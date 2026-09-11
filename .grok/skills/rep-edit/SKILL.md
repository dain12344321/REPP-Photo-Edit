---
name: rep-edit
description: >
  Lakeshore Listing Media MLS stills pipeline. Ingest Sony JPEG cards and DJI
  dumps, group 3-EV HDR stacks, classify, and call Grok Imagine image-edit
  (not text-to-image) at 3:2 / 2K. Use when editing listing photos, running
  a card dump, delivering Grok_2K stills, or restoring the frozen Imagine pack.
---

# Lakeshore REP Edit

Pixel prompts are frozen in `prompts/imagine-shot-prompts.md` (version
`2026-09-11-window-truth`). Never send `prompts/source-long-REFERENCE-ONLY.md`
to Imagine.

## Do

1. Read `prompts/imagine-shot-prompts.md` before any Imagine call.
2. Append the sticky keep-clause to every still prompt (the pack already does this via `KEEP-CLAUSE`).
3. Group 3-EV interiors as middle / dark / bright from EXIF `ExposureBiasValue` + `DateTimeOriginal` + filename. If EXIF is stripped, fall back to sequence + same-scene luma.
4. Classify into listed conditions only. If uncertain, skip and flag.
5. Call **image edit**, not text-to-image. Middle frame is geometry. Attach order for HDR is always middle, dark, bright.
6. Version outputs (`*_v001.jpg`). Never overwrite finals.
7. Write stills into `Grok_2K` under **DELIVERED CLIENT ASSETS (by Property)**. Leave original `MLS Listing Photos/` untouched.

## Do not

- Invent a view through frosted, privacy, reeded, or obscured glass.
- Paint scenery outside a window opening.
- Recover a Lisa window pool unless the dark frame actually contains a readable exterior through that pane.
- Draw property outlines / lot boxes.
- Change aspect ratio away from Sony 3:2.
- Run `hermes-photo-pipeline/` for MLS stills (Photomator comparison only).
- Call Imagine in a loop on page load. User-initiated, one shot at a time, one retry max.

## API

| | |
|---|---|
| Endpoint | `POST https://api.x.ai/v1/images/edits` |
| Model | `grok-imagine-image-2.0` |
| Auth | `Authorization: Bearer $XAI_API_KEY` |
| Body | JSON. Local files as `data:image/jpeg;base64,...` |
| Max inputs | 3 (HDR: middle, dark, bright) |
| Aspect / res | `"3:2"` / `"2k"` |
| Response | `response_format: "b64_json"` |

Implementation: `providers/grok.py`. Do **not** use OpenAI multipart `images.edit()` against `api.x.ai`.

Hermes native Imagine tools (OAuth / session) may be used only if they accept the same frozen prompt + reference images. Prefer `providers/grok.py` with `XAI_API_KEY` so the pack stays identical.

## Commands

```bash
python3 -m pip install -r requirements.txt
export XAI_API_KEY=xai-...
python3 scripts/ingest.py inbox --job-id listing --out jobs/listing/job.json
python3 scripts/run_job.py jobs/listing/job.json
# or
python3 scripts/watch_inbox.py inbox --out jobs/listing --once
```

Drive in/out with rclone. See `FOLDERS.md` and `SNAPSHOT.md`.

## Window truth (2026-09-11)

Bathroom frosted glass was the failure mode of the previous pack. The keep-clause now locks privacy glass. Score every interior for: real view only, no invented trees/water/sky behind frosted panes, no scenery painted outside the frame.
