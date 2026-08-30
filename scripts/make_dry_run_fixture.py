#!/usr/bin/env python3
"""Write a fake 9-JPEG Sony-style folder for the Codex 6-stack dry-run.

2 interior HDR stacks (6 files) + 2 exteriors + 1 drone.
brief.json marks twilight candidates from the two exteriors.
"""
from __future__ import annotations

import json
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from PIL import Image, ImageDraw  # type: ignore
import piexif  # type: ignore

W, H = 480, 320  # 3:2


def _exif(dt: datetime, ev: float, *, make: str, model: str, altitude: float | None = None) -> bytes:
    zeroth = {
        piexif.ImageIFD.Make: make,
        piexif.ImageIFD.Model: model,
        piexif.ImageIFD.Software: "rep-edit-fixture",
        piexif.ImageIFD.DateTime: dt.strftime("%Y:%m:%d %H:%M:%S"),
        piexif.ImageIFD.XResolution: (300, 1),
        piexif.ImageIFD.YResolution: (300, 1),
        piexif.ImageIFD.Orientation: 1,
    }
    ev_num = int(round(ev * 100))
    exif = {
        piexif.ExifIFD.DateTimeOriginal: dt.strftime("%Y:%m:%d %H:%M:%S"),
        piexif.ExifIFD.ExposureBiasValue: (ev_num, 100),
        piexif.ExifIFD.FNumber: (40, 10),
        piexif.ExifIFD.FocalLength: (240, 10),
        piexif.ExifIFD.ISOSpeedRatings: 100,
        piexif.ExifIFD.PixelXDimension: W,
        piexif.ExifIFD.PixelYDimension: H,
    }
    gps: dict = {}
    if altitude is not None:
        gps[piexif.GPSIFD.GPSAltitude] = (int(round(altitude * 100)), 100)
        gps[piexif.GPSIFD.GPSAltitudeRef] = 0
    dumped = piexif.dump({"0th": zeroth, "Exif": exif, "GPS": gps})
    return dumped


def _save(path: Path, img: Image.Image, dt: datetime, ev: float, **kw) -> None:
    img = img.convert("RGB")
    img.save(path, "JPEG", quality=88, subsampling=1, exif=_exif(dt, ev, **kw))


def _interior(kind: str, ev: float) -> Image.Image:
    # Distinct rooms so thumbs are readable in the console.
    if kind == "A":
        wall, floor, sofa, window = (214, 196, 168), (132, 96, 62), (90, 62, 44), (186, 210, 224)
    else:
        wall, floor, sofa, window = (196, 204, 198), (110, 118, 112), (70, 86, 92), (168, 196, 214)
    # EV shifts brightness without changing geometry.
    lift = int(ev * 18)
    def c(rgb):
        return tuple(max(0, min(255, ch + lift)) for ch in rgb)

    img = Image.new("RGB", (W, H), c(wall))
    d = ImageDraw.Draw(img)
    d.rectangle([0, int(H * 0.62), W, H], fill=c(floor))
    d.rectangle([int(W * 0.58), int(H * 0.16), int(W * 0.88), int(H * 0.48)], fill=c(window))
    d.rectangle([int(W * 0.57), int(H * 0.15), int(W * 0.89), int(H * 0.49)], outline=c((80, 70, 60)), width=3)
    d.rectangle([int(W * 0.14), int(H * 0.52), int(W * 0.52), int(H * 0.78)], fill=c(sofa))
    d.rectangle([int(W * 0.08), int(H * 0.12), int(W * 0.11), int(H * 0.88)], fill=c((92, 86, 78)))
    return img


def _exterior(kind: str) -> Image.Image:
    sky = (156, 184, 206) if kind == "A" else (148, 176, 198)
    grass = (96, 124, 72)
    house = (232, 224, 210)
    roof = (92, 78, 68)
    img = Image.new("RGB", (W, H), sky)
    d = ImageDraw.Draw(img)
    d.rectangle([0, int(H * 0.58), W, H], fill=grass)
    d.polygon(
        [(int(W * 0.22), int(H * 0.48)), (int(W * 0.50), int(H * 0.22)), (int(W * 0.78), int(H * 0.48))],
        fill=roof,
    )
    d.rectangle([int(W * 0.28), int(H * 0.48), int(W * 0.72), int(H * 0.82)], fill=house)
    d.rectangle([int(W * 0.34), int(H * 0.56), int(W * 0.44), int(H * 0.70)], fill=(186, 210, 224))
    d.rectangle([int(W * 0.56), int(H * 0.56), int(W * 0.66), int(H * 0.70)], fill=(186, 210, 224))
    d.rectangle([int(W * 0.46), int(H * 0.64), int(W * 0.54), int(H * 0.82)], fill=(120, 92, 70))
    return img


def _drone() -> Image.Image:
    img = Image.new("RGB", (W, H), (118, 148, 86))
    d = ImageDraw.Draw(img)
    d.rectangle([int(W * 0.34), int(H * 0.34), int(W * 0.66), int(H * 0.62)], fill=(210, 204, 196))
    d.rectangle([int(W * 0.36), int(H * 0.36), int(W * 0.64), int(H * 0.50)], fill=(128, 110, 96))
    d.rectangle([int(W * 0.30), int(H * 0.62), int(W * 0.70), int(H * 0.78)], fill=(150, 148, 142))
    d.rectangle([0, 0, W, int(H * 0.18)], fill=(164, 188, 206))
    return img


def write_fixture(dest: Path) -> Path:
    dest.mkdir(parents=True, exist_ok=True)
    sony = dict(make="SONY", model="ILCE-7M4")
    specs = [
        ("DSC00001_INT_A_m.jpg", datetime(2026, 8, 28, 10, 0, 0), 0.0, "intA", 0),
        ("DSC00002_INT_A_d.jpg", datetime(2026, 8, 28, 10, 0, 0), -3.0, "intA", -3),
        ("DSC00003_INT_A_b.jpg", datetime(2026, 8, 28, 10, 0, 1), 3.0, "intA", 3),
        ("DSC00004_INT_B_m.jpg", datetime(2026, 8, 28, 10, 1, 12), 0.0, "intB", 0),
        ("DSC00005_INT_B_d.jpg", datetime(2026, 8, 28, 10, 1, 12), -3.0, "intB", -3),
        ("DSC00006_INT_B_b.jpg", datetime(2026, 8, 28, 10, 1, 13), 3.0, "intB", 3),
        ("DSC00007_EXT_A.jpg", datetime(2026, 8, 28, 10, 15, 0), 0.0, "extA", 0),
        ("DSC00008_EXT_B.jpg", datetime(2026, 8, 28, 10, 16, 30), 0.0, "extB", 0),
        ("DSC00009_DRONE_A.jpg", datetime(2026, 8, 28, 10, 40, 0), 0.0, "drone", 0),
    ]
    for name, dt, ev, kind, _ in specs:
        path = dest / name
        if kind == "intA":
            img = _interior("A", ev)
            _save(path, img, dt, ev, **sony)
        elif kind == "intB":
            img = _interior("B", ev)
            _save(path, img, dt, ev, **sony)
        elif kind == "extA":
            _save(path, _exterior("A"), dt, ev, **sony)
        elif kind == "extB":
            _save(path, _exterior("B"), dt, ev, **sony)
        else:
            _save(
                path,
                _drone(),
                dt,
                ev,
                make="DJI",
                model="FC3411",
                altitude=82.0,
            )
    brief = {
        "twilight_from_exteriors": True,
        "note": "Codex 6-stack test: 2 interiors, 2 exteriors, 2 twilight candidates. Drone is the 9th JPEG.",
    }
    (dest / "brief.json").write_text(json.dumps(brief, indent=2) + "\n", encoding="utf-8")
    return dest


def main() -> int:
    dest = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "fixtures" / "dry-run-9jpeg"
    write_fixture(dest)
    print(f"wrote 9 JPEGs + brief.json → {dest}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
