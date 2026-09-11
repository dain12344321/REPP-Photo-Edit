import { createFileRoute } from "@tanstack/react-router";
import { DRIVE_FOLDERS } from "@/lib/rep-edit/folders";

export const Route = createFileRoute("/qc")({ component: QcPage });

const WORK = [
  { src: "/gallery/wanatah/002_MLS.jpg", cap: "405 N Main St · front" },
  { src: "/gallery/wanatah/001_MLS-BT.jpg", cap: "405 N Main St · twilight" },
  { src: "/gallery/wanatah/015_MLS.jpg", cap: "405 N Main St · bedroom" },
  { src: "/gallery/wanatah/021_MLS.jpg", cap: "405 N Main St · interior" },
  { src: "/gallery/sumava/11477_N_250_W_Sumava_Resorts_IN_46379_001_MLS.jpg", cap: "Sumava · front" },
  { src: "/gallery/sumava/11477_N_250_W_Sumava_Resorts_IN_46379_010_MLS.jpg", cap: "Sumava · interior" },
  { src: "/gallery/sumava/11477_N_250_W_Sumava_Resorts_IN_46379_015_MLS.jpg", cap: "Sumava · kitchen" },
  { src: "/gallery/sumava/11477_N_250_W_Sumava_Resorts_IN_46379_033_VT.jpg", cap: "Sumava · twilight" },
  { src: "/gallery/hero2.jpg", cap: "Lakeshore" },
  { src: "/gallery/editing.jpg", cap: "Editing" },
];

const LABELS = [
  { k: "Standard", v: "{address}_{nnn}_MLS.jpg" },
  { k: "Twilight", v: "{address}_{nnn}_VT.jpg" },
];

function QcPage() {
  return (
    <div className="space-y-10">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Gallery</p>
          <h1 className="mt-2 font-display text-4xl tracking-[-0.025em]">Stills</h1>
        </div>
        <a href={DRIVE_FOLDERS.outboxUrl} className="text-sm text-steel underline-offset-4 hover:underline">
          Open OUTBOX
        </a>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {WORK.map((g) => (
          <figure key={g.src + g.cap}>
            <img src={g.src} alt={g.cap} className="frame-3x2 w-full rounded-sm object-cover" />
            <figcaption className="mt-2 font-mono text-[11px] tracking-wide text-muted uppercase">
              {g.cap}
            </figcaption>
          </figure>
        ))}
      </div>

      <section>
        <h2 className="font-display text-xl">Filenames</h2>
        <ul className="mt-4 divide-y divide-line overflow-hidden rounded-md border border-line bg-paper">
          {LABELS.map((row) => (
            <li key={row.k} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-baseline sm:justify-between">
              <span className="text-ink">{row.k}</span>
              <span className="font-mono text-[12px] text-muted">{row.v}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
