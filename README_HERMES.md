# Hermes / local run

Clone the repo. Do not use a website zip.

```bash
git clone https://github.com/dain12344321/REPP-Photo-Edit.git
cd REPP-Photo-Edit
python3 -m pip install -r requirements.txt
export XAI_API_KEY=xai-...
```

Point the agent at [INSTRUCTIONS.md](INSTRUCTIONS.md) and [prompts/imagine-shot-prompts.md](prompts/imagine-shot-prompts.md). Model is `grok-imagine-image-2.0` only — quality medium, 2K. Do not hand a smaller model the stills job.

```bash
python3 scripts/ingest.py inbox --job-id listing --out jobs/listing/job.json
python3 scripts/run_job.py jobs/listing/job.json
# or
python3 scripts/watch_inbox.py inbox --out jobs/listing --once
```

Skill copy lives in `.grok/skills/rep-edit/` if the harness wants a skill folder.

## Drive

Official folders: [FOLDERS.md](FOLDERS.md). INBOX is the card dump. OUTBOX is delivered stills.

## Hosting the console

```bash
npm install
export XAI_API_KEY=xai-...
npm run dev -- --host 0.0.0.0 --port 8080
cloudflared tunnel --url http://127.0.0.1:8080
```
