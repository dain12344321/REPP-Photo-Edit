import type { JobItem } from "./types";
import { parseJpegExif, type FrameExif } from "./exif";

export type Frame = {
  name: string;
  url: string;
  make: string;
  model: string;
  dt: string | null;
  ev: number | null;
  altitudeM: number | null;
  seq: number | null;
  role: "middle" | "dark" | "bright" | null;
  keywords: Set<string>;
};

export type Brief = {
  twilight_from_exteriors?: boolean;
  object_remove?: Record<string, string[]>;
  declutter?: string[];
  yard_cleanup?: string[];
};

const ROLE_PATTERNS: Array<[Frame["role"], RegExp]> = [
  ["middle", /(?:^|[_\-])(middle|mid|base|0ev|ev0)(?:[_\-.]|$)/i],
  ["dark", /(?:^|[_\-])(dark|minus3|n03|-3ev|ev-3)(?:[_\-.]|$)/i],
  ["bright", /(?:^|[_\-])(bright|plus3|p03|\+3ev|ev\+3)(?:[_\-.]|$)/i],
  ["middle", /(?:^|[_\-])m(?:[_\-.]|$)/],
  ["dark", /(?:^|[_\-])d(?:[_\-.]|$)/],
  ["bright", /(?:^|[_\-])b(?:[_\-.]|$)/],
];

export function roleFromName(name: string): Frame["role"] {
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

function frameFrom(name: string, url: string, ex: FrameExif): Frame {
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
  };
}

function skip(inputs: JobItem["inputs"], flag: string): JobItem {
  return {
    id: "",
    condition: "skipped",
    inputs,
    prompt_id: "",
    status: "skipped",
    flag,
  };
}

function classifyStack(stack: Record<"middle" | "dark" | "bright", Frame>): JobItem {
  const keys = new Set<string>();
  for (const r of ["middle", "dark", "bright"] as const) {
    for (const k of stack[r].keywords) keys.add(k);
  }
  const inputs = {
    middle: stack.middle.url,
    dark: stack.dark.url,
    bright: stack.bright.url,
  };
  if (keys.has("drone")) {
    return skip(inputs, "drone brackets are not a listed still condition; not guessing an aerial HDR blend");
  }
  if (keys.has("exterior") && !keys.has("interior")) {
    return skip(inputs, "exterior 3-EV stack is not a listed condition; not guessing interior HDR");
  }
  return {
    id: "",
    condition: "interior_hdr",
    inputs,
    prompt_id: "interior_hdr",
    status: "pending",
  };
}

function looksDrone(frame: Frame): boolean {
  if ((frame.make || "").toUpperCase().startsWith("DJI")) return true;
  if (frame.altitudeM != null && frame.altitudeM >= 20) return true;
  return false;
}

function classifySingle(frame: Frame, brief: Brief): JobItem {
  const name = frame.name.toLowerCase();
  const inputs = { single: frame.url };
  const listed = brief.object_remove?.[name];
  if (listed) {
    if (!listed.length) return skip(inputs, "object_remove listed but object list is empty");
    return {
      id: "",
      condition: "object_remove",
      inputs,
      prompt_id: "object_remove",
      status: "pending",
      object_list: listed,
    };
  }
  if ((brief.declutter ?? []).includes(name) || frame.keywords.has("declutter")) {
    return { id: "", condition: "declutter", inputs, prompt_id: "declutter", status: "pending" };
  }
  if ((brief.yard_cleanup ?? []).includes(name) || frame.keywords.has("yard")) {
    return { id: "", condition: "yard_cleanup", inputs, prompt_id: "yard_cleanup", status: "pending" };
  }
  if (frame.keywords.has("window_pull")) {
    return skip(inputs, "window_pull needs an interior + dark pair in brief.json; not guessing");
  }
  if (frame.keywords.has("twilight")) {
    return { id: "", condition: "virtual_twilight", inputs, prompt_id: "virtual_twilight", status: "pending" };
  }
  if (frame.keywords.has("drone") || looksDrone(frame)) {
    return { id: "", condition: "drone", inputs, prompt_id: "drone", status: "pending" };
  }
  if (frame.keywords.has("interior")) {
    return { id: "", condition: "interior_single", inputs, prompt_id: "interior_single", status: "pending" };
  }
  if (frame.keywords.has("exterior")) {
    return { id: "", condition: "exterior_single", inputs, prompt_id: "exterior_single", status: "pending" };
  }
  if (frame.keywords.has("remove")) {
    return skip(inputs, "object_remove filename seen but no object list in brief.json");
  }
  return skip(
    inputs,
    "uncertain classification — no INT/EXT/DRONE/VT token and no brief override; skipped rather than guessed",
  );
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
  const used = new Set<string>();
  const items: JobItem[] = [];
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
    const byRole: Partial<Record<"middle" | "dark" | "bright", Frame>> = {};
    for (const f of group) if (f.role) byRole[f.role] = f;
    if (byRole.middle && byRole.dark && byRole.bright) {
      used.add(byRole.middle.name);
      used.add(byRole.dark.name);
      used.add(byRole.bright.name);
      items.push(classifyStack({ middle: byRole.middle, dark: byRole.dark, bright: byRole.bright }));
    } else {
      rest.push(...group);
    }
  }
  const leftover = rest
    .filter((f) => !used.has(f.name))
    .sort((a, b) => (a.dt || "").localeCompare(b.dt || "") || a.name.localeCompare(b.name));
  for (const frame of leftover) items.push(classifySingle(frame, brief));
  if (brief.twilight_from_exteriors) {
    for (const item of [...items]) {
      if (item.condition === "exterior_single" && item.inputs.single) {
        items.push({
          id: "",
          condition: "virtual_twilight",
          inputs: { single: item.inputs.single },
          prompt_id: "virtual_twilight",
          status: "pending",
        });
      }
    }
  }
  return assignIds(items);
}

export async function framesFromFiles(files: File[]): Promise<Frame[]> {
  const jpeg = files.filter((f) => /\.jpe?g$/i.test(f.name));
  const out: Frame[] = [];
  for (const file of jpeg) {
    const ex = await parseJpegExif(await file.arrayBuffer());
    out.push(frameFrom(file.name, URL.createObjectURL(file), ex));
  }
  return out;
}

export async function framesFromUrls(
  entries: Array<{ name: string; url: string }>,
): Promise<Frame[]> {
  const out: Frame[] = [];
  for (const entry of entries) {
    const res = await fetch(entry.url);
    const buf = await res.arrayBuffer();
    const ex = parseJpegExif(buf);
    out.push(frameFrom(entry.name, entry.url, ex));
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
