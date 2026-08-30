#!/usr/bin/env python3
"""Run a REP Edit job.json against Grok Imagine edits (or dry-run).

Loads shot prompts + keep-clause from prompts/imagine-shot-prompts.md.
Never sends prompts/source-long-REFERENCE-ONLY.md.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from providers import get_provider
from rep_edit.job import planned_prompt, validate_job, write_job, write_sidecar
from rep_edit.prompts import load_prompt_pack


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run or dry-run a REP Edit job")
    parser.add_argument("job", type=Path, help="Path to job.json")
    parser.add_argument("--dry-run", action="store_true", help="Plan outputs and sidecars; no API calls")
    parser.add_argument("--provider", default="", help="Override job.provider (grok|codex)")
    parser.add_argument("--item", action="append", default=[], help="Only these item ids (repeatable)")
    parser.add_argument("--limit", type=int, default=0, help="Max live edits this invocation")
    parser.add_argument("--prompts", type=Path, default=None, help="Override prompt pack path")
    args = parser.parse_args(argv)

    job_path = args.job.expanduser().resolve()
    job = json.loads(job_path.read_text(encoding="utf-8"))
    validate_job(job)

    pack = load_prompt_pack(args.prompts)
    provider_name = args.provider or job.get("provider") or "grok"
    model = job.get("model") or "grok-imagine-image-2.0"
    edit = get_provider(provider_name)

    wanted = set(args.item)
    live_done = 0
    for item in job["items"]:
        if wanted and item["id"] not in wanted:
            continue
        if item["condition"] == "skipped" or item["status"] == "skipped":
            continue
        if item["status"] == "done":
            continue

        try:
            prompt = planned_prompt(pack, item)
        except ValueError as exc:
            item["status"] = "skipped"
            item["flag"] = str(exc)
            continue

        out_path = Path(item["output"])
        images = _input_paths(item)
        missing = [p for p in images if not p.is_file()]
        if missing:
            item["status"] = "error"
            item["flag"] = "missing input: " + ", ".join(str(p) for p in missing)
            continue

        sidecar_path = out_path.with_suffix(".json")
        if not sidecar_path.exists():
            write_sidecar(
                output_path=out_path,
                item=item,
                prompt=prompt,
                prompt_id=item["prompt_id"],
                model=model,
                dry_run=args.dry_run,
                extra={"provider": provider_name, "pack_version": pack.version_line},
            )

        if args.dry_run:
            item["status"] = "pending"
            print(f"dry-run  {item['id']:16} {item['condition']:20} → {out_path.name}")
            print(f"         sidecar {sidecar_path.name}  prompt_id={item['prompt_id']}")
            continue

        if args.limit and live_done >= args.limit:
            print(f"limit    {item['id']} held (live --limit {args.limit})")
            continue

        try:
            edit(images, prompt, out_path, dry_run=False, model=model)
            item["status"] = "done"
            live_done += 1
            print(f"done     {item['id']:16} {item['condition']:20} → {out_path}")
        except Exception as exc:  # noqa: BLE001 — surface provider errors on the item
            item["status"] = "error"
            item["flag"] = str(exc)
            print(f"error    {item['id']:16} {exc}", file=sys.stderr)

    write_job(job, job_path)
    print(f"updated {job_path}")
    return 0


def _input_paths(item: dict) -> list[Path]:
    inputs = item.get("inputs") or {}
    condition = item.get("condition")
    if condition == "interior_hdr":
        order = ("middle", "dark", "bright")
    elif condition == "window_pull":
        order = ("middle", "dark")
    else:
        order = tuple(k for k in ("single", "middle", "dark", "bright") if k in inputs)
    paths = []
    for key in order:
        if key in inputs:
            paths.append(Path(inputs[key]))
    return paths


if __name__ == "__main__":
    raise SystemExit(main())
