import { createFileRoute, Link } from "@tanstack/react-router";
import { Download } from "lucide-react";

export const Route = createFileRoute("/run")({ component: RunPage });

function RunPage() {
  return (
    <div className="space-y-10">
      <header className="rise max-w-2xl">
        <p className="eyebrow">Hermes · Cloudflare · Drive</p>
        <h1 className="mt-2 font-display text-4xl tracking-[-0.025em]">Same pack. Three hosts.</h1>
        <p className="mt-3 text-muted">
          Pixel prompts stay in <span className="font-mono text-sm">prompts/imagine-shot-prompts.md</span>.
          Model is <span className="font-mono text-sm">grok-imagine-image-2.0</span> via{" "}
          <span className="font-mono text-sm">POST /v1/images/edits</span>. Auth is an xAI API key
          on the server, or a Hermes session that already has xAI.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-3">
        <article className="rounded-md border border-line bg-paper p-5">
          <p className="font-mono text-[11px] text-steel">01</p>
          <h2 className="mt-1 font-display text-xl">This console</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Drop a card on Ingest. Classify. Run one 2K edit at a time. The
            injected xAI key never leaves the server.
          </p>
          <Link to="/ingest" className="mt-4 inline-block text-sm text-cta underline-offset-4 hover:underline">
            Open ingest
          </Link>
        </article>
        <article className="rounded-md border border-line bg-paper p-5">
          <p className="font-mono text-[11px] text-steel">02</p>
          <h2 className="mt-1 font-display text-xl">Hermes agent</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Download the zip. Point Hermes at the repo. Copy{" "}
            <span className="font-mono text-[12px]">.grok/skills/rep-edit/</span> into the
            agent skills folder. Drop a card in <span className="font-mono text-[12px]">inbox/</span>.
          </p>
          <a
            href="/lakeshore-rep-edit.zip"
            download="lakeshore-rep-edit.zip"
            className="mt-4 inline-flex items-center gap-2 text-sm text-cta underline-offset-4 hover:underline"
          >
            <Download className="size-4" />
            lakeshore-rep-edit.zip
          </a>
        </article>
        <article className="rounded-md border border-line bg-paper p-5">
          <p className="font-mono text-[11px] text-steel">03</p>
          <h2 className="mt-1 font-display text-xl">Cloudflare</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Run the console on a Mac Mini, tunnel it, CNAME{" "}
            <span className="font-mono text-[12px]">edit.lakeshorelisting.media</span>. Keep
            the key in the process environment. Never in Vite.
          </p>
        </article>
      </section>

      <section>
        <h2 className="font-display text-2xl">Hermes — Mac Mini</h2>
        <pre className="mt-4 overflow-auto rounded-md bg-ink p-5 font-mono text-[12px] leading-relaxed text-paper-2">{`# 1. Unzip next to an inbox
python3 -m pip install -r requirements.txt
export XAI_API_KEY=xai-...          # console.x.ai — API key, not a Grok cookie

# 2. Drop Sony JPEGs (+ optional DJI folder) into inbox/
python3 scripts/ingest.py inbox --job-id listing --out jobs/listing/job.json
python3 scripts/run_job.py jobs/listing/job.json

# or watch a Drive-synced folder
python3 scripts/watch_inbox.py inbox --out jobs/listing --once

# 3. Push jobs/listing/outputs/ into that property's Grok_2K
#    DELIVERED CLIENT ASSETS (by Property)/{address}/Grok_2K/`}</pre>
      </section>

      <section>
        <h2 className="font-display text-2xl">Cloudflare tunnel</h2>
        <pre className="mt-4 overflow-auto rounded-md bg-ink p-5 font-mono text-[12px] leading-relaxed text-paper-2">{`npm install
export XAI_API_KEY=xai-...
npm run dev -- --host 0.0.0.0 --port 8080
# other terminal
cloudflared tunnel --url http://127.0.0.1:8080
# named tunnel: CNAME edit.lakeshorelisting.media → the tunnel`}</pre>
      </section>

      <section>
        <h2 className="font-display text-2xl">Google Drive</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
          Input is the card dump. Output is{" "}
          <span className="font-mono text-[12px]">Grok_2K</span> inside the property folder
          under <span className="font-medium text-ink">DELIVERED CLIENT ASSETS (by Property)</span>.
          Original <span className="font-mono text-[12px]">MLS Listing Photos/</span> stays
          read-only. Pair Hermes with rclone:
        </p>
        <pre className="mt-4 overflow-auto rounded-md bg-ink p-5 font-mono text-[12px] leading-relaxed text-paper-2">{`rclone sync "Drive:DELIVERED CLIENT ASSETS (by Property)/…/SD card dump" ./inbox
python3 scripts/watch_inbox.py ./inbox --out ./out --once
rclone copy ./out "Drive:DELIVERED CLIENT ASSETS (by Property)/…/Grok_2K"`}</pre>
        <p className="mt-3 text-sm text-muted">
          In this Grok-hosted console, Drive browse finds the folder. JPEGs still
          drop here or run on Hermes — the gate does not stream card dumps.
        </p>
      </section>

      <section className="rounded-md border border-line bg-paper p-5 text-sm leading-relaxed text-muted">
        <p>
          GitHub:{" "}
          <a
            href="https://github.com/dain12344321/REPP-Photo-Edit"
            className="text-cta underline-offset-4 hover:underline"
          >
            dain12344321/REPP-Photo-Edit
          </a>
          . Skill: <span className="font-mono text-[12px]">.grok/skills/rep-edit/SKILL.md</span>.
          Do not run <span className="font-mono text-[12px]">hermes-photo-pipeline/</span> for MLS
          stills — that is the Photomator comparison skill.
        </p>
      </section>
    </div>
  );
}
