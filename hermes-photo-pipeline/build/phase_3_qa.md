# Phase 3 — QA gate

Read `build/README.md`, `ARCHITECTURE.md` §5 (QA gate), and
`skills/photo-pipeline/SKILL.md` stage 4 first. Work from the
`hermes-photo-pipeline/` repo root.

## Build `skills/photo-pipeline/scripts/qa_gate.py`

For each set in state `returned`:

1. **Stage 1 (free, Pillow, no tokens):** result decodes as JPEG; long edge ≥
   requested −64px; aspect ratio within 2% of the source middle frame; not
   grayscale; highlight/shadow clipping under the PER-CATEGORY thresholds in
   config `qa.clip`; not near-duplicate of any input frame — mean absolute
   difference against each 256px-downscaled input must EXCEED
   `qa.near_duplicate_max_mean_abs_diff`. Any stage-1 failure → set →
   `qa_fail` WITHOUT calling the judge (log which check failed).
2. **Stage 2 (vision judge, one call per photo):** send ALL THREE source
   brackets (dark, middle, bright, in that order, each downscaled ≤1024 long
   edge) + the result + the judge system prompt from
   `references/qa_rubric.md` to the config `models.qa_judge` model,
   temperature 0, strict JSON. Unparsable response → retry once → then set →
   `exception` (reason `judge_unparsable`). Verdict rule: pass = no hard_fails
   AND mean ≥ `qa.min_mean_score` AND no axis < `qa.min_axis_score`.
3. Route: pass → hardlink result into `50_qa/<job>/pass/`, set → `qa_pass`,
   store the verdict JSON beside it. Fail → copy result + verdict JSON into
   `50_qa/<job>/fail/`, set → `qa_fail`; then, per the unified retry semantics:
   if `retry.attempt + 1 < retry.max_attempts`, re-queue — set → `queued`,
   `retry.attempt += 1`, `prompt_profile` switched to the `_strict` variant
   (regenerate that set's `edit_request.json` in place — state files are the
   one exception to never-overwrite; log the regeneration); else set →
   `exception` with the verdict as the reason.
4. When no set remains in `sent`/`queued`: job → `QA_DONE` and print the human
   approve instructions (review `50_qa/<job>/pass/`; respond "approve all" or
   list sets to remove).
Flags: `--job`, `--root`, `--dry-run`.

## Acceptance tests — add to `tests/test_pipeline.py` (mock ALL HTTP)

- undersized image fails stage 1 and the judge mock is NEVER called.
- blown-highlight interior image (synthesize with Pillow: >0.5% pure white)
  fails stage 1; the SAME image in an exterior set passes the exterior
  threshold — proves per-category clip config is wired.
- near-duplicate: result = middle frame re-saved → fails the near-dup check.
- judge hard_fail → set re-queued to `queued` with `attempt+1` and `_strict`
  profile; second hard_fail (attempt now at max) → `exception`.
- judge pass → hardlink exists in `50_qa/pass/`, set → `qa_pass`, verdict JSON
  stored.
- unparsable judge JSON twice → `exception` with reason `judge_unparsable`,
  exactly two judge calls made.
- the judge mock asserts it received FOUR images (3 brackets + result) in
  dark→bright→result order.

## Done when

Full test suite green. Print a sample verdict JSON and the stage-1 check list
with the thresholds used, and stop.
