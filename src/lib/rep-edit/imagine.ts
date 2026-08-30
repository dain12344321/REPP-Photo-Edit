import { createServerFn } from "@tanstack/react-start";

export const getImagineStatus = createServerFn({ method: "GET" }).handler(async () => {
  return { available: Boolean(process.env.XAI_API_KEY) };
});

type EditInput = {
  prompt: string;
  images: string[];
};

export const runImagineEdit = createServerFn({ method: "POST" })
  .validator((input: EditInput) => {
    if (!input || typeof input.prompt !== "string" || input.prompt.length < 8) {
      throw new Error("prompt required");
    }
    if (!Array.isArray(input.images) || input.images.length < 1 || input.images.length > 3) {
      throw new Error("1–3 images required");
    }
    return input;
  })
  .handler(async ({ data }) => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "Imagine is not available in this environment" };
    }
    const body: Record<string, unknown> = {
      model: "grok-imagine-image-2.0",
      prompt: data.prompt,
      aspect_ratio: "3:2",
      resolution: "2k",
      response_format: "b64_json",
    };
    const refs = data.images.map((url) => ({ type: "image_url" as const, url }));
    if (refs.length === 1) body.image = refs[0];
    else body.images = refs;

    const res = await fetch("https://api.x.ai/v1/images/edits", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 400);
      return { ok: false as const, error: `xAI ${res.status}: ${detail}` };
    }
    const json = (await res.json()) as {
      data?: Array<{ b64_json?: string; url?: string }>;
    };
    const first = json.data?.[0];
    const b64 = first?.b64_json;
    const url = first?.url;
    if (b64) return { ok: true as const, image: `data:image/jpeg;base64,${b64}` };
    if (url) return { ok: true as const, image: url };
    return { ok: false as const, error: "unexpected Imagine response" };
  });
