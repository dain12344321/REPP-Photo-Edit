# Lakeshore REP Edit

Sony card in. 2K MLS stills out. This repo is the product.

**Clone it:** [github.com/dain12344321/REPP-Photo-Edit](https://github.com/dain12344321/REPP-Photo-Edit)

```bash
git clone https://github.com/dain12344321/REPP-Photo-Edit.git
cd REPP-Photo-Edit
```

Two runtimes, same prompt pack (`prompts/imagine-shot-prompts.md`) and same model (`grok-imagine-image-2.0`, quality medium, 2K).

## 1. Local / Hermes (Python)

For a Mac Mini, a Hermes agent, or a headless watcher.

```bash
python3 -m pip install -r requirements.txt
export XAI_API_KEY=xai-...          # console.x.ai API key
python3 scripts/ingest.py inbox --job-id listing --out jobs/listing/job.json
python3 scripts/run_job.py jobs/listing/job.json
```

Dry run (no API):

```bash
python3 scripts/make_dry_run_fixture.py fixtures/dry-run-9jpeg
python3 scripts/ingest.py fixtures/dry-run-9jpeg --job-id dry-run --out jobs/dry-run/job.json
python3 scripts/run_job.py jobs/dry-run/job.json --dry-run
```

Operator rules: [INSTRUCTIONS.md](INSTRUCTIONS.md). Drive IDs: [FOLDERS.md](FOLDERS.md). Hermes notes: [README_HERMES.md](README_HERMES.md).

## 2. Hosted web console

The Grok Build app is the hosted console — ingest a card, sign in, talk to Drive.

To host it yourself (Node 22):

```bash
npm install
export XAI_API_KEY=xai-...
npm run dev -- --host 0.0.0.0 --port 8080
```

Point a Cloudflare tunnel at it if you want a public URL on your domain:

```bash
cloudflared tunnel --url http://127.0.0.1:8080
```

Production build of this stack deploys as a TanStack Start / Vercel app (`npm run build`). A native Cloudflare Workers rewrite is not in this repo.

## Drive

| | |
|---|---|
| INBOX | [Card dumps](https://drive.google.com/drive/folders/1LidXBZXZW_m5c_J1xXjdHnjnwvgat8lZ) |
| OUTBOX | [Delivered stills](https://drive.google.com/drive/folders/1-W86toL_viRDEoyXX5JMR0ab68g2x62G) |

One folder per listing. INBOX is read-only source. OUTBOX is the only write target.

## Layout

| Path | Role |
|---|---|
| `prompts/imagine-shot-prompts.md` | Frozen Imagine pack |
| `INSTRUCTIONS.md` | Operator instruction set |
| `rep_edit/` + `scripts/` | Python ingest / edit / watcher |
| `providers/grok.py` | `POST /v1/images/edits` |
| `src/` | Web console |
