import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { FolderOpen, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  classifyCallToolError,
  redirectToLoginIfRequired,
  useRefetchWhenConnectorReady,
} from "@/lib/app-data";
import {
  classifyFrames,
  framesFromFiles,
  overrideCondition,
  type Brief,
} from "@/lib/rep-edit/classify";
import { browseDrive, type DriveEntry } from "@/lib/rep-edit/drive";
import { PACK, buildPrompt } from "@/lib/rep-edit/prompts";
import { editItem } from "@/lib/rep-edit/run-edit";
import { useJobStore } from "@/lib/rep-edit/store";
import { getImagineStatus } from "@/lib/rep-edit/imagine";
import { CONDITIONS, CONDITION_LABEL, CONDITION_TONE, type Condition, type JobItem, type RepEditJob } from "@/lib/rep-edit/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ingest")({ component: IngestPage });

const EDITABLE: Condition[] = CONDITIONS.filter((c) => c !== "skipped");

function withPrompts(items: JobItem[]): JobItem[] {
  return items.map((item) => {
    if (item.condition === "skipped") return item;
    try {
      return { ...item, prompt: buildPrompt(PACK, item.condition, item.object_list) };
    } catch (err) {
      return {
        ...item,
        status: "skipped" as const,
        condition: "skipped" as const,
        flag: err instanceof Error ? err.message : "prompt failed",
      };
    }
  });
}

function IngestPage() {
  const navigate = useNavigate();
  const setLive = useJobStore((s) => s.setLive);
  const patchItem = useJobStore((s) => s.patchItem);
  const live = useJobStore((s) => s.live);
  const [items, setItems] = useState<JobItem[] | null>(null);
  const [names, setNames] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [twilight, setTwilight] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [running, setRunning] = useState<string | null>(null);
  const [ai, setAi] = useState<boolean | null>(null);
  const [driveOpen, setDriveOpen] = useState(false);
  const [driveQuery, setDriveQuery] = useState("");
  const [driveFolder, setDriveFolder] = useState<string | undefined>(undefined);
  const [driveRows, setDriveRows] = useState<DriveEntry[]>([]);
  const [driveErr, setDriveErr] = useState<ReturnType<typeof classifyCallToolError>>(null);
  const [drivePending, setDrivePending] = useState(false);

  const brief: Brief = useMemo(() => ({ twilight_from_exteriors: twilight }), [twilight]);

  useEffect(() => {
    void getImagineStatus().then((s) => setAi(s.available));
  }, []);

  async function applyFrames(frames: Awaited<ReturnType<typeof framesFromFiles>>, sourceNames: string[]) {
    const classified = withPrompts(classifyFrames(frames, brief));
    setItems(classified);
    setNames(sourceNames);
    const job: RepEditJob = {
      job_id: "live",
      source_dir: "upload",
      provider: "grok",
      model: "grok-imagine-image-2.0",
      created_at: new Date().toISOString(),
      items: classified,
    };
    setLive(job);
  }

  async function onFiles(fileList: FileList | File[]) {
    setBusy(true);
    setError(null);
    try {
      const files = Array.from(fileList);
      const frames = await framesFromFiles(files);
      if (!frames.length) {
        setError("Drop JPEG stills — other types are ignored.");
        return;
      }
      await applyFrames(
        frames,
        frames.map((f) => f.name),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "ingest failed");
    } finally {
      setBusy(false);
    }
  }

  async function loadSample() {
    setBusy(true);
    setError(null);
    try {
      const names = [
        "DSC00001_INT_A_m.jpg",
        "DSC00002_INT_A_d.jpg",
        "DSC00003_INT_A_b.jpg",
        "DSC00004_INT_B_m.jpg",
        "DSC00005_INT_B_d.jpg",
        "DSC00006_INT_B_b.jpg",
        "DSC00007_EXT_A.jpg",
        "DSC00008_EXT_B.jpg",
        "DSC00009_DRONE_A.jpg",
      ];
      const files: File[] = [];
      for (const name of names) {
        const res = await fetch(`/fixtures/${name}`);
        const blob = await res.blob();
        files.push(new File([blob], name, { type: "image/jpeg" }));
      }
      await onFiles(files);
    } finally {
      setBusy(false);
    }
  }

  function changeCondition(id: string, condition: Condition) {
    setItems((prev) => {
      if (!prev) return prev;
      const next = withPrompts(prev.map((item) => (item.id === id ? overrideCondition(item, condition) : item)));
      setLive({
        job_id: "live",
        source_dir: "upload",
        provider: "grok",
        model: "grok-imagine-image-2.0",
        items: next,
      });
      return next;
    });
  }

  async function runOne(item: JobItem) {
    if (!item.prompt) return;
    if (!window.confirm(`Spend one Imagine 2K edit on ${item.id}?`)) return;
    setRunning(item.id);
    setError(null);
    try {
      const out = await editItem(item);
      if (out.ok) {
        const patch = { result: out.image, status: "done" as const };
        patchItem(item.id, patch);
        setItems((prev) => prev?.map((it) => (it.id === item.id ? { ...it, ...patch } : it)) ?? null);
      } else {
        setError(out.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "edit failed");
    } finally {
      setRunning(null);
    }
  }

  async function loadDrive(folderId?: string, query?: string) {
    setDrivePending(true);
    setDriveErr(null);
    const res = await browseDrive({ data: { folderId, query } });
    if (!res.ok) {
      const classified = classifyCallToolError(res);
      setDriveErr(classified);
      if (classified?.kind === "login") redirectToLoginIfRequired(res);
      setDrivePending(false);
      return;
    }
    setDriveFolder(folderId);
    setDriveRows(res.entries);
    setDrivePending(false);
  }

  useRefetchWhenConnectorReady(driveErr?.kind === "pending", () => {
    void loadDrive(driveFolder, driveQuery || undefined);
  });

  const working = items ?? live?.items ?? null;
  const pending = working?.filter((i) => i.status === "pending").length ?? 0;
  const skipped = working?.filter((i) => i.status === "skipped").length ?? 0;
  const done = working?.filter((i) => i.status === "done").length ?? 0;
  const hermesCmd = `python3 scripts/watch_inbox.py inbox --out jobs/listing --once`;

  return (
    <div className="space-y-8">
      <header className="rise max-w-2xl">
        <p className="eyebrow">Ingest</p>
        <h1 className="mt-2 font-display text-4xl tracking-[-0.025em]">Card dump in. Stacks out.</h1>
        <p className="mt-3 text-muted">
          3-EV interiors become middle / dark / bright from EXIF ExposureBias,
          burst time, or luma. Dark frame is the window pull — only when a real
          view is in that pane. Frosted glass stays frosted.
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
        <Button variant="secondary" size="sm" onClick={() => void loadSample()} disabled={busy}>
          Load 9-JPEG sample
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setDriveOpen((v) => !v)}>
          <FolderOpen className="size-4" />
          Google Drive
        </Button>
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
        <p className="mt-3 font-medium">Drop Sony JPEGs or a DJI dump</p>
        <p className="mt-1 text-sm text-muted">EXIF ExposureBiasValue + DateTimeOriginal + filename. HDR stacks group automatically.</p>
        <input
          type="file"
          accept="image/jpeg,.jpg,.jpeg"
          multiple
          className="sr-only"
          onChange={(e) => e.target.files && void onFiles(e.target.files)}
        />
      </label>

      {driveOpen ? (
        <section className="rounded-md border border-line bg-paper p-5">
          <h2 className="font-display text-2xl">Drive card dump</h2>
          <p className="mt-2 text-sm text-muted">
            Browse your Drive for a card folder. JPEGs cannot stream through the
            gate — drop them here, or hand the folder to Hermes:
          </p>
          <pre className="mt-3 overflow-auto rounded-md bg-ink p-3 font-mono text-[12px] text-paper-2">{hermesCmd}</pre>
          <div className="mt-4 flex flex-wrap gap-2">
            <input
              value={driveQuery}
              onChange={(e) => setDriveQuery(e.target.value)}
              placeholder="Search folders — Sumava, card dump, Grok_2K"
              className="h-11 min-w-0 flex-1 rounded-full border border-line px-4 text-sm"
            />
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void loadDrive(undefined, driveQuery || undefined)}
              disabled={drivePending}
            >
              {drivePending ? "Connecting…" : "Search Drive"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => void loadDrive()}>
              Root
            </Button>
          </div>
          {driveErr ? (
            <p className="mt-3 text-sm text-warn">
              {driveErr.message}
              {driveErr.kind === "login" ? " Open from Grok so Drive can attach." : null}
            </p>
          ) : null}
          {driveRows.length ? (
            <ul className="mt-4 divide-y divide-line overflow-hidden rounded-md border border-line">
              {driveRows.map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                  <span className="truncate">{row.name}</span>
                  {row.isFolder ? (
                    <button
                      type="button"
                      className="font-mono text-[11px] tracking-wide text-steel uppercase"
                      onClick={() => void loadDrive(row.id)}
                    >
                      Open
                    </button>
                  ) : (
                    <span className="font-mono text-[11px] text-muted uppercase">{row.isJpeg ? "jpeg" : "file"}</span>
                  )}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      {error ? <p className="text-sm text-err">{error}</p> : null}
      {busy ? <p className="text-sm text-muted">Reading EXIF and grouping HDR stacks…</p> : null}

      {working ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl">Result</h2>
              <p className="text-sm text-muted">
                {names.length || working.length} sources · {working.length} items · {pending} pending · {done} edited · {skipped} skipped
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/job/$jobId"
                params={{ jobId: "live" }}
                className="text-sm text-steel underline-offset-4 hover:underline"
              >
                Open live job
              </Link>
              <a
                className="text-sm text-steel underline-offset-4 hover:underline"
                href={`data:application/json,${encodeURIComponent(
                  JSON.stringify(
                    {
                      job_id: "live",
                      source_dir: "upload",
                      items: working.map(({ result: _r, ...rest }) => rest),
                    },
                    null,
                    2,
                  ),
                )}`}
                download="job.json"
              >
                Download job.json
              </a>
            </div>
          </div>
          <ul className="divide-y divide-line overflow-hidden rounded-lg bg-paper shadow-[var(--shadow-border)]">
            {working.map((item) => {
              const thumb = item.result || item.inputs.middle || item.inputs.single || item.inputs.dark;
              return (
                <li key={item.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-3">
                    {thumb ? (
                      <img src={thumb} alt="" className="frame-3x2 h-10 w-[60px] rounded-xs object-cover" />
                    ) : null}
                    <span className="font-mono text-sm text-ink">{item.id}</span>
                    <Badge tone={CONDITION_TONE[item.condition]}>{CONDITION_LABEL[item.condition]}</Badge>
                    <select
                      className="h-9 rounded-full border border-line bg-paper px-3 font-mono text-[11px] uppercase"
                      value={item.condition}
                      onChange={(e) => changeCondition(item.id, e.target.value as Condition)}
                    >
                      {EDITABLE.map((c) => (
                        <option key={c} value={c}>
                          {CONDITION_LABEL[c]}
                        </option>
                      ))}
                      <option value="skipped">Skipped</option>
                    </select>
                    <span className="font-mono text-[11px] text-muted uppercase">{item.status}</span>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={!ai || running === item.id || !item.prompt}
                      onClick={() => void runOne(item)}
                    >
                      {running === item.id ? "Editing…" : item.result ? "Re-run" : "Run edit"}
                    </Button>
                  </div>
                  {item.flag ? <p className="mt-1 text-sm text-warn">{item.flag}</p> : null}
                  <p className="mt-1 truncate font-mono text-[11px] text-faint">
                    {Object.entries(item.input_names ?? item.inputs)
                      .map(([k, v]) => `${k}: ${String(v).split("/").pop()}`)
                      .join(" · ")}
                  </p>
                </li>
              );
            })}
          </ul>
          {ai === false ? (
            <p className="text-sm text-muted">Imagine is unavailable in this environment.</p>
          ) : (
            <p className="text-sm text-muted">
              Edits are user-initiated. 2K · 3:2 · grok-imagine-image-2.0 · one shot at a time.
            </p>
          )}
          <p className="text-sm text-muted">
            Inspect the sample plan on the{" "}
            <button
              type="button"
              className="text-steel underline-offset-4 hover:underline"
              onClick={() => navigate({ to: "/job/$jobId", params: { jobId: "demo" } })}
            >
              demo job
            </button>
            .
          </p>
        </section>
      ) : null}
    </div>
  );
}
