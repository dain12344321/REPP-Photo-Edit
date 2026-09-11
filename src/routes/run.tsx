import { createFileRoute, Link } from "@tanstack/react-router";
import { DRIVE_FOLDERS } from "@/lib/rep-edit/folders";

export const Route = createFileRoute("/run")({ component: RunPage });

const LISTINGS = [
  {
    name: "1642 Flag Ct, Crown Point, IN 46307",
    inbox: "https://drive.google.com/drive/folders/1cCkhmwbjaEx5E7MAlFKi5oeOZBo_HNq-",
    outbox: "https://drive.google.com/drive/folders/1NErlIfipK_xQf4aLN-uPRDSTajkUE687",
  },
  {
    name: "405 N Main St, Wanatah, IN 46390",
    inbox: "https://drive.google.com/drive/folders/1V1so2_Xvn5CX2w3PLLGyY-YlcT3gF3i5",
    outbox: "https://drive.google.com/drive/folders/1QRP9oHkTO7w9AZI6xCvvo0G_wueiI6KA",
  },
];

function RunPage() {
  return (
    <div className="space-y-10">
      <header>
        <p className="eyebrow">Drive</p>
        <h1 className="mt-2 font-display text-4xl tracking-[-0.025em]">INBOX and OUTBOX</h1>
        <p className="mt-3 max-w-xl text-muted">
          Card dumps in. Delivered stills out. One folder per listing.
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

      <section>
        <h2 className="font-display text-xl">Listings</h2>
        <ul className="mt-4 divide-y divide-line overflow-hidden rounded-md border border-line bg-paper">
          {LISTINGS.map((row) => (
            <li key={row.name} className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-ink">{row.name}</span>
              <span className="flex gap-4 text-sm">
                <a href={row.inbox} className="text-steel underline-offset-4 hover:underline">
                  Card
                </a>
                <a href={row.outbox} className="text-steel underline-offset-4 hover:underline">
                  Delivery
                </a>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <Link to="/ingest" className="inline-block text-sm text-cta underline-offset-4 hover:underline">
        Ingest a card
      </Link>
    </div>
  );
}
