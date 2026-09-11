#!/usr/bin/env python3
"""Quality-test 3 stills per listing at grok-imagine-image-2.0 / 2k / medium.

Writes MLS-named JPEGs + JSON sidecars into artifacts/outbox/TEST_RESULTS.
"""
from __future__ import annotations

import json
import sys
import traceback
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from PIL import Image

from providers.grok import edit
from rep_edit.job import write_sidecar
from rep_edit.prepare import output_long_edge
from rep_edit.prompts import load_prompt_pack

OUT = Path("/workspace/artifacts/outbox/TEST_RESULTS")
PUBLIC = Path("/workspace/public/gallery/test-results")
PACK = load_prompt_pack()
NOW = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

LISTINGS = {
    "flag": {
        "name": "1642 Flag Ct, Crown Point, IN 46307",
        "slug": "1642_Flag_Ct_Crown_Point_IN_46307",
        "folder": "1642 Flag Ct, Crown Point, IN 46307",
    },
    "wanatah": {
        "name": "405 N Main St, Wanatah, IN 46390",
        "slug": "405_N_Main_St_Wanatah_IN_46390",
        "folder": "405 N Main St, Wanatah, IN 46390",
    },
}

# MLS order: exteriors, interiors, aerials. Three per listing.
SHOTS = [
    {
        "listing": "flag",
        "n": 1,
        "tag": "MLS",
        "condition": "exterior_single",
        "room": "Hero front",
        "source_kind": "card",
        "source": Path("/workspace/artifacts/card/ext/_SA90369.JPG"),
        "aspect": "3:2",
        "note": "Sony card hero. House number 1642 on the brick column. Person on stoop kept.",
    },
    {
        "listing": "flag",
        "n": 2,
        "tag": "MLS",
        "condition": "interior_single",
        "room": "Hall bath",
        "source_kind": "card",
        "source": Path("/workspace/artifacts/card/int/_SA90357.JPG"),
        "aspect": "3:2",
        "note": "Window-truth test. Frosted/privacy glass over the tub — must stay frosted, no invented yard or water.",
    },
    {
        "listing": "flag",
        "n": 3,
        "tag": "MLS",
        "condition": "drone",
        "room": "Aerial front",
        "source_kind": "card",
        "source": Path("/workspace/artifacts/card/dji/DJI_0130.JPG"),
        "aspect": "4:3",
        "note": "DJI nadir-ish front. Prompt removes cars/people. Keep lot shape.",
    },
    {
        "listing": "wanatah",
        "n": 1,
        "tag": "MLS",
        "condition": "exterior_single",
        "room": "Hero front",
        "source_kind": "gold-regrade",
        "source": Path("/workspace/public/gallery/wanatah/002_MLS.jpg"),
        "aspect": "3:2",
        "note": "Wanatah gold exterior re-run at true 2K. Drive card dump did not land in this sandbox except _SA90451.",
    },
    {
        "listing": "wanatah",
        "n": 2,
        "tag": "MLS",
        "condition": "interior_single",
        "room": "Living room",
        "source_kind": "card",
        "source": Path("/workspace/artifacts/wanatah-card/_SA90451.JPG"),
        "aspect": "3:2",
        "note": "Sony card living. Real sliding-door view (yard, trees, neighbor) — Lisa pull allowed. Bias +1 EV single.",
    },
    {
        "listing": "wanatah",
        "n": 3,
        "tag": "MLS",
        "condition": "interior_single",
        "room": "Bedroom",
        "source_kind": "gold-regrade",
        "source": Path("/workspace/public/gallery/wanatah/015_MLS.jpg"),
        "aspect": "3:2",
        "note": "Wanatah gold bedroom re-run at true 2K. Carpet-weave texture check.",
    },
]


def dest_for(shot: dict) -> Path:
    listing = LISTINGS[shot["listing"]]
    name = f"{listing['slug']}_{shot['n']:03d}_{shot['tag']}.jpg"
    return OUT / listing["folder"] / name


def run_one(shot: dict) -> dict:
    listing = LISTINGS[shot["listing"]]
    out = dest_for(shot)
    out.parent.mkdir(parents=True, exist_ok=True)
    prompt = PACK.for_condition(shot["condition"])
    rec = {
        "listing": listing["name"],
        "slug": listing["slug"],
        "n": shot["n"],
        "tag": shot["tag"],
        "room": shot["room"],
        "condition": shot["condition"],
        "source_kind": shot["source_kind"],
        "source": str(shot["source"]),
        "output": str(out),
        "prompt_id": shot["condition"],
        "model": "grok-imagine-image-2.0",
        "quality": "medium",
        "resolution": "2k",
        "aspect_ratio": shot["aspect"],
        "pack_version": PACK.version_line,
        "note": shot["note"],
        "created_at": NOW,
    }
    print(f"START  {out.name}  {shot['condition']}  {shot['source'].name}", flush=True)
    try:
        if out.exists():
            rec["status"] = "exists"
            rec["long_edge"] = output_long_edge(out)
            print(f"SKIP   {out.name} already exists", flush=True)
            return rec
        edit(
            [shot["source"]],
            prompt,
            out,
            aspect_ratio=shot["aspect"],
            timeout=240,
        )
        rec["status"] = "done"
        rec["long_edge"] = output_long_edge(out) if out.exists() else 0
        rec["bytes"] = out.stat().st_size if out.exists() else 0
        if rec["long_edge"] < 1920:
            rec["flag"] = f"long edge {rec['long_edge']} < 1920"
        write_sidecar(
            output_path=out,
            item={
                "condition": shot["condition"],
                "inputs": {"single": str(shot["source"])},
                "status": rec["status"],
                "flag": rec.get("flag"),
            },
            prompt=prompt,
            prompt_id=shot["condition"],
            model="grok-imagine-image-2.0",
            dry_run=False,
            extra={
                "provider": "grok",
                "pack_version": PACK.version_line,
                "listing": listing["name"],
                "slug": listing["slug"],
                "room": shot["room"],
                "source_kind": shot["source_kind"],
                "n": shot["n"],
                "tag": shot["tag"],
                "quality": "medium",
                "resolution": "2k",
                "aspect_ratio": shot["aspect"],
                "long_edge": rec["long_edge"],
                "note": shot["note"],
                "test_results": True,
            },
        )
        print(f"DONE   {out.name}  {rec['long_edge']}px  {rec.get('bytes', 0)} bytes", flush=True)
    except Exception as exc:  # noqa: BLE001
        rec["status"] = "error"
        rec["flag"] = str(exc)
        rec["trace"] = traceback.format_exc()[-1500:]
        print(f"ERROR  {out.name}  {exc}", flush=True)
    return rec


def copy_public(rec: dict) -> None:
    if rec.get("status") not in {"done", "exists"}:
        return
    src = Path(rec["output"])
    if not src.exists():
        return
    PUBLIC.mkdir(parents=True, exist_ok=True)
    dest = PUBLIC / src.name
    dest.write_bytes(src.read_bytes())


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    PUBLIC.mkdir(parents=True, exist_ok=True)
    results: list[dict] = []
    with ThreadPoolExecutor(max_workers=3) as pool:
        futs = {pool.submit(run_one, shot): shot for shot in SHOTS}
        for fut in as_completed(futs):
            rec = fut.result()
            copy_public(rec)
            results.append(rec)
    results.sort(key=lambda r: (0 if "Flag" in r["listing"] else 1, r["n"]))
    manifest = {
        "label": "TEST RESULTS",
        "created_at": NOW,
        "model": "grok-imagine-image-2.0",
        "quality": "medium",
        "resolution": "2k",
        "pack_version": PACK.version_line,
        "note": (
            "Highest quality the 2.0 edit API serves is quality=medium at 2k "
            "(high is rejected). Frozen prompt pack + keep-clause, window-truth locked."
        ),
        "items": results,
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    (PUBLIC / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print("\n=== TEST RESULTS ===")
    for rec in results:
        print(
            f"{rec['status']:7} {rec['slug']}_{rec['n']:03d}_{rec['tag']}.jpg  "
            f"{rec.get('long_edge', '?')}  {rec.get('flag', '')}"
        )
    print(f"manifest {OUT / 'manifest.json'}")
    return 0 if all(r.get("status") in {"done", "exists"} for r in results) else 1


if __name__ == "__main__":
    raise SystemExit(main())
