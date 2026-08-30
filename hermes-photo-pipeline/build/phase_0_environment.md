# Phase 0 — environment and deterministic core verification

Read `build/README.md` first. This phase writes almost no code; it proves the
ground is solid. Work from the `hermes-photo-pipeline/` repo root.

## Do

1. Install prerequisites (macOS, Homebrew present):
   - `brew install exiftool` — it is NOT installed on this machine; everything
     downstream shells out to it. Verify: `exiftool -ver`.
   - Create a Python 3.11+ venv at the repo root (`.venv/`), activate it, and
     install ONLY: `requests` (or `httpx`), `Pillow`, `jsonschema`.
2. Create the pipeline tree at `~/REPipeline/` exactly as in ARCHITECTURE.md §3
   (`00_intake` … `99_exceptions`, `_state`, `_config`).
3. Copy `skills/photo-pipeline/references/config.example.json` to
   `~/REPipeline/_config/config.json`. Fill every `SET_ME`; replace every
   `PIN_..._AT_BUILD` model string with the exact current string from the
   vendor's docs page (Gemini: ai.google.dev/models; OpenAI:
   platform.openai.com/docs/models) — print the URL you took each string from.
   Set `gemini_backend` after asking the operator whether the $300 credits are
   Google Cloud credits (→ `vertex`) or AI Studio (→ `ai_studio`).
4. Run the frozen core's test suite and make it green:
   `python3 -m unittest discover -s tests -v`
   (tests/test_group_brackets.py ships with the repo; it is offline, no
   exiftool needed). Do not modify the tests or the script to make them pass —
   if anything is red, report it, do not patch around it.
5. Smoke-run the core in fixture mode:
   `python3 skills/photo-pipeline/scripts/group_brackets.py --from-json <a small fixture> --state /tmp/gb_smoke --dry-run`
   (construct a 6-frame fixture: one camera, two clean triplets).
6. Verify exiftool against one REAL past-listing RAW if the operator provides
   its path: `exiftool -json -fast2 -DateTimeOriginal -SubSecTimeOriginal
   -ExposureCompensation -FNumber -ExposureTime -ISO -Model <file>` — confirm
   every field the script needs is present (this validates `-fast2` keeps them).

## Report

A short `ENV REPORT`: exiftool version, python version, pip freeze, config
path with SET_ME/PIN values resolved (mask any key material — keys stay in
env, never in config), test-suite output tail, and the model-string source
URLs. Stop after this report.
