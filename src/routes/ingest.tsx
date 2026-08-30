import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  classifyFrames,
  framesFromFiles,
  type Brief,
} from "@/lib/rep-edit/classify";
import { PACK, buildPrompt } from "@/lib/rep-edit/prompts";
import { CONDITION_LABEL, CONDITION_TONE, type JobItem } from "@/lib/rep-edit/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ingest")({ component: IngestPage });

function IngestPage() {
  const [items, setItems] = useState<JobItem[] | null>(null);
  const [names, setNames] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [twilight, setTwilight] = useState(true);
  const [dragging, setDragging] = useState(false);

  const brief: Brief = useMemo(() => ({ twilight_from_exteriors: twilight }), [twilight]);

  async function run(frames: Awaited<ReturnType<typeof framesFromFiles>>, sourceNames: string[]) {
    const classified = classifyFrames(frames, brief);
    for (const item of classified) {
      if (item.condition !== "skipped") {
        try {
          item.prompt = buildPrompt(PACK, item.condition, item.object_list);
        } catch (err) {
          item.status = "skipped";
          item.condition = "skipped";
          item.flag = err instanceof Error ? err.message : "prompt failed";
        }
      }
    }
    setItems(classified);
    setNames(sourceNames);
  }

  async function onFiles(fileList: FileList | File[]) {
    setBusy(true);
    setError(null);
    try {
      const files = Array.from(fileList);
      const frames = await framesFromFiles(files);
      if (!frames.length) {
        setError("Drop JPEG stills — other types are ignored.");
        setBusy(false);
        return;
      }
      await run(
        frames,
        frames.map((f) => f.name),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "ingest failed");
    } finally {
      setBusy(false);
    }
  }

  const pending = items?.filter((i) => i.status === "pending").length ?? 0;
  const skipped = items?.filter((i) => i.status === "skipped").length ?? 0;

  return (
    <div className="space-y-8">
      <header className="rise max-w-2xl">
        <p className="eyebrow">Ingest</p>
        <h1 className="mt-2 font-display text-4xl tracking-[-0.025em]">Card dump in. Stacks out.</h1>
        <p className="mt-3 text-muted">
          3-EV interiors become middle / dark / bright. Dark frame is the window
          pull. No INT/EXT token and no EXIF → classified from scene, or skipped.
          Nothing is guessed.
        </p>
      </header>

      <div className="rise-2 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input
            type="checkbox"
            checked={twilight}
            onChange={(e) => setTwilight(e.target.checked)}
            className="size-4 accent-steel"
          />
          Twilight candidates from exteriors
        </label>
      </div>

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files.length) void onFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-6 py-10 text-center transition-colors duration-150",
          dragging ? "border-steel bg-paper-2" : "border-line bg-paper",
        )}
      >
        <Upload className="size-6 text-steel" />
        <p className="mt-3 font-medium">Drop Sony JPEGs</p>
        <p className="mt-1 text-sm text-muted">Or browse. EXIF ExposureBiasValue + DateTimeOriginal + filename.</p>
        <input
          type="file"
          accept="image/jpeg,.jpg,.jpeg"
          multiple
          className="sr-only"
          onChange={(e) => e.target.files && void onFiles(e.target.files)}
        />
      </label>

      {error ? <p className="text-sm text-err">{error}</p> : null}
      {busy ? <p className="text-sm text-muted">Reading EXIF…</p> : null}

      {items ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl">Result</h2>
              <p className="text-sm text-muted">
                {names.length} JPEGs → {items.length} items · {pending} pending · {skipped} skipped
              </p>
            </div>
            <a
              className="text-sm text-steel underline-offset-4 hover:underline"
              href={`data:application/json,${encodeURIComponent(
                JSON.stringify({ job_id: "local", source_dir: "upload", items }, null, 2),
              )}`}
              download="job.json"
            >
              Download job.json
            </a>
          </div>
          <ul className="divide-y divide-line overflow-hidden rounded-lg bg-paper shadow-[var(--shadow-border)]">
            {items.map((item) => (
              <li key={item.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono text-sm text-ink">{item.id}</span>
                  <Badge tone={CONDITION_TONE[item.condition]}>{CONDITION_LABEL[item.condition]}</Badge>
                  <span className="font-mono text-[11px] text-muted uppercase">{item.status}</span>
                </div>
                {item.flag ? <p className="mt-1 text-sm text-warn">{item.flag}</p> : null}
                <p className="mt-1 truncate font-mono text-[11px] text-faint">
                  {Object.entries(item.inputs)
                    .map(([k, v]) => `${k}: ${String(v).split("/").pop()}`)
                    .join(" · ")}
                </p>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted">
            Inspect the completed sample on the{" "}
            <Link to="/job/$jobId" params={{ jobId: "dry-run" }} className="text-steel underline-offset-4 hover:underline">
              dry-run job
            </Link>
            .
          </p>
        </section>
      ) : null}
    </div>
  );
}
