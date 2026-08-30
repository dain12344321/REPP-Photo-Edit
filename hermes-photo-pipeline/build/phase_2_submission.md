# Phase 2 — provider submission

Read `build/README.md`, `ARCHITECTURE.md` (especially §5 retry semantics and
the logging rule), and `skills/photo-pipeline/SKILL.md` first. Work from the
`hermes-photo-pipeline/` repo root. This script touches money — implement the
spec, nothing more.

## Build `skills/photo-pipeline/scripts/submit_edits.py`

Per SKILL stage 3. For each set in state `queued` (or re-queued with attempts
left), optionally filtered by `--sets a,b,c`:

1. Set → `sent` (state write) BEFORE the HTTP call; load the prompt from
   `references/prompts/<category>.md` (`strict` section when
   `retry.attempt > 0`); attach the 3 queue JPEGs dark→bright; request
   `output.long_edge` at source aspect.
2. Providers, per `_config/config.json` (`provider`, `fallback_provider`,
   `fallback_enabled`, `models.*` — model strings come ONLY from config):
   - `nano-banana-2` / `nano-banana-pro`: Gemini `generateContent` with 3
     inline images + prompt. Backend per `gemini_backend`: `vertex` (Vertex AI
     endpoint, application-default credentials) or `ai_studio`
     (`GEMINI_API_KEY` query/header). Abstract this behind one
     `call_gemini(...)` function so the backend is a config flip.
   - `gpt-image-2`: OpenAI `images/edits` with the 3 frames as reference
     images. Do NOT send `input_fidelity`.
3. Retry semantics — implement ARCHITECTURE.md §5 verbatim:
   transient 429/5xx/timeout → in-attempt retries at `backoff_seconds[0]` then
   `[1]`; still failing → wait `backoff_seconds[2]`, re-queue with
   `attempt += 1` if `attempt + 1 < max_attempts`, else fallback provider if
   `fallback_enabled`, else set → `exception`. Safety/policy refusal →
   `exception` immediately, response metadata attached, no retry.
4. Save the result image to `40_returned/<job>/set_NNN/result_a<attempt>.jpg`
   (never overwrite — new file per attempt) + the response JSON WITH BINARY
   STRIPPED: replace any inline/base64 image field with
   `{"_binary_stripped": true, "sha256": ..., "bytes": ...}`. Set → `returned`.
5. Log to `log.jsonl`: request ID, model string, usage metadata, ESTIMATED cost
   (per-image price table keyed by provider+long_edge lives in the script with
   a comment to update from vendor pages), latency, attempt — never binary.
6. Budget: before each call, if `spend_so_far + estimated_call_cost >
   budget.max_usd_per_job`, HALT the job (job → `EXCEPTION`, reason
   `budget_cap`) with a clear message naming the cap and the spend.
7. Sequential only. Honor rate limits with a fixed small delay between calls
   (config-free constant, e.g. 1s). Job → `EDITING` while anything is in
   flight.
Flags: `--job`, `--root`, `--provider`, `--sets`, `--dry-run` (dry-run prints
the exact requests it WOULD send: model, prompt profile, frame hashes — no HTTP).

## Acceptance tests — add to `tests/test_pipeline.py` (mock ALL HTTP)

- 429 then 200 → exactly one in-attempt backoff then success; backoff delays
  injected/mockable (no real sleeping in tests — patch the sleep function).
- persistent 5xx through both in-attempt retries → attempt ends, set re-queued
  with `attempt+1` (fallback disabled) / fallback provider called once
  (fallback enabled).
- attempts exhausted → set → `exception`, no further calls.
- safety refusal → `exception`, no retry, response metadata (not binary) logged.
- budget cap: with spend at $11.90 and a $0.15 estimated call against a $12.00
  cap → halt BEFORE the HTTP call; assert the mock was never called.
- binary stripping: a Gemini-shaped response containing a 1MB fake base64
  inline image → saved response JSON contains the stub, the log line contains
  sha256+bytes, and no base64 string appears in either file.
- dry-run makes zero HTTP calls and writes nothing.

## Done when

Full test suite green. Print the per-provider request shapes (endpoints,
payload skeletons) as a short reference block and stop.
