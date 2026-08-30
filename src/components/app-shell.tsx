import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/ingest", label: "Ingest" },
  { to: "/job/$jobId", label: "Job" },
  { to: "/prompts", label: "Prompts" },
  { to: "/qc", label: "QC" },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-paper text-ink-soft">
      <header className="bg-header text-paper">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <img
              src="/brand/wordmark.png"
              alt="Lakeshore Listing Media"
              className="h-10 w-auto sm:h-12"
            />
            <span className="hidden h-8 w-px bg-paper/20 sm:block" />
            <span className="hidden font-mono text-[11px] tracking-[0.18em] text-paper/70 uppercase sm:inline">
              REP Edit
            </span>
          </Link>
          <nav className="flex flex-wrap gap-1" aria-label="Primary">
            {NAV.map((item) => {
              const active =
                item.to === "/"
                  ? pathname === "/"
                  : item.to === "/job/$jobId"
                    ? pathname.startsWith("/job")
                    : pathname === item.to || pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  params={item.to === "/job/$jobId" ? { jobId: "demo" } : undefined}
                  className={cn(
                    "rounded-full px-4 py-2 text-xs font-medium tracking-[0.12em] uppercase transition-colors duration-200",
                    active ? "bg-paper text-ink" : "text-paper/75 hover:text-paper",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="h-px bg-brand/40" />
      </header>
      <main className="mx-auto max-w-[1280px] px-6 py-10 sm:px-8 sm:py-12">{children}</main>
      <footer className="bg-header text-paper/70">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-3 px-6 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p className="font-mono text-[11px] tracking-[0.14em] uppercase">
            Lakeshore Listing Media · grok-imagine-image-2.0 · Sony 3:2
          </p>
          <a
            href="https://lakeshorelisting.media"
            className="text-xs tracking-[0.12em] text-brand uppercase hover:text-paper"
          >
            lakeshorelisting.media
          </a>
        </div>
      </footer>
    </div>
  );
}
