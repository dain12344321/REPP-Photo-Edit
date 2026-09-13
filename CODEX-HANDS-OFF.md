# Codex / Astra — do not touch the Grok Hermes lock-in

Paste this into the Codex app thread that owns the OpenAI REPP skill.

The 2026-09-13 Grok Imagine 2K path on Hermes is **locked**. Codex may refine **its own** OpenAI skill inside the Codex app and `/home/dain0/projects/repp-photo-openai` protected skills only if Dain asks. It must **not** change Hermes.

## Off limits

- `/home/dain0/.hermes/profiles/repp-photo/` (SOUL, skills `repp-photo-grok` and `repp-photo-openai`, config, Drive token)
- `/home/dain0/projects/repp-photo-edit/` (Grok engine, `providers/openrouter.py` 2.0 pin, prompt pack)
- `/home/dain0/projects/repp-photo-hermes/` (adapter, `OPERATOR.md`, jobs)
- GitHub `dain12344321/REPP-Photo-Edit` production defaults for MLS
- GitHub `dain12344321/REPP-Photo-Hermes`
- Hermes-agent git checkout
- Global `/home/dain0/.hermes/config.yaml` model defaults
- `reppstudio` / `reppvideo` (retired)

## Allowed

- Codex app session for the OpenAI photo skill
- `/home/dain0/projects/repp-photo-openai` if Dain opens that job
- Reading CONTINUATION.md / OPERATOR.md

OpenAI in Hermes is a **preserved backup**. Do not “improve” it from Codex by rewriting the Hermes adapter. Do not resume child `01a09b30`. Do not point MLS at `grok-imagine-image-quality`.
