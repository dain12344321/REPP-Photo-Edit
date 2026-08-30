# Build package — Hermes photo pipeline, phased prompts

Five test-gated phases that build the complete pipeline. Run them IN ORDER,
one phase per coding-agent session. Do not start phase N+1 until phase N's
acceptance tests pass. The spec documents are `ARCHITECTURE.md` (architecture)
and `skills/photo-pipeline/SKILL.md` (operating manual) — they override any
assumption the coding agent brings. `skills/photo-pipeline/scripts/group_brackets.py`
(v1.1) is FROZEN: it is shipped and tested; do not refactor it, do not "improve"
it, call it as specified.

## How to run a phase

1. Paste the phase file into your coding agent, from the repo root
   (`hermes-photo-pipeline/`).
2. Let it write code AND tests, run the tests, and show you the output.
3. You review the diff. If tests are green and the diff matches the phase spec,
   move to the next phase.

## Tool notes

- **Codex CLI / cloud:** run one phase per task (`codex exec "$(cat build/phase_1_intake_ingest.md)"`
  or paste into the cloud UI). Its sandbox can't reach your real API keys — good:
  every test must pass with mocked HTTP anyway.
- **Cline (any model):** paste one phase per task; keep "auto-approve" OFF for
  file writes so you review each diff. Feed only the current phase file, not the
  whole package — context discipline keeps quality up.
- **Hermes + Codex:** Hermes orchestrates: hand each phase file to `codex exec`,
  run the phase's test command itself between phases, and stop the line on red.
  This is the recommended pattern if Hermes will also operate the finished
  pipeline — the operator understands the build.
- Do NOT split one phase across two tools, and do NOT let the agent improvise
  features beyond the phase list.

## Global invariants (every phase, restated in each file)

- Python 3.11+, dependencies ONLY `requests` (or `httpx`), `Pillow`, `jsonschema`;
  everything else stdlib. Tests use stdlib `unittest` + `unittest.mock` — no
  pytest, no network, mock ALL HTTP.
- Exit codes: `0` ok, `1` blocking error, `2` ok-with-warnings.
- Never overwrite a file; collisions get `-<sha256[:8]>` suffix + log line +
  stored name written back to state.
- Moves are copy-verify-delete. State writes are atomic (temp + rename).
  `job.json`/`sets.json` are re-read before every stage.
- `log.jsonl` gets every event, API request ID, usage, cost estimate — and NEVER
  a binary payload (strip base64 image data; keep sha256 + bytes).
- Keys from env only: `GEMINI_API_KEY` (required), `OPENAI_API_KEY` (optional).
- Retry semantics are defined once in ARCHITECTURE.md §5 — implement exactly
  that, don't re-derive.
- No daemons, no watchers, no GUI, no customer-facing anything, no Photomator
  automation of any kind (it has no API; the operator drives it).

## Phases

| Phase | File | Builds | Gate |
|---|---|---|---|
| 0 | `phase_0_environment.md` | prerequisites, config, folder tree | group_brackets test suite green |
| 1 | `phase_1_intake_ingest.md` | `classify_sets.py`, `ingest_exports.py`, `status.py` | phase tests green (HTTP mocked) |
| 2 | `phase_2_submission.md` | `submit_edits.py` | backoff/refusal/budget tests green |
| 3 | `phase_3_qa.md` | `qa_gate.py` | stage-1/judge/requeue tests green |
| 4 | `phase_4_finalize_deliver.md` | `finalize.py`, `deliver.py`, e2e + README | full dry-run to DELIVERED |

After phase 4: run one REAL past listing end-to-end (Day-5 in ARCHITECTURE §8),
then start benchmark round 1 (BENCHMARK.md).
