from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from PIL import Image  # type: ignore
import piexif  # type: ignore

from rep_edit.classify import classify_folder, parse_brief
from rep_edit.job import build_job, next_versioned_path, validate_job
from rep_edit.prompts import load_prompt_pack
from scripts.make_dry_run_fixture import write_fixture


class PromptPackTests(unittest.TestCase):
    def setUp(self) -> None:
        self.pack = load_prompt_pack()

    def test_keep_clause_appended_and_not_duplicated_token(self):
        text = self.pack.for_condition("interior_single")
        self.assertIn("Keep the exact architecture", text)
        self.assertNotIn("KEEP-CLAUSE", text)
        self.assertNotIn("Master Project Prompt", text)
        self.assertIn("Sony 3:2", text)
        self.assertNotIn("window pool", text.lower())
        self.assertIn("swimming pool", text.lower())
        self.assertIn("carpet", text.lower())

    def test_hdr_names_middle_dark_bright(self):
        text = self.pack.for_condition("interior_hdr")
        self.assertIn("Image 1 is the middle exposure", text)
        self.assertIn("Image 2 is the dark exposure", text)
        self.assertIn("Image 3 is the bright exposure", text)
        self.assertIn("Do not invent a view", text)
        self.assertIn("frosted", text.lower())
        self.assertIn("privacy", text.lower())
        self.assertNotIn("window pool", text.lower())
        self.assertIn("swimming pool", text.lower())

    def test_object_remove_requires_list(self):
        with self.assertRaises(ValueError):
            self.pack.for_condition("object_remove", object_list=[])
        text = self.pack.for_condition("object_remove", object_list=["trash bin", "hose"])
        self.assertIn("Remove only: trash bin, hose.", text)
        self.assertNotIn("[LIST]", text)

    def test_refuses_long_manifesto_as_pack(self):
        with self.assertRaises(ValueError):
            load_prompt_pack(ROOT / "prompts" / "source-long-REFERENCE-ONLY.md")

    def test_twilight_no_purple_no_new_fixtures(self):
        text = self.pack.for_condition("virtual_twilight")
        self.assertIn("No purple sky", text)
        self.assertIn("No new windows or fixtures", text)

    def test_pack_never_says_window_pool(self):
        self.assertIn("2026-09-11-2k-texture", self.pack.version_line)
        for condition in (
            "interior_hdr",
            "interior_single",
            "exterior_single",
            "virtual_twilight",
            "drone",
            "declutter",
            "yard_cleanup",
            "window_pull",
        ):
            text = self.pack.for_condition(condition).lower()
            self.assertNotIn("window pool", text, condition)
        text = self.pack.for_condition("object_remove", object_list=["hose"]).lower()
        self.assertNotIn("window pool", text)


class FixtureClassifyTests(unittest.TestCase):
    def test_nine_jpeg_codex_stacks(self):
        with tempfile.TemporaryDirectory() as tmp:
            src = write_fixture(Path(tmp) / "dry-run-9jpeg")
            items = classify_folder(src)
            conditions = [i.condition for i in items]
            self.assertEqual(conditions.count("interior_hdr"), 2)
            self.assertEqual(conditions.count("exterior_single"), 2)
            self.assertEqual(conditions.count("virtual_twilight"), 2)
            self.assertEqual(conditions.count("drone"), 1)
            self.assertNotIn("skipped", conditions)
            hdr = next(i for i in items if i.condition == "interior_hdr")
            self.assertIn("middle", hdr.inputs)
            self.assertIn("dark", hdr.inputs)
            self.assertIn("bright", hdr.inputs)
            self.assertTrue(hdr.inputs["middle"].endswith("_m.jpg"))
            self.assertTrue(hdr.inputs["dark"].endswith("_d.jpg"))
            self.assertTrue(hdr.inputs["bright"].endswith("_b.jpg"))

    def test_uncertain_single_is_skipped_not_guessed(self):
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp)
            img = Image.new("RGB", (48, 32), (10, 10, 10))
            img.save(folder / "mystery.jpg", "JPEG")
            items = classify_folder(folder)
            self.assertEqual(len(items), 1)
            self.assertEqual(items[0].condition, "skipped")
            self.assertEqual(items[0].status, "skipped")
            self.assertIn("uncertain", items[0].flag.lower())

    def test_ext_b_is_not_a_bright_bracket_role(self):
        from rep_edit.classify import _role_from_name

        self.assertIsNone(_role_from_name("DSC00008_EXT_B.jpg"))
        self.assertEqual(_role_from_name("DSC00001_INT_A_m.jpg"), "middle")
        self.assertEqual(_role_from_name("DSC00002_INT_A_d.jpg"), "dark")
        self.assertEqual(_role_from_name("DSC00003_INT_A_b.jpg"), "bright")

    def test_object_remove_without_list_skipped(self):
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp)
            Image.new("RGB", (48, 32), (20, 20, 20)).save(folder / "DSC00010_REMOVE.jpg", "JPEG")
            items = classify_folder(folder)
            self.assertEqual(items[0].condition, "skipped")
            self.assertIn("object list", items[0].flag.lower())
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp)
            Image.new("RGB", (48, 32), (20, 20, 20)).save(folder / "DSC00010_REMOVE.jpg", "JPEG")
            items = classify_folder(folder)
            self.assertEqual(items[0].condition, "skipped")
            self.assertIn("object list", items[0].flag.lower())

    def test_job_schema_and_versioning(self):
        with tempfile.TemporaryDirectory() as tmp:
            src = write_fixture(Path(tmp) / "dry-run-9jpeg")
            items = classify_folder(src)
            out_dir = Path(tmp) / "outputs"
            job = build_job(job_id="dry-run", source_dir=src, items=items, out_dir=out_dir)
            validate_job(job)
            self.assertEqual(job["provider"], "grok")
            self.assertTrue(all("id" in i and "status" in i for i in job["items"]))
            first = Path(job["items"][0]["output"])
            self.assertTrue(first.name.endswith("_v001.jpg"))
            first.write_bytes(b"x")
            bumped = next_versioned_path(out_dir, first.stem.rsplit("_v", 1)[0])
            self.assertTrue(bumped.name.endswith("_v002.jpg"))
            self.assertNotEqual(bumped, first)


class ProviderSignatureTests(unittest.TestCase):
    def test_grok_and_codex_share_edit_signature(self):
        from providers.codex import edit as codex_edit
        from providers.grok import edit as grok_edit

        self.assertEqual(grok_edit.__name__, "edit")
        self.assertEqual(codex_edit.__name__, "edit")
        with self.assertRaises(NotImplementedError):
            codex_edit([], "x", Path("/tmp/nope.jpg"))

    def test_grok_refuses_smaller_models(self):
        from providers.grok import edit as grok_edit

        with tempfile.TemporaryDirectory() as tmp:
            src = Path(tmp) / "in.jpg"
            Image.new("RGB", (48, 32), (10, 10, 10)).save(src, "JPEG")
            out = Path(tmp) / "out.jpg"
            with self.assertRaises(ValueError):
                grok_edit([src], "prompt", out, model="grok-imagine-image", dry_run=True)

    def test_openrouter_maps_2_0_not_quality(self):
        from providers import openrouter

        self.assertEqual(
            openrouter._resolve_model("grok-imagine-image-2.0"),
            "x-ai/grok-imagine-image-2.0",
        )
        self.assertEqual(
            openrouter._resolve_model("x-ai/grok-imagine-image-2.0"),
            "x-ai/grok-imagine-image-2.0",
        )
        self.assertEqual(openrouter.OPENROUTER_MODEL_DEFAULT, "x-ai/grok-imagine-image-2.0")
        with self.assertRaises(ValueError):
            openrouter._resolve_model("x-ai/grok-imagine-image-quality")
        with self.assertRaises(ValueError):
            openrouter._resolve_model("grok-imagine-image-quality")


class PrepareTests(unittest.TestCase):
    def test_downscales_long_edge_to_2k(self):
        from rep_edit.prepare import output_is_2k, output_long_edge, prepare_for_imagine

        with tempfile.TemporaryDirectory() as tmp:
            src = Path(tmp) / "src.jpg"
            dest = Path(tmp) / "out.jpg"
            Image.new("RGB", (6000, 4000), (40, 80, 40)).save(src, "JPEG", quality=90)
            prepare_for_imagine(src, dest)
            self.assertEqual(output_long_edge(dest), 2048)
            self.assertTrue(output_is_2k(dest))
            with Image.open(dest) as im:
                w, h = im.size
            self.assertEqual(round(w / h, 2), round(3 / 2, 2))


if __name__ == "__main__":
    unittest.main()
