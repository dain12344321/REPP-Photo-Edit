# Hermes / local run

Unzip `Lakeshore-REP-Edit.zip`. This is the product — there is no zip on the public website.

**If you are Grok:** open [HERMES.md](HERMES.md) and follow it. That file is the install brief for this agent.

```bash
cd Lakeshore-REP-Edit
python3 -m pip install -r requirements.txt
export XAI_API_KEY=xai-...
```

The key is from [console.x.ai](https://console.x.ai) on the same X account used to sign in. Then read [INSTRUCTIONS.md](INSTRUCTIONS.md) and [prompts/imagine-shot-prompts.md](prompts/imagine-shot-prompts.md). Model is `grok-imagine-image-2.0` only.

```bash
python3 scripts/ingest.py inbox --job-id listing --out jobs/listing/job.json
python3 scripts/run_job.py jobs/listing/job.json
python3 scripts/watch_inbox.py inbox --out jobs/listing --once
```

Skill: `.grok/skills/rep-edit/`. Drive: [FOLDERS.md](FOLDERS.md). Start: [START_HERE.md](START_HERE.md).
