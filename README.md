# Lakeshore REP Edit

Local stills pipeline for Lakeshore Listing Media. Pixel prompts are frozen in
`prompts/imagine-shot-prompts.md`. The console inspects ingest, classification,
and image edits. Photo-to-video, parcel outlines, and gallery-wide generative
matching are out of scope.

## Frozen files

| File | Role |
| --- | --- |
| `prompts/imagine-shot-prompts.md` | Only text sent to the editor (shot + keep-clause) |
| `prompts/source-short.md` | Proven short pack, human reference |
| `prompts/source-long-REFERENCE-ONLY.md` | QC language and disclosure labels. Never send to the editor. |
| `schemas/job.schema.json` | `job.json` shape |

## Workflow

1. Ingest a folder of Sony JPEGs (`scripts/ingest.py`).
2. Group 3-EV interior stacks as middle / dark / bright using EXIF
   `ExposureBiasValue` + `DateTimeOriginal` + filename sequence. If EXIF is
   stripped, fall back to sequence + same-scene luma (never invent a view).
3. Classify into the listed conditions only. If uncertain, skip and flag.
4. Build one edit prompt = shot prompt + sticky keep-clause.
5. Call the selected provider **edit** (JSON image-to-image, not text-to-image).
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

## Live run — xAI (default)

Requires `XAI_API_KEY`. Middle frame is geometry authority. Attach order for
HDR is always middle, dark, bright.

```bash
export XAI_API_KEY=xai-...
python scripts/ingest.py jobs/live-9/inbox --job-id live-9 --out jobs/live-9/job.json
python scripts/run_job.py jobs/live-9/job.json
```

## Live run — OpenRouter

Same pipeline, different provider. Get a key at [openrouter.ai/keys](https://openrouter.ai/keys).

```bash
export OPENROUTER_API_KEY=sk-or-...
# optional — defaults to x-ai/grok-imagine-image-quality
export OPENROUTER_MODEL=x-ai/grok-imagine-image-quality
python scripts/run_job.py jobs/live-9/job.json --provider openrouter
```

Or set `"provider": "openrouter"` in `job.json`. Other image models that accept
`input_references` also work, e.g. `google/gemini-2.5-flash-image` or
`bytedance-seed/seedream-4.5`.

```bash
curl -X POST https://openrouter.ai/api/v1/images \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  -d '{
    "model": "x-ai/grok-imagine-image-quality",
    "prompt": "<shot prompt + keep-clause>",
    "aspect_ratio": "3:2",
    "resolution": "2K",
    "output_format": "jpeg",
    "input_references": [
      { "type": "image_url", "image_url": { "url": "data:image/jpeg;base64,..." } }
    ]
  }'
```

Single-item re-run:

```bash
python scripts/run_job.py jobs/dry-run/job.json --item ext-01 --provider openrouter
```

## Mac Mini / Grokbot / Drive

This is a local Python client. The image editor is the only network call.

| How | What you run |
| --- | --- |
| Mac Mini | `python scripts/watch_inbox.py ~/rep-edit/inbox --out ~/rep-edit/out` |
| Drive drop | rclone the inbox in, rclone the out folder back |
| Grokbot / Hermes | same `ingest.py` + `run_job.py` + API key |

```bash
python scripts/ingest.py ~/rep-edit/inbox --job-id shoot --out ~/rep-edit/out/job.json
python scripts/run_job.py ~/rep-edit/out/job.json --provider openrouter
```

Needs: Python 3.10+, `XAI_API_KEY` and/or `OPENROUTER_API_KEY`.

## Provider interface

```python
def edit(images: list[Path], prompt: str, out_path: Path) -> Path: ...
```

| Provider | Module | Auth |
| --- | --- | --- |
| `grok` (default) | `providers/grok.py` | `XAI_API_KEY` → `api.x.ai/v1/images/edits` |
| `openrouter` | `providers/openrouter.py` | `OPENROUTER_API_KEY` → `openrouter.ai/api/v1/images` |
| `codex` | `providers/codex.py` | stub |

## Conditions

`interior_hdr` · `interior_single` · `exterior_single` · `virtual_twilight` ·
`drone` · `object_remove` · `declutter` · `yard_cleanup` · `window_pull` ·
`skipped`

Do not invent extra conditions. Prefer skip + flag over a guessed window view
or a guessed parcel line. Preserve Sony 3:2. Do not crop to 16:9 / 4:3 / square.

## Tests

```bash
python -m unittest tests.test_rep_edit -v
```
