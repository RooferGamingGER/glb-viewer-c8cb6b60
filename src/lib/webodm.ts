import { SERVERS } from "@/lib/auth-context";

const PROXY_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/webodm-proxy`;
const UPLOAD_PROXY_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/webodm-upload`;

/** Read the active server URL from sessionStorage */
function getActiveServerUrl(): string {
  return sessionStorage.getItem("webodm_active_server") || SERVERS[0].url;
}

async function proxyFetch(path: string, options: {
  method?: string;
  body?: Record<string, string>;
  token?: string;
  server?: string;
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
      server: options.server || getActiveServerUrl(),
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
  pending_action: number | null;
  created_at: string;
  available_assets: string[];
  last_error: string | null;
  size: number;
  statistics: Record<string, unknown>;
  extent: number[] | null;
}

export interface TaskImage {
  id: number;
  filename: string;
}

export interface ShotFeature {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number, number?] };
  properties: { filename: string; [k: string]: unknown };
}

export interface ShotsGeoJSON {
  type: "FeatureCollection";
  features: ShotFeature[];
}

export const TASK_STATUS: Record<number, { label: string; color: string }> = {
  10: { label: "In Warteschlange", color: "warning" },
  20: { label: "Wird verarbeitet", color: "info" },
  30: { label: "Fehlgeschlagen", color: "destructive" },
  40: { label: "Abgeschlossen", color: "success" },
  50: { label: "Abgebrochen", color: "muted" },
};

export const PENDING_ACTION: Record<number, string> = {
  1: "Wird abgebrochen…",
  2: "Wird entfernt…",
  3: "Wird neu gestartet…",
  4: "Wird importiert…",
};

export interface ProcessingStageInfo {
  label: string;
  stepNumber: number;
  totalSteps: number;
  estimatedMinutes: number;
}

const PROCESSING_STAGES: { threshold: number; label: string; minutes: number }[] = [
  { threshold: 0,    label: "Wird initialisiert…",            minutes: 1 },
  { threshold: 0.05, label: "Bilder werden hochgeladen…",     minutes: 3 },
  { threshold: 0.15, label: "Bilder werden analysiert…",      minutes: 5 },
  { threshold: 0.25, label: "Merkmale werden extrahiert…",    minutes: 8 },
  { threshold: 0.35, label: "Bildausrichtung läuft…",         minutes: 10 },
  { threshold: 0.45, label: "Punktwolke wird erstellt…",      minutes: 12 },
  { threshold: 0.55, label: "Punktwolke wird verdichtet…",    minutes: 15 },
  { threshold: 0.65, label: "Mesh wird generiert…",           minutes: 10 },
  { threshold: 0.75, label: "Texturierung läuft…",            minutes: 8 },
  { threshold: 0.85, label: "Orthophoto wird erstellt…",      minutes: 5 },
  { threshold: 0.95, label: "Höhenmodelle werden berechnet…", minutes: 3 },
];

export function getProcessingStage(progress: number): string {
  return getProcessingStageInfo(progress).label;
}

export function getProcessingStageInfo(progress: number): ProcessingStageInfo {
  const totalSteps = PROCESSING_STAGES.length;
  let stepIndex = 0;
  for (let i = PROCESSING_STAGES.length - 1; i >= 0; i--) {
    if (progress >= PROCESSING_STAGES[i].threshold) {
      stepIndex = i;
      break;
    }
  }
  const stage = PROCESSING_STAGES[stepIndex];
  // Estimate remaining minutes: sum of remaining stages
  let remaining = 0;
  for (let i = stepIndex; i < PROCESSING_STAGES.length; i++) {
    remaining += PROCESSING_STAGES[i].minutes;
  }
  return {
    label: stage.label,
    stepNumber: stepIndex + 1,
    totalSteps,
    estimatedMinutes: remaining,
  };
}

// --- Asset filtering ---

function isForbiddenAsset(asset: string): boolean {
  const name = String(asset || "").toLowerCase().trim();
  return (
    name === "report.pdf" ||
    name.endsWith("/report.pdf") ||
    name === "all.zip" ||
    name.endsWith("/all.zip")
  );
}

function isLikelyFile(asset: string): boolean {
  const lastPart = String(asset || "").split("/").filter(Boolean).pop() || "";
  return /\.[a-z0-9]+$/i.test(lastPart);
}

export function getFilteredAssets(assets: string[]): string[] {
  return (Array.isArray(assets) ? assets : [])
    .filter((a) => !isForbiddenAsset(a))
    .filter(isLikelyFile);
}

export const ASSET_INFO: Record<string, { label: string; description: string; category: string }> = {
  "orthophoto.tif": { label: "Orthophoto", description: "GeoTIFF Orthomosaik", category: "map" },
  "odm_orthophoto/odm_orthophoto.tif": { label: "Orthophoto", description: "GeoTIFF Orthomosaik", category: "map" },
  "georeferenced_model.laz": { label: "Punktwolke", description: "LAZ Punktwolke", category: "3d" },
  "odm_georeferencing/odm_georeferenced_model.laz": { label: "Punktwolke", description: "LAZ Punktwolke", category: "3d" },
  "textured_model.zip": { label: "3D-Modell (ZIP)", description: "Texturiertes 3D-Modell als OBJ", category: "3d" },
  "textured_model.glb": { label: "3D-Modell (GLB)", description: "Texturiertes 3D-Modell für Web", category: "3d" },
  "dtm.tif": { label: "DTM", description: "Digitales Geländemodell", category: "map" },
  "dsm.tif": { label: "DSM", description: "Digitales Oberflächenmodell", category: "map" },
  "odm_dem/dsm.tif": { label: "DSM", description: "Digitales Oberflächenmodell", category: "map" },
  "odm_dem/dtm.tif": { label: "DTM", description: "Digitales Geländemodell", category: "map" },
  "cameras.json": { label: "Kameras", description: "Kamerapositionen und -parameter", category: "data" },
  "shots.geojson": { label: "Aufnahmen", description: "GeoJSON der Fotostandorte", category: "data" },
};

export function getAssetLabel(asset: string): string {
  const info = ASSET_INFO[asset];
  if (info) return info.label;
  const parts = asset.split("/").filter(Boolean);
  return parts[parts.length - 1] || asset;
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

/**
 * Authenticate against a specific server.
 * @param server The full server URL (e.g. "https://drohnenvermessung-server.de")
 */
export async function authenticate(username: string, password: string, server?: string): Promise<string> {
  const res = await proxyFetch("/api/token-auth/", {
    method: "POST",
    body: { username, password },
    server: server || SERVERS[0].url,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    // Parse nested error detail for cleaner message
    let message = `Anmeldung fehlgeschlagen (${res.status})`;
    if (data.detail) {
      try {
        const parsed = JSON.parse(data.detail);
        if (parsed.non_field_errors?.length) {
          message = parsed.non_field_errors[0];
        } else {
          message = data.detail;
        }
      } catch {
        message = data.detail;
      }
    }
    const err = new Error(message);
    (err as any).statusCode = res.status;
    throw err;
  }

  const data = await res.json();
  return data.token;
}

// --- Project Cache ---

const PROJECT_CACHE_KEY = "webodm_projects_cache";
const CACHE_TTL_MS = 60_000; // 1 minute

interface ProjectCache {
  server: string;
  projects: Project[];
  timestamp: number;
}

function getCachedProjects(server: string): Project[] | null {
  try {
    const raw = sessionStorage.getItem(PROJECT_CACHE_KEY);
    if (!raw) return null;
    const cache: ProjectCache = JSON.parse(raw);
    if (cache.server !== server) return null;
    if (Date.now() - cache.timestamp > CACHE_TTL_MS) return null;
    return cache.projects;
  } catch {
    return null;
  }
}

function setCachedProjects(server: string, projects: Project[]) {
  try {
    sessionStorage.setItem(PROJECT_CACHE_KEY, JSON.stringify({
      server,
      projects,
      timestamp: Date.now(),
    }));
  } catch {}
}

// --- Projects ---

export async function getProjects(token: string, server?: string): Promise<Project[]> {
  const srv = server || getActiveServerUrl();
  
  // Return cache immediately if fresh
  const cached = getCachedProjects(srv);
  if (cached) return cached;
  
  const res = await proxyFetch("/api/projects/?ordering=-created_at", { token, server: srv });
  if (!res.ok) throw new Error("Projekte konnten nicht geladen werden.");
  const projects = await res.json();
  setCachedProjects(srv, projects);
  return projects;
}

/** Prefetch projects in the background (fire-and-forget) */
export function prefetchProjects(token: string, server?: string) {
  getProjects(token, server).catch(() => {});
}

// --- Tasks ---

export async function getProjectTasks(token: string, projectId: number): Promise<Task[]> {
  const res = await proxyFetch(`/api/projects/${projectId}/tasks/`, { token });
  if (!res.ok) throw new Error("Tasks konnten nicht geladen werden.");
  return res.json();
}

// --- Drone Photos via shots.geojson ---

export async function getTaskShots(token: string, projectId: number, taskId: string): Promise<ShotsGeoJSON | null> {
  try {
    const res = await proxyFetch(`/api/projects/${projectId}/tasks/${taskId}/download/shots.geojson`, { token });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
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
  a.download = filename.split("/").filter(Boolean).pop() || "download.bin";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// --- Processing Nodes & Presets ---

export interface ProcessingNode {
  id: number;
  hostname: string;
  port: number;
  label: string;
  online: boolean;
}

export interface Preset {
  id: number;
  name: string;
  options: { name: string; value: string }[];
  created_at: string;
  system: boolean;
}

export async function getProcessingNodes(token: string): Promise<ProcessingNode[]> {
  const res = await proxyFetch("/api/processingnodes/", { token });
  if (!res.ok) throw new Error("Processing Nodes konnten nicht geladen werden.");
  return res.json();
}

export async function getPresets(token: string): Promise<Preset[]> {
  const res = await proxyFetch("/api/presets/", { token });
  if (!res.ok) throw new Error("Presets konnten nicht geladen werden.");
  return res.json();
}

// --- Task Creation (two-step: create partial → upload images → commit) ---

export async function createTask(
  token: string,
  projectId: number,
  name: string,
  images: File[],
  options?: { name: string; value: string }[],
  onProgress?: (pct: number) => void,
  processingNode?: number | null
): Promise<Task> {
  const server = getActiveServerUrl();

  // Step 1: Create task in partial mode
  const createBody: Record<string, string> = {
    name,
    partial: "true",
  };
  if (processingNode != null) {
    createBody.processing_node = String(processingNode);
  }
  if (options && options.length > 0) {
    createBody.options = JSON.stringify(options);
  }

  const createRes = await proxyFetch(`/api/projects/${projectId}/tasks/`, {
    method: "POST",
    body: createBody,
    token,
    server,
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Task-Erstellung fehlgeschlagen (${createRes.status}). ${err}`);
  }

  const task: Task = await createRes.json();
  onProgress?.(5);

  // Step 2: Upload images one by one via upload proxy
  const uploadPath = `/api/projects/${projectId}/tasks/${task.id}/upload/`;
  
  for (let i = 0; i < images.length; i++) {
    const formData = new FormData();
    formData.append("images", images[i], images[i].name);

    const uploadRes = await fetch(UPLOAD_PROXY_URL, {
      method: "POST",
      headers: {
        "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        "x-webodm-token": token,
        "x-webodm-path": uploadPath,
        "x-webodm-server": server,
      },
      body: formData,
    });

    if (!uploadRes.ok) {
      const detail = await uploadRes.text();
      throw new Error(`Bild-Upload fehlgeschlagen bei ${images[i].name}: ${detail}`);
    }

    const pct = 5 + Math.round(((i + 1) / images.length) * 85);
    onProgress?.(pct);
  }

  // Step 3: Commit task to start processing
  const commitRes = await proxyFetch(`/api/projects/${projectId}/tasks/${task.id}/commit/`, {
    method: "POST",
    token,
    server,
  });

  if (!commitRes.ok) {
    const detail = await commitRes.text();
    throw new Error(`Task-Commit fehlgeschlagen: ${detail}`);
  }

  onProgress?.(100);
  return task;
}

// --- Helpers ---

export function findGlbAsset(assets: string[]): string | null {
  const safe = getFilteredAssets(assets);
  const candidates = [
    (a: string) => a === "textured_model.glb",
    (a: string) => a.endsWith(".glb"),
  ];
  for (const match of candidates) {
    const found = safe.find((a) => match(a.toLowerCase()));
    if (found) return found;
  }
  return null;
}

export function formatFileSize(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb.toFixed(0)} MB`;
}

export function isTaskActive(task: Task): boolean {
  return task.status === 10 || task.status === 20;
}

// --- Task Deletion ---

export async function deleteTask(token: string, projectId: number, taskId: string): Promise<void> {
  const res = await proxyFetch(`/api/projects/${projectId}/tasks/${taskId}/remove/`, {
    method: "POST",
    token,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Task konnte nicht gelöscht werden (${res.status}). ${detail}`);
  }
}

// --- Admin: Users ---

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  date_joined: string;
  last_login: string | null;
}

export async function getAdminUsers(token: string, server?: string): Promise<AdminUser[]> {
  const res = await proxyFetch("/api/admin/users/", { token, server });
  if (res.status === 403) {
    throw new Error("NO_PERMISSION");
  }
  if (!res.ok) throw new Error("Benutzerliste konnte nicht geladen werden.");
  const data = await res.json();
  // Handle paginated response (Django REST returns { results: [...] })
  return Array.isArray(data) ? data : (data.results ?? []);
}

// --- All Tasks across projects ---

export interface EnrichedTask extends Task {
  projectName: string;
  projectId: number;
  serverLabel: string;
}

export async function getAllTasksForServer(
  token: string,
  server?: string,
  serverLabel?: string
): Promise<EnrichedTask[]> {
  const projects = await getProjects(token, server);
  const allTasks: EnrichedTask[] = [];
  
  const taskPromises = projects.map(async (project) => {
    try {
      const tasks = await getProjectTasks(token, project.id);
      return tasks.map((t) => ({
        ...t,
        projectName: project.name,
        projectId: project.id,
        serverLabel: serverLabel || "Server",
      }));
    } catch {
      return [];
    }
  });
  
  const results = await Promise.all(taskPromises);
  for (const tasks of results) {
    allTasks.push(...tasks);
  }
  
  return allTasks.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}
