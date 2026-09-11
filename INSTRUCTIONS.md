# Lakeshore REP Edit — operator instructions

This is the production instruction set. Follow it as written. Do not paraphrase
a chat message into a prompt. Do not invent extra conditions.

## What this pipeline is

Lakeshore Listing Media stills: a Sony JPEG card (optional DJI dump) in, MLS
stills out. One model, one resolution, one prompt pack.

| | |
|---|---|
| Model | `grok-imagine-image-2.0` only |
| Call | `POST https://api.x.ai/v1/images/edits` (image-edit, never text-to-image) |
| Quality | `medium` (never omit, never `low`, never `auto`) |
| Resolution | `2k` (2048 px on the long edge). Verify. Reject a 1K stand-in. |
| Aspect | `3:2` — the Sony frame. Do not crop to 16:9 / 4:3 / square. |
| Auth | `Authorization: Bearer $XAI_API_KEY` |
| Inputs | 1–3 JPEGs. HDR attach order is always middle, dark, bright. |
| Prompts | `prompts/imagine-shot-prompts.md` only. Append the sticky keep-clause. |

Gold look: the **Wanatah** hand-edited Imagine set in OUTBOX
(`405 N Main St, Wanatah IN, 46390`). Color, punch, Lisa window treatment,
AutoHDR Classic. That look at **true 2K**, not the 1700-px files that slipped
through earlier runs.

Texture floor: Jefferson / Marietta gold stills (3000×2000) — carpet weave and
grass blades stay photographic. If the floor looks painted or the lawn looks
airbrushed, the still fails.

## Drive (official)

| Role | Folder | ID |
|---|---|---|
| **INBOX** | Card dumps, one folder per listing `{Street, City, ST ZIP}` | `1LidXBZXZW_m5c_J1xXjdHnjnwvgat8lZ` |
| **OUTBOX** | Delivered client stills, one folder per listing | `1-W86toL_viRDEoyXX5JMR0ab68g2x62G` |

- INBOX is read-only source. Sony `_SA9*.JPG` (and optional DJI). Do not edit in place.
- OUTBOX is the only write target. Filename `{slug}_{nnn}_MLS.jpg` or `_VT.jpg`.
- Never overwrite an original MLS handoff folder.
- Ignore RAW (`.ARW`). JPEG stills only.
- Do not ship a music zip, Hermes zip, or pipeline zip to the client.

Current INBOX listings: `1642 Flag Ct, Crown Point, IN 46307` and
`405 N Main St, Wanatah, IN 46390`.

## Hard bans

1. **No smaller models.** Forbidden for MLS stills: `grok-imagine-image` (1.0),
   `grok-imagine-image-quality`, nano-banana, FAL, Flux, Midjourney, Photomator
   generative, `hermes-photo-pipeline/`, any chat model asked to “draw” a photo.
   Smaller models invent swimming pools in bathroom windows. That is a fail.
2. **No invented window views.** Frosted, privacy, reeded, filmed, or dark glass
   stays as photographed. Recover an exterior only when the dark bracket actually
   shows one through that pane.
3. **Never use the phrase “window pool.”** It is photographer slang. Models read
   it as a swimming pool. Say “window view” or “exterior view.”
4. **No swimming pool, pond, lake, or water** in or behind a window unless it is
   already visible in the source pane.
5. **No 1K output.** Long edge must be ≥ 1920 px. Flag anything smaller.
6. **No smeared carpet or neon grass.** Keep weave, pile, wood grain, and blades.
7. **No lot boxes, captions, watermarks, or shot numbers** on the frame.
8. **No twilight on a backyard** unless that still is the designated front-hero
   virtual twilight. Exterior sets share one daylight grade.

## Ingest

1. Read the card dump (INBOX property folder, or files dropped on the console).
2. Group 3-EV interiors as middle / dark / bright from EXIF `ExposureBiasValue`
   + `DateTimeOriginal` + filename. If EXIF is stripped, sequence + same-scene luma.
3. Classify into the listed conditions only. Uncertain → skip and flag.
   Do not guess a window view.
4. Twilight only from the designated front exteriors, one pair max unless briefed.
5. Preflight every input: RGB JPEG, long edge 2048, quality 95, 3:2 preserved.
   Do not send 6000×4000 camera files raw — the API crushes them.

## Edit

1. Build the prompt from the pack section for that condition + keep-clause.
2. Call Imagine with `model=grok-imagine-image-2.0`, `quality=medium`,
   `resolution=2k`, `aspect_ratio=3:2`, `response_format=b64_json`.
3. One shot. One retry max if architecture drifts — shorten the change clause,
   do not pile on policy.
4. Version outputs `*_v001.jpg`. Never clobber a final.
5. QC the file: 3:2, long edge ≥ 1920, no invented water, carpet/grass still
   textured, house numbers intact, no halo on windows.
6. Write the keeper into OUTBOX under that listing’s folder.

## QC score (every still)

| Check | Fail if |
|---|---|
| Geometry | Room stretched, verticals drunk, aspect not 3:2 |
| Windows | Invented trees/sky/water; frosted glass cleared; scenery painted past the frame; a swimming pool that was not there |
| Texture | Carpet smeared, grass painted, wood plastic |
| Color | Neon lawn, orange interior, fake HDR, window halo |
| Twilight | Purple sky, new fixtures, house unreadable |
| Resolution | Long edge under 1920 px |
| Truth | Architecture, furniture, or condition changed |

A dark or frosted pane is correct. An invented postcard is not.

## Website

The public console ingests a card (drag-and-drop) and links the official Drive
INBOX / OUTBOX. It does not publish a Hermes zip or a music zip. Sign in with
Grok to spend Imagine credits. Drive browse uses the viewer’s Google Drive
connection; JPEGs still drop locally — the gate does not stream a 12 MB card.

## Commands

```bash
python3 -m pip install -r requirements.txt
export XAI_API_KEY=xai-...
python3 scripts/ingest.py inbox --job-id listing --out jobs/listing/job.json
python3 scripts/run_job.py jobs/listing/job.json
# or
python3 scripts/watch_inbox.py inbox --out jobs/listing --once
```

Pixel prompts: `prompts/imagine-shot-prompts.md` version **2026-09-11-2k-texture**.
Implementation: `providers/grok.py`.
