import { createFileRoute } from "@tanstack/react-router";
import { PACK, sectionTitle } from "@/lib/rep-edit/prompts";

export const Route = createFileRoute("/prompts")({ component: PromptsPage });

function PromptsPage() {
  const sections = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
  return (
    <div className="space-y-8">
      <header className="rise max-w-2xl">
        <p className="eyebrow">Prompt pack {PACK.version}</p>
        <h1 className="mt-2 font-display text-4xl tracking-[-0.025em]">Codex-short + Lisa pull + window truth</h1>
        <p className="mt-3 text-muted">
          Shot language comes from <span className="font-mono text-sm">source-short.md</span> —
          the set that holds. Window pulls use Lisa: bright interior, deep real
          view, no halo. Frosted and privacy glass stay as photographed. Keep-clause
          on every still. Long manifesto never sent.
        </p>
      </header>

      <div className="rise-2 rounded-md bg-ink px-4 py-3 text-sm text-paper">
        Do not invent a view through frosted bathroom glass. Do not send gallery
        consistency, parcel outlines, day-to-dusk video, or the master manifesto
        as a still prompt.
      </div>

      <div className="rise-3 space-y-6">
        {sections.map((n) => (
          <article key={n} className="rounded-md border border-line bg-paper px-5 py-5">
            <p className="font-mono text-[11px] text-steel">{String(n).padStart(2, "0")}</p>
            <h2 className="mt-1 font-display text-2xl font-bold">{sectionTitle(n)}</h2>
            <pre className="mt-3 font-sans text-sm leading-relaxed whitespace-pre-wrap text-ink-soft">
              {n === 0 ? PACK.keepClause : PACK.shots[n]}
            </pre>
          </article>
        ))}
      </div>
    </div>
  );
}
