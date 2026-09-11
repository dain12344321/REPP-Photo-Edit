import { runImagineEdit } from "./imagine";
import type { JobItem } from "./types";

export function inputOrder(item: JobItem): Array<"middle" | "dark" | "bright" | "single"> {
  if (item.condition === "interior_hdr") return ["middle", "dark", "bright"];
  if (item.condition === "window_pull") return ["middle", "dark"];
  return ["single", "middle", "dark", "bright"];
}

export async function toDataUrl(url: string): Promise<string> {
  if (url.startsWith("data:")) return url;
  const res = await fetch(url);
  const blob = await res.blob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function editItem(item: JobItem): Promise<{ ok: true; image: string } | { ok: false; error: string }> {
  if (!item.prompt) return { ok: false, error: "no prompt" };
  const urls = inputOrder(item)
    .map((k) => item.inputs[k])
    .filter((u): u is string => Boolean(u))
    .slice(0, 3);
  if (!urls.length) return { ok: false, error: "no input images" };
  const images = await Promise.all(urls.map(toDataUrl));
  return runImagineEdit({ data: { prompt: item.prompt, images } });
}
