import { createServerFn } from "@tanstack/react-start";
import { ConnectorType, GoogleDriveTools, type CallToolResult } from "@/lib/app-data";

export type DriveEntry = {
  id: string;
  name: string;
  mimeType: string;
  isFolder: boolean;
  isJpeg: boolean;
  webViewLink?: string;
  size?: number;
};

export type DriveBrowseResult = CallToolResult<DriveEntry[]> & { entries: DriveEntry[] };

function asEntries(data: unknown): DriveEntry[] {
  const rows: unknown[] = Array.isArray(data)
    ? data
    : data && typeof data === "object" && Array.isArray((data as { files?: unknown }).files)
      ? (data as { files: unknown[] }).files
      : data && typeof data === "object" && Array.isArray((data as { items?: unknown }).items)
        ? (data as { items: unknown[] }).items
        : [];
  const out: DriveEntry[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const id = String(r.file_id ?? r.id ?? r.fileId ?? "");
    const name = String(r.name ?? r.title ?? "untitled");
    const mimeType = String(r.mime_type ?? r.mimeType ?? "");
    if (!id) continue;
    const isFolder = mimeType.includes("folder") || mimeType === "application/vnd.google-apps.folder";
    const isJpeg = /\.jpe?g$/i.test(name) || mimeType.includes("jpeg");
    const entry: DriveEntry = { id, name, mimeType, isFolder, isJpeg };
    if (typeof r.web_view_link === "string") entry.webViewLink = r.web_view_link;
    else if (typeof r.webViewLink === "string") entry.webViewLink = r.webViewLink;
    if (typeof r.size_bytes === "number") entry.size = r.size_bytes;
    else if (typeof r.size === "number") entry.size = r.size;
    out.push(entry);
  }
  return out;
}

export const browseDrive = createServerFn({ method: "POST" })
  .validator((input: { folderId?: string; query?: string }) => input)
  .handler(async ({ data }): Promise<DriveBrowseResult> => {
    const { callTool } = await import("@/lib/app-data/client.server");
    const options = { connectorType: ConnectorType.GoogleDrive };
    const result = data.query
      ? await callTool(
          GoogleDriveTools.search,
          {
            query: data.query,
            max_results: 40,
            title_only: true,
          },
          options,
        )
      : await callTool(
          GoogleDriveTools.listFolder,
          {
            ...(data.folderId ? { folder_id: data.folderId } : {}),
            max_results: 80,
          },
          options,
        );
    if (!result.ok) {
      return { ...result, data: null, entries: [] };
    }
    const entries = asEntries(result.data);
    return { ok: true, data: entries, entries };
  });
