---
name: photo-pipeline
description: >
  Run the real-estate photo pipeline: validate RAW intake, group bracket sets,
  classify and stage the Photomator handoff, submit bracket triplets to the AI
  edit provider, QA results, finalize naming/metadata, and hand off to R2
  delivery. Use when the user says "process <job>", "new listing photos",
  "run the pipeline", "check job status", or drops files in 00_intake.
---

# Photo Pipeline Skill

You are operating a production pipeline for a real-estate photography business.
Client deliverables and money are involved. Follow the state machine exactly.
When in doubt, stop and ask; never improvise a file move or an API call outside
the stages below.

## Ground rules

1. Photomator has NO API, NO AppleScript dictionary, NO Shortcuts actions
   (verified on-device, v3.4.14). Never attempt to drive it. The operator runs
   Photomator steps by hand; you prepare and watch folders around it.
2. Never overwrite a file. Collisions get a `-<sha256[:8]>` suffix, a `renamed`
   log line, and the stored name is written back into `sets.json`
   (`frames[].file`), with `frames[].original_name` recording the intake name.
3. Every move = copy, verify size+hash, then delete source.
4. `_state/<job>/job.json` and `sets.json` are the single source of truth.
   Re-read before every stage; write atomically (temp file + rename) after.
5. Append every event, API request ID, usage, cost estimate, and error to
   `_state/<job>/log.jsonl` — but NEVER log binary payloads. Provider responses
   embed images as base64; strip them (keep sha256 + byte count) before logging
   or saving response JSON.
6. Respect `budget.max_usd_per_job` from `_config/config.json`. Halt at cap.
7. All edits are MLS-safe: exposure blend only, nothing added or removed,
   window views preserved. `sky_replacement` only when explicitly flagged on a
   set, and it forces `disclosure.required = true` through to delivery.
8. Production provider: `nano-banana-2` (Gemini; backend per config
   `gemini_backend`: `vertex` if your $300 credits are Google Cloud credits,
   `ai_studio` otherwise). Escalation: `nano-banana-pro`. Fallback: `gpt-image-2`
   (OpenAI, cash — off unless `fallback_enabled`). QA judge + category
   classifier: pinned Gemini Flash-class model (config `models.qa_judge`).
   Keys from env only: `GEMINI_API_KEY` (required), `OPENAI_API_KEY`
   (optional — only for fallback/benchmark). Never from files.

## Pipeline root

`~/REPipeline/` — folder meanings and job/set state vocabularies are defined in
ARCHITECTURE.md §3. Job ID regex: `^\d{8}[_-][a-z0-9-]+$`.

## Retry semantics (single source of truth — mirrors ARCHITECTURE §5)

`retry.max_attempts` (default 3) = TOTAL provider submissions per set.
Transient errors (429/5xx/timeout) retry in-attempt up to twice:
`backoff_seconds[0]` (30s), then `[1]` (120s). If the submission still fails:
wait `backoff_seconds[2]` (480s), re-queue with `attempt += 1` if attempts
remain, else fallback provider if enabled, else `exception`. QA hard-fail:
re-queue with the `_strict` prompt variant while attempts remain, then
`exception`. Safety refusal: straight to `exception`, no retry.

## Stages (run in order; each is idempotent)

### 1. `intake <job>`
- Validate the input contract: only supported RAW (config
  `grouping.raw_extensions`, default `.arw` + `.dng`) + optional
  `overrides.json`; unique names; non-zero; EXIF readable on ≥95%.
- Run `scripts/group_brackets.py --intake 00_intake/<job> --raw 10_raw/<job>
  --state _state/<job> --exceptions 99_exceptions/<job>` (v1.1: per-camera
  clustering, cluster splitting, EV sanity, idempotent re-runs). It moves
  validated RAW to `10_raw/`, writes `sets.json`, quarantines leftovers with
  reasons. Exit codes: 0 ok, 1 blocking, 2 ok-with-quarantines.
- Classify each set: run `scripts/classify_sets.py --job <job>`. It renders a
  preview JPEG from each middle-frame RAW (`exiftool -b -PreviewImage`,
  fallbacks `-ThumbnailImage`, then `sips`), downscales ≤1024px, calls the
  judge model with `references/qa_rubric.md` §Classifier, and writes
  `category` into `sets.json`. Then it applies `overrides.json`
  (format: `{"set_003": {"category": "exterior", "sky_replacement": true}}`) —
  overrides always win.
- Set job `AWAITING_PHOTOMATOR`. Tell the operator: job, set count, category
  counts, any quarantines, and the exact Photomator instructions (open
  `10_raw/<job>`, apply approved preset per category via the saved Batch Edit
  workflow, export JPEG quality 90+, ORIGINAL filenames, to
  `20_photomator_export/<job>/`). Offer `open -a Photomator`.

### 2. `ingest-exports <job>`
- Match JPEGs in `20_photomator_export/<job>/` to `sets.json` by filename STEM
  (`DSC01234.ARW` ↔ `DSC01234.jpg`).
- If counts mismatch: report exactly which basenames are missing, exit 1, wait.
- Assemble `30_queue/<job>/set_NNN/` with the 3 JPEGs plus `edit_request.json`
  built from config + `references/edit_request.schema.json` (validate before
  writing; `frames[].sha256` hashes the queue JPEG; include `created_at`).
  Job → `QUEUED`.

### 3. `submit <job> [--provider X] [--sets a,b]`
- For each set in state `queued` (or re-queued after failure with attempts
  left): set → `sent`; load the prompt from
  `references/prompts/<category>.md` (`strict` section when `retry.attempt > 0`),
  attach the 3 frames dark→bright, request `output.long_edge` at source aspect.
  - nano-banana-2 / nano-banana-pro: Gemini `generateContent` with 3 inline
    images + prompt, via the configured backend (Vertex AI or AI Studio).
    Model string per `_config` — pinned at build from vendor docs.
  - gpt-image-2: OpenAI `images/edits` with 3 reference images. Do not send
    `input_fidelity`.
- Follow the unified retry semantics above. Safety refusal → `exception`.
- Save result to `40_returned/<job>/set_NNN/result_a<attempt>.jpg` + response
  JSON WITH BINARY STRIPPED (store sha256 + bytes instead). Set → `returned`.
  Record estimated cost in log. Enforce `budget.max_usd_per_job`: halt BEFORE
  the call that would exceed it. Job → `EDITING` while any set is in flight.

### 4. `qa <job>`
- Stage 1 per returned set (no tokens): decodes; long edge ≥ requested −64;
  aspect within 2% of source; not grayscale; clip check per category from
  config `qa.clip`; not near-identical to any input frame (256px mean abs diff
  above `qa.near_duplicate_max_mean_abs_diff`).
- Stage 2: vision judge per `references/qa_rubric.md` with ALL THREE source
  brackets (dark, middle, bright) + result — the dark frame is required for
  INVENTED_VIEW detection. Parse strict JSON; on unparsable output retry once,
  then exception. Pass = no hard_fails, mean ≥3.5, no axis <3.
- Pass → hardlink into `50_qa/<job>/pass/`, set → `qa_pass`.
  Fail → `50_qa/<job>/fail/` + verdict JSON, set → `qa_fail`; re-queue per the
  retry semantics (strict prompt), else set → `exception` with the verdict.
- When no set remains in flight: job → `QA_DONE`.

### 5. `approve <job>` (HUMAN checkpoint)
- Summarize QA results, list fails/exceptions, then wait for the operator to
  review `50_qa/<job>/pass/` (Quick Look or Photomator).
- Operator responds with "approve all" or per-set removals; removed sets go to
  `exception` for manual editing (Photomator first; Luminar Neo/Nik only if
  their specific tools are required). Approved sets → `approved`;
  job → `APPROVED`. Never advance without an explicit human approve.

### 6. `finalize <job>`
- Order approved sets by capture time of middle frame. Rename to
  `<address-slug>_NN.jpg` (NN = 01…, zero-padded).
- Copy capture EXIF from the source middle RAW via `exiftool -tagsFromFile`,
  then apply `references/metadata_args.txt` (creator/copyright/address/
  keywords) plus per-image disclosure: `trainedAlgorithmicMedia` for the
  standard provider blend, `compositeWithTrainedAlgorithmicMedia` when
  `sky_replacement` was true (verify current IPTC digitalsourcetype URIs at
  build time; if your MLS accepts `algorithmicallyEnhanced` for exposure-only
  blends, that's one config value).
- PRESERVE any C2PA content credentials / SynthID provenance on provider
  output — do not strip; verify with one real file at build time.
- Write `70_final/<job>/` + `manifest.json` (filename, set_id, category,
  disclosure flags, sha256 of the final file). Job → `FINALIZED`.

### 7. `deliver <job>`
- Copy `70_final` into `80_delivery/<job>/branded/` and `unbranded/`. Branding
  (watermark) is applied by your existing R2 pipeline
  (config `delivery.branding_applied_by_r2_pipeline` — if that is ever false,
  stop and add a watermark step before staging, or the two variants are
  byte-identical).
- Job → `DELIVERING`. Invoke `delivery.r2_handoff_cmd` once per variant with
  `{delivery_dir}`/`{variant}` substitution. Nonzero exit: retry ×3 with
  backoff. Mark job `DELIVERED` ONLY when BOTH variants exit 0; if one variant
  delivered and the other failed, job → `EXCEPTION` with
  `partial_delivery: true` in the log + loud alert (one variant is already
  live — say so). On success, write the final cost summary to log and report it.

### `status [<job>]`
Read-only: render job state, per-set counts by state, spend so far, and the
next required action (including "waiting on Photomator export" or "waiting on
human approve").

## Failure handling quick reference

Incomplete/implausible brackets → quarantine, continue. Missing exports → name
them, exit 1, wait. API errors → unified retry semantics → fallback provider if
enabled → exception. Refusal → exception immediately. QA hard-fail → strict
re-queue while attempts remain → exception. Crash → re-run stage; state files
resume. Anything you cannot classify → move nothing, log, ask the operator.
The pipeline prefers stalling loudly to guessing.
