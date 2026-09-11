import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { AppShell } from "@/components/app-shell";
import appCss from "../styles.css?url";

const APP_NAME = "Lakeshore Listing Media · REP Edit";

function publicShareHost(): string {
  const raw = String(import.meta.env.VITE_PUBLIC_HOSTNAME ?? "")
    .split(",")[0]
    .trim()
    .split(":")[0]
    .toLowerCase();
  if (!raw || !/^[a-z0-9.-]+$/.test(raw) || !raw.includes(".")) return "";
  if (
    raw === "vercel.app" ||
    raw.endsWith(".vercel.app") ||
    raw === "vercel.com" ||
    raw.endsWith(".vercel.com")
  ) {
    return "";
  }
  return raw;
}

export const Route = createRootRoute({
  head: () => {
    const host = publicShareHost();
    const xBanner = host ? `https://${host}/x-banner.jpg` : undefined;
    return {
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { title: APP_NAME },
        {
          name: "description",
          content:
            "MLS stills pipeline for Lakeshore Listing Media. Sony cards in, Grok Imagine image-edit, 3:2 2K stills out. Window-truth locked.",
        },
        { name: "theme-color", content: "#000000" },
        ...(xBanner ? [{ property: "x:game:image", content: xBanner }] : []),
      ],
      links: [
        { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
        { rel: "apple-touch-icon", href: "/brand/icon-180.png" },
        { rel: "stylesheet", href: appCss },
        { rel: "manifest", href: "/__grok/manifest.webmanifest" },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&family=Roboto+Mono:wght@400;500&display=swap",
        },
      ],
    };
  },
  component: Root,
});

function Root() {
  return (
    <html lang="en" className="antialiased" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <PreviewHostBridge />
        <AuthProvider>
          <AppShell>
            <Outlet />
          </AppShell>
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  );
}
