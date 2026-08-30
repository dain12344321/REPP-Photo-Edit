#!/usr/bin/env python3
"""Ingest a folder of Sony JPEGs, group 3-EV stacks, classify, write job.json.

Never calls Imagine. Pixel prompts are loaded later by run_job.py from
prompts/imagine-shot-prompts.md — they are not inlined here.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from rep_edit.classify import classify_folder, load_brief
from rep_edit.job import build_job, validate_job, write_job


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Ingest Sony JPEGs into a REP Edit job.json")
    parser.add_argument("source_dir", type=Path, help="Folder of JPEG stills")
    parser.add_argument("--job-id", default="", help="Defaults to the source folder name")
    parser.add_argument("--out", type=Path, default=None, help="Path to write job.json")
    parser.add_argument("--out-dir", type=Path, default=None, help="Directory for versioned outputs")
    parser.add_argument("--provider", choices=("grok", "codex"), default="grok")
    parser.add_argument(
        "--twilight-from-exteriors",
        action="store_true",
        help="Add virtual_twilight candidates for every classified exterior_single",
    )
    parser.add_argument("--brief", type=Path, default=None, help="Optional brief.json override")
    args = parser.parse_args(argv)

    source = args.source_dir.expanduser().resolve()
    if not source.is_dir():
        print(f"source is not a directory: {source}", file=sys.stderr)
        return 2

    job_id = args.job_id or source.name
    out_json = args.out or (ROOT / "jobs" / job_id / "job.json")
    out_dir = args.out_dir or (out_json.parent / "outputs")

    if args.brief:
        import json

        from rep_edit.classify import parse_brief

        brief = parse_brief(json.loads(args.brief.read_text(encoding="utf-8")))
    else:
        brief = load_brief(source)

    items = classify_folder(
        source,
        brief=brief,
        twilight_from_exteriors=True if args.twilight_from_exteriors else None,
    )
    job = build_job(
        job_id=job_id,
        source_dir=source,
        items=items,
        provider=args.provider,
        out_dir=out_dir,
    )
    validate_job(job)
    write_job(job, out_json)

    pending = sum(1 for i in job["items"] if i["status"] == "pending")
    skipped = sum(1 for i in job["items"] if i["status"] == "skipped")
    print(f"wrote {out_json}")
    print(f"job_id={job_id} items={len(job['items'])} pending={pending} skipped={skipped}")
    for item in job["items"]:
        flag = f"  flag={item['flag']}" if item.get("flag") else ""
        print(f"  {item['id']:16} {item['condition']:20} {item['status']}{flag}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
