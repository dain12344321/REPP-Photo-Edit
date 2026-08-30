from __future__ import annotations

import re
import struct
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Optional

from .constants import JPEG_SUFFIXES


@dataclass
class FrameExif:
    path: Path
    make: str = ""
    model: str = ""
    datetime_original: Optional[datetime] = None
    exposure_bias: Optional[float] = None
    gps_altitude_m: Optional[float] = None
    image_width: Optional[int] = None
    image_height: Optional[int] = None


_DT_FORMATS = ("%Y:%m:%d %H:%M:%S", "%Y-%m-%d %H:%M:%S")


def is_jpeg(path: Path) -> bool:
    return path.is_file() and path.suffix.lower() in JPEG_SUFFIXES


def _parse_dt(raw: str) -> Optional[datetime]:
    text = raw.strip().strip("\x00")
    for fmt in _DT_FORMATS:
        try:
            return datetime.strptime(text, fmt)
        except ValueError:
            continue
    return None


def _ratio(num: int, den: int) -> Optional[float]:
    if den == 0:
        return None
    return num / den


def read_frame_exif(path: Path) -> FrameExif:
    """Read the handful of tags we need. Pillow/piexif preferred; TIFF walk fallback."""
    info = FrameExif(path=path)
    try:
        from PIL import Image  # type: ignore

        with Image.open(path) as im:
            info.image_width, info.image_height = im.size
            exif = im.getexif()
            if exif:
                make = exif.get(0x010F)
                model = exif.get(0x0110)
                if isinstance(make, bytes):
                    make = make.decode("utf-8", "replace")
                if isinstance(model, bytes):
                    model = model.decode("utf-8", "replace")
                info.make = (make or "").strip()
                info.model = (model or "").strip()
                ifd = getattr(exif, "get_ifd", None)
                exif_ifd = ifd(0x8769) if callable(ifd) else {}
                gps_ifd = ifd(0x8825) if callable(ifd) else {}
                dt = exif_ifd.get(0x9003) or exif.get(0x9003) or exif.get(0x0132)
                if isinstance(dt, bytes):
                    dt = dt.decode("utf-8", "replace")
                if isinstance(dt, str):
                    info.datetime_original = _parse_dt(dt)
                bias = exif_ifd.get(0x9204)
                info.exposure_bias = _coerce_rational(bias)
                alt = gps_ifd.get(0x0006)
                ref = gps_ifd.get(0x0005)
                alt_m = _coerce_rational(alt)
                if alt_m is not None:
                    if ref in (1, b"\x01", "1"):
                        alt_m = -alt_m
                    info.gps_altitude_m = alt_m
            return info
    except Exception:
        pass
    try:
        return _read_exif_raw(path)
    except Exception:
        return info


def _coerce_rational(value) -> Optional[float]:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, tuple) and len(value) == 2:
        return _ratio(int(value[0]), int(value[1]))
    if hasattr(value, "numerator") and hasattr(value, "denominator"):
        return _ratio(int(value.numerator), int(value.denominator))
    if isinstance(value, IFDRationalLike):
        return float(value)
    return None


class IFDRationalLike:
    pass


def _read_exif_raw(path: Path) -> FrameExif:
    info = FrameExif(path=path)
    data = path.read_bytes()
    if len(data) < 4 or data[:2] != b"\xff\xd8":
        return info
    pos = 2
    app1 = None
    while pos + 4 <= len(data):
        if data[pos] != 0xFF:
            break
        marker = data[pos + 1]
        if marker == 0xDA:
            break
        if marker == 0xD9:
            break
        if marker in (0xD0, 0xD1, 0xD2, 0xD3, 0xD4, 0xD5, 0xD6, 0xD7, 0x01):
            pos += 2
            continue
        if pos + 4 > len(data):
            break
        seglen = struct.unpack(">H", data[pos + 2 : pos + 4])[0]
        start = pos + 4
        end = pos + 2 + seglen
        if marker == 0xE1 and data[start : start + 6] == b"Exif\x00\x00":
            app1 = data[start + 6 : end]
        pos = end
    if not app1:
        return info
    _parse_tiff(app1, info)
    return info


def _parse_tiff(buf: bytes, info: FrameExif) -> None:
    if len(buf) < 8:
        return
    endian = "<" if buf[:2] == b"II" else ">" if buf[:2] == b"MM" else None
    if not endian:
        return

    def u16(off: int) -> int:
        return struct.unpack(endian + "H", buf[off : off + 2])[0]

    def u32(off: int) -> int:
        return struct.unpack(endian + "I", buf[off : off + 4])[0]

    def i32(off: int) -> int:
        return struct.unpack(endian + "i", buf[off : off + 4])[0]

    def read_ifd(offset: int) -> dict[int, object]:
        if offset <= 0 or offset + 2 > len(buf):
            return {}
        n = u16(offset)
        entries: dict[int, object] = {}
        p = offset + 2
        for _ in range(n):
            if p + 12 > len(buf):
                break
            tag = u16(p)
            typ = u16(p + 2)
            count = u32(p + 4)
            val_off = p + 8
            unit = {1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8}.get(typ, 1)
            size = unit * count
            data_off = u32(val_off) if size > 4 else val_off
            blob = buf[data_off : data_off + size] if size <= len(buf) - data_off else b""
            if typ == 2:
                entries[tag] = blob.split(b"\x00", 1)[0].decode("utf-8", "replace")
            elif typ == 3 and count == 1:
                entries[tag] = u16(val_off)
            elif typ == 4 and count == 1:
                entries[tag] = u32(val_off) if size > 4 else u32(val_off) if False else (
                    u32(val_off) if size > 4 else struct.unpack(endian + "I", buf[val_off : val_off + 4])[0]
                )
            elif typ == 5 and count >= 1 and len(blob) >= 8:
                num, den = struct.unpack(endian + "II", blob[:8])
                entries[tag] = _ratio(num, den)
            elif typ == 10 and count >= 1 and len(blob) >= 8:
                num, den = struct.unpack(endian + "ii", blob[:8])
                entries[tag] = _ratio(num, den)
            elif typ == 1 and count == 1:
                entries[tag] = buf[val_off]
            else:
                entries[tag] = blob
            p += 12
        return entries

    ifd0 = read_ifd(u32(4))
    make = ifd0.get(0x010F)
    model = ifd0.get(0x0110)
    info.make = str(make or "").strip()
    info.model = str(model or "").strip()
    exif_ptr = ifd0.get(0x8769)
    if isinstance(exif_ptr, int):
        exif_ifd = read_ifd(exif_ptr)
        dt = exif_ifd.get(0x9003)
        if isinstance(dt, str):
            info.datetime_original = _parse_dt(dt)
        bias = exif_ifd.get(0x9204)
        if isinstance(bias, float):
            info.exposure_bias = bias
    gps_ptr = ifd0.get(0x8825)
    if isinstance(gps_ptr, int):
        gps = read_ifd(gps_ptr)
        alt = gps.get(6)
        if isinstance(alt, float):
            ref = gps.get(5)
            info.gps_altitude_m = -alt if ref in (1, 1) else alt


_SEQ_RE = re.compile(r"(\d{3,})", re.ASCII)


def filename_sequence(name: str) -> Optional[int]:
    matches = _SEQ_RE.findall(name)
    if not matches:
        return None
    return int(matches[0])
