#!/usr/bin/env python3
"""
group_brackets.py v1.1 — validate RAW intake and group 3-shot bracket sets.

Deterministic core of the photo pipeline. No network, no AI.

  python3 group_brackets.py --intake 00_intake/JOB --raw 10_raw/JOB \
      --state _state/JOB --exceptions 99_exceptions/JOB [--gap 2.5] \
      [--exts arw,dng] [--min-ev-step 0.5] [--max-ev-step 4.0] [--dry-run]

Testing without exiftool/files:
  python3 group_brackets.py --from-json fixture.json --state /tmp/s --dry-run

Reads EXIF via `exiftool -json`. Groups frames into bracket sets by capture-time
proximity (default gap 2.5 s), computed per camera. Orders frames dark->bright
using ExposureCompensation when present, else relative EV100 computed from
shutter/aperture/ISO (higher EV100 = less light = darker frame). Validated sets
must pass an EV-spacing sanity check. Writes _state/sets.json + job.json,
moves validated RAW copy-verify-delete, quarantines leftovers with reasons.
Exit codes: 0 ok, 1 fatal (bad args / nothing usable), 2 ok-with-quarantines.

v1.1 changes:
  * --exts: comma-separated RAW extensions accepted in the intake
    (default "arw,dng", case-insensitive — DJI drones shoot .dng).
  * Per-camera clustering: frames group by EXIF Model (strip + case-fold,
    empty/missing -> "unknown") before time-gap clustering; each camera group
    is clustered separately. Sets carry a "camera" field and are numbered
    globally, sorted by each set's first-frame timestamp.
  * Cluster splitting: clusters of exactly 3 -> one candidate set. Clusters
    of 4-5 split at the single largest internal time gap into triplet +
    leftover. Clusters of >=6 chunk into consecutive chronological triplets.
    Leftovers/remainders are quarantined ("leftover after triplet split");
    all split decisions are logged ("cluster_split").
  * EV sanity: after ordering, adjacent dark->bright spacings must lie within
    [--min-ev-step, --max-ev-step] stops (defaults 0.5 / 4.0), else the whole
    triplet is quarantined ("implausible EV spacing (X.XX, Y.YY stops)").
  * The v1.0 sequence-guess fallback is removed: triplets whose exposures are
    not distinguishable by ExposureCompensation or EV100 are quarantined
    ("exposures not distinguishable"); EV labels are never invented.
  * confidence "high" = ordered from distinct ExposureCompensation, or from
    EV100 with every adjacent spacing in [1.0, 3.0] stops; otherwise "low"
    (still accepted when inside the sanity bounds).
  * Collision reconciliation: frames[].file records the STORED (possibly
    renamed) filename; on rename frames[].original_name keeps the intake
    basename and a "renamed" event is logged per collision.
  * Idempotent re-runs: (a) empty intake + populated raw dir + existing
    sets.json -> log "already_grouped", exit 0 without rewriting state;
    (b) during moves, a frame whose source vanished but whose basename already
    sits in the raw dir is treated as already moved ("already_moved").

Fixture mode (--from-json) skips exiftool and all file moves, so the move-phase
deltas above are no-ops there. sha256 is computed from the intake path pre-move.
"""

import argparse, hashlib, json, math, os, re, shutil, subprocess, sys
from datetime import datetime

JOB_RE = re.compile(r"^\d{8}[_-][a-z0-9-]+$")


def log(state_dir, event, **kw):
    rec = {"at": datetime.now().astimezone().isoformat(), "event": event, **kw}
    os.makedirs(state_dir, exist_ok=True)
    with open(os.path.join(state_dir, "log.jsonl"), "a") as f:
        f.write(json.dumps(rec) + "\n")
    print(f"[{event}] " + json.dumps(kw, default=str))


def atomic_write(path, obj):
    tmp = path + ".tmp"
    with open(tmp, "w") as f:
        json.dump(obj, f, indent=2)
    os.replace(tmp, path)


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def parse_exts(s):
    """'arw, DNG' -> {'.arw', '.dng'} (comma-separated, case-insensitive)."""
    return {"." + e.strip().lstrip(".").lower() for e in str(s).split(",") if e.strip()}


def is_raw_file(name, exts):
    return os.path.splitext(name)[1].lower() in exts


def check_intake(intake_dir, exts):
    """Return (reason, detail) if the intake dir must be rejected, else None."""
    names = [n for n in os.listdir(intake_dir) if not n.startswith(".")]
    bad = [n for n in names if n != "overrides.json" and not is_raw_file(n, exts)]
    if bad:
        return "non-RAW files present", bad
    for n in names:
        if n != "overrides.json" and os.path.getsize(os.path.join(intake_dir, n)) == 0:
            return "zero-byte file", n
    return None


def already_grouped(intake_dir, raw_dir, state_dir, exts):
    """Re-run guard (a): intake has no RAWs, raw dir is populated, sets.json
    exists -> a previous run already grouped this job."""
    try:
        if any(is_raw_file(n, exts) for n in os.listdir(intake_dir)):
            return False
    except OSError:
        return False
    try:
        if not any(not n.startswith(".") for n in os.listdir(raw_dir)):
            return False
    except OSError:
        return False
    return os.path.exists(os.path.join(state_dir, "sets.json"))


def read_exif(intake_dir, exts):
    cmd = ["exiftool", "-json", "-fast2", "-DateTimeOriginal", "-SubSecTimeOriginal",
           "-ExposureCompensation", "-FNumber", "-ExposureTime", "-ISO", "-Model"]
    for e in sorted(exts):
        cmd += ["-ext", e.lstrip(".")]
    cmd.append(intake_dir)
    out = subprocess.run(cmd, capture_output=True, text=True)
    if out.returncode not in (0, 1):  # exiftool returns 1 on minor warnings
        raise RuntimeError(f"exiftool failed: {out.stderr.strip()[:400]}")
    return json.loads(out.stdout or "[]")


def parse_dt(rec):
    raw = rec.get("DateTimeOriginal")
    if not raw:
        return None
    try:
        dt = datetime.strptime(str(raw), "%Y:%m:%d %H:%M:%S")
    except ValueError:
        return None
    sub = str(rec.get("SubSecTimeOriginal", "") or "")
    frac = float("0." + sub) if sub.isdigit() else 0.0
    return dt.timestamp() + frac


def parse_num(v):
    if v is None:
        return None
    s = str(v).strip()
    try:
        if "/" in s:
            a, b = s.split("/", 1)
            return float(a) / float(b)
        return float(s)
    except (ValueError, ZeroDivisionError):
        return None


def ev100(rec):
    """Relative brightness proxy. Higher = darker capture."""
    n, t, iso = (parse_num(rec.get("FNumber")), parse_num(rec.get("ExposureTime")),
                 parse_num(rec.get("ISO")))
    if not n or not t or not iso or t <= 0 or iso <= 0:
        return None
    return math.log2((n * n) / t) - math.log2(iso / 100.0)


def camera_of(rec):
    """Normalized EXIF Model used for per-camera clustering."""
    return str(rec.get("Model") or "").strip().casefold() or "unknown"


def cluster_by_gap(frames, gap):
    """frames: list of dicts with 'ts' (sorted). Returns list of clusters."""
    clusters, cur = [], []
    for fr in frames:
        if cur and fr["ts"] - cur[-1]["ts"] > gap:
            clusters.append(cur)
            cur = []
        cur.append(fr)
    if cur:
        clusters.append(cur)
    return clusters


def split_cluster(cluster):
    """Split one camera's time-gap cluster into (candidate triplets, leftovers).

    Exactly 3 -> one triplet. 4-5 -> split at the single largest internal
    time gap into triplet + leftover. >=6 -> consecutive chronological
    triplets plus a 1-2 frame remainder."""
    n = len(cluster)
    if n == 3:
        return [cluster], []
    if n in (4, 5):
        gaps = [cluster[i + 1]["ts"] - cluster[i]["ts"] for i in range(n - 1)]
        k = gaps.index(max(gaps))
        parts = (cluster[:k + 1], cluster[k + 1:])
        return ([p for p in parts if len(p) == 3],
                [f for p in parts if len(p) != 3 for f in p])
    triplets = [cluster[i:i + 3] for i in range(0, n - n % 3, 3)]
    return triplets, cluster[n - n % 3:]


def evaluate_triplet(cluster, min_step, max_step):
    """Order a 3-frame cluster dark->bright and sanity-check EV spacing.

    Returns (ordered, method, confidence, reason). ordered is None when the
    triplet is rejected; reason then holds the quarantine reason. The v1.0
    sequence-guess path is gone: indistinguishable exposures are rejected."""
    ecs = [parse_num(f["exif"].get("ExposureCompensation")) for f in cluster]
    if all(e is not None for e in ecs) and len(set(ecs)) == len(ecs):
        vals = sorted(ecs)
        pairs = sorted(zip(ecs, cluster), key=lambda p: p[0])
        for e, f in pairs:
            f["ev"] = round(e, 2)
        method = "exposure_compensation"
    else:
        evs = [ev100(f["exif"]) for f in cluster]
        if not (all(e is not None for e in evs) and len(set(evs)) == len(evs)):
            return None, None, None, "exposures not distinguishable"
        med = sorted(evs)[len(evs) // 2]
        vals = sorted(evs, reverse=True)  # darkest first
        pairs = sorted(zip(evs, cluster), key=lambda p: -p[0])
        for e, f in pairs:
            f["ev"] = round(med - e, 2)  # dark frame -> negative label
        method = "ev100_fallback"
    spacings = [round(abs(vals[i + 1] - vals[i]), 4) for i in range(len(vals) - 1)]
    if not all(min_step <= s <= max_step for s in spacings):
        return None, None, None, ("implausible EV spacing (" +
                                  ", ".join(f"{s:.2f}" for s in spacings) + " stops)")
    confident = method == "exposure_compensation" or all(1.0 <= s <= 3.0 for s in spacings)
    return [f for _, f in pairs], method, ("high" if confident else "low"), None


def build_sets(frames, no_dt, gap, min_step, max_step, fixture, state_dir):
    """Cluster per camera, split clusters, evaluate triplets.
    Returns (sets, quarantine); sets are numbered globally by first-frame ts."""
    quarantine = list(no_dt)
    groups = {}
    for f in frames:
        groups.setdefault(f["camera"], []).append(f)
    candidates = []  # (first_ts, camera, ordered, method, confidence)
    for cam in sorted(groups):
        cam_frames = sorted(groups[cam], key=lambda f: (f["ts"], f["file"]))
        for cl in cluster_by_gap(cam_frames, gap):
            if len(cl) < 3:
                for f in cl:
                    f["why"] = f"cluster of {len(cl)}, expected 3"
                quarantine.extend(cl)
                continue
            triplets, leftovers = split_cluster(cl)
            if len(cl) != 3:
                log(state_dir, "cluster_split", camera=cam, size=len(cl),
                    triplets=[[f["file"] for f in t] for t in triplets],
                    leftovers=[f["file"] for f in leftovers])
            for tri in triplets:
                ordered, method, confidence, reason = evaluate_triplet(
                    tri, min_step, max_step)
                if ordered is None:
                    for f in tri:
                        f["why"] = reason
                    quarantine.extend(tri)
                    continue
                candidates.append((min(f["ts"] for f in tri), cam,
                                   ordered, method, confidence))
            for f in leftovers:
                f["why"] = "leftover after triplet split"
            quarantine.extend(leftovers)
    candidates.sort(key=lambda c: c[0])
    sets = []
    for i, (_, cam, ordered, method, confidence) in enumerate(candidates):
        sets.append({"set_id": f"set_{i+1:03d}", "camera": cam, "category": None,
                     "state": "pending", "grouping": method,
                     "confidence": confidence,
                     "frames": [{"file": f["file"], "ev": f["ev"],
                                 "ts": f["ts"],
                                 "sha256": (sha256_file(f["path"])
                                            if not fixture and f.get("path")
                                            and os.path.exists(f["path"]) else None)}
                                for f in ordered]})
    return sets, quarantine


def safe_move(src, dst_dir, dry):
    os.makedirs(dst_dir, exist_ok=True)
    dst = os.path.join(dst_dir, os.path.basename(src))
    if os.path.exists(dst):
        h8 = sha256_file(src)[:8]
        root, ext = os.path.splitext(dst)
        dst = f"{root}-{h8}{ext}"
    if dry:
        return dst
    shutil.copy2(src, dst)
    if os.path.getsize(src) != os.path.getsize(dst):
        os.remove(dst)
        raise RuntimeError(f"copy size mismatch: {src}")
    os.remove(src)
    return dst


def move_frame(state_dir, intake_dir, raw_dir, fr, dry):
    """Move one validated frame intake->raw. Returns the stored basename.

    Re-run guard (b): source missing but basename already in the raw dir ->
    already moved, skip. On a collision rename, records original_name and
    logs "renamed"."""
    src = os.path.join(intake_dir, fr["file"])
    if not os.path.exists(src):
        if os.path.exists(os.path.join(raw_dir, fr["file"])):
            log(state_dir, "already_moved", file=fr["file"])
            return fr["file"]
        raise RuntimeError(f"frame missing from intake and raw: {fr['file']}")
    dst = safe_move(src, raw_dir, dry)
    stored = os.path.basename(dst)
    if stored != fr["file"]:
        log(state_dir, "renamed", **{"from": fr["file"], "to": stored})
        fr["original_name"] = fr["file"]
    return stored


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--intake")
    ap.add_argument("--raw")
    ap.add_argument("--state", required=True)
    ap.add_argument("--exceptions")
    ap.add_argument("--gap", type=float, default=2.5)
    ap.add_argument("--min-ev-step", type=float, default=0.5)
    ap.add_argument("--max-ev-step", type=float, default=4.0)
    ap.add_argument("--exts", default="arw,dng",
                    help="comma-separated RAW extensions (case-insensitive)")
    ap.add_argument("--job-id")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--from-json", help="EXIF records fixture (skips exiftool + moves)")
    a = ap.parse_args()

    exts = parse_exts(a.exts)
    if not exts:
        sys.exit("--exts produced no usable extensions")
    if not (0 < a.min_ev_step <= a.max_ev_step):
        sys.exit("require 0 < --min-ev-step <= --max-ev-step")
    fixture = bool(a.from_json)
    if not fixture and not (a.intake and a.raw):
        sys.exit("--intake and --raw required (or use --from-json)")
    job_id = a.job_id or os.path.basename((a.intake or a.state).rstrip("/"))
    if not JOB_RE.match(job_id):
        print(f"WARNING: job id '{job_id}' does not match YYYYMMDD_address-slug")
    os.makedirs(a.state, exist_ok=True)

    # ---- idempotent re-run guard (a); real-file mode only ----
    if not fixture and already_grouped(a.intake, a.raw, a.state, exts):
        log(a.state, "already_grouped", job=job_id)
        print("note: intake has no RAWs, raw dir is populated and sets.json "
              "exists - already grouped, leaving state untouched")
        sys.exit(0)

    # ---- read metadata ----
    if fixture:
        with open(a.from_json) as f:
            records = json.load(f)
    else:
        problem = check_intake(a.intake, exts)
        if problem:
            reason, detail = problem
            log(a.state, "intake_rejected", reason=reason,
                **({"files": detail} if isinstance(detail, list) else {"file": detail}))
            sys.exit(1)
        records = read_exif(a.intake, exts)

    frames, no_dt = [], []
    for rec in records:
        ts = parse_dt(rec)
        entry = {"file": os.path.basename(rec.get("SourceFile", "?")),
                 "path": rec.get("SourceFile"), "ts": ts,
                 "camera": camera_of(rec), "exif": rec}
        (frames if ts is not None else no_dt).append(entry)
    if no_dt:
        log(a.state, "no_timestamp", files=[f["file"] for f in no_dt])
    if len(no_dt) > max(1, 0.05 * len(records)):  # grace for 1 corrupt frame
        log(a.state, "intake_rejected", reason=">5% frames missing EXIF timestamps")
        sys.exit(1)
    if not frames:
        log(a.state, "intake_rejected", reason="no usable frames")
        sys.exit(1)

    sets, quarantine = build_sets(frames, no_dt, a.gap, a.min_ev_step,
                                  a.max_ev_step, fixture, a.state)

    # ---- move files (fixture mode skips all moves) ----
    if not fixture:
        for s in sets:
            for fr in s["frames"]:
                fr["file"] = move_frame(a.state, a.intake, a.raw, fr, a.dry_run)
        if a.exceptions:
            os.makedirs(a.exceptions, exist_ok=True)
            for f in quarantine:
                if f.get("path") and os.path.exists(f["path"]):
                    safe_move(f["path"], a.exceptions, a.dry_run)
            if quarantine and not a.dry_run:
                with open(os.path.join(a.exceptions, "reason.txt"), "a") as fh:
                    for f in quarantine:
                        fh.write(f"{f['file']}: {f.get('why', 'no timestamp')}\n")
        ov = os.path.join(a.intake, "overrides.json")
        if os.path.exists(ov) and not a.dry_run:
            shutil.copy2(ov, os.path.join(a.state, "overrides.json"))

    # ---- persist state (after moves so frames[].file holds stored names) ----
    now = datetime.now().astimezone().isoformat()
    atomic_write(os.path.join(a.state, "sets.json"),
                 {"job_id": job_id, "created_at": now, "gap_seconds": a.gap,
                  "min_ev_step": a.min_ev_step, "max_ev_step": a.max_ev_step,
                  "exts": sorted(e.lstrip(".") for e in exts),
                  "sets": sets,
                  "quarantined": [{"file": f["file"], "reason": f.get("why", "no timestamp")}
                                  for f in quarantine]})
    atomic_write(os.path.join(a.state, "job.json"),
                 {"job_id": job_id, "state": "GROUPED",
                  "history": [{"state": s, "at": now} for s in
                              ("NEW", "VALIDATED", "GROUPED")],
                  "counts": {"sets": len(sets), "frames": len(frames),
                             "quarantined": len(quarantine)}})

    log(a.state, "grouped", job=job_id, sets=len(sets),
        quarantined=len(quarantine), dry_run=a.dry_run)
    for s in sets:
        print(f"  {s['set_id']} [{s['camera']}/{s['grouping']}/{s['confidence']}]: " +
              ", ".join(f"{f['file']}({f['ev']:+.1f})" for f in s["frames"]))
    sys.exit(2 if quarantine else 0)


if __name__ == "__main__":
    main()
