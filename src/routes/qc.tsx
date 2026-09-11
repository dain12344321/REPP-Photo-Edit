import { createFileRoute, Link } from "@tanstack/react-router";
import { RedirectToSignIn, SignInGate } from "@/lib/auth/gates";
import { DRIVE_FOLDERS } from "@/lib/rep-edit/folders";
import { useJobStore } from "@/lib/rep-edit/store";

export const Route = createFileRoute("/qc")({ component: QcPage });

function QcPage() {
  return (
    <SignInGate fallback={<RedirectToSignIn />}>
      <QcDesk />
    </SignInGate>
  );
}

function QcDesk() {
  const live = useJobStore((s) => s.live);
  const stills = (live?.items ?? []).filter((item) => item.result);

  return (
    <div className="space-y-10">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Gallery</p>
          <h1 className="mt-2 font-display text-4xl tracking-[-0.025em]">Stills</h1>
          <p className="mt-2 max-w-xl text-muted">
            Finished edits from this session land here. Empty until you ingest a card.
          </p>
        </div>
        <a href={DRIVE_FOLDERS.outboxUrl} className="text-sm text-steel underline-offset-4 hover:underline">
          Open OUTBOX
        </a>
      </header>

      {stills.length ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {stills.map((item) => (
            <figure key={item.id}>
              <img src={item.result} alt={item.id} className="frame-3x2 w-full rounded-sm object-cover" />
              <figcaption className="mt-2 font-mono text-[11px] tracking-wide text-muted uppercase">
                {item.id}
              </figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-line px-6 py-16 text-center">
          <p className="font-display text-xl text-ink">No stills yet</p>
          <p className="mt-2 text-sm text-muted">Ingest a card and run edits. Results populate this gallery.</p>
          <Link
            to="/ingest"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-cta px-8 text-sm font-semibold tracking-wider text-paper uppercase hover:bg-cta-hover"
          >
            Ingest a card
          </Link>
        </div>
      )}
    </div>
  );
}
