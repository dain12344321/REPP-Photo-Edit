import { cn } from "@/lib/utils";

const tones: Record<string, string> = {
  ink: "bg-ink text-paper",
  steel: "bg-steel text-steel-fg",
  paper: "bg-paper-2 text-ink-soft border border-line",
  ok: "bg-ok/10 text-ok",
  warn: "bg-warn/10 text-warn",
  err: "bg-err/10 text-err",
  dusk: "bg-dusk text-paper",
  skip: "bg-paper-3 text-muted",
};

export function Badge({
  children,
  tone = "paper",
  className,
}: {
  children: React.ReactNode;
  tone?: keyof typeof tones;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-[11px] tracking-wide uppercase",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
