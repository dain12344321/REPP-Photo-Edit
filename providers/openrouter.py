from __future__ import annotations

import base64
import json
import os
import ssl
import time
import urllib.error
import urllib.request
from pathlib import Path

from rep_edit.constants import ASPECT_RATIO, MAX_INPUT_IMAGES, RESOLUTION

OPENROUTER_URL = "https://openrouter.ai/api/v1/images"
OPENROUTER_MODEL_DEFAULT = "x-ai/grok-imagine-image-quality"

# Short xAI slugs from this repo map onto OpenRouter model ids.
_MODEL_ALIASES = {
    "grok-imagine-image-2.0": "x-ai/grok-imagine-image-quality",
    "grok-imagine-image": "x-ai/grok-imagine-image-quality",
    "grok-imagine-image-quality": "x-ai/grok-imagine-image-quality",
}


def edit(
    images: list[Path],
    prompt: str,
    out_path: Path,
    *,
    dry_run: bool = False,
    model: str | None = None,
    aspect_ratio: str = ASPECT_RATIO,
    resolution: str = RESOLUTION,
    api_key: str | None = None,
    timeout: int = 180,
) -> Path:
    """POST JSON to OpenRouter /api/v1/images with input_references (image-to-image)."""
    if not images:
        raise ValueError("edit() requires at least one input image")
    if len(images) > MAX_INPUT_IMAGES:
        raise ValueError(f"max {MAX_INPUT_IMAGES} input images, got {len(images)}")
    if out_path.exists():
        raise FileExistsError(f"refusing to clobber {out_path}")
    if dry_run:
        return out_path

    key = api_key if api_key is not None else os.environ.get("OPENROUTER_API_KEY", "")
    if not key:
        raise RuntimeError(
            "OPENROUTER_API_KEY is not set; pass --dry-run to plan without calling OpenRouter"
        )

    resolved = _resolve_model(model)
    body = {
        "model": resolved,
        "prompt": prompt,
        "aspect_ratio": aspect_ratio,
        "resolution": _normalize_resolution(resolution),
        "output_format": "jpeg",
        "n": 1,
        "input_references": [
            {"type": "image_url", "image_url": {"url": _data_url(p)}} for p in images
        ],
    }

    payload = json.dumps(body).encode("utf-8")
    last_error: Exception | None = None
    for attempt in range(2):
        try:
            raw = _post(payload, key, timeout=timeout)
            _write_image(raw, out_path)
            return out_path
        except urllib.error.HTTPError as exc:
            last_error = exc
            status = exc.code
            detail = exc.read().decode("utf-8", "replace")[:800]
            if status in {429, 500, 502, 503, 504} and attempt == 0:
                time.sleep(2)
                continue
            raise RuntimeError(f"OpenRouter /images HTTP {status}: {detail}") from exc
        except (urllib.error.URLError, TimeoutError, ssl.SSLError) as exc:
            last_error = exc
            if attempt == 0:
                time.sleep(2)
                continue
            raise RuntimeError(f"OpenRouter /images failed: {exc}") from exc
    raise RuntimeError(f"OpenRouter /images failed: {last_error}")


def _resolve_model(model: str | None) -> str:
    raw = (model or os.environ.get("OPENROUTER_MODEL") or OPENROUTER_MODEL_DEFAULT).strip()
    return _MODEL_ALIASES.get(raw, raw)


def _normalize_resolution(value: str) -> str:
    v = (value or "2K").strip()
    aliases = {"2k": "2K", "1k": "1K", "4k": "4K", "512": "512"}
    return aliases.get(v.lower(), v)


def _data_url(path: Path) -> str:
    blob = path.read_bytes()
    b64 = base64.b64encode(blob).decode("ascii")
    suffix = path.suffix.lower()
    mime = "image/png" if suffix == ".png" else "image/jpeg"
    return f"data:{mime};base64,{b64}"


def _post(payload: bytes, api_key: str, *, timeout: int) -> bytes:
    req = urllib.request.Request(
        OPENROUTER_URL,
        data=payload,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
            "Accept": "application/json",
            "HTTP-Referer": "https://github.com/dain12344321/REPP-Photo-Edit",
            "X-Title": "Lakeshore REP Edit",
        },
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


def _write_image(response_body: bytes, out_path: Path) -> None:
    data = json.loads(response_body.decode("utf-8"))
    item = _first_item(data)
    if not item:
        raise RuntimeError(f"unexpected OpenRouter /images response keys: {list(data)[:12]}")
    if item.get("b64_json"):
        raw = base64.b64decode(item["b64_json"])
    elif item.get("url"):
        with urllib.request.urlopen(item["url"], timeout=60) as resp:
            raw = resp.read()
    else:
        raise RuntimeError(f"no b64_json or url in response item: {list(item)[:12]}")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    tmp = out_path.with_suffix(out_path.suffix + ".tmp")
    tmp.write_bytes(raw)
    tmp.replace(out_path)


def _first_item(data: dict) -> dict:
    if isinstance(data.get("data"), list) and data["data"]:
        first = data["data"][0]
        return first if isinstance(first, dict) else {}
    if isinstance(data.get("image"), dict):
        return data["image"]
    return data if any(k in data for k in ("b64_json", "url")) else {}
