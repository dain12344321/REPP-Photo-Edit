#!/usr/bin/env python3
"""Mac Mini / Grokbot loop: watch a folder, ingest, Imagine-edit, write outputs.

Offline except for the Imagine POST. Pair with rclone if you want Drive in/out:

    rclone sync Drive:INBOX/{listing} ./inbox
    python scripts/watch_inbox.py ./inbox --out ./out --once
    rclone copy ./out Drive:OUTBOX/{listing}

Official folder IDs: FOLDERS.md (INBOX card dumps, OUTBOX delivered stills).

Polls every --interval seconds. A job starts when JPEGs appear and settle
(no size change for --settle seconds). Outputs are never overwritten.
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


def _jpeg_fingerprint(folder: Path) -> tuple[tuple[str, int], ...]:
    rows = []
    for p in sorted(folder.glob("*")):
        if p.suffix.lower() in {".jpg", ".jpeg"} and p.is_file():
            rows.append((p.name, p.stat().st_size))
    return tuple(rows)


def _run(cmd: list[str]) -> int:
    print("+", " ".join(cmd), flush=True)
    return subprocess.call(cmd, cwd=str(ROOT))


def run_once(inbox: Path, out: Path, job_id: str, dry_run: bool) -> int:
    if not any(inbox.glob("*.jpg")) and not any(inbox.glob("*.jpeg")):
        print("empty inbox", inbox)
        return 0
    out.mkdir(parents=True, exist_ok=True)
    job_path = out / "job.json"
    ingest = [
        sys.executable,
        str(ROOT / "scripts" / "ingest.py"),
        str(inbox),
        "--job-id",
        job_id,
        "--out",
        str(job_path),
    ]
    code = _run(ingest)
    if code != 0:
        return code
    run = [sys.executable, str(ROOT / "scripts" / "run_job.py"), str(job_path)]
    if dry_run:
        run.append("--dry-run")
    return _run(run)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Watch an inbox and run REP Edit")
    parser.add_argument("inbox", type=Path)
    parser.add_argument("--out", type=Path, default=Path("jobs/watch/outputs"))
    parser.add_argument("--job-id", default="watch")
    parser.add_argument("--interval", type=int, default=30)
    parser.add_argument("--settle", type=int, default=8)
    parser.add_argument("--once", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args(argv)

    inbox = args.inbox.expanduser().resolve()
    inbox.mkdir(parents=True, exist_ok=True)
    last: tuple[tuple[str, int], ...] | None = None

    while True:
        fp = _jpeg_fingerprint(inbox)
        if args.once:
            return run_once(inbox, args.out.expanduser().resolve(), args.job_id, args.dry_run)
        if fp and fp == last:
            time.sleep(args.settle)
            if _jpeg_fingerprint(inbox) == fp:
                marker = args.out.expanduser().resolve() / ".last-fingerprint.json"
                marker.parent.mkdir(parents=True, exist_ok=True)
                prev = marker.read_text() if marker.exists() else ""
                if json.dumps(fp) != prev:
                    code = run_once(inbox, args.out.expanduser().resolve(), args.job_id, args.dry_run)
                    marker.write_text(json.dumps(fp))
                    if code != 0:
                        print("job failed", code, flush=True)
        last = fp
        time.sleep(args.interval)


if __name__ == "__main__":
    raise SystemExit(main())
