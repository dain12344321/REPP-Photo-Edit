# Provider Benchmark: Nano Banana 2 vs GPT Image 2

Goal: pick the production bracket editor with evidence, in one week.
Budget reality (v1.1, corrected): the $300 credits are **Google**, so the
Nano Banana side costs ~$3–6 of credits. The GPT Image 2 side (~$10–25) is
**cash** — decide consciously. Zero-cash alternative: benchmark Nano Banana 2
vs Nano Banana Pro instead and leave GPT Image 2 as a configured-but-untested
fallback.

## Test set (frozen before any scoring)

From 2–3 delivered past listings, pick 20 bracket sets and export them through
the normal Photomator preset step so inputs match production:

- 10 interior (set_001–set_010): 4 hard cases (bright window with a view worth
  keeping, mixed tungsten/daylight WB, dark room needing +3 stops, large
  mirror), 6 typical.
- 6 exterior (set_011–set_016): 2 with dull/blown skies (sky ENHANCE only; no
  replacement in the benchmark), 4 typical.
- 4 drone (set_017–set_020): 1 with visible inter-frame drift.

Also mark 3 "consistency pairs": two sets from the same room/elevation, to
score batch consistency.

## Protocol

Round 1 — prompt tuning (6 sets, 3 per category mix): iterate each provider's
prompt independently until its output stops improving. Max 3 iterations per
provider. Freeze both prompts. Record final prompts in this file.

Round 2 — scored run (all 20 sets): both providers, same inputs, 2K long edge,
default settings (note: gpt-image edits has no temperature parameter; Gemini
does — leave both at defaults), one attempt each (no retries; failures score 0).
Log per set: request time, wall-clock latency, HTTP result, and afterwards pull
actual cost from each usage dashboard (this is the real GPT Image 2 number the
estimates can't give you).

Blind scoring: rename outputs to `set_NNN_A.jpg` / `set_NNN_B.jpg` with A/B
randomly assigned per set (Hermes does the shuffle and keeps the key). View
pairs full screen at 100% zoom. Fill `benchmark_scoresheet.csv` (prefilled for
all 20 sets × A/B) for every image: seven axes 1–5, hard-fail codes from
`qa_rubric.md`. Note: axis 7 (`sharpness_100pct`) is human-scored only — the
automated QA judge scores six axes. Any hard fail zeroes the image. Score the
3 consistency pairs on whether the two same-room results look like the same
editor's work.

## Metrics and decision

Per provider: mean score per axis; % usable-without-rework (no hard fail, mean
≥3.5); hard-fail rate; mean latency; actual cost per image; max delivered
resolution.

Decision gate:
1. A provider must hit ≥90% usable-without-rework AND a hard-fail rate of
   **zero** — at n=20, one hard fail is exactly 5%, which fails the "<5%" bar.
   Treat the gate as: 18/20 usable AND 0 hard fails.
2. If both pass: lower actual cost per image wins (expected: Nano Banana 2).
3. If only one passes: it wins regardless of cost.
4. If neither passes: revise the failing prompt once, rerun Round 2 on the 10
   worst sets; if still failing, benchmark Nano Banana Pro on those 10 before
   reconsidering the whole approach.
5. Consistency pairs: if either provider's same-room pairs do not read as the
   same editor's work, record it as a consistency risk. Not disqualifying on
   its own, but it breaks ties.

Whatever wins, keep the loser configured as `fallback_provider` and rerun this
benchmark when either vendor ships a new image model (roughly quarterly).

## Budget

- Nano Banana 2: ~26 runs (tuning + scored) × $0.101 @2K ≈ $3–6 — Google credits.
- GPT Image 2: ~26 edit runs at high quality ≈ $10–25 depending on dynamic
  token count (the point is to measure it) — **cash, your call**. Substitute
  Nano Banana Pro (~$3.50, credits) for a zero-cash benchmark.
- Production QA judge/classifier is a Gemini Flash-class model (sub-cent per
  photo, ~$0.20 per listing) — also Google credits.
