import { createFileRoute } from "@tanstack/react-router";
import { PACK, sectionTitle } from "@/lib/rep-edit/prompts";

export const Route = createFileRoute("/prompts")({ component: PromptsPage });

function PromptsPage() {
  const sections = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow">Prompt pack {PACK.version}</p>
        <h1 className="mt-2 font-display text-4xl tracking-[-0.025em]">Shot prompts</h1>
        <p className="mt-3 max-w-xl text-muted">
          What Imagine receives for each condition. Keep-clause is appended automatically.
        </p>
      </header>

      <div className="space-y-6">
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
