import type { RepEditJob } from "./types";
import { useJobStore } from "./store";

export const EMPTY_JOB: RepEditJob = {
  job_id: "live",
  source_dir: "inbox",
  provider: "grok",
  model: "grok-imagine-image-2.0",
  items: [],
};

export const JOBS: Record<string, RepEditJob> = {};

export function getJob(id: string): RepEditJob {
  if (id === "live") {
    return useJobStore.getState().live ?? { ...EMPTY_JOB };
  }
  return JOBS[id] ?? { ...EMPTY_JOB, job_id: id };
}
