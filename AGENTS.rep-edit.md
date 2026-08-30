# AGENTS.md — Lakeshore REP Edit

This repo is a real-estate stills pipeline. Pixel prompts are frozen.

On Grokbot / Grok Build / Hermes: read `.grok/skills/rep-edit/SKILL.md` then this file.

## Do

- Read `prompts/imagine-shot-prompts.md` before any Imagine call.
- Append the sticky keep-clause to every still prompt.
- Group brackets before classifying.
- Version outputs: `*_v001.jpg`, never clobber.
- Prefer skip + flag over a guessed window view.
- Write finals into `Grok_2K` under **DELIVERED CLIENT ASSETS (by Property)**.

## Do not

- Send `prompts/source-long-REFERENCE-ONLY.md` to Imagine.
- Call Hermes/FAL/nano-banana generic image-gen for MLS stills (`hermes-photo-pipeline/` is reference only).
- Add conditions that are not in the shot-prompt file.
- Build photo-to-video in this pass.
- Change aspect ratio away from the Sony 3:2 source.
- Draw property outlines / lot boxes.

## API

- Base: https://api.x.ai/v1
- Edits: POST /images/edits
- Model: grok-imagine-image-2.0
- Auth: Bearer $XAI_API_KEY
- Body: JSON. Image as `{ "url": "data:image/jpeg;base64,...", "type": "image_url" }` or `images: [...]` for multi-ref (max 3).
- Implementation: `providers/grok.py`

## Handover

`GROKBOT.md` · `FOLDERS.md` · `SNAPSHOT.md` · `README_HERMES.md`
