# Phase 1 — classify, ingest, status

Read `build/README.md`, `ARCHITECTURE.md`, and `skills/photo-pipeline/SKILL.md`
first; they are the spec. Work from the `hermes-photo-pipeline/` repo root.
`group_brackets.py` is frozen — call it, never edit it.

## Build, in `skills/photo-pipeline/scripts/`

1. `classify_sets.py` — per SKILL stage 1: for each set in
   `_state/<job>/sets.json` with `category: null`, render a preview JPEG from
   the middle-frame RAW in `10_raw/<job>/` (`exiftool -b -PreviewImage`,
   fallback `-ThumbnailImage`, fallback `sips -s format jpeg`), downscale so
   the long edge ≤1024 (Pillow), call the config `models.qa_judge` Gemini model
   with the §Classifier prompt from `references/qa_rubric.md`, parse the
   one-word answer, validate it against {interior, exterior, drone} (invalid →
   set `category: "interior"` + flag `category_low_confidence: true` + log),
   write category into sets.json atomically. Then apply
   `_state/<job>/overrides.json` if present (format:
   `{"set_003": {"category": "exterior", "sky_replacement": true}}`) —
   overrides always win; log every override applied. Set job
   `AWAITING_PHOTOMATOR` and print the operator's Photomator instructions from
   SKILL stage 1. Flags: `--job`, `--root` (default `~/REPipeline`),
   `--dry-run`. Mock the HTTP call in tests.

2. `ingest_exports.py` — per SKILL stage 2: match JPEGs in
   `20_photomator_export/<job>/` to `sets.json` by filename STEM
   (`DSC01234.ARW` ↔ `DSC01234.jpg`, case-insensitive extension). Missing
   exports → print exact missing basenames, exit 1, move nothing partially for
   any set. Complete sets: assemble `30_queue/<job>/set_NNN/` with the 3 JPEGs
   (copied, not moved) + `edit_request.json` built from config defaults +
   set data, validated against `references/edit_request.schema.json` via
   `jsonschema` BEFORE writing (note: schema requires `created_at`;
   `frames[].sha256` hashes the queue JPEG, not the RAW). Sets → `queued`,
   job → `QUEUED`. Flags: `--job`, `--root`, `--dry-run`.

3. `status.py` — read-only: job state, per-set counts by state, spend so far
   (sum cost events in `log.jsonl`), and the single next required action
   (e.g. "waiting on Photomator export", "waiting on human approve",
   "run: submit"). Flags: `--job` (optional; without it, list all jobs and
   their states), `--root`.

## Acceptance tests — add to `tests/test_pipeline.py` (stdlib unittest, mock ALL HTTP)

- classify: mocked judge returns "exterior" → category written; garbage answer
  → interior + low-confidence flag; overrides.json beats the model.
- ingest: complete job assembles N set folders with schema-valid
  edit_request.json (validate in the test); one missing basename → exit 1,
  that set's folder absent, others untouched; state shows which are missing.
- status: fixture state renders correct counts and next action; exits 0 with
  no writes (assert no state file mtime changed).

## Done when

`python3 -m unittest discover -s tests -v` is green (including the phase-0
suite). Print a one-paragraph usage example per script and stop.
