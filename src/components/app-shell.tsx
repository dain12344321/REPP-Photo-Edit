import { Link, useRouterState } from "@tanstack/react-router";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/ingest", label: "Ingest" },
  { to: "/job/$jobId", label: "Job" },
  { to: "/prompts", label: "Prompts" },
  { to: "/qc", label: "Gallery" },
  { to: "/run", label: "Drive" },
] as const;

function AuthSlot() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-paper/20" />;
  }
  if (user) {
    return (
      <div className="text-paper [&_span]:text-paper [&_button]:text-paper/70">
        <UserButton />
      </div>
    );
  }
  return (
    <Link
      to="/login"
      className="rounded-full px-4 py-2 text-xs font-medium tracking-[0.12em] text-paper/75 uppercase hover:text-paper"
    >
      Sign in
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-paper text-ink-soft">
      <header className="bg-header text-paper">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <span className="font-display text-[15px] font-bold tracking-tight text-paper sm:text-lg">
              Lakeshore Listing Media
            </span>
            <span className="hidden h-8 w-px bg-paper/20 sm:block" />
            <span className="hidden font-mono text-[11px] tracking-[0.18em] text-paper/70 uppercase sm:inline">
              REP Edit
            </span>
          </Link>
          <div className="flex flex-wrap items-center gap-1">
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
            <AuthSlot />
          </div>
        </div>
        <div className="h-px bg-brand/40" />
      </header>
      <main className="mx-auto max-w-[1280px] px-6 py-10 sm:px-8 sm:py-12">{children}</main>
      <footer className="bg-header text-paper/70">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-3 px-6 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p className="font-mono text-[11px] tracking-[0.14em] uppercase">
            Lakeshore Listing Media
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <a
              href="https://github.com/dain12344321/REPP-Photo-Edit"
              className="text-xs tracking-[0.12em] text-brand uppercase hover:text-paper"
            >
              GitHub
            </a>
            <a
              href="https://lakeshorelisting.media"
              className="text-xs tracking-[0.12em] text-brand uppercase hover:text-paper"
            >
              lakeshorelisting.media
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
