from __future__ import annotations

from pathlib import Path


def edit(images: list[Path], prompt: str, out_path: Path, **_kwargs) -> Path:
    """Stub — same signature as providers.grok.edit so the runner can swap later."""
    raise NotImplementedError(
        "Codex provider is a stub. Point --provider grok or implement providers/codex.py."
    )
