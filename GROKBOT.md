# Grokbot / Hermes / Cloudflare handover

This repo is the Grok Imagine MLS pipeline for Lakeshore Listing Media.

## Three ways to run it

| Mode | What runs | Key |
|---|---|---|
| **Hermes agent (Mac Mini / PC)** | `scripts/watch_inbox.py` + this skill | `XAI_API_KEY` from [console.x.ai](https://console.x.ai) |
| **Cloudflare on your domain** | `npm run dev -- --host 0.0.0.0 --port 8080` + `cloudflared tunnel` | same API key, server-only |
| **Grokbot / Grok Build** | This workspace. Skill: `.grok/skills/rep-edit/SKILL.md` | Build session key (image-edit credits) |

Same model everywhere: `grok-imagine-image-2.0` via `POST /v1/images/edits`. Not OAuth unless a Hermes *native* Imagine tool is used instead of `providers/grok.py`.

## Hermes

1. Copy this repo (or the pipeline zip on Drive root: `REPP-Photo-Edit-Pipeline-Grok.zip`).
2. Install the skill: copy `.grok/skills/rep-edit/` into the agent skills folder (or point Hermes at `AGENTS.rep-edit.md`).
3. `export XAI_API_KEY=...`
4. Drop a card in `inbox/` (Sony JPEGs; DJI in `DJI Drone Card Dump/`).
5. `python3 scripts/watch_inbox.py inbox --out jobs/listing --once`
6. Push `jobs/listing/outputs/` into that property’s `Grok_2K` folder under **DELIVERED CLIENT ASSETS (by Property)**.

Do not run `hermes-photo-pipeline/` for MLS stills. That skill is Photomator + nano-banana. Keep it as a comparison reference only.

## Cloudflare

```bash
npm install
export XAI_API_KEY=xai-...
npm run dev -- --host 0.0.0.0 --port 8080
cloudflared tunnel --url http://127.0.0.1:8080
```

CNAME `edit.lakeshorelisting.media` at a named tunnel if you want it on the domain. Never put the key in `VITE_*`.

## Grokbot

On revisit: read `AGENTS.rep-edit.md` then `.grok/skills/rep-edit/SKILL.md`. Pixel prompts stay in `prompts/imagine-shot-prompts.md` (version **2026-09-11-window-truth**). Frosted / privacy glass stays as photographed. Drive layout in `FOLDERS.md`. Locked Sumava pack notes in `SNAPSHOT.md`.

## Client output (this job)

Website download is **MLS Listing Photos only** — 50 stills, address-named, drop into:

`DELIVERED CLIENT ASSETS (by Property)/11477 N 250 W, Sumava Resorts, IN 46379/Grok_2K/`
