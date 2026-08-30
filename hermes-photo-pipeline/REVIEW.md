# Adversarial Review — Hermes Photo Pipeline (plan + assets)

**Status 2026-07-19 (v1.1): APPLIED.** Sections A–E were implemented across
ARCHITECTURE.md v1.1, SKILL.md, BENCHMARK.md, config.example.json,
qa_rubric.md, metadata_args.txt, benchmark_scoresheet.csv, and
group_brackets.py v1.1 (with tests/test_group_brackets.py). The build is now
specified as the phased prompt package in `build/` (phases 0–4), which
supersedes the old IMPLEMENTATION_PROMPT.md. Kept open for the operator:
Vertex-vs-AI-Studio credit confirmation, MLS DigitalSourceType policy check,
and the cash decision on the GPT benchmark arm.

Reviewed 2026-07-19 against: ARCHITECTURE.md, IMPLEMENTATION_PROMPT.md, BENCHMARK.md,
benchmark_scoresheet.csv, skills/photo-pipeline/** (SKILL.md, group_brackets.py,
references/*). Vendor claims checked against live sources the same day; Photomator
claims checked against the installed app on this Mac (Photomator 3.4.14, macOS 27.0).

**Verdict:** Sound skeleton, honest about Photomator, and most vendor claims check
out — but there is one load-bearing factual error (the $300 credits are Google, not
OpenAI), several places where the shipped script does not implement its own spec, a
QA blind spot on window views, and one Day-1 hard dependency missing from this Mac.
Do not hand IMPLEMENTATION_PROMPT.md to a coding agent until Section D is resolved.

---

## A. The corrected premise: $300 of GOOGLE credits, not OpenAI

The plan assumes $300 of OpenAI credits in at least four places:

- ARCHITECTURE.md §2: "Your $300 of OpenAI credits are worth more elsewhere: they
  fund the GPT side of the benchmark (~$15 to $30) plus the QA vision judge… for
  many months."
- ARCHITECTURE.md §6: "your $300 OpenAI balance is never touched by production
  edits, only QA/classification (~$1.60/month) and the benchmark."
- BENCHMARK.md: goal "under $40 total ($15–30 of it from the $300 OpenAI credit)"
  and "Leftover credit funds the QA judge in production for a long time."
- DESIGN consequence: the QA judge + category classifier are specced as an "OpenAI
  mini vision model" precisely because those credits were assumed to exist.

Consequences of the correction:

1. **Production edits (~$28/mo at 8 listings) bill to Google.** Good — that's where
   the credits are. But confirm what the credits actually are: $300 is the signature
   of the **Google Cloud free-trial credit (typically 90-day expiry)**, which spends
   against **Vertex AI**, not necessarily AI Studio Gemini API keys. If so, wire
   `submit_edits.py` to the Vertex AI endpoint for Nano Banana 2, and note the
   expiry — the "funds the QA judge for many months" line dies if credits lapse
   in 90 days.
2. **QA judge + classifier should move to a Gemini Flash-class model** so all
   recurring spend sits on the same Google bill/credits. Keeping an OpenAI judge
   means real cash spend forever. After the switch, `OPENAI_API_KEY` becomes
   optional (benchmark/fallback only) — `config.example.json` currently lists both
   keys as unconditionally required.
3. **The GPT Image 2 benchmark arm ($15–30) becomes out-of-pocket cash.** Decide
   consciously: pay it, shrink the GPT arm (e.g., score only the 10 hardest sets),
   or benchmark NB2 vs NB Pro instead and treat GPT Image 2 as an optional
   challenger later.
4. Naming check: the comparison is **GPT Image 2 vs Nano Banana 2** — not the 2019
   text model "GPT-2". The docs are internally consistent on this; just keep the
   shorthand out of written specs.

---

## B. Vendor claims — verified today

| Claim in docs | Status |
|---|---|
| Nano Banana 2 = Gemini 3.1 Flash Image | **Real.** Also note Nano Banana 2 Lite (`gemini-3.1-flash-lite-image`, ~$0.034/1K) launched 2026-06-30 |
| NB2 $0.067/1K, $0.101/2K, $0.151/4K | **Consistent with Google list pricing** (resellers quote ~20% below list: $0.0538/$0.0806/$0.1210 → list ≈ your numbers) |
| NB Pro $0.134 @2K | Confirmed |
| GPT Image 2 real, released 2026-04-21 | Confirmed |
| GPT Image 2 $8/M image in, $30/M image out | Confirmed against openai.com/api/pricing |
| `gpt-image-1` shuts down 2026-10-23 | **Confirmed** (OpenAI deprecation notice, April 2026) |
| Gemini Batch mode 50% off, ≤24h | Confirmed for the Nano Banana image family |
| "OpenAI Batch discount unclear" | **Outdated** — OpenAI Batch API advertises 50% off all models; verify image-endpoint eligibility, but the doc undersells it |
| GPT Image 2 "Max output 2K class" | **Contested** — multiple sources list GPT Image 2 up to 4K. Irrelevant to a 2K-delivery benchmark, but fix the table |
| NB2 "10 RPM free tier" | Plausible, but irrelevant: with credits you'll be on paid tier. Verify paid RPM in your project |

Two pricing-internal inconsistencies to flag rather than fix by fiat:

- The GPT cost row (~$9–14/listing @2K high) contradicts the table's own note
  ("~$0.21 high @1K, 2K scales roughly with pixels" → ~$0.84/image → ~$25/listing).
  The benchmark resolves this — label the row as soft, which the doc already half-does.
- `budget.max_usd_per_job: $12` is comfortable for the NB2 route (~$3.55/listing)
  but the GPT route can hit it mid-job and halt with a half-edited listing. Make
  the cap route-aware or raise it.

Also: `config.example.json` already contains a pinned `gpt-image-2-2026-04-21`
string while the same file (correctly) tells you to PIN exact model strings at
build. Dated-variant naming for gpt-image-2 is unverified — replace with a
PIN_ placeholder so the coding agent doesn't copy it blindly.

---

## C. Photomator capability map — verified on this machine (v3.4.14)

- **No AppleScript dictionary.** No `.sdef` in the bundle. `NSAppleScriptEnabled=true`
  buys only the required-suite verbs (open/print/quit) — i.e., nothing beyond what
  `open -a Photomator` already gives you. Tier B claim holds.
- **No Shortcuts actions.** No App Intents / AppShortcuts provider, no SiriKit
  intent extensions in the bundle. Tier B claim holds today; re-check after updates.
- **One extra sanctioned ingress the plan misses:** Photomator ships a Share
  extension ("Add to Photomator") — Finder/Photos → Share menu can hand it files.
  Optional Tier-A nicety alongside `open -a`.
- **Batch Editing** is a real, documented Photomator feature (Apple support doc).
  Tier A claim holds.
- **Pixelmator Pro AppleScript claim: TRUE** (full scripting dictionary since
  v1.8, Sept 2020, built with Sal Soghoian) — the doc's parenthetical is accurate.
  Note Pixelmator Pro is *not* installed on this Mac (Photomator and Luminar Neo are).
- Conclusion: the "no invented Photomator API" discipline is honored and accurate.
  Keep Tier C (Accessibility UI scripting) off in v1 — correct call.

---

## D. Critical defects (fix before build)

1. **exiftool is not installed on this Mac — Day 1 fails immediately.**
   `group_brackets.py` shells out to `exiftool`; `finalize` needs it too; no doc
   lists it as a prerequisite, and there is no environment-setup section anywhere
   (venv, `pip install pillow jsonschema requests`). Add a Day-0 prerequisites
   block: `brew install exiftool`, Python 3.11+ venv, deps.
2. **Drone media can't enter the pipeline.** `RAW_EXT = {".arw"}` and intake
   rejects any non-ARW file. DJI drones shoot `.dng`. The plan has drone prompts,
   drone QA rules, and drone benchmark sets — but the front door refuses drone
   files. Allow `.dng` (and document supported RAW types) or confirm a Sony-only
   world that doesn't exist.
3. **Multi-camera clustering breaks.** EXIF `-Model` is read and never used. One
   job mixes the ground body and the drone; unsynced clocks + one merged
   timestamp-sorted stream → bogus 4–6-frame clusters → mass quarantine. Cluster
   per camera model first, then by time gap.
4. **The advertised EV-pattern validation does not exist.** ARCHITECTURE §5
   promises "{-2, 0, +2} within ±0.7 EV tolerance"; `config.example.json` ships
   `ev_tolerance: 0.7`; `group_brackets.py` never checks any of it — any 3-frame
   cluster becomes a set, even 3 identical exposures. Implement the check or
   delete the claim and the config key.
5. **The "high confidence" path rarely fires with real Sony brackets.** In-camera
   AEB varies shutter speed while the ExposureCompensation tag stays constant, so
   the EC path fails its distinctness test and everything falls to `ev100_fallback`
   flagged `low_confidence` — crying wolf at the operator on every job. EV100 with
   ~2-stop spacing *is* high confidence; recalibrate the confidence semantics.
6. **The QA judge cannot verify what it's asked to verify.** Judge input = middle
   frame + result, but the rubric's INVENTED_VIEW check requires knowing the real
   window view — which is blown out in the middle frame and only exists in the
   dark frame. Send all three brackets (or dark frame + result). Still sub-cent.
7. **The category classifier is an unowned, unspecced API call.** SKILL.md stage 1
   sends "the middle frame" to a vision model at intake — but at intake the frames
   are RAWs; nothing renders a preview (`exiftool -b -PreviewImage` / sips /
   libraw). No classify script is in the build list, and `overrides.json`'s shape
   is documented nowhere. The implementation prompt says money-touching code must
   be built deliberately — this one slipped through.
8. **"Log the full API response" will bloat the log to ~100 MB/listing.** Gemini
   responses embed the image as base64 inline data. Spec must say: strip binary
   payloads from anything logged or saved; record usageMetadata, sizes, hashes.
9. **Retry semantics are off by one, in three directions.** ARCHITECTURE says "one
   strict retry, second fail → exception" (2 submissions); SKILL/config
   `max_attempts: 2` yields 3 submissions (attempts 0, 1, 2); the backoff list has
   3 delays for "max 2 retries"; ARCHITECTURE's per-set states `retry_1`/`retry_2`
   are dead (SKILL re-queues to `queued` + attempt++); the `sent` state is never
   assigned. Pick one model and propagate it to all docs + the cost table's
   "Retries ~10%" assumption.
10. **Delivery can go half-live.** `deliver.py` runs the R2 handoff per variant;
    if branded succeeds and unbranded fails 3×, the job is "staged + alert" but one
    variant is already public — the doc's own "never partial-deliver" rule is
    violated in spirit. Gate DELIVERED on both handoffs exiting 0 and define the
    rollback.
11. **Collision handling desyncs state from disk.** `safe_move` renames on
    collision (`DSC01234-<hash8>.ARW`) but `sets.json` keeps the original basename,
    so ingest matching and finalize's `-tagsFromFile` source lookup break. Write
    the renamed path back into state.
12. **Stages aren't actually idempotent on re-run.** State files are written before
    file moves; crash mid-move → re-run hits missing sources → `copy2` raises. Guard
    moves with existence checks keyed to current state.
13. **`sequence_guess` EV labels are likely wrong exactly when you can least afford
    it.** The last-resort path labels shot order as [-2, 0, +2]; Sony AEB typically
    fires 0, -2, +2 (menu-dependent). Quarantine instead of guessing.
14. **ARCHITECTURE's own example `edit_request.json` fails its own schema** —
    `created_at` is required by `edit_request.schema.json` and absent from the §5
    example.

## E. Moderate / nits

- Job-ID regex: ARCHITECTURE `^\d{8}_[a-z0-9-]+$` vs `^\d{8}[_-][a-z0-9-]+$`
  everywhere else (SKILL, schema, script). Pick one.
- §4 says Photomator export EXIF is "how Hermes re-matches brackets"; SKILL and
  the implementation prompt match by basename. Drop the EXIF-matching claim
  (basename is the contract) — and then "metadata ON" is only needed if you want
  belt-and-braces, since finalize pulls capture EXIF from the RAW anyway.
- Clusters of 6/9 (back-to-back brackets in continuous drive within 2.5 s) are
  quarantined wholesale. Split into consecutive triplets; quarantine only the
  remainder.
- ingest "exit 2 on missing exports" collides with group_brackets' convention
  where 2 = ok-with-quarantines (1 = fatal). Use 1, or define codes per script.
- No near-duplicate threshold in config (clip thresholds are there; this one isn't).
- QA stage-1 white-clip ≤0.5% will false-fail bright exteriors; SKILL carves out
  "drone-sky" only. Make clip thresholds per-category.
- Branded vs unbranded: `deliver.py` copies the same finals into both variants —
  branding must live in the existing R2 pipeline. Confirm that explicitly or the
  two variants are byte-identical.
- sha256 provenance: sets.json hashes RAWs, edit_request hashes queue JPEGs,
  manifest hashes finals. Fine — but say so, so QA never compares across kinds.
- BENCHMARK: at n=20, "<5% hard-fail rate" means zero hard fails allowed (1/20 =
  5%); state that. The consistency-pair metric has no decision gate — orphan.
  `benchmark_scoresheet.csv` ships 1 stub set; prefill all 20 sets × A/B.
  "temperature/default settings" — gpt-image edits has no temperature parameter.
- Disclosure stance: tagging a **generative-model** blend as IPTC
  `algorithmicallyEnhanced` is arguably under-disclosure — Nano Banana / GPT Image
  re-render pixels rather than mathematically blending them. Many MLS AI policies
  (2025–26) expect disclosure of any AI-edited listing photo regardless of
  "exposure only". Consider `trainedAlgorithmicMedia` as the default and confirm
  with your MLS's current rules before baking in the lighter tag.
- Gemini outputs carry **SynthID** and may carry C2PA content credentials. Decide
  deliberately whether finalize preserves C2PA manifests (good for MLS provenance)
  rather than letting the metadata rewrite decide by accident.
- `__pycache__/group_brackets.cpython-310.pyc` — tested under Python 3.10 while
  the implementation prompt demands 3.11+; also don't ship `__pycache__`.
- Data hygiene: sending client interiors to any third-party API — with Google
  credits presumably on the paid/Vertex lane (no training on inputs). Confirm the
  lane; add a line to your client agreement covering AI-assisted processing.

## F. What the plan gets right — keep it

- The one-line design (Hermes owns files/JSON/HTTP/state; Photomator owns taste;
  watched-folder contracts) is the correct architecture for a no-API editor.
- Two deliberate human checkpoints (preset/export, final approve) — right risk
  posture for client deliverables and money.
- copy-verify-delete moves, never-overwrite, atomic state writes, append-only log,
  exit-code discipline — the right skeleton.
- Model selection is evidence-based and the verified numbers hold up; pinning
  exact model strings at build time is the right anti-hallucination guard.
- Prompt set (base/strict per category), hard-fail rubric, two-stage QA with the
  cheap checks first — well constructed.
- Benchmark method (frozen sets, blind A/B with a kept key, hard-fail zeroing,
  actual cost pulled from dashboards) is genuinely rigorous for $40.

## Recommended deltas, in order

1. Re-wire provider economics for Google credits: Gemini judge + classifier;
   Vertex-vs-AI-Studio credit check; rewrite BENCHMARK budget; make OPENAI_API_KEY
   optional.
2. Add Day-0 prerequisites (exiftool, venv, deps).
3. Amend "do not refactor group_brackets.py" — the script doesn't implement its
   own spec: `.dng`, per-model clustering, EV-tolerance (or remove the claim),
   collision reconciliation, idempotent re-runs, cluster splitting, quarantine
   instead of sequence-guess.
4. Judge input = all three frames.
5. Add a classify step (RAW preview render → vision call → apply overrides) to
   the build list; document `overrides.json`.
6. Align retry semantics + state vocab across ARCHITECTURE / SKILL / impl prompt /
   config; fix the §5 example to include `created_at`.
7. Strip-binary rule for all logging; usageMetadata + hashes only.
8. Decide the DigitalSourceType default with your MLS; preserve C2PA on purpose.
