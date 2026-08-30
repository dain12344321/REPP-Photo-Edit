# Real-Estate Photo Pipeline: Photomator + Hermes + AI Bracket Editor

Version 1.1 — 2026-07-19. One architecture, one week-one build, no invented APIs.
v1.1 applies the adversarial review (REVIEW.md): provider economics corrected to
Google credits, group_brackets.py upgraded to v1.1 (per-camera clustering, .dng,
EV sanity, idempotency), QA judge input fixed, retry semantics unified.

---

## 1. The one-line design

Hermes owns everything that is files, JSON, HTTP, and state. Photomator owns everything that is taste. The two never talk directly; they meet at watched folders with strict naming contracts. The AI bracket editor is a swappable HTTP provider behind a JSON `edit_request`; QA is a two-stage gate (deterministic checks, then a cheap vision judge that sees all three source brackets plus the result) before a single mandatory human approval.

```
Card dump                HUMAN (Photomator)                    HERMES (automated)
────────────  ────────────────────────────────  ─────────────────────────────────────────────
00_intake  →  validate → group (per camera) → classify → sets.json  →
                                             [open RAWs, apply approved preset,
                                              Batch Edit workflow, export JPEG]
                                                        ↓ 20_photomator_export/
              match exports to sets → build 30_queue/set_NNN/ + edit_request.json
                        ↓
              submit 3 brackets + prompt → PROVIDER (Nano Banana 2; GPT Image 2 fallback)
                        ↓ 40_returned/
              QA gate: programmatic checks → vision judge (3 brackets + result) → 50_qa/{pass,fail}
                        ↓
              HUMAN: eyeball 50_qa/pass, `approve` (exceptions → Photomator/Luminar/Nik)
                        ↓
              finalize: rename + IPTC/EXIF metadata + disclosure flags → 70_final/
                        ↓
              hand off to existing branded/unbranded Cloudflare R2 delivery → 80_delivery/
```

Two humans-in-the-loop total: the preset/export step and the final approve. Everything else is Hermes.

---

## 2. Provider decision: Nano Banana 2 vs GPT Image 2

Both are real, current models (verified July 2026 against vendor pricing pages and deprecation notices):

| | Nano Banana 2 (Gemini 3.1 Flash Image) | GPT Image 2 (`gpt-image-2`, 2026-04-21) |
|---|---|---|
| Pricing model | Flat per image by resolution | Token-based ($8/M image in, $30/M image out) |
| Cost per output | $0.067 @1K, $0.101 @2K, $0.151 @4K | ~$0.05 (medium) to ~$0.21 (high) @1K class; larger sizes scale with token count, which is dynamic. Edit calls with 3 reference images bill input at high-fidelity rates; budget 2 to 3x generation baseline. **2K-class per-listing estimates are soft — the benchmark measures the real number.** |
| Batch mode | Yes, 50% off, up to 24h turnaround | OpenAI Batch API advertises 50% off all models; confirm image-endpoint eligibility before relying on it |
| Max output | 4K (4096 long edge) | Reported up to 4K class by third-party trackers; confirm against current docs at build time |
| Multi-image input | Yes (bracket triplets fine) | Yes, edits endpoint accepts multiple reference images |
| Rate limits | Paid tier only (credits account) — verify project RPM at build | Verify in dashboard; sequential submission makes this non-blocking |
| Notes | Cost-optimized sibling of Nano Banana Pro; NB Pro ($0.134 @2K) is the higher-fidelity escalation. NB2 Lite ($0.0336 @1K) exists but is 1K-only — not a delivery candidate | `gpt-image-1` shuts down 2026-10-23 (confirmed), so anything built now targets `gpt-image-2` anyway |

**Recommendation: Nano Banana 2 as the production provider. GPT Image 2 as the benchmarked challenger and configured fallback.** Reasons: 2 to 4x cheaper at the 2K real-estate delivery size, native 4K available for hero shots, flat predictable pricing (GPT Image 2's dynamic token count makes per-listing cost estimates soft), a batch mode that halves cost on non-rush jobs — and, decisively, **your $300 of credits are Google, not OpenAI**, so every production dollar lands where the credits are.

**Credits routing (corrected in v1.1):** $300 is the signature of a Google Cloud trial credit, which typically (a) spends against **Vertex AI**, not AI Studio API keys, and (b) **expires (often 90 days)**. Before building, confirm what the credits attach to. If they are Google Cloud credits, run the Gemini calls through the Vertex AI backend (`gemini_backend: "vertex"` in config) and spend them early — the "funds QA for many months" plan does not survive a 90-day expiry. The **QA judge and category classifier are Gemini Flash-class models** (pin at build), so classification + QA also bill to Google. OpenAI spend is then optional and cash-only: the GPT arm of the benchmark (~$10–25) and nothing else. If you'd rather not spend cash, benchmark NB2 vs NB Pro instead and keep GPT Image 2 as a configured-but-untested fallback.

Escalation tier (optional, not default): Nano Banana Pro (Gemini 3 Pro Image) for twilight/hero shots where NB2 fidelity falls short. Same API shape, $0.134 per 2K image.

---

## 3. Folder structure and job states

Root: `~/REPipeline/`. Job ID: `YYYYMMDD_address-slug` (regex `^\d{8}[_-][a-z0-9-]+$`), e.g. `20260719_123-main-st`.

```
~/REPipeline/
  00_intake/<job>/                # operator dumps RAW files here; only entry point
  10_raw/<job>/                   # validated RAW, flat (grouping is logical, in sets.json)
  20_photomator_export/<job>/     # operator exports preset-applied JPEGs here (watched)
  30_queue/<job>/set_NNN/         # Hermes-assembled bracket triplets + edit_request.json
  40_returned/<job>/set_NNN/      # provider output + API response metadata (binary stripped)
  50_qa/<job>/pass/  fail/        # QA verdicts; pass/ doubles as the human review folder
  70_final/<job>/                 # renamed, metadata applied
  80_delivery/<job>/branded/ unbranded/   # handoff point for the existing R2 pipeline
  90_archive/<job>/               # RAW + finals after delivery (optional week two)
  99_exceptions/<job>/            # anything quarantined, with reason.txt alongside
  _state/<job>/job.json           # job state machine
  _state/<job>/sets.json          # per-set manifest + per-set state
  _state/<job>/log.jsonl          # append-only event log (every transition, every API call — NO binary payloads)
  _config/config.json             # provider, backend, sizes, budgets, retries, R2 hook command
```

Job states (in `job.json`): `NEW → VALIDATED → GROUPED → AWAITING_PHOTOMATOR → EXPORTED → QUEUED → EDITING → QA_DONE → APPROVED → FINALIZED → DELIVERING → DELIVERED` plus terminal `EXCEPTION`.

Per-set states (in `sets.json`): `pending → queued → sent → returned → qa_pass | qa_fail → (re-queued with attempt+1 | exception) → approved → finalized → delivered`. `sent` is set while a provider request is in flight; a set that fails QA or hits a transient API failure returns to `queued` with `retry.attempt` incremented, until `retry.max_attempts` total submissions are exhausted.

Rules that make this safe: every file move is copy-then-verify-then-delete; nothing is ever overwritten (collisions get a content-hash suffix, a `renamed` log entry, and the stored name is written back into `sets.json`); every transition is one atomic `job.json`/`sets.json` write; each stage is idempotent (re-running a stage on already-advanced work is a no-op — `group_brackets.py` v1.1 exits 0 with `already_grouped` if intake is empty but state and RAWs exist, and skips already-moved files).

**Logging rule (v1.1):** provider responses embed images as base64. Nothing binary ever enters `log.jsonl`. Scripts log request ID, model, usage metadata, estimated cost, and result sha256/size only. The full response JSON saved to `40_returned/` has binary fields replaced by `{"_binary_stripped": true, "sha256": ..., "bytes": ...}`.

**Exit-code convention (all scripts):** `0` ok; `1` blocking error (named, loud, nothing moved partially); `2` ok-with-warnings (e.g., quarantines).

---

## 4. Photomator/Hermes handoff — what is actually supported

Capability map verified on the production machine (Photomator 3.4.14, macOS 27, July 2026; Pixelmator team is now Apple):

**Tier A — supported and reliable (use these):**
- File-system contracts. Hermes prepares folders; the operator points Photomator at them; Hermes watches the export folder. This is the backbone.
- Photomator's built-in Batch Editing workflows: apply a preset, auto-enhance, crop, denoise, watermark, and export to a chosen folder across many photos in one operator-triggered run. In-app automation, sanctioned and documented — but it cannot be triggered from outside the app.
- `open -a Photomator <files>` from Hermes to hand the operator the right RAWs with zero navigation. (The bundle has `NSAppleScriptEnabled` but no scripting dictionary — AppleScript can open/print/quit and nothing more.)
- Photomator's Share extension ("Add to Photomator"): Finder/Photos → Share menu is a second sanctioned way to hand it files.
- macOS Folder Actions / a generic Shortcut for notifications ("job 20260719_123-main-st is ready for Photomator") — Shortcuts moving files and notifying is fine; it just can't drive edits.

**Tier B — not available (verified on-device; do not design against these):**
- No public Photomator API, SDK, or CLI. None. Anything claiming otherwise is invented.
- No AppleScript dictionary (no `.sdef` in the bundle). Pixelmator Pro — a different app, not installed on this machine — does have a full AppleScript dictionary and Shortcuts support; it's a legitimate optional exception tool alongside Luminar/Nik if the RAW preset step is ever fully scripted.
- No Photomator-shipped Shortcuts actions (no App Intents / SiriKit extensions in the bundle as of 3.4.14). Re-verify after each update (open Shortcuts, search actions for "Photomator"); if actions ever appear, promote them into Tier A.

**Tier C — possible but fragile (keep behind a flag, off by default):**
- Accessibility/UI scripting (System Events clicking through the Batch Edit dialog). It works until any UI update, fails silently, and saves about 90 seconds per job. Not worth it in v1.

**Manual checkpoints (deliberate, not gaps):** (1) preset selection + Batch Edit export in Photomator; (2) final approve of QA-passed images; (3) exception edits — Photomator first, Luminar Neo/Nik only when their specific tools are needed. Everything else that used to be manual (grouping, moving, classifying, uploading, renaming, metadata, retries) is Hermes.

Export contract the operator must follow (enforced by validation): export JPEG, quality 90+, **original filenames preserved** (`DSC01234.ARW → DSC01234.jpg`) — basename matching is THE re-matching mechanism — into `20_photomator_export/<job>/`. ("Include metadata" is nice-to-have belt-and-braces; finalize pulls capture EXIF from the source RAW regardless.)

---

## 5. The agent loop

### Input contract (job-level)

A job is accepted from `00_intake/<job>/` only if: the folder name matches the job regex; it contains only supported RAW (`.arw`, `.dng`, case-insensitive — config `grouping.raw_extensions`) plus optional `overrides.json`; every file is non-zero, readable, and uniquely named; EXIF is readable on ≥95% of frames. Grouping (group_brackets.py v1.1) is **per camera model** (ground body and drone never mix), then by capture-time proximity (2.5s default). Clusters of exactly 3 become sets; 4–5 split at the largest internal gap; ≥6 chunk into consecutive triplets; leftovers quarantine. A triplet is accepted only if adjacent EV spacing is plausible (0.5–4.0 stops; config `min_ev_step`/`max_ev_step`) — frames with indistinguishable exposures are quarantined, never label-guessed. Leftovers go to `99_exceptions/<job>/` with reasons and do not block the job.

Category (interior/exterior/drone) per set is assigned by `classify_sets.py`: it renders a preview JPEG from the middle-frame RAW (`exiftool -b -PreviewImage`, fallbacks `-ThumbnailImage` then `sips`), downscales ≤1024px, calls the Gemini judge model with the classifier prompt, and writes the category into `sets.json`. `overrides.json` (format: `{"set_003": {"category": "exterior", "sky_replacement": true}}`) is applied last and always wins; operators can also edit `sets.json` directly.

### Edit request (per set) — the JSON contract

Full JSON Schema in `skills/photo-pipeline/references/edit_request.schema.json`. Shape:

```json
{
  "job_id": "20260719_123-main-st",
  "set_id": "set_007",
  "category": "interior",
  "frames": [
    {"file": "DSC01231.jpg", "ev": -2.0, "sha256": "..."},
    {"file": "DSC01232.jpg", "ev": 0.0,  "sha256": "..."},
    {"file": "DSC01233.jpg", "ev": 2.0,  "sha256": "..."}
  ],
  "provider": "nano-banana-2",
  "prompt_profile": "interior_v1",
  "output": {"long_edge": 2048, "aspect": "match_source", "format": "jpeg"},
  "constraints": {
    "preserve_layout": true, "no_add_remove": true,
    "sky_replacement": false, "window_view": "preserve", "people": "none_expected"
  },
  "disclosure": {"required": false, "reason": null},
  "retry": {"attempt": 0, "max_attempts": 3},
  "budget": {"max_usd_per_set": 0.60},
  "created_at": "2026-07-19T14:03:11-07:00"
}
```

`frames[].sha256` here hashes the **queue JPEG** (sets.json hashes the source RAW; the delivery manifest hashes the final file — never compare across kinds). `sky_replacement` defaults to false; when an exterior set is flagged for it (operator override), `disclosure.required` flips to true automatically and follows the image to delivery.

### Retry semantics (unified in v1.1 — this paragraph is the single source of truth)

`retry.max_attempts` (config, default 3) is the **total number of provider submissions** per set. Within one submission, transient errors (429/5xx/timeout) retry up to twice with `backoff_seconds[0]` (30s) then `[1]` (120s). If the submission still fails, the attempt ends: wait `backoff_seconds[2]` (480s), then re-queue with `attempt += 1` if attempts remain, else try `fallback_provider` if `fallback_enabled`, else `exception`. A QA hard-fail re-queues with the profile's `_strict` prompt variant while attempts remain, then `exception`. A safety refusal consumes the attempt and goes straight to `exception` — no blind retry.

### QA gate (two stages, cheap first)

Stage 1, programmatic (free, in `qa` step): file decodes as JPEG; long edge ≥ requested (tolerance −64px); aspect ratio within 2% of source middle frame; not grayscale; highlight/shadow clipping below **per-category** thresholds (config `qa.clip`; exterior/drone tolerate more sky-white than interior); output is not byte-identical or near-duplicate of an input frame (mean absolute difference on 256px downscales above config `qa.near_duplicate_max_mean_abs_diff`).

Stage 2, vision judge (one call per photo, pinned Gemini Flash-class model, sub-cent): input = **all three source brackets (dark, middle, bright) + the edited result** + rubric (`references/qa_rubric.md`). The dark frame is mandatory: it is the only place the real window view exists, and INVENTED_VIEW cannot be judged without it. Output = strict JSON:

```json
{
  "verdict": "pass | fail",
  "scores": {"window_recovery": 4, "lighting_natural": 5, "color_fidelity": 4,
             "geometry": 5, "artifacts": 4, "sky": 5},
  "hard_fails": [],
  "notes": "short human-readable reason"
}
```

Hard-fail list (any one fails regardless of scores): object added or removed; window view invented or replaced; readable text/screens warped; structural geometry changed (walls, rooflines, cabinetry); people or pets altered; watermark/text artifacts. Pass threshold: no hard fails and mean score ≥ 3.5 with no axis below 3.

### Failure modes and recovery

| # | Failure | Detection | Response |
|---|---|---|---|
| 1 | Incomplete bracket / implausible EV spacing / indistinguishable exposures | grouping | quarantine set to 99 with reason, job continues |
| 2 | EXIF EV missing | grouping | EV100 ordering still applies; sets below the high-confidence bar are flagged `low_confidence` for operator glance |
| 3 | Export mismatch (JPEG count ≠ manifest) | export ingest | list missing basenames, exit 1, wait; never guess |
| 4 | API 429/5xx/timeout | submit | per unified retry semantics (§5): 30s/120s in-attempt, 480s between attempts, then fallback provider if enabled, else exception |
| 5 | Safety refusal | submit | no retry; exception with response metadata attached (rare; artwork/people can trigger) |
| 6 | QA hard fail | qa | re-queue with `_strict` prompt while attempts remain; then exception (Photomator/Luminar manual) |
| 7 | Wrong size/aspect returned | qa stage 1 | one resubmission with explicit size params (consumes an attempt); then exception |
| 8 | Crash mid-job | any | state files are truth; re-run the stage command, idempotency skips done work |
| 9 | R2 handoff nonzero exit | deliver | 3 retries with backoff; DELIVERED only when BOTH variants exit 0; partial success → EXCEPTION with `partial_delivery: true` + alert; never silently half-deliver |
| 10 | Cost runaway | submit | per-job `budget.max_usd_per_job` in config; halt job at cap with exception |
| 11 | Filename collision | any move | write with `-<hash8>` suffix, record stored name + `original_name` in sets.json, log, continue |

Retries are always: same set, incremented `retry.attempt`, new output file (never overwrite), request/response **metadata** logged to `log.jsonl` (binary stripped).

---

## 6. Cost per listing (30 delivered photos, 3 brackets each)

| Route | Edits | Retries ~10% | QA judge + classify | Total | Per photo |
|---|---|---|---|---|---|
| **NB2 @2K standard (recommended)** | $3.03 | $0.30 | ~$0.20 | **~$3.55** | ~$0.12 |
| NB2 @2K batch (non-rush, 24h SLA) | $1.51 | $0.15 | ~$0.20 | ~$1.90 | ~$0.06 |
| NB2 @4K (print/hero) | $4.53 | $0.45 | ~$0.20 | ~$5.20 | ~$0.17 |
| GPT Image 2 high, 2K class (SOFT — benchmark measures) | ~$7.50–13.00 | ~$1.00 | ~$0.20 | **~$9–14** | ~$0.30–0.47 |
| NB Pro @2K (escalation only) | $4.02 | $0.40 | ~$0.20 | ~$4.60 | ~$0.15 |

GPT Image 2 numbers are estimates because output token count is dynamic — treat the whole row as soft until the benchmark reads the usage dashboard. Input-token costs on NB2 (3 reference images) are effectively noise at $0.25/M. At 8 listings/month the recommended route is ~$28/month of Gemini spend — **billed to Google, where your $300 credits live** (confirm Vertex vs AI Studio routing and credit expiry). QA/classification is also on Gemini (~$1.60/month at 8 listings). OpenAI is only touched if you choose to run the GPT benchmark arm (~$10–25, cash) or enable the fallback.

`budget.max_usd_per_job` ($12 default) fits the NB2 route with ~3x headroom; if you ever run the GPT route on a full listing, raise the cap first or the job will halt half-edited.

---

## 7. Benchmark method (details + scoresheet in BENCHMARK.md)

Twenty frozen test sets from past listings: 10 interior (including 4 hard cases), 6 exterior (2 dull-sky), 4 drone. Round 1 (6 sets): tune each provider's prompt to its best; freeze. Round 2 (20 sets): both providers, 2K output, same inputs. Blind A/B scoring on the prefilled `benchmark_scoresheet.csv`. Also record objectively: actual per-image cost from both usage dashboards, wall-clock latency, error/refusal count, delivered resolution. Decision gate: ≥90% "usable without rework" AND zero hard fails (at n=20, "<5%" means 0 — one hard fail is 5% and fails the gate); if both pass, cheaper wins. Budget: NB2 side ~$5 (Google credits). GPT side ~$10–25 **cash — decide consciously**, or substitute NB Pro and stay entirely on credits.

---

## 8. Smallest safe version to build this week

- **Day 0 (prerequisites — new in v1.1):** `brew install exiftool` (NOT present on this machine — everything breaks without it); Python 3.11+ venv with `requests` (or `httpx`), `Pillow`, `jsonschema`; copy `config.example.json` to `~/REPipeline/_config/config.json` and fill every `SET_ME`/`PIN_` value; create the folder tree; run `tests/test_group_brackets.py` green.
- **Day 1:** run `group_brackets.py` v1.1 against one past listing's RAW copies (Sony body + drone `.dng` if you have one — per-camera grouping should keep them cleanly apart). Confirm sets.json matches reality, including quarantine reasons. Build `classify_sets.py`.
- **Day 2:** Photomator conventions: save one Batch Edit workflow per category (preset + JPEG export, original filenames, to `20_photomator_export/<job>/`). Build `ingest_exports.py` + `status.py`.
- **Day 3:** `submit_edits.py` for Nano Banana 2 only, interiors only, sequential, with logging (binary-stripped) and backoff. Eyeball results manually in `40_returned`.
- **Day 4:** `qa_gate.py` stage 1 + judge + `approve` + `finalize.py` (rename `<address-slug>_NN.jpg` by capture order + exiftool metadata/disclosure template).
- **Day 5:** `deliver.py` = invoke your existing R2 pipeline command against both variants of `80_delivery/<job>/`; run one full past listing end-to-end; start benchmark round 1.

Explicitly not this week: no daemon/watchers (run `hermes-pipeline <stage> <job>` per job), no GUI, no customer-facing anything, no sky replacement by default, no Gemini batch mode, no UI scripting, no parallel providers in production, no Luminar/Nik in the main path.

---

## 9. What Hermes runs (the skill)

Drop `skills/photo-pipeline/` into Hermes. `SKILL.md` is the operating manual (stage commands, state rules, guardrails); `references/` holds the schema, per-category prompts with strict-retry variants, the QA rubric, and the exiftool metadata template; `scripts/group_brackets.py` (v1.1) is the deterministic core, shipped tested. The remaining scripts are specified phase-by-phase in `build/` (see `build/README.md`) for your coding agent, with acceptance tests, so the code that touches money and client files is built deliberately rather than improvised at runtime.

MLS-safe stance baked in end to end: brackets blended for exposure only; nothing added, removed, or restyled; window views preserved; sky replacement is per-set opt-in, tracked in `disclosure`, written into IPTC (`DigitalSourceType`), surfaced in the delivery manifest so the listing side can disclose per MLS rules.

**Disclosure honesty (v1.1):** the provider is a *generative* model — it re-renders pixels rather than mathematically blending them — so the default `DigitalSourceType` is `trainedAlgorithmicMedia` (not the lighter `algorithmicallyEnhanced`), rising to `compositeWithTrainedAlgorithmicMedia` when sky replacement is used. Confirm your MLS's current AI-disclosure policy; if it accepts the lighter tag for exposure-only blends, that is one config value. Gemini outputs carry SynthID and may carry C2PA content credentials: finalize must **preserve** C2PA manifests (provenance helps you) — verify with one real file at build time that the exiftool metadata pass does not strip them.
