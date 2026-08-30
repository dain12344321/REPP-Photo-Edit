export const CONDITIONS = [
  "interior_hdr",
  "interior_single",
  "exterior_single",
  "virtual_twilight",
  "drone",
  "object_remove",
  "declutter",
  "yard_cleanup",
  "window_pull",
  "skipped",
] as const;

export type Condition = (typeof CONDITIONS)[number];

export type JobItem = {
  id: string;
  condition: Condition;
  inputs: Partial<Record<"middle" | "dark" | "bright" | "single", string>>;
  prompt_id: string;
  status: "pending" | "done" | "skipped" | "error";
  flag?: string;
  output?: string;
  output_name?: string;
  result?: string;
  prompt?: string;
  prompt_sha256?: string;
  dry_run?: boolean;
  object_list?: string[];
};

export type RepEditJob = {
  job_id: string;
  source_dir: string;
  provider?: "grok" | "codex";
  model?: string;
  created_at?: string;
  items: JobItem[];
};

export const CONDITION_LABEL: Record<Condition, string> = {
  interior_hdr: "Interior HDR",
  interior_single: "Interior single",
  exterior_single: "Exterior single",
  virtual_twilight: "Virtual twilight",
  drone: "Drone still",
  object_remove: "Object removal",
  declutter: "Auto declutter",
  yard_cleanup: "Yard cleanup",
  window_pull: "Window pull",
  skipped: "Skipped",
};

export const CONDITION_TONE: Record<Condition, "ink" | "steel" | "paper" | "ok" | "warn" | "err" | "dusk" | "skip"> =
  {
    interior_hdr: "steel",
    interior_single: "steel",
    exterior_single: "ok",
    virtual_twilight: "dusk",
    drone: "ink",
    object_remove: "paper",
    declutter: "paper",
    yard_cleanup: "ok",
    window_pull: "steel",
    skipped: "skip",
  };
