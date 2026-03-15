const PROXY_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/webodm-proxy`;

async function proxyFetch(path: string, options: {
  method?: string;
  body?: Record<string, string>;
  token?: string;
}): Promise<Response> {
  const res = await fetch(PROXY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify({
      path,
      method: options.method || "GET",
      body: options.body,
      token: options.token,
    }),
  });
  return res;
}

// --- Types ---

export interface Project {
  id: number;
  name: string;
  description: string;
  created_at: string;
  permissions: string[];
  tasks: number[];
}

export interface Task {
  id: string;
  project: number;
  name: string;
  images_count: number;
  status: number;
  running_progress: number;
  created_at: string;
  available_assets: string[];
  last_error: string | null;
  size: number;
}

export interface TaskImage {
  id: number;
  filename: string;
}

export const TASK_STATUS: Record<number, { label: string; color: string }> = {
  10: { label: "In Warteschlange", color: "warning" },
  20: { label: "Wird verarbeitet", color: "info" },
  30: { label: "Fehlgeschlagen", color: "destructive" },
  40: { label: "Abgeschlossen", color: "success" },
  50: { label: "Abgebrochen", color: "muted" },
};

// --- Asset filtering ---

export const EXCLUDED_ASSETS = ["report.pdf", "all.zip"];

export function getFilteredAssets(assets: string[]): string[] {
  return assets.filter(
    (a) => !EXCLUDED_ASSETS.includes(a.toLowerCase())
  );
}

export function getAssetIcon(asset: string): string {
  const lower = asset.toLowerCase();
  if (lower.endsWith(".glb") || lower.endsWith(".gltf")) return "box";
  if (lower.endsWith(".tif") || lower.endsWith(".tiff") || lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image";
  if (lower.endsWith(".laz") || lower.endsWith(".las") || lower.endsWith(".ply")) return "scatter";
  if (lower.endsWith(".obj")) return "box";
  if (lower.endsWith(".json") || lower.endsWith(".geojson")) return "file-json";
  if (lower.endsWith(".csv")) return "file-spreadsheet";
  return "file";
}

// --- Auth ---

export async function authenticate(username: string, password: string): Promise<string> {
  const res = await proxyFetch("/api/token-auth/", {
    method: "POST",
    body: { username, password },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || `Anmeldung fehlgeschlagen (${res.status})`);
  }

  const data = await res.json();
  return data.token;
}

// --- Projects ---

export async function getProjects(token: string): Promise<Project[]> {
  const res = await proxyFetch("/api/projects/?ordering=-created_at", { token });
  if (!res.ok) throw new Error("Projekte konnten nicht geladen werden.");
  return res.json();
}

// --- Tasks ---

export async function getProjectTasks(token: string, projectId: number): Promise<Task[]> {
  const res = await proxyFetch(`/api/projects/${projectId}/tasks/`, { token });
  if (!res.ok) throw new Error("Tasks konnten nicht geladen werden.");
  return res.json();
}

// --- Task Images ---

export async function getTaskImages(token: string, projectId: number, taskId: string): Promise<TaskImage[]> {
  const res = await proxyFetch(`/api/projects/${projectId}/tasks/${taskId}/images/`, { token });
  if (!res.ok) throw new Error("Bilder konnten nicht geladen werden.");
  return res.json();
}

export function getImageThumbnailUrl(projectId: number, taskId: string, filename: string): string {
  return `/api/projects/${projectId}/tasks/${taskId}/images/thumbnail/${filename}`;
}

export async function downloadImageAsFile(
  token: string,
  projectId: number,
  taskId: string,
  filename: string
): Promise<void> {
  const res = await proxyFetch(`/api/projects/${projectId}/tasks/${taskId}/images/download/${filename}`, { token });
  if (!res.ok) throw new Error(`Bild-Download fehlgeschlagen (${res.status})`);
  const blob = await res.blob();
  triggerBrowserDownload(blob, filename);
}

export async function loadThumbnailBlob(
  token: string,
  projectId: number,
  taskId: string,
  filename: string
): Promise<string> {
  const res = await proxyFetch(`/api/projects/${projectId}/tasks/${taskId}/images/thumbnail/${filename}`, { token });
  if (!res.ok) throw new Error("Thumbnail konnte nicht geladen werden.");
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

// --- GLB Download ---

export async function downloadGlbAsBlob(
  token: string,
  projectId: number,
  taskId: string,
  asset: string = "textured_model.glb",
  onProgress?: (pct: number) => void
): Promise<string> {
  onProgress?.(10);

  const res = await proxyFetch(`/api/projects/${projectId}/tasks/${taskId}/download/${asset}`, {
    token,
  });

  if (!res.ok) {
    throw new Error(`GLB-Download fehlgeschlagen (${res.status})`);
  }

  onProgress?.(60);

  const blob = await res.blob();

  // Validate that we actually got binary data, not an error page
  if (blob.size < 100) {
    throw new Error("Die heruntergeladene Datei ist ungültig oder leer.");
  }

  onProgress?.(90);

  const blobUrl = URL.createObjectURL(blob);
  onProgress?.(100);

  return blobUrl;
}

// --- Asset Download ---

export async function downloadAssetAsFile(
  token: string,
  projectId: number,
  taskId: string,
  asset: string,
  onProgress?: (pct: number) => void
): Promise<void> {
  onProgress?.(10);
  const res = await proxyFetch(`/api/projects/${projectId}/tasks/${taskId}/download/${asset}`, { token });

  if (!res.ok) {
    throw new Error(`Download fehlgeschlagen (${res.status})`);
  }

  onProgress?.(60);
  const blob = await res.blob();
  onProgress?.(90);

  triggerBrowserDownload(blob, asset);
  onProgress?.(100);
}

function triggerBrowserDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// --- Helpers ---

export function findGlbAsset(assets: string[]): string | null {
  const candidates = [
    (a: string) => a === "textured_model.glb",
    (a: string) => a.endsWith(".glb"),
  ];
  for (const match of candidates) {
    const found = assets.find((a) => match(a.toLowerCase()));
    if (found) return found;
  }
  return null;
}

export function formatFileSize(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb.toFixed(0)} MB`;
}
