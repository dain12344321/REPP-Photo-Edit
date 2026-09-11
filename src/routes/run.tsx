import { createFileRoute, Link } from "@tanstack/react-router";
import { RedirectToSignIn, SignInGate } from "@/lib/auth/gates";
import { DRIVE_FOLDERS } from "@/lib/rep-edit/folders";

export const Route = createFileRoute("/run")({ component: RunPage });

function RunPage() {
  return (
    <SignInGate fallback={<RedirectToSignIn />}>
      <RunDesk />
    </SignInGate>
  );
}

function RunDesk() {
  return (
    <div className="space-y-10">
      <header>
        <p className="eyebrow">Drive</p>
        <h1 className="mt-2 font-display text-4xl tracking-[-0.025em]">INBOX and OUTBOX</h1>
        <p className="mt-3 max-w-xl text-muted">
          Card dumps in. Delivered stills out. Listing folders populate as you ingest.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-md border border-line bg-paper p-5">
          <p className="font-mono text-[11px] text-steel">INBOX</p>
          <h2 className="mt-1 font-display text-xl">Card dumps</h2>
          <a
            href={DRIVE_FOLDERS.inboxUrl}
            className="mt-4 inline-block text-sm text-cta underline-offset-4 hover:underline"
          >
            Open INBOX
          </a>
        </article>
        <article className="rounded-md border border-line bg-paper p-5">
          <p className="font-mono text-[11px] text-steel">OUTBOX</p>
          <h2 className="mt-1 font-display text-xl">Delivered stills</h2>
          <a
            href={DRIVE_FOLDERS.outboxUrl}
            className="mt-4 inline-block text-sm text-cta underline-offset-4 hover:underline"
          >
            Open OUTBOX
          </a>
        </article>
      </section>

      <Link to="/ingest" className="inline-block text-sm text-cta underline-offset-4 hover:underline">
        Ingest a card
      </Link>
    </div>
  );
}
