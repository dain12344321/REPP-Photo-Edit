#!/usr/bin/env python3
"""
Offline test suite for group_brackets.py v1.1.

Stdlib unittest only: no pytest, no third-party deps, no network, no exiftool.
EXIF-driven cases run the script as a subprocess with --from-json fixtures in
tmp dirs; move/guard logic is tested by direct import of the module.

MANUAL TEST (requires exiftool, not run in CI/offline):
  End-to-end idempotency guard (a): run the script for real on an intake of
  RAWs (exit 0, files moved to raw dir, sets.json written), then run the same
  command again with the now-empty intake -> expect log event
  "already_grouped", a printed note, exit 0, and sets.json byte-identical.
  The guard logic itself is unit-tested below via already_grouped().
"""

import hashlib
import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCRIPT = ROOT / "skills" / "photo-pipeline" / "scripts" / "group_brackets.py"

_spec = importlib.util.spec_from_file_location("group_brackets", SCRIPT)
gb = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(gb)

BASE = datetime(2025, 3, 1, 12, 0, 0).timestamp()


def rec(name, ts, model="ILCE-7M4", ec=None, fn=None, et=None, iso=None):
    """Build one exiftool-style EXIF record."""
    r = {"SourceFile": name,
         "DateTimeOriginal": datetime.fromtimestamp(ts).strftime("%Y:%m:%d %H:%M:%S"),
         "Model": model}
    if ec is not None:
        r["ExposureCompensation"] = str(ec)
    if fn is not None:
        r["FNumber"] = str(fn)
    if et is not None:
        r["ExposureTime"] = str(et)
    if iso is not None:
        r["ISO"] = str(iso)
    return r


def triplet(prefix, t0, model="ILCE-7M4", ext=".arw", ec_order=(-1, 0, 1), dt=1.0):
    """3 frames at t0, t0+dt, t0+2*dt; file i carries ec_order[i]."""
    labels = ["a", "b", "c"]
    return [rec(f"{prefix}_{labels[i]}{ext}", t0 + i * dt, model=model,
                ec=ec_order[i], fn=2.8, et="1/100", iso=100)
            for i in range(3)]


class FixtureRunTest(unittest.TestCase):
    """Subprocess runs of the CLI with --from-json fixtures."""

    def run_fixture(self, records, extra=()):
        td = tempfile.TemporaryDirectory()
        self.addCleanup(td.cleanup)
        d = Path(td.name)
        fx = d / "fixture.json"
        fx.write_text(json.dumps(records))
        state = d / "state"
        p = subprocess.run([sys.executable, str(SCRIPT),
                            "--from-json", str(fx), "--state", str(state),
                            "--dry-run", *extra],
                           capture_output=True, text=True)
        sets_path = state / "sets.json"
        sets = json.loads(sets_path.read_text()) if sets_path.exists() else None
        loglines = []
        log_path = state / "log.jsonl"
        if log_path.exists():
            loglines = [json.loads(x) for x in log_path.read_text().splitlines()]
        return p, sets, loglines

    def test_two_clean_triplets_one_camera(self):
        # Chronological order deliberately != EC order in triplet 1, to prove
        # dark->bright ordering comes from ExposureCompensation, not sequence.
        records = [
            rec("s1_mid.arw", BASE + 0, ec=0),
            rec("s1_dark.arw", BASE + 1, ec=-1),
            rec("s1_bright.arw", BASE + 2, ec=1),
            *triplet("s2", BASE + 10),
        ]
        p, sets, _ = self.run_fixture(records)
        self.assertEqual(p.returncode, 0, p.stderr + p.stdout)
        self.assertEqual(len(sets["sets"]), 2)
        s1 = sets["sets"][0]
        self.assertEqual(s1["set_id"], "set_001")
        self.assertEqual(s1["camera"], "ilce-7m4")
        self.assertEqual(s1["grouping"], "exposure_compensation")
        self.assertEqual(s1["confidence"], "high")
        self.assertEqual([f["file"] for f in s1["frames"]],
                         ["s1_dark.arw", "s1_mid.arw", "s1_bright.arw"])
        self.assertEqual([f["ev"] for f in s1["frames"]], [-1, 0, 1])
        self.assertEqual(sets["quarantined"], [])
        # v1.1 metadata block next to gap_seconds
        self.assertEqual(sets["gap_seconds"], 2.5)
        self.assertEqual(sets["min_ev_step"], 0.5)
        self.assertEqual(sets["max_ev_step"], 4.0)
        self.assertEqual(sets["exts"], ["arw", "dng"])

    def test_per_camera_interleaved_with_clock_skew(self):
        # Two cameras whose timestamps interleave completely; DJI clock runs
        # 0.5 s behind. Global gap-clustering would mix them; per-camera must not.
        records = [
            *triplet("sony", BASE + 0.0, model="ILCE-7M4"),
            *triplet("dji", BASE - 0.5, model="DJI FC3170", ext=".dng"),
        ]
        records = sorted(records, key=lambda r: r["SourceFile"])  # scramble input order
        p, sets, _ = self.run_fixture(records)
        self.assertEqual(p.returncode, 0, p.stderr + p.stdout)
        self.assertEqual(len(sets["sets"]), 2)
        # numbered globally by first-frame ts: DJI starts 0.5 s earlier
        self.assertEqual(sets["sets"][0]["camera"], "dji fc3170")
        self.assertEqual(sets["sets"][1]["camera"], "ilce-7m4")
        for s in sets["sets"]:
            prefixes = {f["file"].split("_")[0] for f in s["frames"]}
            self.assertEqual(len(prefixes), 1)  # no cross-camera mixing
        dji_files = {f["file"] for f in sets["sets"][0]["frames"]}
        self.assertTrue(all(f.endswith(".dng") for f in dji_files))

    def test_cluster_of_six_chunks_into_two_sets(self):
        # One camera, tight 0.8 s gaps -> single cluster of 6 -> two triplets.
        ecs = [-1, 0, 1, -1, 0, 1]
        records = [rec(f"c{i}.arw", BASE + i * 0.8, ec=ecs[i]) for i in range(6)]
        p, sets, loglines = self.run_fixture(records)
        self.assertEqual(p.returncode, 0, p.stderr + p.stdout)
        self.assertEqual(len(sets["sets"]), 2)
        self.assertEqual(sets["quarantined"], [])
        self.assertTrue(any(e["event"] == "cluster_split" for e in loglines))

    def test_cluster_of_four_splits_at_largest_gap(self):
        # ts gaps 1, 1, 2.4 -> one cluster of 4; largest internal gap splits
        # off the 4th frame as leftover.
        records = [*triplet("q", BASE), rec("q_lone.arw", BASE + 4.4, ec=-1)]
        p, sets, loglines = self.run_fixture(records)
        self.assertEqual(p.returncode, 2, p.stderr + p.stdout)
        self.assertEqual(len(sets["sets"]), 1)
        self.assertEqual(len(sets["quarantined"]), 1)
        self.assertEqual(sets["quarantined"][0]["file"], "q_lone.arw")
        self.assertEqual(sets["quarantined"][0]["reason"], "leftover after triplet split")
        self.assertTrue(any(e["event"] == "cluster_split" for e in loglines))

    def test_indistinguishable_exposures_quarantined(self):
        # Identical EC *and* identical EV100 (same shutter/aperture/ISO):
        # v1.0 would have invented sequence-guess labels; v1.1 must quarantine.
        records = [rec(f"u{i}.arw", BASE + i, ec=0, fn=2.8, et="1/100", iso=100)
                   for i in range(3)]
        p, sets, _ = self.run_fixture(records)
        self.assertEqual(p.returncode, 2, p.stderr + p.stdout)
        self.assertEqual(sets["sets"], [])
        self.assertEqual(len(sets["quarantined"]), 3)
        for q in sets["quarantined"]:
            self.assertEqual(q["reason"], "exposures not distinguishable")

    def test_implausible_ev_spacing_quarantined(self):
        # No EC; EV100 distinct but adjacent spacings ~0.3 stops (< min 0.5).
        # t2 = t1 / 2**0.3, t3 = t1 / 2**0.6 -> spacings 0.30, 0.30.
        records = [
            rec("w0.arw", BASE + 0, fn=2.8, et="0.01", iso=100),
            rec("w1.arw", BASE + 1, fn=2.8, et="0.008123", iso=100),
            rec("w2.arw", BASE + 2, fn=2.8, et="0.006597", iso=100),
        ]
        p, sets, _ = self.run_fixture(records)
        self.assertEqual(p.returncode, 2, p.stderr + p.stdout)
        self.assertEqual(sets["sets"], [])
        self.assertEqual(len(sets["quarantined"]), 3)
        for q in sets["quarantined"]:
            self.assertIn("implausible EV spacing (0.30, 0.30 stops)", q["reason"])

    def test_dng_accepted_via_default_exts(self):
        records = triplet("drone", BASE, model="DJI FC3170", ext=".dng")
        p, sets, _ = self.run_fixture(records)
        self.assertEqual(p.returncode, 0, p.stderr + p.stdout)
        self.assertEqual(len(sets["sets"]), 1)
        self.assertEqual(sets["sets"][0]["camera"], "dji fc3170")


class ExtensionFilterTest(unittest.TestCase):
    """Real-file smoke test of the intake extension filter (no exiftool needed:
    the CLI runs validation before exiftool, so we exercise the factored
    check_intake() helper directly on real files)."""

    def test_dng_accepted_jpg_rejected(self):
        self.assertEqual(gb.parse_exts("ARW, dng"), {".arw", ".dng"})
        self.assertEqual(gb.parse_exts("arw,dng"), {".arw", ".dng"})
        with tempfile.TemporaryDirectory() as td:
            intake = Path(td)
            (intake / "a.dng").write_bytes(b"x")
            (intake / "b.ARW").write_bytes(b"x")  # case-insensitive
            (intake / "c.jpg").write_bytes(b"x")
            (intake / "overrides.json").write_bytes(b"{}")
            exts = gb.parse_exts("arw,dng")
            problem = gb.check_intake(str(intake), exts)
            self.assertIsNotNone(problem)
            reason, detail = problem
            self.assertEqual(reason, "non-RAW files present")
            self.assertEqual(detail, ["c.jpg"])
            (intake / "c.jpg").unlink()
            self.assertIsNone(gb.check_intake(str(intake), exts))  # .dng/.ARW pass
            (intake / "a.dng").write_bytes(b"")  # zero-byte still rejected
            self.assertEqual(gb.check_intake(str(intake), exts),
                             ("zero-byte file", "a.dng"))


class SafeMoveTest(unittest.TestCase):
    def test_copy_verify_delete_removes_source(self):
        with tempfile.TemporaryDirectory() as td:
            d = Path(td)
            src = d / "intake" / "x.arw"
            src.parent.mkdir()
            src.write_bytes(b"payload")
            dst_dir = d / "raw"
            out = gb.safe_move(str(src), str(dst_dir), dry=False)
            self.assertEqual(out, str(dst_dir / "x.arw"))
            self.assertFalse(src.exists())  # delete happened
            self.assertEqual((dst_dir / "x.arw").read_bytes(), b"payload")

    def test_collision_renames_with_sha_suffix(self):
        with tempfile.TemporaryDirectory() as td:
            d = Path(td)
            src = d / "intake" / "x.arw"
            src.parent.mkdir()
            src.write_bytes(b"new-bytes")
            dst_dir = d / "raw"
            dst_dir.mkdir()
            (dst_dir / "x.arw").write_bytes(b"old-bytes")
            out = gb.safe_move(str(src), str(dst_dir), dry=False)
            h8 = hashlib.sha256(b"new-bytes").hexdigest()[:8]
            self.assertEqual(out, str(dst_dir / f"x-{h8}.arw"))
            self.assertEqual((dst_dir / "x.arw").read_bytes(), b"old-bytes")
            self.assertEqual((dst_dir / f"x-{h8}.arw").read_bytes(), b"new-bytes")
            self.assertFalse(src.exists())


class MoveFrameTest(unittest.TestCase):
    def test_collision_records_stored_name_and_original(self):
        with tempfile.TemporaryDirectory() as td:
            d = Path(td)
            intake, raw, state = d / "in", d / "raw", d / "state"
            intake.mkdir()
            raw.mkdir()
            (intake / "z.arw").write_bytes(b"new")
            (raw / "z.arw").write_bytes(b"old")
            fr = {"file": "z.arw"}
            stored = gb.move_frame(str(state), str(intake), str(raw), fr, dry=False)
            h8 = hashlib.sha256(b"new").hexdigest()[:8]
            self.assertEqual(stored, f"z-{h8}.arw")
            self.assertEqual(fr["original_name"], "z.arw")
            events = [json.loads(x)["event"]
                      for x in (state / "log.jsonl").read_text().splitlines()]
            self.assertIn("renamed", events)

    def test_already_moved_skips_without_raising(self):
        with tempfile.TemporaryDirectory() as td:
            d = Path(td)
            intake, raw, state = d / "in", d / "raw", d / "state"
            intake.mkdir()
            raw.mkdir()
            (raw / "x.arw").write_bytes(b"moved")  # source gone, copy in raw
            fr = {"file": "x.arw"}
            stored = gb.move_frame(str(state), str(intake), str(raw), fr, dry=False)
            self.assertEqual(stored, "x.arw")
            self.assertNotIn("original_name", fr)
            events = [json.loads(x)["event"]
                      for x in (state / "log.jsonl").read_text().splitlines()]
            self.assertIn("already_moved", events)

    def test_missing_everywhere_raises(self):
        with tempfile.TemporaryDirectory() as td:
            d = Path(td)
            for sub in ("in", "raw"):
                (d / sub).mkdir()
            with self.assertRaises(RuntimeError):
                gb.move_frame(str(d / "state"), str(d / "in"), str(d / "raw"),
                              {"file": "ghost.arw"}, dry=False)


class AlreadyGroupedGuardTest(unittest.TestCase):
    """Unit tests for re-run guard (a). See module docstring for the manual
    end-to-end variant that requires exiftool."""

    def _dirs(self, td):
        d = Path(td)
        intake, raw, state = d / "in", d / "raw", d / "state"
        for p in (intake, raw, state):
            p.mkdir()
        return intake, raw, state

    def test_guard_true_when_grouped(self):
        with tempfile.TemporaryDirectory() as td:
            intake, raw, state = self._dirs(td)
            (raw / "a.arw").write_bytes(b"x")
            (state / "sets.json").write_text("{}")
            exts = gb.parse_exts("arw,dng")
            self.assertTrue(gb.already_grouped(str(intake), str(raw), str(state), exts))

    def test_guard_false_when_intake_has_raws(self):
        with tempfile.TemporaryDirectory() as td:
            intake, raw, state = self._dirs(td)
            (intake / "b.DNG").write_bytes(b"x")
            (raw / "a.arw").write_bytes(b"x")
            (state / "sets.json").write_text("{}")
            exts = gb.parse_exts("arw,dng")
            self.assertFalse(gb.already_grouped(str(intake), str(raw), str(state), exts))

    def test_guard_false_when_raw_empty_or_no_state(self):
        with tempfile.TemporaryDirectory() as td:
            intake, raw, state = self._dirs(td)
            exts = gb.parse_exts("arw,dng")
            self.assertFalse(gb.already_grouped(str(intake), str(raw), str(state), exts))
            (state / "sets.json").write_text("{}")
            self.assertFalse(gb.already_grouped(str(intake), str(raw), str(state), exts))
            (raw / "a.arw").write_bytes(b"x")
            (state / "sets.json").unlink()
            self.assertFalse(gb.already_grouped(str(intake), str(raw), str(state), exts))


if __name__ == "__main__":
    unittest.main()
