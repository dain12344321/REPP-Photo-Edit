import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/qc")({ component: QcPage });

const CHECKS = [
  {
    t: "Property accuracy",
    d: "No unauthorized architecture, furniture, views, or condition changes.",
  },
  {
    t: "Geometry",
    d: "Verticals upright. Rooms not stretched. Sony 3:2 preserved. No 16:9 / 4:3 / square crop.",
  },
  {
    t: "Windows",
    d: "Recover only the real view in the dark bracket. A bright clipped window beats an invented postcard.",
  },
  {
    t: "Twilight",
    d: "Time of day only. Existing windows and fixtures. No purple sky, no new lights, house still visible.",
  },
  {
    t: "Color",
    d: "Neutral whites, real wood, natural grass. No fake HDR, halos, neon foliage, orange interiors.",
  },
  {
    t: "Removal",
    d: "Listed objects only, plus their shadows and reflections. Do not hide damage. Do not enlarge the room.",
  },
];

const LABELS = [
  { k: "Standard", v: "[PROPERTY]_[SHOT]_MLS.jpg" },
  { k: "Virtual twilight", v: "[PROPERTY]_[SHOT]_VT.jpg" },
  { k: "Heavy declutter", v: "[PROPERTY]_[SHOT]_VD.jpg" },
  { k: "Furniture removal", v: "[PROPERTY]_[SHOT]_VFR.jpg" },
  { k: "Virtual staging", v: "[PROPERTY]_[SHOT]_VS.jpg" },
  { k: "Lawn enhancement", v: "[PROPERTY]_[SHOT]_VLE.jpg" },
];

const OUT = [
  "Day-to-dusk photo-to-video",
  "Parcel / property-boundary overlays",
  "Gallery-wide generative matching",
];

function QcPage() {
  return (
    <div className="space-y-10">
      <header className="rise max-w-2xl">
        <p className="eyebrow">Quality control</p>
        <h1 className="mt-2 font-display text-4xl tracking-[-0.025em]">Match the delivered gallery. Not a mood.</h1>
        <p className="mt-3 text-muted">
          Score against lakeshorelisting.media heroes and Drive deliveries
          (Jefferson, Marietta — AutoHDR + Luminar). Disclosure suffixes live in
          source-long-REFERENCE-ONLY.md. They are for editors. They do not go to Imagine.
        </p>
      </header>

      <section className="rise-2">
        <h2 className="font-display text-2xl">Inspect</h2>
        <ol className="mt-4 grid gap-3 sm:grid-cols-2">
          {CHECKS.map((c, i) => (
            <li key={c.t} className="rounded-md border border-line bg-paper px-4 py-4">
              <p className="font-mono text-[11px] text-steel">{String(i + 1).padStart(2, "0")}</p>
              <p className="font-medium text-ink">{c.t}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">{c.d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="rise-3">
        <h2 className="font-display text-2xl">Disclosure suffixes</h2>
        <ul className="mt-4 divide-y divide-line overflow-hidden rounded-md border border-line bg-paper">
          {LABELS.map((row) => (
            <li key={row.k} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-baseline sm:justify-between">
              <span className="text-ink">{row.k}</span>
              <span className="font-mono text-[12px] text-muted">{row.v}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-display text-2xl">Out of scope this pass</h2>
        <ul className="mt-3 space-y-2 text-ink-soft">
          {OUT.map((x) => (
            <li key={x} className="flex gap-2">
              <span className="text-steel">—</span>
              {x}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
