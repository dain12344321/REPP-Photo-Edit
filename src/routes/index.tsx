import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Download, FolderOpen } from "lucide-react";
import { SignedOut } from "@/lib/auth/gates";
import { DRIVE_FOLDERS } from "@/lib/rep-edit/folders";

export const Route = createFileRoute("/")({ component: Home });

const DOWNLOAD_URL = "https://github.com/dain12344321/REPP-Photo-Edit/archive/refs/heads/main.zip";

function Home() {
  return (
    <div className="space-y-14">
      <section className="overflow-hidden rounded-md border border-line">
        <img
          src="/hero.jpg"
          alt="Lakeshore Listing Media"
          className="frame-3x2 w-full object-cover"
        />
      </section>

      <section className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-xl">
          <p className="eyebrow">Lakeshore Listing Media</p>
          <h1 className="mt-2 font-display text-4xl tracking-[-0.025em] sm:text-5xl">
            Listing stills for Northwest Indiana.
          </h1>
          <p className="mt-3 text-muted">
            Sign in with X, drop a Sony card, deliver to Drive.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/ingest"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-cta px-8 text-sm font-semibold tracking-wider text-paper uppercase transition-[background-color,transform] duration-200 hover:-translate-y-px hover:bg-cta-hover"
          >
            Ingest a card
            <ArrowRight className="size-4" />
          </Link>
          <SignedOut>
            <Link
              to="/login"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-line bg-paper px-8 text-sm font-semibold tracking-wider text-ink uppercase hover:border-cta hover:text-cta"
            >
              Sign in with X
            </Link>
          </SignedOut>
          <a
            href={DOWNLOAD_URL}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-line bg-paper px-8 text-sm font-semibold tracking-wider text-ink uppercase hover:border-cta hover:text-cta"
          >
            <Download className="size-4" />
            Download
          </a>
        </div>
      </section>

      <section className="flex flex-wrap gap-6 border-t border-line pt-8 text-sm">
        <a href={DRIVE_FOLDERS.inboxUrl} className="inline-flex items-center gap-2 text-ink hover:text-cta">
          <FolderOpen className="size-4" />
          INBOX
        </a>
        <a href={DRIVE_FOLDERS.outboxUrl} className="inline-flex items-center gap-2 text-ink hover:text-cta">
          <FolderOpen className="size-4" />
          OUTBOX
        </a>
        <a
          href="https://github.com/dain12344321/REPP-Photo-Edit"
          className="inline-flex items-center gap-2 text-ink hover:text-cta"
        >
          GitHub
        </a>
      </section>
    </div>
  );
}
