import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Download, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/")({ component: Home });

const STEPS = [
  {
    k: "01",
    t: "Ingest",
    d: "Drop a Sony card or DJI dump. 3-EV interiors group as middle / dark / bright from EXIF, filename, or luma.",
  },
  {
    k: "02",
    t: "Classify",
    d: "Each stack becomes a listed condition. Uncertain shots skip. Never guess a window view.",
  },
  {
    k: "03",
    t: "Edit",
    d: "Grok Imagine image-edit at 3:2 / 2K. Middle frame is geometry. Frosted glass stays frosted.",
  },
  {
    k: "04",
    t: "Deliver",
    d: "Versioned stills land in Grok_2K. Original MLS handoff stays untouched. Hermes or this console.",
  },
];

const LOOK = [
  { src: "/gallery/sumava/11477_N_250_W_Sumava_Resorts_IN_46379_001_MLS.jpg", cap: "Exterior · Sumava" },
  { src: "/gallery/sumava/11477_N_250_W_Sumava_Resorts_IN_46379_010_MLS.jpg", cap: "Interior HDR" },
  { src: "/gallery/sumava/11477_N_250_W_Sumava_Resorts_IN_46379_015_MLS.jpg", cap: "Kitchen" },
  { src: "/gallery/sumava/11477_N_250_W_Sumava_Resorts_IN_46379_027_MLS.jpg", cap: "Bath · window-truth" },
  { src: "/gallery/sumava/11477_N_250_W_Sumava_Resorts_IN_46379_033_VT.jpg", cap: "Virtual twilight" },
  { src: "/gallery/marietta-04.jpg", cap: "Gold look · Marietta" },
];

function Home() {
  return (
    <div className="space-y-16">
      <section className="grid items-end gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rise max-w-2xl">
          <p className="eyebrow">Lakeshore Listing Media</p>
          <h1 className="mt-3 font-display text-[2.15rem] leading-[1.12] tracking-[-0.025em] text-ink sm:text-5xl">
            MLS stills. Imagine-edited. Window-truth locked.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
            The dialed-in Grok Imagine pack — AutoHDR Classic, Lisa window
            pull, Luminar twilight — with one hard fix: do not invent a view
            through frosted glass. Sony cards in. 3:2 2K stills out.
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
              <Download className="size-4" />
              Hermes zip
            </a>
            <Link
              to="/run"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-line bg-paper px-8 text-sm font-semibold tracking-wider text-ink uppercase transition-colors hover:border-cta hover:text-cta"
            >
              Cloudflare / Drive
            </Link>
          </div>
        </div>
        <figure className="rise-2 overflow-hidden rounded-md border border-line">
          <img
            src="/gallery/hero1.jpg"
            alt="Lakeshore listing exterior"
            className="frame-3x2 w-full object-cover"
          />
        </figure>
      </section>

      <section className="rise-3">
        <div className="mb-4 flex items-end justify-between gap-4">
          <h2 className="font-display text-2xl">The locked look</h2>
          <Link to="/qc" className="text-sm text-steel underline-offset-4 hover:underline">
            QC gallery
          </Link>
        </div>
        <div className="-mx-6 flex gap-3 overflow-x-auto px-6 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-6">
          {LOOK.map((shot) => (
            <figure key={shot.src} className="min-w-[200px] sm:min-w-0">
              <img src={shot.src} alt={shot.cap} className="frame-3x2 w-full rounded-sm object-cover" />
              <figcaption className="mt-2 font-mono text-[11px] tracking-wide text-muted uppercase">
                {shot.cap}
              </figcaption>
            </figure>
          ))}
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

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-md border border-line bg-paper p-6">
          <div className="flex items-center gap-2 text-ok">
            <ShieldCheck className="size-5" />
            <h2 className="font-display text-xl">Window truth</h2>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            The previous pack recovered every window as a Lisa pool. Bathroom
            frosted glass grew invented trees and water. The 2026-09-11 pack
            recovers a view only when the dark frame actually contains one.
            Privacy glass stays privacy glass.
          </p>
        </article>
        <article className="rounded-md border border-line bg-paper p-6">
          <h2 className="font-display text-xl">Three ways to run</h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted">
            <li>
              <span className="font-medium text-ink">This console</span> — drop a card, classify, run Imagine with the injected xAI key.
            </li>
            <li>
              <span className="font-medium text-ink">Hermes on a Mac Mini</span> — download the zip, point the skill at an inbox, use your xAI key or session.
            </li>
            <li>
              <span className="font-medium text-ink">Cloudflare tunnel</span> — host the console on your domain, keep the key server-side, rclone Drive in and out.
            </li>
          </ul>
        </article>
      </section>
    </div>
  );
}
