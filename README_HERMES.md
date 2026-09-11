# Hermes / local run

Download or clone the repo. This is the product — there is no website zip.

```bash
git clone https://github.com/dain12344321/REPP-Photo-Edit.git
cd REPP-Photo-Edit
python3 -m pip install -r requirements.txt
export XAI_API_KEY=xai-...
```

The key is from [console.x.ai](https://console.x.ai) on the same X account used to sign in. Point the agent at [INSTRUCTIONS.md](INSTRUCTIONS.md) and [prompts/imagine-shot-prompts.md](prompts/imagine-shot-prompts.md). Model is `grok-imagine-image-2.0` only.

```bash
python3 scripts/ingest.py inbox --job-id listing --out jobs/listing/job.json
python3 scripts/run_job.py jobs/listing/job.json
python3 scripts/watch_inbox.py inbox --out jobs/listing --once
```

Skill copy: `.grok/skills/rep-edit/`. Drive: [FOLDERS.md](FOLDERS.md).
