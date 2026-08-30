from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

from .classify import ClassifiedItem
from .constants import MODEL_DEFAULT, VIRTUAL_SUFFIX
from .prompts import PromptPack

SCHEMA_PATH = Path(__file__).resolve().parents[1] / "schemas" / "job.schema.json"


def next_versioned_path(out_dir: Path, stem: str) -> Path:
    """Return stem_v001.jpg, bumping until the path does not exist. Never clobber."""
    out_dir.mkdir(parents=True, exist_ok=True)
    n = 1
    while True:
        candidate = out_dir / f"{stem}_v{n:03d}.jpg"
        sidecar = out_dir / f"{stem}_v{n:03d}.json"
        if not candidate.exists() and not sidecar.exists():
            return candidate
        n += 1
        if n > 999:
            raise RuntimeError(f"exhausted versions for {stem} in {out_dir}")


def output_stem(job_id: str, item: ClassifiedItem) -> str:
    suffix = VIRTUAL_SUFFIX.get(item.condition)
    parts = [job_id, item.id]
    if suffix:
        parts.append(suffix)
    return "_".join(_safe(p) for p in parts)


def build_job(
    *,
    job_id: str,
    source_dir: Path,
    items: list[ClassifiedItem],
    provider: str = "grok",
    model: str = MODEL_DEFAULT,
    out_dir: Optional[Path] = None,
) -> dict[str, Any]:
    out_dir = out_dir or (source_dir.parent / "jobs" / job_id / "outputs")
    payload_items = []
    for item in items:
        rec: dict[str, Any] = {
            "id": item.id,
            "condition": item.condition,
            "inputs": dict(item.inputs),
            "prompt_id": item.prompt_id,
            "status": item.status,
        }
        if item.flag:
            rec["flag"] = item.flag
        if item.object_list:
            rec["object_list"] = list(item.object_list)
        if item.condition != "skipped":
            rec["output"] = str(next_versioned_path(out_dir, output_stem(job_id, item)))
        payload_items.append(rec)
    return {
        "job_id": job_id,
        "source_dir": str(source_dir.resolve()),
        "provider": provider,
        "model": model,
        "created_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "items": payload_items,
    }


def write_job(job: dict[str, Any], path: Path) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(job, indent=2) + "\n", encoding="utf-8")
    tmp.replace(path)
    return path


def write_sidecar(
    *,
    output_path: Path,
    item: dict[str, Any],
    prompt: str,
    prompt_id: str,
    model: str,
    dry_run: bool,
    extra: Optional[dict[str, Any]] = None,
) -> Path:
    sidecar_path = output_path.with_suffix(".json")
    if sidecar_path.exists():
        raise FileExistsError(f"refusing to clobber sidecar {sidecar_path}")
    payload = {
        "prompt_id": prompt_id,
        "model": model,
        "condition": item.get("condition"),
        "inputs": item.get("inputs"),
        "output": str(output_path),
        "status": "pending" if dry_run else item.get("status"),
        "dry_run": dry_run,
        "prompt": prompt,
        "prompt_sha256": _sha256(prompt),
    }
    if item.get("flag"):
        payload["flag"] = item["flag"]
    if extra:
        payload.update(extra)
    sidecar_path.parent.mkdir(parents=True, exist_ok=True)
    sidecar_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    return sidecar_path


def planned_prompt(pack: PromptPack, item: dict[str, Any]) -> str:
    return pack.for_condition(
        item["condition"],
        object_list=item.get("object_list"),
    )


def validate_job(job: dict[str, Any]) -> None:
    try:
        import jsonschema  # type: ignore
    except ImportError:
        _validate_required(job)
        return
    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    jsonschema.validate(job, schema)


def _validate_required(job: dict[str, Any]) -> None:
    for key in ("job_id", "source_dir", "items"):
        if key not in job:
            raise ValueError(f"job missing {key}")
    for item in job["items"]:
        for key in ("id", "condition", "inputs", "prompt_id", "status"):
            if key not in item:
                raise ValueError(f"item missing {key}")


def _safe(value: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "-", value).strip("-")
    return cleaned or "x"


def _sha256(text: str) -> str:
    import hashlib

    return hashlib.sha256(text.encode("utf-8")).hexdigest()
