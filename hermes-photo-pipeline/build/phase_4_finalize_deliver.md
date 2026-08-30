# Phase 4 — finalize, deliver, end-to-end

Read `build/README.md`, `ARCHITECTURE.md`, and `skills/photo-pipeline/SKILL.md`
stages 6–7 first. Work from the `hermes-photo-pipeline/` repo root. Requires
`exiftool` on PATH (phase 0 verified it).

## Build `skills/photo-pipeline/scripts/finalize.py`

Per SKILL stage 6. For each set in state `approved`:
1. Order approved sets by the middle frame's capture timestamp (sets.json).
2. Copy result → `70_final/<job>/<address-slug>_NN.jpg` (NN = 01…, zero-padded;
   address slug = job ID minus the `YYYYMMDD[_-]` prefix).
3. Copy capture EXIF from the source middle RAW (`10_raw/<job>/<stem>.<ext>` —
   use the STORED name from sets.json, which may carry a collision suffix) via
   `exiftool -tagsFromFile`; then apply `references/metadata_args.txt` with
   placeholders filled from config + job + set, including
   `DigitalSourceType` from config `metadata.digital_source_type_default` (or
   `_sky_replacement` when the set's disclosure flag is set). Never add flags
   that strip C2PA/JUMBF — see the argfile's comment.
4. Write `70_final/<job>/manifest.json`: filename, set_id, category,
   disclosure flags, sha256 OF THE FINAL FILE. Sets → `finalized`,
   job → `FINALIZED`.
Flags: `--job`, `--root`, `--dry-run`.

## Build `skills/photo-pipeline/scripts/deliver.py`

Per SKILL stage 7:
1. If `delivery.branding_applied_by_r2_pipeline` is false → STOP with a clear
   message (the two variants would be byte-identical).
2. Copy `70_final/<job>/` into `80_delivery/<job>/branded/` and
   `.../unbranded/`; job → `DELIVERING`.
3. Run `delivery.r2_handoff_cmd` once per variant with `{delivery_dir}` /
   `{variant}` substituted; nonzero exit → retry ×3 with backoff
   (`retries.backoff_seconds`).
4. `DELIVERED` ONLY when BOTH variants exit 0. If one succeeded and the other
   failed all retries → job → `EXCEPTION` with `partial_delivery: true` logged
   and a loud alert naming the LIVE variant (it is already public — say so).
5. On success: append the final cost summary (sum of cost events in
   `log.jsonl`, broken down by submit / judge / classify) and print it.
Flags: `--job`, `--root`, `--dry-run`.

## Acceptance tests — add to `tests/test_pipeline.py` (mock ALL HTTP; use a fake handoff command)

- finalize: two approved sets produce `slug_01.jpg`, `slug_02.jpg` in capture
  order; manifest sha256 values verify against the files on disk; a set with
  disclosure.required=true gets the sky-replacement DigitalSourceType (inspect
  via `exiftool -DigitalSourceType` on the output; exiftool is available).
- deliver: handoff command that fails (exit 1) → exactly 3 attempts per
  variant (patch sleep), job → `EXCEPTION`, `partial_delivery` correctly
  reflects which variant succeeded; both succeed → `DELIVERED` + cost summary
  printed.
- branding flag false → exits 1 before staging anything.
- **End-to-end:** a bundled fixture job (construct under `tests/fixtures/`:
  2 sets × 3 tiny JPEGs as "RAW" stand-ins — build sets.json directly to skip
  exiftool) runs ingest → submit → qa → finalize → deliver with all HTTP
  mocked and a fake handoff command, reaches `DELIVERED`, and `log.jsonl`
  contains a complete audit trail with zero binary payloads.

## Then write the operator README

Create `README.md` at the repo root: a table of every stage command
(`intake`, `classify_sets.py`, `ingest-exports`, `submit`, `qa`, `approve`,
`finalize`, `deliver`, `status`) with what it does, what it expects, and its
exit codes; the operator's two manual checkpoints (Photomator export contract,
human approve); and the "stall loudly, never guess" rule.

## Done when

Full test suite green including the end-to-end dry run. Print the stage-command
table and stop. Do not refactor `group_brackets.py`.
