import type { Condition, JobItem } from "./types";
import { parseJpegExif, type FrameExif } from "./exif";

export type FrameRole = "middle" | "dark" | "bright";

export type Frame = {
  name: string;
  url: string;
  make: string;
  model: string;
  dt: string | null;
  ev: number | null;
  altitudeM: number | null;
  seq: number | null;
  role: FrameRole | null;
  keywords: Set<string>;
  width: number | null;
  height: number | null;
  luma: number | null;
  skyBr: number | null;
  scene: number[] | null;
};

export type Brief = {
  twilight_from_exteriors?: boolean;
  object_remove?: Record<string, string[]>;
  declutter?: string[];
  yard_cleanup?: string[];
};

const ROLE_PATTERNS: Array<[FrameRole, RegExp]> = [
  ["middle", /(?:^|[_\-])(middle|mid|base|0ev|ev0)(?:[_\-.]|$)/i],
  ["dark", /(?:^|[_\-])(dark|minus3|n03|-3ev|ev-3)(?:[_\-.]|$)/i],
  ["bright", /(?:^|[_\-])(bright|plus3|p03|\+3ev|ev\+3)(?:[_\-.]|$)/i],
  ["middle", /(?:^|[_\-])m(?:[_\-.]|$)/],
  ["dark", /(?:^|[_\-])d(?:[_\-.]|$)/],
  ["bright", /(?:^|[_\-])b(?:[_\-.]|$)/],
];

const BRACKET_WINDOW_SECONDS = 12;
const MIN_EV_SPREAD = 2;
const SCENE_MAE_MAX = 36;
const LUMA_SPREAD_MIN = 50;
const SKY_BR_EXTERIOR = 12;
const MIN_SCENE_EDGE = 1000;

export function roleFromName(name: string): FrameRole | null {
  const stem = name.replace(/\.[^.]+$/, "");
  for (const [role, pat] of ROLE_PATTERNS) {
    if (pat.test(stem)) return role;
  }
  return null;
}

export function keywordsFrom(name: string, make: string, model: string): Set<string> {
  const blob = `${name} ${make} ${model}`.toUpperCase();
  const tokens = new Set(blob.split(/[^A-Z0-9+]+/));
  const keys = new Set<string>();
  if (tokens.has("INT") || tokens.has("INTERIOR")) keys.add("interior");
  if (tokens.has("EXT") || tokens.has("EXTERIOR")) keys.add("exterior");
  if (tokens.has("DRONE") || tokens.has("DJI") || tokens.has("AERIAL")) keys.add("drone");
  if (tokens.has("VT") || tokens.has("TWILIGHT") || tokens.has("DUSK")) keys.add("twilight");
  if (tokens.has("DECLUTTER") || tokens.has("CLUTTER")) keys.add("declutter");
  if (tokens.has("YARD")) keys.add("yard");
  if (tokens.has("REMOVE") || tokens.has("REMOVAL")) keys.add("remove");
  if (tokens.has("WPULL") || tokens.has("WINDOWPULL")) keys.add("window_pull");
  if ((make || "").toUpperCase().startsWith("DJI")) keys.add("drone");
  if ((make || "").toUpperCase().includes("HASSELBLAD") && blob.includes("DJI")) keys.add("drone");
  return keys;
}

function seqFromName(name: string): number | null {
  const m = name.match(/(\d{3,})/);
  return m ? Number(m[1]) : null;
}

function bracketStem(frame: Frame): string | null {
  if (!frame.role) return null;
  let trimmed = frame.name.replace(/\.[^.]+$/, "");
  trimmed = trimmed.replace(
    /(?:[_\-])(middle|mid|base|0ev|ev0|dark|minus3|n03|-3ev|ev-3|bright|plus3|p03|\+3ev|ev\+3|m|d|b)$/i,
    "",
  );
  trimmed = trimmed.replace(/^(?:DSC|IMG)?_?\d{3,}_/i, "");
  return (trimmed || frame.name).toLowerCase();
}

function parseExifDate(dt: string | null): number | null {
  if (!dt) return null;
  const m = dt.match(/^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (!m) {
    const t = Date.parse(dt);
    return Number.isFinite(t) ? t : null;
  }
  return Date.UTC(
    Number(m[1]),
    Number(m[2]) - 1,
    Number(m[3]),
    Number(m[4]),
    Number(m[5]),
    Number(m[6]),
  );
}

function sameBurst(a: Frame, b: Frame): boolean {
  const ta = parseExifDate(a.dt);
  const tb = parseExifDate(b.dt);
  if (ta != null && tb != null) return Math.abs(tb - ta) <= BRACKET_WINDOW_SECONDS * 1000;
  if (a.seq != null && b.seq != null) return Math.abs(b.seq - a.seq) <= 4;
  return false;
}

function sameScene(a: Frame, b: Frame): boolean {
  if (!a.scene || !b.scene || a.scene.length !== b.scene.length) return true;
  let sum = 0;
  for (let i = 0; i < a.scene.length; i++) sum += Math.abs(a.scene[i]! - b.scene[i]!);
  return sum / a.scene.length <= SCENE_MAE_MAX;
}

function skip(inputs: JobItem["inputs"], flag: string, input_names?: JobItem["input_names"]): JobItem {
  return {
    id: "",
    condition: "skipped",
    inputs,
    input_names,
    prompt_id: "",
    status: "skipped",
    flag,
  };
}

function classifyStack(stack: Record<FrameRole, Frame>): JobItem {
  const keys = new Set<string>();
  for (const r of ["middle", "dark", "bright"] as const) {
    for (const k of stack[r].keywords) keys.add(k);
  }
  const inputs = {
    middle: stack.middle.url,
    dark: stack.dark.url,
    bright: stack.bright.url,
  };
  const input_names = {
    middle: stack.middle.name,
    dark: stack.dark.name,
    bright: stack.bright.name,
  };
  if (keys.has("drone")) {
    return skip(inputs, "drone brackets are not a listed still condition; not guessing an aerial HDR blend", input_names);
  }
  if (keys.has("exterior") && !keys.has("interior")) {
    return skip(inputs, "exterior 3-EV stack is not a listed condition; not guessing interior HDR", input_names);
  }
  const hasEv = [stack.middle, stack.dark, stack.bright].some((f) => f.ev != null);
  return {
    id: "",
    condition: "interior_hdr",
    inputs,
    input_names,
    prompt_id: "interior_hdr",
    status: "pending",
    flag: hasEv ? undefined : "EXIF stripped; 3-EV grouped by sequence + scene luma",
  };
}

function looksDrone(frame: Frame): boolean {
  if ((frame.make || "").toUpperCase().startsWith("DJI")) return true;
  if (frame.altitudeM != null && frame.altitudeM >= 20) return true;
  return false;
}

function sceneKind(frame: Frame): "interior" | "exterior" | null {
  const w = frame.width ?? 0;
  const h = frame.height ?? 0;
  if (Math.min(w, h) < MIN_SCENE_EDGE) return null;
  const ratio = h ? w / h : 0;
  if (ratio < 1.35 || ratio > 1.7) return null;
  if (frame.skyBr != null && frame.skyBr >= SKY_BR_EXTERIOR) return "exterior";
  return "interior";
}

function classifySingle(frame: Frame, brief: Brief): JobItem {
  const name = frame.name.toLowerCase();
  const inputs = { single: frame.url };
  const input_names = { single: frame.name };
  const pending = (condition: Exclude<Condition, "skipped">, extra: Partial<JobItem> = {}): JobItem => ({
    id: "",
    condition,
    inputs,
    input_names,
    prompt_id: condition,
    status: "pending",
    ...extra,
  });
  const listed = brief.object_remove?.[name];
  if (listed) {
    if (!listed.length) return skip(inputs, "object_remove listed but object list is empty", input_names);
    return pending("object_remove", { object_list: listed });
  }
  if ((brief.declutter ?? []).includes(name) || frame.keywords.has("declutter")) {
    return pending("declutter");
  }
  if ((brief.yard_cleanup ?? []).includes(name) || frame.keywords.has("yard")) {
    return pending("yard_cleanup");
  }
  if (frame.keywords.has("window_pull")) {
    return skip(inputs, "window_pull needs an interior + dark pair in brief.json; not guessing", input_names);
  }
  if (frame.keywords.has("twilight")) return pending("virtual_twilight");
  if (frame.keywords.has("drone") || looksDrone(frame)) return pending("drone");
  if (frame.keywords.has("interior")) return pending("interior_single");
  if (frame.keywords.has("exterior")) return pending("exterior_single");
  if (frame.keywords.has("remove")) {
    return skip(inputs, "object_remove filename seen but no object list in brief.json", input_names);
  }
  const kind = sceneKind(frame);
  if (kind === "exterior") {
    return pending("exterior_single", { flag: "no INT/EXT token; classified exterior from sky chroma" });
  }
  if (kind === "interior") {
    return pending("interior_single", { flag: "no INT/EXT token; classified interior (MLS 3:2, no sky chroma)" });
  }
  return skip(
    inputs,
    "uncertain classification — no INT/EXT/DRONE/VT token and no brief override; skipped rather than guessed",
    input_names,
  );
}

function stackFromNamed(group: Frame[]): Record<FrameRole, Frame> | null {
  const byRole: Partial<Record<FrameRole, Frame>> = {};
  for (const f of group) if (f.role && !byRole[f.role]) byRole[f.role] = f;
  if (byRole.middle && byRole.dark && byRole.bright) {
    return { middle: byRole.middle, dark: byRole.dark, bright: byRole.bright };
  }
  return null;
}

function stackFromEv(window: Frame[]): Record<FrameRole, Frame> | null {
  const withEv = window.filter((f) => f.ev != null);
  if (withEv.length < 3) return null;
  const unique = new Map<number, Frame>();
  for (const frame of withEv) {
    const key = Math.round((frame.ev as number) * 100) / 100;
    if (!unique.has(key)) unique.set(key, frame);
  }
  if (unique.size < 3) return null;
  const evs = [...unique.keys()].sort((a, b) => a - b);
  const darkEv = evs[0]!;
  const brightEv = evs[evs.length - 1]!;
  if (brightEv - darkEv < MIN_EV_SPREAD) return null;
  const midEv = evs.reduce((best, e) => (Math.abs(e) < Math.abs(best) ? e : best), evs[0]!);
  if (midEv === darkEv || midEv === brightEv) return null;
  return {
    dark: unique.get(darkEv)!,
    middle: unique.get(midEv)!,
    bright: unique.get(brightEv)!,
  };
}

function stackFromLuma(window: Frame[]): Record<FrameRole, Frame> | null {
  const withLuma = window.filter((f) => f.luma != null);
  if (withLuma.length < 3) return null;
  const dark = withLuma.reduce((a, b) => ((a.luma ?? 0) < (b.luma ?? 0) ? a : b));
  const bright = withLuma.reduce((a, b) => ((a.luma ?? 0) > (b.luma ?? 0) ? a : b));
  if ((bright.luma ?? 0) - (dark.luma ?? 0) < LUMA_SPREAD_MIN) return null;
  const remaining = withLuma.filter((f) => f !== dark && f !== bright);
  if (!remaining.length) return null;
  const target = ((dark.luma ?? 0) + (bright.luma ?? 0)) / 2;
  const middle = remaining.reduce((a, b) =>
    Math.abs((a.luma ?? 0) - target) < Math.abs((b.luma ?? 0) - target) ? a : b,
  );
  return { dark, middle, bright };
}

function groupHdrStacks(frames: Frame[]): {
  stacks: Array<Record<FrameRole, Frame>>;
  dups: Frame[];
  leftover: Frame[];
} {
  const stacks: Array<Record<FrameRole, Frame>> = [];
  const dups: Frame[] = [];
  const byStem = new Map<string, Frame[]>();
  const rest: Frame[] = [];
  for (const frame of frames) {
    const stem = bracketStem(frame);
    if (stem && frame.role) {
      const arr = byStem.get(stem) ?? [];
      arr.push(frame);
      byStem.set(stem, arr);
    } else rest.push(frame);
  }
  for (const group of byStem.values()) {
    const named = stackFromNamed(group);
    if (named) stacks.push(named);
    else rest.push(...group);
  }

  rest.sort((a, b) => {
    const da = parseExifDate(a.dt) ?? Number.MAX_SAFE_INTEGER;
    const db = parseExifDate(b.dt) ?? Number.MAX_SAFE_INTEGER;
    if (da !== db) return da - db;
    const sa = a.seq ?? 1e12;
    const sb = b.seq ?? 1e12;
    if (sa !== sb) return sa - sb;
    return a.name.localeCompare(b.name);
  });

  const consumed = new Set<string>();
  for (let i = 0; i < rest.length; i++) {
    const start = rest[i]!;
    if (consumed.has(start.name)) continue;
    const cluster = [start];
    for (let j = i + 1; j < rest.length; j++) {
      const nxt = rest[j]!;
      if (consumed.has(nxt.name)) continue;
      if (!sameBurst(cluster[0]!, nxt)) break;
      if (!sameScene(cluster[0]!, nxt)) break;
      cluster.push(nxt);
    }
    const stack = stackFromEv(cluster) ?? stackFromLuma(cluster);
    if (stack) {
      const taken = new Set([stack.middle.name, stack.dark.name, stack.bright.name]);
      for (const frame of cluster) {
        consumed.add(frame.name);
        if (!taken.has(frame.name)) dups.push(frame);
      }
      stacks.push(stack);
    }
  }

  const leftover = rest.filter((f) => !consumed.has(f.name));
  return { stacks, dups, leftover };
}

function assignIds(items: JobItem[]): JobItem[] {
  const counts: Record<string, number> = {};
  const used = new Set<string>();
  const bases: Record<string, string> = {
    interior_hdr: "int-hdr",
    interior_single: "int",
    exterior_single: "ext",
    virtual_twilight: "vt",
    drone: "drone",
    object_remove: "rm",
    declutter: "declutter",
    yard_cleanup: "yard",
    window_pull: "wpull",
    skipped: "skip",
  };
  return items.map((item) => {
    if (item.id) return item;
    const base = bases[item.condition] ?? item.condition;
    counts[base] = (counts[base] ?? 0) + 1;
    let candidate = `${base}-${String(counts[base]).padStart(2, "0")}`;
    while (used.has(candidate)) {
      counts[base] += 1;
      candidate = `${base}-${String(counts[base]).padStart(2, "0")}`;
    }
    used.add(candidate);
    return { ...item, id: candidate };
  });
}

export function classifyFrames(framesIn: Frame[], brief: Brief = {}): JobItem[] {
  const frames = [...framesIn].sort((a, b) => a.name.localeCompare(b.name));
  const { stacks, dups, leftover } = groupHdrStacks(frames);
  const items: JobItem[] = [];
  for (const stack of stacks) items.push(classifyStack(stack));
  for (const dup of dups) {
    items.push(skip({ single: dup.url }, "duplicate exposure of an interior HDR stack; skipped rather than double-sending"));
  }
  const rest = leftover.sort(
    (a, b) => (a.dt || "").localeCompare(b.dt || "") || a.name.localeCompare(b.name),
  );
  for (const frame of rest) items.push(classifySingle(frame, brief));
  if (brief.twilight_from_exteriors) {
    for (const item of [...items]) {
      if (item.condition === "exterior_single" && item.inputs.single) {
        items.push({
          id: "",
          condition: "virtual_twilight",
          inputs: { single: item.inputs.single },
          input_names: item.input_names?.single ? { single: item.input_names.single } : item.input_names,
          prompt_id: "virtual_twilight",
          status: "pending",
        });
      }
    }
  }
  return assignIds(items);
}

async function sceneStatsFromUrl(url: string): Promise<{
  width: number;
  height: number;
  luma: number;
  skyBr: number;
  scene: number[];
} | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const bmp = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = 48;
    canvas.height = 32;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bmp.close();
      return null;
    }
    ctx.drawImage(bmp, 0, 0, 48, 32);
    const data = ctx.getImageData(0, 0, 48, 32).data;
    const gray: number[] = [];
    let lumaSum = 0;
    for (let i = 0; i < data.length; i += 4) {
      const g = (data[i]! + data[i + 1]! + data[i + 2]!) / 3;
      gray.push(g);
      lumaSum += g;
    }
    const luma = lumaSum / gray.length;
    const scene = gray.map((g) => g - luma);
    let sky = 0;
    const topCount = 48 * 8;
    for (let i = 0; i < topCount; i++) {
      const o = i * 4;
      sky += data[o + 2]! - data[o]!;
    }
    const stats = {
      width: bmp.width,
      height: bmp.height,
      luma,
      skyBr: sky / topCount,
      scene,
    };
    bmp.close();
    return stats;
  } catch {
    return null;
  }
}

function frameFrom(name: string, url: string, ex: FrameExif, stats: Awaited<ReturnType<typeof sceneStatsFromUrl>>): Frame {
  return {
    name,
    url,
    make: ex.make,
    model: ex.model,
    dt: ex.datetimeOriginal,
    ev: ex.exposureBias,
    altitudeM: ex.gpsAltitudeM,
    seq: seqFromName(name),
    role: roleFromName(name),
    keywords: keywordsFrom(name, ex.make, ex.model),
    width: stats?.width ?? null,
    height: stats?.height ?? null,
    luma: stats?.luma ?? null,
    skyBr: stats?.skyBr ?? null,
    scene: stats?.scene ?? null,
  };
}

export async function framesFromFiles(files: File[]): Promise<Frame[]> {
  const jpeg = files.filter((f) => /\.jpe?g$/i.test(f.name));
  const out: Frame[] = [];
  for (const file of jpeg) {
    const url = URL.createObjectURL(file);
    const ex = await parseJpegExif(await file.arrayBuffer());
    const stats = await sceneStatsFromUrl(url);
    out.push(frameFrom(file.name, url, ex, stats));
  }
  return out;
}

export const SAMPLE_FILES = [
  "DSC00001_INT_A_m.jpg",
  "DSC00002_INT_A_d.jpg",
  "DSC00003_INT_A_b.jpg",
  "DSC00004_INT_B_m.jpg",
  "DSC00005_INT_B_d.jpg",
  "DSC00006_INT_B_b.jpg",
  "DSC00007_EXT_A.jpg",
  "DSC00008_EXT_B.jpg",
  "DSC00009_DRONE_A.jpg",
];

export function overrideCondition(item: JobItem, condition: Condition): JobItem {
  if (condition === "skipped") {
    return { ...item, condition, prompt_id: "", status: "skipped", flag: "manually skipped" };
  }
  return {
    ...item,
    condition,
    prompt_id: condition,
    status: "pending",
    flag: item.flag ? `${item.flag} · overridden to ${condition}` : `overridden to ${condition}`,
  };
}
