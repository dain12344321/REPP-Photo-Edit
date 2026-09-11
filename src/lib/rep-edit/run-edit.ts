import { runImagineEdit } from "./imagine";
import type { JobItem } from "./types";

const IMAGINE_LONG_EDGE = 2048;

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

export async function toImagineDataUrl(url: string, longEdge = IMAGINE_LONG_EDGE): Promise<string> {
  const dataUrl = await toDataUrl(url);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const longest = Math.max(w, h);
      const scale = longest > longEdge ? longEdge / longest : 1;
      const cw = Math.max(1, Math.round(w * scale));
      const ch = Math.max(1, Math.round(h * scale));
      const canvas = document.createElement("canvas");
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("canvas unavailable"));
        return;
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, cw, ch);
      resolve(canvas.toDataURL("image/jpeg", 0.95));
    };
    img.onerror = () => reject(new Error("image load failed"));
    img.src = dataUrl;
  });
}

export async function editItem(item: JobItem): Promise<{ ok: true; image: string } | { ok: false; error: string }> {
  if (!item.prompt) return { ok: false, error: "no prompt" };
  const urls = inputOrder(item)
    .map((k) => item.inputs[k])
    .filter((u): u is string => Boolean(u))
    .slice(0, 3);
  if (!urls.length) return { ok: false, error: "no input images" };
  const images = await Promise.all(urls.map((u) => toImagineDataUrl(u)));
  return runImagineEdit({ data: { prompt: item.prompt, images } });
}
