import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  classifyCallToolError,
  redirectToLoginIfRequired,
  useRefetchWhenConnectorReady,
} from "@/lib/app-data";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { DRIVE_FOLDERS } from "@/lib/rep-edit/folders";
import { browseDrive } from "@/lib/rep-edit/drive";
import { authEnabled } from "@/lib/auth/client";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const { user, isPending } = useCurrentUserState();
  const [driveLogin, setDriveLogin] = useState<string | null>(null);
  const [driveErr, setDriveErr] = useState<ReturnType<typeof classifyCallToolError>>(null);
  const [checking, setChecking] = useState(true);

  async function checkDrive() {
    setChecking(true);
    const res = await browseDrive({ data: { folderId: DRIVE_FOLDERS.inboxId } });
    if (!res.ok) {
      const classified = classifyCallToolError(res);
      setDriveErr(classified);
      setDriveLogin(res.loginUrl ?? null);
      setChecking(false);
      return;
    }
    setDriveErr(null);
    setDriveLogin(null);
    setChecking(false);
  }

  useEffect(() => {
    void checkDrive();
  }, []);

  useRefetchWhenConnectorReady(driveErr?.kind === "pending", () => {
    void checkDrive();
  });

  if (isPending) {
    return (
      <div className="mx-auto max-w-md py-16">
        <div className="h-10 w-40 animate-pulse rounded-full bg-paper-3" />
      </div>
    );
  }
  if (user) return <Navigate to="/ingest" />;

  return (
    <div className="mx-auto max-w-md space-y-6 py-8">
      <header>
        <p className="eyebrow">Operator console</p>
        <h1 className="mt-2 font-display text-4xl tracking-[-0.025em]">Sign in</h1>
        <p className="mt-3 text-muted">
          Sign in with Grok to run edits and open Drive.
        </p>
      </header>

      {!authEnabled ? (
        <p className="text-sm text-muted">Sign-in is disabled in this environment.</p>
      ) : checking || driveErr?.kind === "pending" ? (
        <p className="text-sm text-muted">Connecting to Grok…</p>
      ) : driveErr?.kind === "login" && driveLogin ? (
        <Button
          type="button"
          onClick={() =>
            redirectToLoginIfRequired({
              ok: false,
              data: null,
              loginRequired: true,
              loginUrl: driveLogin,
            })
          }
        >
          Continue with Grok
        </Button>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted">
            {driveErr?.message ?? "Open this console from Grok to sign in. Drive and Imagine attach automatically."}
          </p>
          <Button type="button" variant="secondary" onClick={() => void checkDrive()}>
            Try Drive again
          </Button>
        </div>
      )}

      <p className="text-sm text-muted">
        Card dumps:{" "}
        <a href={DRIVE_FOLDERS.inboxUrl} className="text-cta underline-offset-4 hover:underline">
          INBOX
        </a>
        . Delivered stills:{" "}
        <a href={DRIVE_FOLDERS.outboxUrl} className="text-cta underline-offset-4 hover:underline">
          OUTBOX
        </a>
        .
      </p>
      <Link to="/" className="text-sm text-steel underline-offset-4 hover:underline">
        Back to home
      </Link>
    </div>
  );
}
