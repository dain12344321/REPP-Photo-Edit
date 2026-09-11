import demoJobRaw from "./demo-job.json";
import { PACK, buildPrompt } from "./prompts";
import type { JobItem, RepEditJob } from "./types";
import { useJobStore } from "./store";

function withFixtureUrls(job: RepEditJob): RepEditJob {
  const mapUrl = (v?: string) => {
    if (!v) return v;
    const name = v.split("/").pop();
    if (name && /^DSC\d+/i.test(name)) return `/fixtures/${name}`;
    return v;
  };
  return {
    ...job,
    items: job.items.map((item) => {
      const inputs = Object.fromEntries(
        Object.entries(item.inputs).map(([k, v]) => [k, mapUrl(v)]),
      ) as JobItem["inputs"];
      let prompt = item.prompt;
      if (item.condition !== "skipped") {
        try {
          prompt = buildPrompt(PACK, item.condition, item.object_list);
        } catch {
          /* keep frozen demo prompt */
        }
      }
      return { ...item, inputs, prompt, prompt_id: item.condition === "skipped" ? "" : item.condition };
    }),
  };
}

const demo = withFixtureUrls(demoJobRaw as RepEditJob);

export const JOBS: Record<string, RepEditJob> = {
  demo,
};

export function getJob(id: string): RepEditJob {
  if (id === "live") {
    return useJobStore.getState().live ?? demo;
  }
  return JOBS[id] ?? demo;
}
