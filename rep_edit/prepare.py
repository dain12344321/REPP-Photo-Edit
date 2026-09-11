"""Preflight stills for Imagine: 3:2 preserved, 2K long edge, high-quality JPEG."""

from __future__ import annotations

from pathlib import Path

from PIL import Image

from .constants import MIN_OUTPUT_LONG_EDGE, PREFLIGHT_JPEG_QUALITY, PREFLIGHT_LONG_EDGE


def prepare_for_imagine(
    path: Path,
    dest: Path,
    *,
    long_edge: int = PREFLIGHT_LONG_EDGE,
    quality: int = PREFLIGHT_JPEG_QUALITY,
) -> Path:
    """Write a 2K-capped JPEG for the Imagine request. Never upscale."""
    with Image.open(path) as im:
        rgb = im.convert("RGB")
        w, h = rgb.size
        longest = max(w, h)
        if longest > long_edge:
            scale = long_edge / longest
            rgb = rgb.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.Resampling.LANCZOS)
        dest.parent.mkdir(parents=True, exist_ok=True)
        tmp = dest.with_suffix(dest.suffix + ".tmp")
        rgb.save(tmp, format="JPEG", quality=quality, subsampling=0, optimize=True)
        tmp.replace(dest)
    return dest


def output_long_edge(path: Path) -> int:
    with Image.open(path) as im:
        return max(im.size)


def output_is_2k(path: Path, *, minimum: int = MIN_OUTPUT_LONG_EDGE) -> bool:
    return output_long_edge(path) >= minimum
