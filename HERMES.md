# HERMES.md — paste this whole file to Grok on the Hermes agent

You are Grok, installing **Lakeshore Listing Media · REP Edit** on this Hermes agent.

Locked 2026-09-13: production MLS stills are **Grok Imagine 2.0 / 2K / medium**. Read `OPERATOR.md` for the INBOX → OUTBOX loop. Do not invent a different photo pipeline. Do not use `hermes-photo-pipeline/` (Photomator / nano-banana). Do not restore `reppstudio`.

## 1. Read these, in this order, before any photo

1. `OPERATOR.md` — Hermes INBOX/OUTBOX loop (this is the fire-up brief)
2. `INSTRUCTIONS.md` — operator rules
3. `prompts/imagine-shot-prompts.md` — frozen Imagine pack (version `2026-09-11-2k-texture`)
4. `FOLDERS.md` — official Drive INBOX / OUTBOX
5. `.grok/skills/rep-edit/SKILL.md` — engine skill (on the REPP Photo bot, install as `repp-photo-grok`)
6. `AGENTS.md` — do / do-not for this repo

Never send `prompts/source-long-REFERENCE-ONLY.md` to Imagine.

## 2. Install the skill

On the **REPP Photo** Hermes profile, the live skill name is **`repp-photo-grok`** (not `rep-edit`). Copy from the companion repo `REPP-Photo-Hermes` when present. Auth is **xAI OAuth first**, OpenRouter `x-ai/grok-imagine-image-2.0` as labeled backup. Never `grok-imagine-image-quality`.

If this unzipped folder **is** the workspace, `.grok/skills/rep-edit/` is the engine skill. Keep `AGENTS.md` at the project root.

Confirm: Sony JPEG cards, Grok Imagine image-edit, `grok-imagine-image-2.0`, 2K, medium, 3:2, OUTBOX `{listing}/Grok_2K`.

## 3. Environment

Python 3.10+. Do not commit secrets.

```bash
cd /path/to/Lakeshore-REP-Edit
python3 -m pip install -r requirements.txt
export XAI_API_KEY=xai-...
```

The key is from [console.x.ai](https://console.x.ai) on Dain’s X account (the same account that pays for Imagine). Never write the key into a file in this repo. Never put it in `VITE_*`.

Create working folders if missing:

```bash
mkdir -p inbox jobs/listing/outputs
```

`inbox/` is where the Sony card dump goes. `jobs/` is local work. Delivered stills go to Drive **OUTBOX**, not back into INBOX.

## 4. Drive (official)

| Role | ID |
|---|---|
| INBOX (card dumps, read-only) | `1LidXBZXZW_m5c_J1xXjdHnjnwvgat8lZ` |
| OUTBOX (delivered stills) | `1-W86toL_viRDEoyXX5JMR0ab68g2x62G` |

One folder per listing, named `{Street, City, ST ZIP}`.

Typical loop with rclone (if Drive is mounted):

```bash
rclone sync "Drive:INBOX/{Street, City, ST ZIP}" ./inbox
python3 scripts/watch_inbox.py ./inbox --out ./jobs/listing --once
rclone copy ./jobs/listing/outputs "Drive:OUTBOX/{Street, City, ST ZIP}"
```

If rclone is not set up, Dain drops JPEGs into `inbox/` and you run the watch command. Then he copies keepers to OUTBOX.

## 5. Run a listing

Dry-run first (no Imagine spend):

```bash
python3 scripts/ingest.py inbox --job-id listing --out jobs/listing/job.json
python3 scripts/run_job.py jobs/listing/job.json --dry-run
```

Live (spends Imagine credits, one still at a time inside `run_job.py`):

```bash
export XAI_API_KEY=xai-...
python3 scripts/watch_inbox.py inbox --out jobs/listing --once
```

Or the two-step form:

```bash
python3 scripts/ingest.py inbox --job-id listing --out jobs/listing/job.json
python3 scripts/run_job.py jobs/listing/job.json
```

Outputs: `jobs/listing/outputs/{slug}_{nnn}_MLS.jpg` (twilights `_VT.jpg`) plus a JSON sidecar next to each still.

## 6. Hard rules (fail the still if you break one)

- Model **`grok-imagine-image-2.0` only**. `POST https://api.x.ai/v1/images/edits`. Implementation: `providers/grok.py`.
- `quality=medium`, `resolution=2k`, `aspect_ratio=3:2`, `response_format=b64_json`.
- Preflight every input to long-edge 2048 JPEG q=95. Output long edge must be ≥ 1920.
- HDR attach order is always **middle, dark, bright**. Max 3 images.
- Frosted / privacy / reeded glass stays as shot. Do not clear it. Do not invent a view.
- **Never say “window pool.”** Say “window view” or “exterior view.”
- No swimming pool, pond, lake, or water in/behind a window unless it is already in that pane.
- Keep carpet weave and grass blades. No smeared floors, no neon lawn.
- One shot, one retry max if architecture drifts. Never clobber a final (`*_v001.jpg`).
- Uncertain classification → skip and flag. Do not guess a window view.
- No lot boxes, captions, watermarks, or shot numbers on the frame.
- Do not publish a zip or music package into a client OUTBOX folder.

Gold look: Wanatah hand-edited set in OUTBOX (`405 N Main St, Wanatah, IN 46390`). Match that grade at true 2K.

## 7. Web console (optional, same repo)

Node 22:

```bash
npm install
export XAI_API_KEY=xai-...
npm run dev
```

Sign in with X. Drop a card on Ingest. Gallery starts empty and fills from that job.

## 8. When Dain says “edit this listing”

1. Confirm `XAI_API_KEY` is set.
2. Confirm `inbox/` has the Sony JPEGs (ignore `.ARW`).
3. Ingest → dry-run → show him the plan (`job.json` item list) if he wants a check.
4. Run live.
5. QC every still against the table in `INSTRUCTIONS.md`.
6. Deliver keepers to that listing’s OUTBOX folder.

If anything is off (1K files, invented window water, smeared carpet), do not deliver. Flag and stop.
