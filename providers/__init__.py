from __future__ import annotations

from pathlib import Path
from typing import Callable

EditFn = Callable[..., Path]


def get_provider(name: str) -> EditFn:
    if name == "grok":
        from . import grok

        return grok.edit
    if name == "codex":
        from . import codex

        return codex.edit
    raise ValueError(f"unknown provider {name!r}")
