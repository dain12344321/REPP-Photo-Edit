# Implementation prompt — superseded by the phased build package

**v1.1 (2026-07-19): this single-shot prompt has been replaced by the phased
prompt package in `build/`.** The adversarial review (REVIEW.md) found that a
one-shot build prompt under-specified classification, retry semantics, and
logging, and that `group_brackets.py` v1.0 did not implement its own spec.

Use instead:

- `build/README.md` — how to run the phases, tool notes (Codex / Cline /
  Hermes+Codex), global invariants.
- `build/phase_0_environment.md` — prerequisites (exiftool is NOT installed on
  this machine), config, folder tree, frozen-core verification.
- `build/phase_1_intake_ingest.md` — `classify_sets.py`, `ingest_exports.py`,
  `status.py`.
- `build/phase_2_submission.md` — `submit_edits.py` (Gemini vertex/ai_studio +
  OpenAI fallback, unified retries, budget cap, binary-stripped logging).
- `build/phase_3_qa.md` — `qa_gate.py` (per-category stage 1 + 4-image judge).
- `build/phase_4_finalize_deliver.md` — `finalize.py`, `deliver.py`,
  end-to-end dry run, operator README.

`skills/photo-pipeline/scripts/group_brackets.py` (v1.1) is frozen and tested;
the phases call it as specified. Run phases in order, one per coding-agent
session, each gated by its acceptance tests.
