from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Optional

from .constants import BRACKET_WINDOW_SECONDS, JPEG_SUFFIXES, MIN_EV_SPREAD
from .exifutil import filename_sequence, is_jpeg, read_frame_exif

# Chat uploads often strip EXIF. Fall back to scene + luma when bias/time are gone.
SCENE_MAE_MAX = 36.0
LUMA_SPREAD_MIN = 50.0
SKY_BR_EXTERIOR = 12.0
MIN_SCENE_EDGE = 1000

# Longer role names first so `_middle` wins over `_m`.
# Single-letter _m/_d/_b stay case-sensitive so EXT_B is not "bright".
_ROLE_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("middle", re.compile(r"(?:^|[_\-])(middle|mid|base|0ev|ev0)(?:[_\-\.]|$)", re.I)),
    ("dark", re.compile(r"(?:^|[_\-])(dark|minus3|n03|-3ev|ev-3)(?:[_\-\.]|$)", re.I)),
    ("bright", re.compile(r"(?:^|[_\-])(bright|plus3|p03|\+3ev|ev\+3)(?:[_\-\.]|$)", re.I)),
    ("middle", re.compile(r"(?:^|[_\-])m(?:[_\-\.]|$)")),
    ("dark", re.compile(r"(?:^|[_\-])d(?:[_\-\.]|$)")),
    ("bright", re.compile(r"(?:^|[_\-])b(?:[_\-\.]|$)")),
]


@dataclass
class Frame:
    path: Path
    make: str = ""
    model: str = ""
    dt: Optional[Any] = None
    ev: Optional[float] = None
    altitude_m: Optional[float] = None
    seq: Optional[int] = None
    role: Optional[str] = None  # middle | dark | bright
    keywords: set[str] = field(default_factory=set)
    width: Optional[int] = None
    height: Optional[int] = None
    luma: Optional[float] = None
    sky_br: Optional[float] = None
    scene: Optional[tuple[float, ...]] = None


@dataclass
class ClassifiedItem:
    id: str
    condition: str
    inputs: dict[str, str]
    prompt_id: str
    status: str
    flag: str = ""
    object_list: list[str] = field(default_factory=list)


@dataclass
class Brief:
    twilight_from_exteriors: bool = False
    object_remove: dict[str, list[str]] = field(default_factory=dict)
    declutter: list[str] = field(default_factory=list)
    yard_cleanup: list[str] = field(default_factory=list)
    window_pull: list[dict[str, str]] = field(default_factory=list)
    extras: list[dict[str, Any]] = field(default_factory=list)


def load_brief(source_dir: Path) -> Brief:
    for name in ("brief.json", "ingest.json", "rep-edit.json"):
        path = source_dir / name
        if path.is_file():
            return parse_brief(json.loads(path.read_text(encoding="utf-8")))
    return Brief()


def parse_brief(raw: dict[str, Any]) -> Brief:
    return Brief(
        twilight_from_exteriors=bool(raw.get("twilight_from_exteriors")),
        object_remove={
            _norm_name(k): list(v) for k, v in (raw.get("object_remove") or {}).items()
        },
        declutter=[_norm_name(x) for x in (raw.get("declutter") or [])],
        yard_cleanup=[_norm_name(x) for x in (raw.get("yard_cleanup") or [])],
        window_pull=list(raw.get("window_pull") or []),
        extras=list(raw.get("items") or []),
    )


def classify_folder(
    source_dir: Path,
    *,
    brief: Optional[Brief] = None,
    twilight_from_exteriors: Optional[bool] = None,
) -> list[ClassifiedItem]:
    source_dir = source_dir.resolve()
    brief = brief or load_brief(source_dir)
    if twilight_from_exteriors is not None:
        brief.twilight_from_exteriors = twilight_from_exteriors

    frames = [_frame_from_path(p) for p in _list_jpegs(source_dir)]
    used: set[Path] = set()
    items: list[ClassifiedItem] = []

    stacks, hdr_dups = _group_hdr_stacks(frames)
    for stack in stacks:
        for role in ("middle", "dark", "bright"):
            used.add(stack[role].path)
        items.append(_classify_stack(stack))
    for dup in hdr_dups:
        used.add(dup.path)
        items.append(
            _skip(
                {"single": str(dup.path)},
                "duplicate exposure of an interior HDR stack; skipped rather than double-sending",
            )
        )

    leftover = [f for f in frames if f.path not in used]
    leftover.sort(key=lambda f: (f.dt or 0, f.seq or 0, f.path.name))

    for frame in leftover:
        items.append(_classify_single(frame, brief))

    items.extend(_brief_virtuals(brief, frames, items))
    items.extend(_brief_window_pulls(brief, frames, used))
    return _assign_ids(items)


def _list_jpegs(source_dir: Path) -> list[Path]:
    files = [
        p
        for p in source_dir.iterdir()
        if p.is_file() and p.suffix.lower() in JPEG_SUFFIXES and not p.name.startswith(".")
    ]
    files.sort(key=lambda p: p.name.lower())
    return files


def _frame_from_path(path: Path) -> Frame:
    ex = read_frame_exif(path)
    name = path.name
    luma, sky_br, scene = _scene_stats(path)
    return Frame(
        path=path,
        make=ex.make,
        model=ex.model,
        dt=ex.datetime_original,
        ev=ex.exposure_bias,
        altitude_m=ex.gps_altitude_m,
        seq=filename_sequence(name),
        role=_role_from_name(name),
        keywords=_keywords(name, ex.make, ex.model),
        width=ex.image_width,
        height=ex.image_height,
        luma=luma,
        sky_br=sky_br,
        scene=scene,
    )


def _scene_stats(path: Path) -> tuple[Optional[float], Optional[float], Optional[tuple[float, ...]]]:
    try:
        from PIL import Image  # type: ignore

        with Image.open(path) as im:
            rgb = im.convert("RGB").resize((48, 32), Image.BILINEAR)
        gray = rgb.convert("L")
        raw = gray.get_flattened_data() if hasattr(gray, "get_flattened_data") else gray.getdata()
        pix = list(raw)
        luma = sum(pix) / len(pix)
        centered = tuple(p - luma for p in pix)
        top_img = rgb.crop((0, 0, 48, 8))
        top_raw = top_img.get_flattened_data() if hasattr(top_img, "get_flattened_data") else top_img.getdata()
        top = list(top_raw)
        sky_br = sum(p[2] - p[0] for p in top) / len(top)
        return luma, sky_br, centered
    except Exception:
        return None, None, None


def _role_from_name(name: str) -> Optional[str]:
    stem = Path(name).stem
    for role, pat in _ROLE_PATTERNS:
        if pat.search(stem):
            return role
    return None


def _keywords(name: str, make: str, model: str) -> set[str]:
    blob = f"{name} {make} {model}".upper()
    tokens = set(re.split(r"[^A-Z0-9+]+", blob))
    keys: set[str] = set()
    if "INT" in tokens or "INTERIOR" in tokens:
        keys.add("interior")
    if "EXT" in tokens or "EXTERIOR" in tokens:
        keys.add("exterior")
    if "DRONE" in tokens or "DJI" in tokens or "AERIAL" in tokens:
        keys.add("drone")
    if "VT" in tokens or "TWILIGHT" in tokens or "DUSK" in tokens:
        keys.add("twilight")
    if "DECLUTTER" in tokens or "CLUTTER" in tokens:
        keys.add("declutter")
    if "YARD" in tokens:
        keys.add("yard")
    if "REMOVE" in tokens or "REMOVAL" in tokens:
        keys.add("remove")
    if "WPULL" in tokens or "WINDOWPULL" in tokens:
        keys.add("window_pull")
    make_u = (make or "").upper()
    if "DJI" in make_u or "HASSELBLAD" in make_u and "DJI" in blob:
        keys.add("drone")
    if make_u.startswith("DJI"):
        keys.add("drone")
    return keys


def _group_hdr_stacks(frames: list[Frame]) -> tuple[list[dict[str, Frame]], list[Frame]]:
    stacks: list[dict[str, Frame]] = []
    dups: list[Frame] = []
    by_stem: dict[str, list[Frame]] = {}
    rest: list[Frame] = []
    for frame in frames:
        stem = _bracket_stem(frame)
        if stem and frame.role:
            by_stem.setdefault(stem, []).append(frame)
        else:
            rest.append(frame)
    for stem, group in sorted(by_stem.items()):
        stack = _stack_from_named(group)
        if stack:
            stacks.append(stack)
        else:
            rest.extend(group)

    rest.sort(key=lambda f: (_dt_key(f), f.seq if f.seq is not None else 10**12, f.path.name))
    consumed: set[Path] = set()
    i = 0
    while i < len(rest):
        if rest[i].path in consumed:
            i += 1
            continue
        cluster = [rest[i]]
        j = i + 1
        while j < len(rest):
            nxt = rest[j]
            if nxt.path in consumed:
                j += 1
                continue
            if not _same_burst(cluster[0], nxt):
                break
            if not _same_scene(cluster[0], nxt):
                break
            cluster.append(nxt)
            j += 1
        stack = _stack_from_ev(cluster) or _stack_from_luma(cluster)
        if stack:
            stacks.append(stack)
            taken = {stack[r].path for r in ("middle", "dark", "bright")}
            for frame in cluster:
                consumed.add(frame.path)
                if frame.path not in taken:
                    dups.append(frame)
            i += 1
            continue
        i += 1
    return stacks, dups


def _bracket_stem(frame: Frame) -> Optional[str]:
    if not frame.role:
        return None
    stem = Path(frame.path.name).stem
    trimmed = re.sub(
        r"(?:[_\-])(middle|mid|base|0ev|ev0|dark|minus3|n03|-3ev|ev-3|"
        r"bright|plus3|p03|\+3ev|ev\+3|m|d|b)$",
        "",
        stem,
        flags=re.I,
    )
    trimmed = re.sub(r"^(?:DSC|IMG)?_?\d{3,}_", "", trimmed, flags=re.I)
    return (trimmed or stem).lower()


def _stack_from_named(group: list[Frame]) -> Optional[dict[str, Frame]]:
    by_role: dict[str, list[Frame]] = {"middle": [], "dark": [], "bright": []}
    for frame in group:
        if frame.role in by_role:
            by_role[frame.role].append(frame)
    if all(len(by_role[r]) == 1 for r in ("middle", "dark", "bright")):
        return {r: by_role[r][0] for r in ("middle", "dark", "bright")}
    return None


def _stack_from_ev(window: list[Frame]) -> Optional[dict[str, Frame]]:
    with_ev = [f for f in window if f.ev is not None]
    if len(with_ev) < 3:
        return None
    unique: dict[float, Frame] = {}
    for frame in with_ev:
        key = round(float(frame.ev), 2)  # type: ignore[arg-type]
        unique.setdefault(key, frame)
    if len(unique) < 3:
        return None
    evs = sorted(unique)
    dark_ev = evs[0]
    bright_ev = evs[-1]
    if (bright_ev - dark_ev) < MIN_EV_SPREAD:
        return None
    mid_ev = min(evs, key=lambda e: abs(e))
    if mid_ev in (dark_ev, bright_ev):
        return None
    return {
        "dark": unique[dark_ev],
        "middle": unique[mid_ev],
        "bright": unique[bright_ev],
    }


def _stack_from_luma(window: list[Frame]) -> Optional[dict[str, Frame]]:
    """When ExposureBiasValue is missing, treat a same-scene burst with a wide luma spread as 3-EV."""
    with_luma = [f for f in window if f.luma is not None]
    if len(with_luma) < 3:
        return None
    unique: list[Frame] = []
    seen: set[Path] = set()
    for frame in with_luma:
        if frame.path in seen:
            continue
        seen.add(frame.path)
        unique.append(frame)
    lumas = [float(f.luma) for f in unique]  # type: ignore[arg-type]
    dark = min(unique, key=lambda f: float(f.luma))  # type: ignore[arg-type]
    bright = max(unique, key=lambda f: float(f.luma))  # type: ignore[arg-type]
    if float(bright.luma) - float(dark.luma) < LUMA_SPREAD_MIN:  # type: ignore[arg-type]
        return None
    remaining = [f for f in unique if f.path not in {dark.path, bright.path}]
    if not remaining:
        return None
    target = (float(dark.luma) + float(bright.luma)) / 2  # type: ignore[arg-type]
    middle = min(remaining, key=lambda f: abs(float(f.luma) - target))  # type: ignore[arg-type]
    return {"dark": dark, "middle": middle, "bright": bright}


def _same_burst(a: Frame, b: Frame) -> bool:
    if a.dt and b.dt:
        return abs((b.dt - a.dt).total_seconds()) <= BRACKET_WINDOW_SECONDS
    if a.seq is not None and b.seq is not None:
        return abs(b.seq - a.seq) <= 4
    return False


def _same_scene(a: Frame, b: Frame) -> bool:
    if not a.scene or not b.scene or len(a.scene) != len(b.scene):
        return True  # no signature: fall back to burst window only
    mae = sum(abs(x - y) for x, y in zip(a.scene, b.scene)) / len(a.scene)
    return mae <= SCENE_MAE_MAX


def _dt_key(frame: Frame):
    return frame.dt or __import__("datetime").datetime.max


def _classify_stack(stack: dict[str, Frame]) -> ClassifiedItem:
    frames = [stack["middle"], stack["dark"], stack["bright"]]
    keys = set().union(*(f.keywords for f in frames))
    inputs = {
        "middle": str(stack["middle"].path),
        "dark": str(stack["dark"].path),
        "bright": str(stack["bright"].path),
    }
    if "drone" in keys:
        return ClassifiedItem(
            id="",
            condition="skipped",
            inputs=inputs,
            prompt_id="",
            status="skipped",
            flag="drone brackets are not a listed still condition; not guessing an aerial HDR blend",
        )
    if "exterior" in keys and "interior" not in keys:
        return ClassifiedItem(
            id="",
            condition="skipped",
            inputs=inputs,
            prompt_id="",
            status="skipped",
            flag="exterior 3-EV stack is not a listed condition; not guessing interior HDR",
        )
    return ClassifiedItem(
        id="",
        condition="interior_hdr",
        inputs=inputs,
        prompt_id="interior_hdr",
        status="pending",
        flag="" if any(f.ev is not None for f in frames) else "EXIF stripped; 3-EV grouped by sequence + scene luma",
    )


def _classify_single(frame: Frame, brief: Brief) -> ClassifiedItem:
    name = _norm_name(frame.path.name)
    inputs = {"single": str(frame.path)}
    listed_remove = brief.object_remove.get(name)
    if listed_remove is not None:
        if not listed_remove:
            return _skip(inputs, "object_remove listed but object list is empty")
        return ClassifiedItem(
            id="",
            condition="object_remove",
            inputs=inputs,
            prompt_id="object_remove",
            status="pending",
            object_list=list(listed_remove),
        )
    if name in brief.declutter or "declutter" in frame.keywords:
        return ClassifiedItem(
            id="",
            condition="declutter",
            inputs=inputs,
            prompt_id="declutter",
            status="pending",
        )
    if name in brief.yard_cleanup or "yard" in frame.keywords:
        return ClassifiedItem(
            id="",
            condition="yard_cleanup",
            inputs=inputs,
            prompt_id="yard_cleanup",
            status="pending",
        )
    if "window_pull" in frame.keywords:
        return _skip(inputs, "window_pull needs an interior + dark pair in brief.json; not guessing")
    if "twilight" in frame.keywords:
        return ClassifiedItem(
            id="",
            condition="virtual_twilight",
            inputs=inputs,
            prompt_id="virtual_twilight",
            status="pending",
        )
    if "drone" in frame.keywords or _looks_drone(frame):
        return ClassifiedItem(
            id="",
            condition="drone",
            inputs=inputs,
            prompt_id="drone",
            status="pending",
        )
    if "interior" in frame.keywords:
        return ClassifiedItem(
            id="",
            condition="interior_single",
            inputs=inputs,
            prompt_id="interior_single",
            status="pending",
        )
    if "exterior" in frame.keywords:
        return ClassifiedItem(
            id="",
            condition="exterior_single",
            inputs=inputs,
            prompt_id="exterior_single",
            status="pending",
        )
    if "remove" in frame.keywords:
        return _skip(inputs, "object_remove filename seen but no object list in brief.json")
    scene_kind = _scene_kind(frame)
    if scene_kind == "exterior":
        return ClassifiedItem(
            id="",
            condition="exterior_single",
            inputs=inputs,
            prompt_id="exterior_single",
            status="pending",
            flag="EXIF stripped; classified exterior from sky chroma (not guessed architecture)",
        )
    if scene_kind == "interior":
        return ClassifiedItem(
            id="",
            condition="interior_single",
            inputs=inputs,
            prompt_id="interior_single",
            status="pending",
            flag="EXIF stripped; classified interior (MLS-sized 3:2 still, no sky chroma)",
        )
    return _skip(
        inputs,
        "uncertain classification — no INT/EXT/DRONE/VT token and no brief override; skipped rather than guessed",
    )


def _scene_kind(frame: Frame) -> Optional[str]:
    w, h = frame.width or 0, frame.height or 0
    if min(w, h) < MIN_SCENE_EDGE:
        return None
    ratio = w / h if h else 0
    if ratio < 1.35 or ratio > 1.7:
        return None
    if frame.sky_br is not None and frame.sky_br >= SKY_BR_EXTERIOR:
        return "exterior"
    return "interior"


def _looks_drone(frame: Frame) -> bool:
    if (frame.make or "").upper().startswith("DJI"):
        return True
    if frame.altitude_m is not None and frame.altitude_m >= 20:
        return True
    return False


def _skip(inputs: dict[str, str], flag: str) -> ClassifiedItem:
    return ClassifiedItem(
        id="",
        condition="skipped",
        inputs=inputs,
        prompt_id="",
        status="skipped",
        flag=flag,
    )


def _brief_virtuals(
    brief: Brief, frames: list[Frame], existing: list[ClassifiedItem]
) -> list[ClassifiedItem]:
    extra: list[ClassifiedItem] = []
    if brief.twilight_from_exteriors:
        for item in existing:
            if item.condition != "exterior_single":
                continue
            src = item.inputs.get("single")
            extra.append(
                ClassifiedItem(
                    id="",
                    condition="virtual_twilight",
                    inputs={"single": src} if src else dict(item.inputs),
                    prompt_id="virtual_twilight",
                    status="pending",
                )
            )
    by_name = {_norm_name(f.path.name): f for f in frames}
    for spec in brief.extras:
        condition = spec.get("condition")
        if condition not in {
            "virtual_twilight",
            "object_remove",
            "declutter",
            "yard_cleanup",
            "window_pull",
            "interior_single",
            "exterior_single",
            "drone",
        }:
            continue
        inputs = dict(spec.get("inputs") or {})
        if spec.get("single") and "single" not in inputs:
            inputs = {**inputs, "single": spec["single"]}
        resolved = {}
        for k, v in inputs.items():
            name = _norm_name(str(v))
            frame = by_name.get(name)
            resolved[k] = str(frame.path) if frame else str(v)
        extra.append(
            ClassifiedItem(
                id=str(spec.get("id") or ""),
                condition=condition,
                inputs=resolved,
                prompt_id=condition,
                status="pending",
                object_list=list(spec.get("object_list") or []),
            )
        )
    return extra


def _brief_window_pulls(
    brief: Brief, frames: list[Frame], used: set[Path]
) -> list[ClassifiedItem]:
    by_name = {_norm_name(f.path.name): f for f in frames}
    items: list[ClassifiedItem] = []
    for spec in brief.window_pull:
        interior = spec.get("interior") or spec.get("middle")
        dark = spec.get("dark")
        if not interior or not dark:
            items.append(
                _skip({}, "window_pull brief entry missing interior/dark paths")
            )
            continue
        fi = by_name.get(_norm_name(interior))
        fd = by_name.get(_norm_name(dark))
        if not fi or not fd:
            items.append(_skip({}, f"window_pull files not found: {interior!r}, {dark!r}"))
            continue
        items.append(
            ClassifiedItem(
                id="",
                condition="window_pull",
                inputs={"middle": str(fi.path), "dark": str(fd.path)},
                prompt_id="window_pull",
                status="pending",
            )
        )
    return items


def _assign_ids(items: list[ClassifiedItem]) -> list[ClassifiedItem]:
    counts: dict[str, int] = {}
    used: set[str] = set()
    for item in items:
        if item.id:
            used.add(item.id)
            continue
        base = {
            "interior_hdr": "int-hdr",
            "interior_single": "int",
            "exterior_single": "ext",
            "virtual_twilight": "vt",
            "drone": "drone",
            "object_remove": "rm",
            "declutter": "declutter",
            "yard_cleanup": "yard",
            "window_pull": "wpull",
            "skipped": "skip",
        }.get(item.condition, item.condition)
        counts[base] = counts.get(base, 0) + 1
        candidate = f"{base}-{counts[base]:02d}"
        while candidate in used:
            counts[base] += 1
            candidate = f"{base}-{counts[base]:02d}"
        item.id = candidate
        used.add(candidate)
    return items


def _norm_name(name: str) -> str:
    return Path(str(name)).name.lower()
