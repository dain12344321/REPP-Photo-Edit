from __future__ import annotations

import base64
import json
import os
import ssl
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path

from rep_edit.constants import (
    ALLOWED_MODELS,
    ASPECT_RATIO,
    EDIT_URL,
    MAX_INPUT_IMAGES,
    MODEL_DEFAULT,
    QUALITY,
    RESOLUTION,
)
from rep_edit.prepare import prepare_for_imagine

# Do not use the OpenAI SDK multipart images.edit() helper against api.x.ai.
# Do not call grok-imagine-image (1.0) or any cheaper/smaller model for MLS stills.


def edit(
    images: list[Path],
    prompt: str,
    out_path: Path,
    *,
    dry_run: bool = False,
    model: str = MODEL_DEFAULT,
    aspect_ratio: str = ASPECT_RATIO,
    resolution: str = RESOLUTION,
    quality: str = QUALITY,
    api_key: str | None = None,
    timeout: int = 180,
) -> Path:
    """POST JSON to /v1/images/edits. Local files as data:image/jpeg;base64."""
    if not images:
        raise ValueError("edit() requires at least one input image")
    if len(images) > MAX_INPUT_IMAGES:
        raise ValueError(f"max {MAX_INPUT_IMAGES} input images, got {len(images)}")
    if out_path.exists():
        raise FileExistsError(f"refusing to clobber {out_path}")
    if model not in ALLOWED_MODELS:
        raise ValueError(
            f"refusing model {model!r}; MLS stills must use grok-imagine-image-2.0"
        )
    if resolution != "2k":
        raise ValueError(f"refusing resolution {resolution!r}; MLS stills must be 2k")
    if quality != "medium":
        raise ValueError(f"refusing quality {quality!r}; MLS stills must be medium")
    if dry_run:
        return out_path

    key = api_key if api_key is not None else os.environ.get("XAI_API_KEY", "")
    if not key:
        raise RuntimeError("XAI_API_KEY is not set; pass --dry-run to plan without calling Imagine")

    body: dict = {
        "model": model,
        "prompt": prompt,
        "aspect_ratio": aspect_ratio,
        "resolution": resolution,
        "quality": quality,
        "response_format": "b64_json",
    }
    with tempfile.TemporaryDirectory(prefix="rep-edit-2k-") as tmp:
        prepared = [
            prepare_for_imagine(src, Path(tmp) / f"{i:02d}.jpg")
            for i, src in enumerate(images)
        ]
        encoded = [_data_url(p) for p in prepared]
    if len(encoded) == 1:
        body["image"] = {"url": encoded[0], "type": "image_url"}
    else:
        body["images"] = [{"url": url, "type": "image_url"} for url in encoded]

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
            raise RuntimeError(f"xAI images/edits HTTP {status}: {detail}") from exc
        except (urllib.error.URLError, TimeoutError, ssl.SSLError) as exc:
            last_error = exc
            if attempt == 0:
                time.sleep(2)
                continue
            raise RuntimeError(f"xAI images/edits failed: {exc}") from exc
    raise RuntimeError(f"xAI images/edits failed: {last_error}")


def _data_url(path: Path) -> str:
    blob = path.read_bytes()
    b64 = base64.b64encode(blob).decode("ascii")
    return f"data:image/jpeg;base64,{b64}"


def _post(payload: bytes, api_key: str, *, timeout: int) -> bytes:
    req = urllib.request.Request(
        EDIT_URL,
        data=payload,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
            "Accept": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


def _write_image(response_body: bytes, out_path: Path) -> None:
    data = json.loads(response_body.decode("utf-8"))
    item = _first_item(data)
    if not item:
        raise RuntimeError(f"unexpected images/edits response keys: {list(data)[:12]}")
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
