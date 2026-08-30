# Lakeshore REP Edit — Hermes / Cloudflare

Full snapshot: **[SNAPSHOT.md](SNAPSHOT.md)**. Grokbot handover: **[GROKBOT.md](GROKBOT.md)**. Skill: **`.grok/skills/rep-edit/SKILL.md`**.

## Quick start (Mac Mini / PC)

```bash
python3 -m pip install -r requirements.txt
export XAI_API_KEY=xai-...   # console.x.ai — API key, not Grok OAuth
python3 scripts/ingest.py inbox --job-id listing --out jobs/listing/job.json
python3 scripts/run_job.py jobs/listing/job.json
```

Imagine: `POST https://api.x.ai/v1/images/edits` · `grok-imagine-image-2.0` · JSON + base64 · 3:2 / 2K. See `providers/grok.py`.

## Cloudflare

```bash
npm install
export XAI_API_KEY=xai-...
npm run dev -- --host 0.0.0.0 --port 8080
cloudflared tunnel --url http://127.0.0.1:8080
```

## Drive

Input = card dump. Output = `DELIVERED CLIENT ASSETS (by Property)/{address}/Grok_2K/`. See `FOLDERS.md`.

## Out of scope

Property outlines / lot boxes — removed. `hermes-photo-pipeline/` is the Codex/Photomator comparison skill — do not use it for MLS stills.
