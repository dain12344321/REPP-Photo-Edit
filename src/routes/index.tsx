import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({ component: Home });

const STEPS = [
  {
    k: "01",
    t: "Ingest",
    d: "Drop Sony JPEGs. 3-EV interiors group as middle / dark / bright from EXIF and filename.",
  },
  {
    k: "02",
    t: "Classify",
    d: "Each stack becomes a condition: interior HDR, exterior, twilight, drone, window pull. Uncertain shots skip.",
  },
  {
    k: "03",
    t: "Edit",
    d: "Grok Imagine image-edit at 3:2 / 2K. Middle frame is geometry. Real window views only.",
  },
  {
    k: "04",
    t: "Deliver",
    d: "Versioned stills land in Grok_2K under the property folder. Original MLS handoff stays untouched.",
  },
];

function Home() {
  return (
    <div className="space-y-14">
      <section className="rise max-w-2xl">
        <p className="eyebrow">Lakeshore Listing Media</p>
        <h1 className="mt-3 font-display text-[2.15rem] leading-[1.12] tracking-[-0.025em] text-ink sm:text-5xl">
          MLS stills, Imagine-edited.
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
          A local pipeline for Sony cards and DJI dumps. Group HDR stacks, freeze
          the shot prompts, call Grok Imagine edit — not text-to-image — and write
          3:2 2K stills ready for the MLS.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/ingest"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-cta px-8 text-sm font-semibold tracking-wider text-paper uppercase transition-[background-color,transform,box-shadow] duration-200 hover:-translate-y-px hover:bg-cta-hover hover:shadow-[0_4px_12px_rgb(204_0_0_/_0.25)]"
          >
            Ingest a card
            <ArrowRight className="size-4" />
          </Link>
          <a
            href="/lakeshore-rep-edit.zip"
            download="lakeshore-rep-edit.zip"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-line bg-paper px-8 text-sm font-semibold tracking-wider text-ink uppercase transition-colors hover:border-cta hover:text-cta"
          >
            Download project
          </a>
          <Link
            to="/job/$jobId"
            params={{ jobId: "demo" }}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-line bg-paper px-8 text-sm font-semibold tracking-wider text-ink uppercase transition-colors hover:border-cta hover:text-cta"
          >
            Sample job
          </Link>
        </div>
      </section>

      <section className="grid gap-6 sm:grid-cols-2">
        {STEPS.map((s) => (
          <article key={s.k} className="rounded-md border border-line bg-paper p-6">
            <p className="font-mono text-[11px] tracking-wide text-faint uppercase">{s.k}</p>
            <h2 className="mt-2 font-display text-xl font-bold">{s.t}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{s.d}</p>
          </article>
        ))}
      </section>

      <section className="max-w-2xl text-sm leading-relaxed text-muted">
        <p>
          Run it here, on a Mac Mini with Hermes, or behind a Cloudflare tunnel.
          Auth is an xAI API key — <span className="font-mono text-ink">XAI_API_KEY</span>{" "}
          — model <span className="font-mono text-ink">grok-imagine-image-2.0</span>.
          Pixel prompts stay in{" "}
          <Link to="/prompts" className="text-cta underline-offset-4 hover:underline">
            Prompts
          </Link>
          . QC labels live on{" "}
          <Link to="/qc" className="text-cta underline-offset-4 hover:underline">
            QC
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
