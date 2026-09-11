# Lakeshore REP Edit — start here

This zip is the standalone product: web console + Hermes / Mac Mini pipeline.

There is one listing photo in the package: `public/hero.jpg` (the lakeshorelisting.media home hero). Gallery, jobs, and `inbox/` start empty.

## If you are Grok on a Hermes agent

Read **[HERMES.md](HERMES.md)** and follow it as written. That file is the install brief.

Then read `INSTRUCTIONS.md` before any Imagine call.

## If you are setting this up yourself

1. Unzip. `cd` into `Lakeshore-REP-Edit`.
2. Python 3.10+: `python3 -m pip install -r requirements.txt`
3. Key from [console.x.ai](https://console.x.ai) on the same X account: `export XAI_API_KEY=xai-...`
4. Drop Sony JPEGs into `inbox/`
5. `python3 scripts/watch_inbox.py inbox --out jobs/listing --once`

Optional web console (Node 22): `npm install` then `npm run dev`. Sign in with X.

## Files Grok must not skip

| File | Why |
|---|---|
| `HERMES.md` | Install this skill on Hermes |
| `INSTRUCTIONS.md` | Operator rules |
| `prompts/imagine-shot-prompts.md` | Frozen 2K pack |
| `.grok/skills/rep-edit/SKILL.md` | The skill |
| `FOLDERS.md` | Drive INBOX / OUTBOX |
| `providers/grok.py` | `grok-imagine-image-2.0` image-edit |

Model is `grok-imagine-image-2.0` only. 2K. Medium. Sony 3:2.
