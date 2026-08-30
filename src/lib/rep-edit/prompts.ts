import RAW_PACK from "../../../prompts/imagine-shot-prompts.md?raw";
import type { Condition } from "./types";

const SECTION = /^##\s+(\d+)\.\s+(.*)$/gm;

export type PromptPack = {
  keepClause: string;
  shots: Record<number, string>;
  version: string;
  raw: string;
};

export function loadPromptPack(raw: string = RAW_PACK): PromptPack {
  const matches = [...raw.matchAll(SECTION)];
  const shots: Record<number, string> = {};
  let keepClause = "";
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i]!;
    const start = match.index! + match[0].length;
    const next = matches[i + 1];
    let end = next?.index ?? raw.length;
    const stop = raw.indexOf("\n## Do not send to Imagine", start);
    if (stop !== -1 && (next == null || stop < end)) end = stop;
    const body = raw
      .slice(start, end)
      .split("\n")
      .filter((line) => !/^---+$/.test(line.trim()))
      .join("\n")
      .trim();
    const n = Number(match[1]);
    if (n === 0) keepClause = body;
    else shots[n] = body;
  }
  const versionLine = raw.split("\n").find((l) => l.toLowerCase().startsWith("version:"));
  return {
    keepClause,
    shots,
    version: versionLine?.split(":").slice(1).join(":").trim() ?? "",
    raw,
  };
}

const CONDITION_TO_SECTION: Record<Exclude<Condition, "skipped">, number> = {
  interior_hdr: 1,
  interior_single: 2,
  exterior_single: 3,
  virtual_twilight: 4,
  drone: 5,
  object_remove: 6,
  declutter: 7,
  yard_cleanup: 8,
  window_pull: 9,
};

const SECTION_TITLES: Record<number, string> = {
  0: "Sticky keep-clause",
  1: "Interior HDR — 3 brackets",
  2: "Interior — single exposure",
  3: "Exterior — single exposure",
  4: "Virtual twilight",
  5: "Drone still",
  6: "Standard object removal",
  7: "Auto declutter, keep furniture",
  8: "Outdoor yard cleanup",
  9: "Window pull (2 frames)",
};

export function sectionTitle(n: number): string {
  return SECTION_TITLES[n] ?? `Section ${n}`;
}

export function buildPrompt(
  pack: PromptPack,
  condition: Condition,
  objectList?: string[],
): string {
  if (condition === "skipped") throw new Error("skipped items have no Imagine prompt");
  const section = CONDITION_TO_SECTION[condition];
  let text = (pack.shots[section] ?? "").trim();
  if (condition === "object_remove") {
    const filled = (objectList ?? []).map((s) => s.trim()).filter(Boolean).join(", ");
    if (!filled) throw new Error("object_remove requires a non-empty object list");
    text = text.replace("[LIST]", filled);
  }
  if (text.includes("KEEP-CLAUSE")) text = text.replace("KEEP-CLAUSE", pack.keepClause.trim());
  else text = `${text}\n\n${pack.keepClause.trim()}`;
  return text.replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

export const PACK = loadPromptPack();
