# Grokbot / Hermes / Cloudflare handover

This repo is the Grok Imagine MLS pipeline for Lakeshore Listing Media.

## Three ways to run it

| Mode | What runs | Key |
|---|---|---|
| **Hermes agent (Mac Mini / PC)** | `scripts/watch_inbox.py` + this skill | `XAI_API_KEY` from [console.x.ai](https://console.x.ai) |
| **Cloudflare on your domain** | `npm run dev` + `cloudflared tunnel` | same API key, server-only |
| **Grokbot / Grok Build** | This workspace. Skill: `.grok/skills/rep-edit/SKILL.md` | Build session key (image-edit credits) |

Same model everywhere: `grok-imagine-image-2.0` via `POST /v1/images/edits`.

## Hermes

1. Unzip `Lakeshore-REP-Edit.zip` (or clone the repo).
2. Paste [HERMES.md](HERMES.md) to Grok on that agent and let it install.
3. Skill path: copy `.grok/skills/rep-edit/` into the agent skills folder (or point Hermes at this folder — `AGENTS.md` + `SKILL.md` are already here).
4. `export XAI_API_KEY=...`
5. Drop a card in `inbox/` (Sony JPEGs; DJI in `DJI Drone Card Dump/`).
6. `python3 scripts/watch_inbox.py inbox --out jobs/listing --once`
7. Push `jobs/listing/outputs/` into that property’s folder under **OUTBOX**.

Do not run `hermes-photo-pipeline/` for MLS stills. That skill is Photomator + nano-banana. Keep it as a comparison reference only.

## Cloudflare

```bash
npm install
export XAI_API_KEY=xai-...
npm run dev
cloudflared tunnel --url http://127.0.0.1:8080
```

CNAME `edit.lakeshorelisting.media` at a named tunnel if you want it on the domain. Never put the key in `VITE_*`.

## Grokbot

On revisit: read `HERMES.md` if installing on Hermes, else `INSTRUCTIONS.md`, then `AGENTS.rep-edit.md`, then `.grok/skills/rep-edit/SKILL.md`. Pixel prompts stay in `prompts/imagine-shot-prompts.md` (version **2026-09-11-2k-texture**). Frosted / privacy glass stays as photographed. Drive layout in `FOLDERS.md`. Gold look is Wanatah OUTBOX.

## Client output

Website ingest is **card drop + Drive INBOX/OUTBOX links**. No zip on the public site.
Delivered stills go to the listing folder under OUTBOX.
