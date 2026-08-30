# Lakeshore REP Edit — locked snapshot

Sumava first production run. Outline/lot-box work is **removed**. Do not bring it back.

## What this is

A local pipeline that ingests a Sony JPEG card (+ optional DJI dump), groups 3-EV HDR stacks, classifies each shot, and calls **Grok Imagine image edit** (not text-to-image) at 3:2 / 2K. Outputs versioned MLS stills plus a sidecar JSON.

It is meant to run on a Mac Mini / PC, either:

1. **Hermes agent / CLI** — drop a card in `inbox/`, run ingest + `run_job.py`, pull stills from `jobs/<id>/outputs/`.
2. **Own domain via Cloudflare tunnel** — run the TanStack console locally, point a tunnel at it. The browser never holds the API key.

## Imagine API (not OAuth)

This Build used the **xAI Images Edit API**, not Grok.com OAuth.

| | |
|---|---|
| Endpoint | `POST https://api.x.ai/v1/images/edits` |
| Model | `grok-imagine-image-2.0` (current Imagine stills model) |
| Auth | `Authorization: Bearer $XAI_API_KEY` |
| Body | JSON. Local files as `data:image/jpeg;base64,...` |
| Max inputs | 3 images (HDR: middle, dark, bright) |
| Aspect / res | `"3:2"` / `"2k"` |
| Response | `response_format: "b64_json"` |

Implementation: `providers/grok.py`. Do **not** use OpenAI multipart `images.edit()` against `api.x.ai`.

**Credits this session:** sandbox calls went through that API with the Build environment key. They count as Imagine **image-edit** usage on this Grok Build / SuperGrok session — not a Grok.com OAuth consent, and not a separate invoice you would see in Hermes unless you put your own key in.

**On your machine:**

- CLI / Cloudflare host → create a key at [console.x.ai](https://console.x.ai) → `export XAI_API_KEY=...`. That is **API billing** on your xAI account.
- Hermes **native** Imagine tools (if a skill calls the built-in image editor) → **OAuth / session**. Different path. This snapshot’s `grok.py` does not use that.

Same model either way: `grok-imagine-image-2.0`.

## Curl (exact)

```bash
python3 - << 'PY'
import base64, json, pathlib
p = pathlib.Path("inbox/hero.jpg")
print(json.dumps({
  "model": "grok-imagine-image-2.0",
  "prompt": open("prompts/imagine-shot-prompts.md").read().split("KEEP-CLAUSE")[0][-800:],
  "aspect_ratio": "3:2",
  "resolution": "2k",
  "response_format": "b64_json",
  "image": {"url": "data:image/jpeg;base64," + base64.b64encode(p.read_bytes()).decode(), "type": "image_url"},
}))
PY
# then:
curl -sS https://api.x.ai/v1/images/edits \
  -H "Authorization: Bearer $XAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d @payload.json
```

See `README.md` for the checked-in example. `providers/grok.py` is the one we actually ran.

## Run (Hermes / Mac Mini)

```bash
python3 -m pip install -r requirements.txt
export XAI_API_KEY=xai-...          # never commit this
python3 scripts/ingest.py inbox --job-id listing --out jobs/listing/job.json
# cull: skip flags, cap ~60 stills, twilight only the front hero
python3 scripts/run_job.py jobs/listing/job.json
```

Watch a Drive inbox instead:

```bash
python3 scripts/watch_inbox.py
```

## Run (Cloudflare tunnel on your domain)

```bash
npm install
export XAI_API_KEY=xai-...
npm run dev -- --host 0.0.0.0 --port 8080
# other terminal
cloudflared tunnel --url http://127.0.0.1:8080
# or a named tunnel CNAME e.g. edit.lakeshorelisting.media → the tunnel
```

Keep the key in the process environment. Do not put it in Vite `VITE_*` or client JS.

## Snapshot layout

```
providers/grok.py          Imagine edit client (API)
providers/codex.py         stub, same signature, swap later
rep_edit/                  ingest, EXIF, classify, job.json
scripts/ingest.py          card → job.json (no Imagine)
scripts/run_job.py         job.json → versioned stills + sidecars
scripts/watch_inbox.py     Drive / folder watcher
prompts/imagine-shot-prompts.md   pixel prompts (source of truth)
prompts/source-short.md    Codex-working set (do not send as-is)
prompts/source-long-REFERENCE-ONLY.md   QC labels only
schemas/job.schema.json
tests/test_rep_edit.py
src/                       TanStack console (gallery / ingest / QC)
MLS/                       locked Sumava stills (this zip)
```

Removed on purpose: `scripts/overlay_lot.py`, still `049`, any parcel/lot-box overlay.

## Drive folders

See [FOLDERS.md](FOLDERS.md). Input = card dump. Output = `Grok_2K` inside the client job `11477 N 250 W, Sumava Resorts, IN 46379`. Original `MLS Listing Photos/` stays read-only. Cuba Casa drops extras in `Grok_2K`.

## Locked pack (50 stills)

`11477_N_250_W_Sumava_Resorts_IN_46379_<nnn>_MLS.jpg` · 3:2 · 2K

| Range | What |
|---|---|
| 001–005 | Exteriors from Sony card (`_SA90369–377`). One daylight grade. 005 is daytime backyard — not dusk. |
| 006–026, 028–040 | Interiors, Imagine walkthrough |
| 027 | Bathroom HDR from card `_SA90258/259/260`. Lisa window pool. |
| 041–042 | Missing rooms from card (`_SA90366` yellow bath, `_SA90360` kitchenette) |
| 043–048 | DJI aerials, punchy, photographer + cars pulled. 6 drones. |
| 050–051 VT | Virtual twilight from card fronts 369 / 373. Bright house, cotton-candy sky. |

No `049`. No `51` / `052` filenames.

## Hard rules (do not relax)

- Middle frame is geometry on HDR. Attach order: middle, dark, bright.
- Recover only real window views. Never invent scenery. Never leave glass black.
- Twilight is time-of-day only. No new windows, fixtures, landscaping, or purple skies.
- Exterior set shares one daylight grade. Do not dusk a backyard.
- Preserve Sony 3:2. Do not crop to 16:9 / 4:3 / square.
- If uncertain, skip and flag.
- Video, parcel-boundary overlays, and gallery-wide generative matching are out of scope.

## Pixel prompts

Edit `prompts/imagine-shot-prompts.md` only. `run_job.py` appends the sticky keep-clause. Do not send the long manifesto to Imagine.
