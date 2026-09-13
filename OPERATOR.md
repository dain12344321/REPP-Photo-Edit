# REPP Photo Grok — operator instructions (locked 2026-09-13)

This is the production loop. Fire up the **REPP Photo** Hermes bot, point it at a Drive INBOX card, get 2K stills in OUTBOX `{listing}/Grok_2K`.

Do not restore `reppstudio`. Do not let the Codex app (Astra) edit this Hermes profile or the Grok engine.

## What is locked

| Piece | Pin |
|---|---|
| Hermes profile | `repp-photo` on this PC: `/home/dain0/.hermes/profiles/repp-photo` |
| Chat operator | `gpt-5.6-luna` / `openai-codex` / max (unchanged) |
| **Image production** | Grok Imagine **`grok-imagine-image-2.0`** |
| Call | `POST https://api.x.ai/v1/images/edits` |
| Quality / resolution / aspect | `medium` / `2k` / `3:2` |
| Auth | **xAI OAuth first** (Hermes `xai-oauth` or `~/.grok/auth.json`) |
| Auth backup | OpenRouter **`x-ai/grok-imagine-image-2.0`** (labeled). Never `grok-imagine-image-quality` |
| Engine | `/home/dain0/projects/repp-photo-edit` (GitHub `dain12344321/REPP-Photo-Edit`) |
| Prompts | `prompts/imagine-shot-prompts.md` version `2026-09-11-2k-texture` |
| Reject | output long edge below 1920 |
| HDR attach order | middle, dark, bright |
| OpenAI / Codex | preserved backup skill `repp-photo-openai` only if Dain names it |

Proven on 2026-09-13: OAuth HTTP 200; stills **2496×1664**. Carpet, grass, and Lisa window views were accepted on the Flag Ct / Wanatah matrix. Grok A blinds were a little washed — size/auth/model are still the production pin.

## Say this to the bot

- “Process **1642 Flag Ct, Crown Point, IN 46307**”
- “Process the inbox listing …”
- “Run REPP Photo Grok on …”

That means Grok. Do not ask which backend.

## Drive

| Role | ID |
|---|---|
| INBOX (cards, read-only) | `1LidXBZXZW_m5c_J1xXjdHnjnwvgat8lZ` |
| OUTBOX | `1-W86toL_viRDEoyXX5JMR0ab68g2x62G` |
| Production write | `OUTBOX/{Street, City, ST ZIP}/Grok_2K/` |
| Tests only | `OUTBOX/TEST RESULTS` `1P-RXtVQI3ZEKQzhWDNegin79GKPGWzuA` |

Never overwrite Wanatah gold (`1QRP9oHkTO7w9AZI6xCvvo0G_wueiI6KA`) or `MLS Listing Photos`. Ignore `.ARW`. Sony JPEG stills only.

## Commands (Hermes parent runs these)

```bash
export HERMES_HOME=/home/dain0/.hermes/profiles/repp-photo
PY=/home/dain0/projects/repp-photo-edit/.venv/bin/python
SKILL=/home/dain0/.hermes/profiles/repp-photo/skills/repp-photo-grok/scripts

$PY $SKILL/process_listing.py --list-inbox
$PY $SKILL/process_listing.py --property "1642 Flag Ct, Crown Point, IN 46307" --dry-run
$PY $SKILL/process_listing.py --property "1642 Flag Ct, Crown Point, IN 46307"
```

Local folder, no Drive:

```bash
$PY $SKILL/run.py \
  --workspace /home/dain0/projects/repp-photo-hermes/jobs/<id> \
  --staged /absolute/jpegs --job-id <id> --dry-run
$PY $SKILL/run.py --workspace ... --limit 0
```

Auth is automatic: OAuth, then labeled OpenRouter 2.0. Receipts on every still: `provider`, `auth_route`, `model_requested`, `model_reported`, `native_wh`.

## Window / QC

Window pull = flambient / Lisa: bright interior, continuous muntins and blinds, exterior 1–1.5 stops darker through panes that already show a view in the dark frame. Never send photographer slang that makes models draw a swimming pool. Frosted / privacy / reeded glass stays. No invented water. Carpet weave and grass blades stay photographic.

Hold (do not upload) if: long edge below 1920, invented exterior, swimming-pool hallucination, smeared carpet, neon grass, melted window bars.

Never send `prompts/source-long-REFERENCE-ONLY.md` to Imagine.

## OpenAI / Codex (backup only)

Skill `repp-photo-openai` wraps `/home/dain0/projects/repp-photo-openai`. It is demoted. Do not improve it from this bot. Astra may work on the Codex skill **inside the Codex app** and must not touch:

- `/home/dain0/.hermes/profiles/repp-photo/`
- `/home/dain0/projects/repp-photo-edit/`
- `/home/dain0/projects/repp-photo-hermes/` (except reading)

See `CODEX-HANDS-OFF.md`.

## Mac Mini

Clone GitHub `dain12344321/REPP-Photo-Edit` and `dain12344321/REPP-Photo-Hermes`. Follow `MAC-MINI.md`. Same INBOX/OUTBOX. Same OAuth-then-OpenRouter order. Do not copy secrets in git.

## Git / Drive freeze

- Engine + prompt pack: https://github.com/dain12344321/REPP-Photo-Edit
- Hermes adapter + this file: https://github.com/dain12344321/REPP-Photo-Hermes
- Drive lock-in zip: OUTBOX / TEST RESULTS / `LOCK-IN 2026-09-13 REPP Photo Grok`
