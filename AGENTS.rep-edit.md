# AGENTS.md — Lakeshore REP Edit

This repo is a real-estate stills pipeline. Pixel prompts are frozen.

On Grokbot / Grok Build / Hermes: read `INSTRUCTIONS.md`, then
`.grok/skills/rep-edit/SKILL.md`, then this file.

## Do

- Read `INSTRUCTIONS.md` before any edit. It is the operator instruction set.
- Read `prompts/imagine-shot-prompts.md` before any Imagine call.
- Append the sticky keep-clause to every still prompt.
- Call `grok-imagine-image-2.0` only, `quality=medium`, `resolution=2k`, `aspect_ratio=3:2`.
- Preflight inputs to long-edge 2048 JPEG q=95. Verify output long edge ≥ 1920.
- Group brackets before classifying.
- Version outputs: `*_v001.jpg`, never clobber.
- Prefer skip + flag over a guessed window view.
- Frosted / privacy glass is architecture. Do not clear it. Do not invent a view through it.
- Keep carpet weave and grass blades sharp.
- Write finals into the listing folder under **OUTBOX**.

## Do not

- Send `prompts/source-long-REFERENCE-ONLY.md` to Imagine.
- Call Hermes/FAL/nano-banana/grok-imagine-image (1.0) for MLS stills (`hermes-photo-pipeline/` is reference only).
- Say “window pool” in a prompt. Models draw a swimming pool.
- Add a swimming pool, pond, or invented water behind a window.
- Add conditions that are not in the shot-prompt file.
- Build photo-to-video in this pass.
- Change aspect ratio away from the Sony 3:2 source.
- Draw property outlines / lot boxes.
- Publish a Hermes zip or music zip on the public site.

## Drive

- INBOX `1LidXBZXZW_m5c_J1xXjdHnjnwvgat8lZ`
- OUTBOX `1-W86toL_viRDEoyXX5JMR0ab68g2x62G`

See `FOLDERS.md`.

## API

- Base: https://api.x.ai/v1
- Edits: POST /images/edits
- Model: grok-imagine-image-2.0
- Quality: medium
- Resolution: 2k
- Auth: Bearer $XAI_API_KEY
- Body: JSON. Image as `{ "url": "data:image/jpeg;base64,...", "type": "image_url" }` or `images: [...]` for multi-ref (max 3).
- Implementation: `providers/grok.py`

## Handover

`INSTRUCTIONS.md` · `GROKBOT.md` · `FOLDERS.md` · `SNAPSHOT.md` · `README_HERMES.md`
