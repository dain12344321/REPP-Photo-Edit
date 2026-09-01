from __future__ import annotations

from pathlib import Path
from typing import Callable

EditFn = Callable[..., Path]


def get_provider(name: str) -> EditFn:
    key = (name or "grok").strip().lower()
    if key == "grok":
        from . import grok

        return grok.edit
    if key in {"openrouter", "or", "router"}:
        from . import openrouter

        return openrouter.edit
    if key == "codex":
        from . import codex

        return codex.edit
    raise ValueError(f"unknown provider {name!r} (use grok, openrouter, or codex)")
