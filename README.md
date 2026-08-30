# Lakeshore REP Edit

Local stills pipeline for Lakeshore Listing Media. Pixel prompts are frozen in
`prompts/imagine-shot-prompts.md`. The console inspects ingest, classification,
and Imagine edits. Photo-to-video, parcel outlines, and gallery-wide generative
matching are out of scope.

## Frozen files

| File | Role |
| --- | --- |
| `prompts/imagine-shot-prompts.md` | Only text sent to Imagine (shot + keep-clause) |
| `prompts/source-short.md` | Proven short pack, human reference |
| `prompts/source-long-REFERENCE-ONLY.md` | QC language and disclosure labels. Never send to Imagine. |
| `schemas/job.schema.json` | `job.json` shape |

## Workflow

1. Ingest a folder of Sony JPEGs (`scripts/ingest.py`).
2. Group 3-EV interior stacks as middle / dark / bright using EXIF
   `ExposureBiasValue` + `DateTimeOriginal` + filename sequence. If EXIF is
   stripped, fall back to sequence + same-scene luma (never invent a view).
3. Classify into the listed conditions only. If uncertain, skip and flag.
4. Build one Imagine prompt = shot prompt + sticky keep-clause.
5. Call Grok Imagine **edit** (JSON, not OpenAI multipart).
6. Write versioned outputs (`*_v001.jpg`). Never overwrite finals.
7. Write a sidecar JSON next to each output.

## Install

```bash
pip install -r requirements.txt
```

## Dry-run (no API)

```bash
python scripts/make_dry_run_fixture.py fixtures/dry-run-9jpeg
python scripts/ingest.py fixtures/dry-run-9jpeg --job-id dry-run --out jobs/dry-run/job.json
python scripts/run_job.py jobs/dry-run/job.json --dry-run
```

Nine JPEGs become the Codex six-stack test: two interior HDR stacks, two
exteriors, two virtual-twilight candidates, plus one drone still. No Imagine
call. Sidecars land in `jobs/dry-run/outputs/*_v001.json`.

## Live run

Requires `XAI_API_KEY`. Middle frame is geometry authority. Attach order for
HDR is always middle, dark, bright. Twilight is time-of-day only.

```bash
python scripts/ingest.py jobs/live-9/inbox --job-id live-9 --out jobs/live-9/job.json
python scripts/run_job.py jobs/live-9/job.json
```

Proven on the last nine Sony stills: 7 live 2K edits, 2 duplicate exposures
skipped. Outputs in `jobs/live-9/outputs/*_v001.jpg`.

Single-item re-run:

```bash
python scripts/run_job.py jobs/dry-run/job.json --item ext-01
```

## Mac Mini / Grokbot / Drive

This is a local Python client. Imagine is the only network call.

| How | What you run |
| --- | --- |
| Mac Mini | `python scripts/watch_inbox.py ~/rep-edit/inbox --out ~/rep-edit/out` |
| Drive drop | rclone the inbox in, rclone the out folder back |
| Grokbot / Hermes | same `ingest.py` + `run_job.py` + `XAI_API_KEY` |
| This preview | already the live desk |

```bash
# one-shot from a card dump
python scripts/ingest.py ~/rep-edit/inbox --job-id shoot --out ~/rep-edit/out/job.json
python scripts/run_job.py ~/rep-edit/out/job.json

# poll a folder (settles 8s after the last JPEG lands)
python scripts/watch_inbox.py ~/rep-edit/inbox --out ~/rep-edit/out --interval 30

# Drive in / Drive out (rclone remote named Drive)
rclone sync "Drive:rep-edit-inbox" ~/rep-edit/inbox
python scripts/watch_inbox.py ~/rep-edit/inbox --out ~/rep-edit/out --once
rclone copy ~/rep-edit/out "Drive:rep-edit-out"
```

Needs: Python 3.10+, `XAI_API_KEY`, optional rclone. It will not run fully offline —
edits POST to `api.x.ai`. Classification, grouping, and naming all run on the Mini.

## Live API shape (do not change)


```bash
curl -X POST https://api.x.ai/v1/images/edits \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $XAI_API_KEY" \
  -d '{
    "model": "grok-imagine-image-2.0",
    "prompt": "<shot prompt + keep-clause>",
    "aspect_ratio": "3:2",
    "resolution": "2k",
    "images": [
      { "type": "image_url", "url": "data:image/jpeg;base64,..." }
    ]
  }'
```

One image: you may also send a single `"image": { "url": "...", "type": "image_url" }`.
Three-bracket HDR: send middle, dark, bright as `images[0..2]`.

Do not use OpenAI multipart `images.edit()` against api.x.ai.

## Provider interface

```python
def edit(images: list[Path], prompt: str, out_path: Path) -> Path: ...
```

`providers/grok.py` is live. `providers/codex.py` is a stub with the same
signature. Swap later with `--provider codex`.

To run this on your own domain (Cloudflare Worker, VPS, or the edit desk),
copy `rep_edit/`, `providers/`, `scripts/`, `prompts/`, and `schemas/`. Set
`XAI_API_KEY` as a secret. The Worker just POSTs JSON to
`https://api.x.ai/v1/images/edits` — same body as the curl above. 2K
three-frame HDR payloads need a paid Worker request-size limit.

## Conditions

`interior_hdr` · `interior_single` · `exterior_single` · `virtual_twilight` ·
`drone` · `object_remove` · `declutter` · `yard_cleanup` · `window_pull` ·
`skipped`

Do not invent extra conditions. Prefer skip + flag over a guessed window view
or a guessed parcel line. Preserve Sony 3:2. Do not crop to 16:9 / 4:3 / square.

## Brief overrides

Optional `brief.json` in the source folder:

```json
{
  "twilight_from_exteriors": true,
  "object_remove": { "DSC00010.JPG": ["trash bin", "hose"] },
  "declutter": ["DSC00011.JPG"],
  "yard_cleanup": ["DSC00012.JPG"],
  "window_pull": [{ "interior": "DSC00001_INT_A_m.jpg", "dark": "DSC00002_INT_A_d.jpg" }]
}
```

## Tests

```bash
python -m unittest tests.test_rep_edit -v
```
