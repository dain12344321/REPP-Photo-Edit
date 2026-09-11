import { create } from "zustand";
import type { JobItem, RepEditJob } from "./types";

type JobStore = {
  live: RepEditJob | null;
  setLive: (job: RepEditJob) => void;
  patchItem: (id: string, patch: Partial<JobItem>) => void;
};

export const useJobStore = create<JobStore>((set) => ({
  live: null,
  setLive: (job) => set({ live: job }),
  patchItem: (id, patch) =>
    set((state) => {
      if (!state.live) return state;
      return {
        live: {
          ...state.live,
          items: state.live.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
        },
      };
    }),
}));
