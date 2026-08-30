import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getJob, JOBS } from "@/lib/rep-edit/jobs";
import { CONDITION_LABEL, CONDITION_TONE, type JobItem } from "@/lib/rep-edit/types";
import { getImagineStatus, runImagineEdit } from "@/lib/rep-edit/imagine";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/job/$jobId")({ component: JobPage });

function JobPage() {
  const { jobId } = Route.useParams();
  const job = getJob(jobId);
  const [open, setOpen] = useState<string | null>(job.items.find((i) => i.status === "done")?.id ?? job.items[0]?.id ?? null);
  const [ai, setAi] = useState<boolean | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<Record<string, string>>({});
  const [error, setError] = useState<Record<string, string>>({});

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash) setOpen(hash);
    void getImagineStatus().then((s) => setAi(s.available));
  }, [jobId]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const item of job.items) c[item.condition] = (c[item.condition] ?? 0) + 1;
    return c;
  }, [job.items]);

  const live = job.items.some((i) => i.status === "done" && !i.dry_run);

  async function toDataUrl(url: string): Promise<string> {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  async function runLive(item: JobItem) {
    if (!item.prompt) return;
    if (!window.confirm("This spends Imagine credits on one 2K edit. Continue?")) return;
    setBusy(item.id);
    setError((e) => ({ ...e, [item.id]: "" }));
    try {
      const order =
        item.condition === "interior_hdr"
          ? (["middle", "dark", "bright"] as const)
          : item.condition === "window_pull"
            ? (["middle", "dark"] as const)
            : (["single", "middle", "dark", "bright"] as const);
      const urls = order.map((k) => item.inputs[k]).filter((u): u is string => Boolean(u));
      const images = await Promise.all(urls.map(toDataUrl));
      const out = await runImagineEdit({ data: { prompt: item.prompt, images } });
      if (out.ok) setResult((r) => ({ ...r, [item.id]: out.image }));
      else setError((e) => ({ ...e, [item.id]: out.error }));
    } catch (err) {
      setError((e) => ({ ...e, [item.id]: err instanceof Error ? err.message : "edit failed" }));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-8">
      <header className="rise">
        <p className="eyebrow">Job / {job.job_id}</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <h1 className="font-display text-4xl tracking-[-0.03em]">
            {live ? "Live gallery" : "Sample job"}
          </h1>
          <div className="flex flex-wrap gap-2">
            {Object.entries(counts).map(([k, n]) => (
              <Badge key={k} tone="paper">
                {n} {k.replaceAll("_", " ")}
              </Badge>
            ))}
          </div>
        </div>
        <p className="mt-3 max-w-2xl text-ink-soft">
          {live
            ? "2K edits on grok-imagine-image-2.0."
            : "Dry-run plan only — conditions, prompts, and MLS names. Drop a card on Ingest to classify a real shoot."}
        </p>
        {Object.keys(JOBS).length > 1 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {Object.keys(JOBS).map((id) => (
            <Link
              key={id}
              to="/job/$jobId"
              params={{ jobId: id }}
              className={cn(
                "rounded-full px-3 py-1.5 text-[11px] font-semibold tracking-[0.12em] uppercase",
                id === job.job_id ? "bg-ink text-paper" : "border border-line bg-paper text-muted",
              )}
            >
              {id}
            </Link>
          ))}
        </div>
        ) : null}
      </header>

      <ol className="rise-2 space-y-3">
        {job.items.map((item, i) => {
          const thumbs = [
            item.inputs.middle && { label: "middle", src: item.inputs.middle },
            item.inputs.dark && { label: "dark", src: item.inputs.dark },
            item.inputs.bright && { label: "bright", src: item.inputs.bright },
            item.inputs.single && { label: "single", src: item.inputs.single },
          ].filter((t): t is { label: string; src: string } =>
            Boolean(t && (t.src.startsWith("/") || t.src.startsWith("http") || t.src.startsWith("data:"))),
          );
          const expanded = open === item.id;
          const edited = result[item.id] || item.result;
          return (
            <li
              id={item.id}
              key={item.id}
              className="overflow-hidden rounded-md border border-line bg-paper"
            >
              <button
                type="button"
                onClick={() => setOpen(expanded ? null : item.id)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
              >
                <span className="w-6 font-mono text-[11px] text-faint tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {edited ? (
                  <img src={edited} alt="" className="frame-3x2 h-10 w-[60px] rounded-xs object-cover" />
                ) : thumbs[0] ? (
                  <img src={thumbs[0].src} alt="" className="frame-3x2 h-10 w-[60px] rounded-xs object-cover" />
                ) : null}
                <span className="min-w-0 flex-1 truncate font-medium">{item.id}</span>
                <Badge tone={CONDITION_TONE[item.condition]}>{CONDITION_LABEL[item.condition]}</Badge>
                <span
                  className={cn(
                    "hidden font-mono text-[11px] uppercase sm:inline",
                    item.status === "done" ? "text-ok" : item.status === "skipped" ? "text-warn" : "text-muted",
                  )}
                >
                  {item.status}
                </span>
              </button>
              {expanded ? (
                <div className="border-t border-line px-4 py-4">
                  {edited ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <figure>
                        <img
                          src={thumbs[0]?.src}
                          alt="Source"
                          className="frame-3x2 w-full rounded-sm object-cover"
                        />
                        <figcaption className="mt-1 font-mono text-[11px] text-muted uppercase">
                          Source {thumbs[0]?.label}
                        </figcaption>
                      </figure>
                      <figure>
                        <img
                          src={edited}
                          alt={`Edited ${item.id}`}
                          className="frame-3x2 w-full rounded-sm object-cover"
                        />
                        <figcaption className="mt-1 font-mono text-[11px] text-muted uppercase">
                          Imagine 2K · 3:2
                        </figcaption>
                      </figure>
                    </div>
                  ) : null}
                  <div className={cn("grid gap-2", thumbs.length > 1 ? "mt-4 grid-cols-3" : edited ? "mt-4 max-w-md" : "max-w-md")}>
                    {thumbs.map((t) => (
                      <figure key={t.label} className="min-w-0">
                        <img
                          src={t.src}
                          alt={t.label}
                          className="frame-3x2 w-full rounded-sm object-cover"
                        />
                        <figcaption className="mt-1 font-mono text-[11px] text-muted uppercase">
                          {t.label}
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                  {item.flag ? <p className="mt-3 text-sm text-warn">{item.flag}</p> : null}
                  {item.prompt ? (
                    <>
                      <p className="mt-4 font-mono text-[11px] tracking-wide text-muted uppercase">
                        Prompt {item.prompt_id}
                        {item.prompt_sha256 ? ` · ${item.prompt_sha256.slice(0, 12)}` : ""}
                        {item.output_name ? ` · ${item.output_name}` : ""}
                      </p>
                      <pre className="mt-2 max-h-72 overflow-auto rounded-md bg-ink p-4 font-mono text-[12px] leading-relaxed whitespace-pre-wrap text-paper-2">
                        {item.prompt}
                      </pre>
                    </>
                  ) : null}
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <Button
                      size="sm"
                      disabled={!ai || busy === item.id || !item.prompt}
                      onClick={() => void runLive(item)}
                    >
                      {busy === item.id ? "Editing…" : edited ? "Re-run live edit" : "Run one live edit"}
                    </Button>
                    {ai === false ? (
                      <span className="text-sm text-muted">Imagine is unavailable here.</span>
                    ) : (
                      <span className="text-sm text-muted">User-initiated. 2K · 3:2 · one retry max.</span>
                    )}
                  </div>
                  {error[item.id] ? <p className="mt-2 text-sm text-err">{error[item.id]}</p> : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>

      <p className="text-sm text-muted">
        Re-ingest from a folder on the{" "}
        <Link to="/ingest" className="text-steel underline-offset-4 hover:underline">
          ingest desk
        </Link>
        .
      </p>
    </div>
  );
}
