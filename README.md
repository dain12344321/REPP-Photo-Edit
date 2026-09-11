# Lakeshore REP Edit

Standalone listing-stills app. Sign in with X. Drop a Sony card. Imagine at 2K. Deliver to Drive.

**Download:** [Zip of main](https://github.com/dain12344321/REPP-Photo-Edit/archive/refs/heads/main.zip) · **Repo:** [dain12344321/REPP-Photo-Edit](https://github.com/dain12344321/REPP-Photo-Edit)

The shipped photo is the lakeshorelisting.media hero. Gallery, jobs, and OUTBOX start empty and fill from ingest.

## Run locally

You need Node 22, Python 3.10+, and an xAI key from [console.x.ai](https://console.x.ai) on the same X account that pays for Imagine.

```bash
unzip REPP-Photo-Edit-main.zip
cd REPP-Photo-Edit-main
python3 -m pip install -r requirements.txt
npm install
export XAI_API_KEY=xai-...
npm run dev
```

Sign in with X in the console. Ingest a card. Run one 2K edit at a time.

Headless (Hermes / Mac Mini) — no browser, same X account key:

```bash
export XAI_API_KEY=xai-...
python3 scripts/ingest.py inbox --job-id listing --out jobs/listing/job.json
python3 scripts/run_job.py jobs/listing/job.json
```

## Drive

| | |
|---|---|
| INBOX | [Card dumps](https://drive.google.com/drive/folders/1LidXBZXZW_m5c_J1xXjdHnjnwvgat8lZ) |
| OUTBOX | [Delivered stills](https://drive.google.com/drive/folders/1-W86toL_viRDEoyXX5JMR0ab68g2x62G) |

Rules: [INSTRUCTIONS.md](INSTRUCTIONS.md). Folders: [FOLDERS.md](FOLDERS.md). Hermes: [README_HERMES.md](README_HERMES.md).

## What this is

| Path | Role |
|---|---|
| `src/` | Web console (ingest, job, Drive, gallery) |
| `prompts/imagine-shot-prompts.md` | Frozen Imagine pack |
| `providers/grok.py` | `POST /v1/images/edits` · `grok-imagine-image-2.0` · 2K · medium |
| `scripts/ingest.py` / `run_job.py` | Local / Hermes runner |

Imagine is an API — edits need a network. Classify, prompts, job JSON, and the local gallery run on the machine. Sign-in with X authorizes the console; the xAI key on that same account runs the pipeline.
