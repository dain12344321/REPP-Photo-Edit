import demoJob from "./demo-job.json";
import type { RepEditJob } from "./types";

export const JOBS: Record<string, RepEditJob> = {
  demo: demoJob as RepEditJob,
};

export function getJob(id: string): RepEditJob {
  return JOBS[id] ?? JOBS.demo;
}
