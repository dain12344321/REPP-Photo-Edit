import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, FolderOpen } from "lucide-react";
import { DRIVE_FOLDERS } from "@/lib/rep-edit/folders";

export const Route = createFileRoute("/")({ component: Home });

const RECENT = [
  { src: "/gallery/wanatah/002_MLS.jpg", cap: "405 N Main St, Wanatah" },
  { src: "/gallery/hero2.jpg", cap: "Lakeshore" },
  { src: "/gallery/wanatah/001_MLS-BT.jpg", cap: "Wanatah · twilight" },
  { src: "/gallery/wanatah/015_MLS.jpg", cap: "Wanatah · bedroom" },
  { src: "/gallery/sumava/11477_N_250_W_Sumava_Resorts_IN_46379_010_MLS.jpg", cap: "Sumava · interior" },
  { src: "/gallery/wanatah/021_MLS.jpg", cap: "Wanatah · interior" },
];

function Home() {
  return (
    <div className="space-y-14">
      <section className="overflow-hidden rounded-md border border-line">
        <img
          src="/gallery/hero1.jpg"
          alt="Lakeshore Listing Media"
          className="frame-3x2 w-full object-cover"
        />
      </section>

      <section className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-xl">
          <p className="eyebrow">Lakeshore Listing Media</p>
          <h1 className="mt-2 font-display text-4xl tracking-[-0.025em] sm:text-5xl">
            Listing stills for Northwest Indiana.
          </h1>
          <p className="mt-3 text-muted">
            Drop a Sony card, grade at 2K, deliver to Drive.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/ingest"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-cta px-8 text-sm font-semibold tracking-wider text-paper uppercase transition-[background-color,transform] duration-200 hover:-translate-y-px hover:bg-cta-hover"
          >
            Ingest a card
            <ArrowRight className="size-4" />
          </Link>
          <Link
            to="/login"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-line bg-paper px-8 text-sm font-semibold tracking-wider text-ink uppercase hover:border-cta hover:text-cta"
          >
            Sign in
          </Link>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <h2 className="font-display text-2xl">Recent</h2>
          <Link to="/qc" className="text-sm text-steel underline-offset-4 hover:underline">
            All stills
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {RECENT.map((shot) => (
            <figure key={shot.src}>
              <img src={shot.src} alt={shot.cap} className="frame-3x2 w-full rounded-sm object-cover" />
              <figcaption className="mt-2 font-mono text-[11px] tracking-wide text-muted uppercase">
                {shot.cap}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="flex flex-wrap gap-6 border-t border-line pt-8 text-sm">
        <a href={DRIVE_FOLDERS.inboxUrl} className="inline-flex items-center gap-2 text-ink hover:text-cta">
          <FolderOpen className="size-4" />
          INBOX
        </a>
        <a href={DRIVE_FOLDERS.outboxUrl} className="inline-flex items-center gap-2 text-ink hover:text-cta">
          <FolderOpen className="size-4" />
          OUTBOX
        </a>
      </section>
    </div>
  );
}
