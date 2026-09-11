---
name: rep-edit
description: >
  Lakeshore Listing Media MLS stills pipeline. Ingest Sony JPEG cards and DJI
  dumps, group 3-EV HDR stacks, classify, and call Grok Imagine image-edit
  (not text-to-image) at 3:2 / 2K medium. Use when editing listing photos, running
  a card dump, delivering OUTBOX stills, or restoring the frozen Imagine pack.
---

# Lakeshore REP Edit

Read `INSTRUCTIONS.md` first. Pixel prompts are frozen in
`prompts/imagine-shot-prompts.md` (version `2026-09-11-2k-texture`).
Never send `prompts/source-long-REFERENCE-ONLY.md` to Imagine.

## Do

1. Read `prompts/imagine-shot-prompts.md` before any Imagine call.
2. Append the sticky keep-clause to every still prompt (the pack already does this via `KEEP-CLAUSE`).
3. Group 3-EV interiors as middle / dark / bright from EXIF `ExposureBiasValue` + `DateTimeOriginal` + filename. If EXIF is stripped, fall back to sequence + same-scene luma.
4. Classify into listed conditions only. If uncertain, skip and flag.
5. Call **image edit**, not text-to-image. Middle frame is geometry. Attach order for HDR is always middle, dark, bright.
6. Preflight inputs to long-edge 2048 JPEG q=95. Request `quality=medium` and `resolution=2k`. Verify output long edge ≥ 1920.
7. Version outputs (`*_v001.jpg`). Never overwrite finals.
8. Write stills into the listing folder under **OUTBOX**. Leave INBOX untouched.

## Do not

- Use any model other than `grok-imagine-image-2.0`. No 1.0, no quality slug, no nano-banana, no FAL, no `hermes-photo-pipeline/` for MLS stills.
- Say “window pool.” Models draw a swimming pool. Say “window view” or “exterior view.”
- Invent a view through frosted, privacy, reeded, or obscured glass.
- Paint scenery or water outside a window opening.
- Recover a Lisa window view unless the dark frame actually contains a readable exterior through that pane.
- Smear carpet or paint grass.
- Draw property outlines / lot boxes.
- Change aspect ratio away from Sony 3:2.
- Call Imagine in a loop on page load. User-initiated, one shot at a time, one retry max.
- Publish a Hermes zip or music zip on the public site.

## API

| | |
|---|---|
| Endpoint | `POST https://api.x.ai/v1/images/edits` |
| Model | `grok-imagine-image-2.0` |
| Quality | `medium` |
| Auth | `Authorization: Bearer $XAI_API_KEY` |
| Body | JSON. Local files as `data:image/jpeg;base64,...` |
| Max inputs | 3 (HDR: middle, dark, bright) |
| Aspect / res | `"3:2"` / `"2k"` |
| Response | `response_format: "b64_json"` |

Implementation: `providers/grok.py`. Do **not** use OpenAI multipart `images.edit()` against `api.x.ai`.

## Drive

| | ID |
|---|---|
| INBOX (cards) | `1LidXBZXZW_m5c_J1xXjdHnjnwvgat8lZ` |
| OUTBOX (delivered) | `1-W86toL_viRDEoyXX5JMR0ab68g2x62G` |

See `FOLDERS.md`. Gold look: Wanatah OUTBOX.

## Commands

```bash
python3 -m pip install -r requirements.txt
export XAI_API_KEY=xai-...
python3 scripts/ingest.py inbox --job-id listing --out jobs/listing/job.json
python3 scripts/run_job.py jobs/listing/job.json
# or
python3 scripts/watch_inbox.py inbox --out jobs/listing --once
```

## Window truth (2026-09-11-2k-texture)

Bathroom frosted glass and the phrase “window pool” were the failure modes.
Keep privacy glass. Never invent water. Score every interior for: real view
only, no invented trees/water/sky behind frosted panes, no scenery painted
outside the frame, carpet/grass still textured, long edge ≥ 1920.
