import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { CONDITION_LABEL, CONDITION_TONE, type JobItem, type RepEditJob } from "@/lib/rep-edit/types";
import { cn } from "@/lib/utils";

function thumbOf(item: JobItem): string | undefined {
  return item.result || item.inputs.middle || item.inputs.single || item.inputs.dark;
}

export function JobTable({ job, compact }: { job: RepEditJob; compact?: boolean }) {
  const live = job.items.some((i) => i.status === "done" && !i.dry_run);
  return (
    <div className="overflow-hidden rounded-md border border-line bg-paper">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div>
          <p className="font-mono text-[11px] tracking-[0.18em] text-muted uppercase">
            Job {job.job_id}
          </p>
          <p className="text-sm text-muted">
            {job.items.length} items · {job.model ?? "grok-imagine-image-2.0"}
          </p>
        </div>
        <Badge tone={live ? "ok" : "paper"}>{live ? "live" : "dry-run"}</Badge>
      </div>
      <ul className="divide-y divide-line">
        {job.items.map((item, i) => (
          <li key={item.id}>
            <Link
              to="/job/$jobId"
              params={{ jobId: job.job_id }}
              hash={item.id}
              className="flex items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-paper-2"
            >
              <span className="w-6 font-mono text-[11px] text-faint tabular-nums">
                {String(i + 1).padStart(2, "0")}
              </span>
              {thumbOf(item) ? (
                <img
                  src={thumbOf(item)}
                  alt=""
                  className="frame-3x2 h-10 w-[60px] rounded-xs object-cover"
                />
              ) : (
                <div className="frame-3x2 h-10 w-[60px] rounded-xs bg-paper-3" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink">{item.id}</p>
                {!compact && item.flag ? (
                  <p className="truncate text-xs text-warn">{item.flag}</p>
                ) : null}
              </div>
              <Badge tone={CONDITION_TONE[item.condition]}>{CONDITION_LABEL[item.condition]}</Badge>
              <span
                className={cn(
                  "hidden font-mono text-[11px] uppercase sm:inline",
                  item.status === "skipped" ? "text-warn" : item.status === "done" ? "text-ok" : "text-muted",
                )}
              >
                {item.status}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
