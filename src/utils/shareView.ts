import { Measurement } from "@/types/measurements";

const FUNCTION_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/share-view`;

/** Serialize measurements for sharing – converts THREE.Vector3 to plain objects and preserves all fields */
export function serializeMeasurementsForShare(measurements: Measurement[]): unknown[] {
  return measurements.map((m) => ({
    id: m.id,
    type: m.type,
    points: m.points.map((p: any) => ({ x: +p.x, y: +p.y, z: +p.z })),
    value: m.value,
    label: m.label,
    visible: m.visible,
    labelVisible: m.labelVisible,
    unit: m.unit,
    description: m.description,
    segments: m.segments,
    inclination: m.inclination,
    color: m.color,
    subType: m.subType,
    dimensions: m.dimensions,
    position: m.position,
    count: m.count,
    relatedMeasurements: m.relatedMeasurements,
    penetrationType: m.penetrationType,
    notes: m.notes,
    pvModuleInfo: m.pvModuleInfo ? { ...m.pvModuleInfo } : undefined,
    pvModuleSpec: m.pvModuleSpec,
    powerOutput: m.powerOutput,
  }));
}

export interface CreateShareParams {
  webodm_server_url: string;
  webodm_token: string;
  project_id: number;
  task_id: string;
  file_name: string;
  measurements: unknown[];
  created_by: string;
}

export interface ShareInfo {
  share_token: string;
  file_name: string;
  measurements: unknown[];
  created_at: string;
  expires_at: string | null;
  project_id: number;
  task_id: string;
}

export async function createShareLink(params: CreateShareParams): Promise<{ share_token: string; created_at: string; expires_at: string | null }> {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify({ action: "create", ...params }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Fehler ${res.status}`);
  }

  return res.json();
}

export async function getShareInfo(share_token: string): Promise<ShareInfo> {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify({ action: "get", share_token }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Fehler ${res.status}`);
  }

  return res.json();
}

export function getModelProxyUrl(share_token: string): string {
  return `${FUNCTION_URL}/model/${share_token}`;
}

export function getShareUrl(share_token: string): string {
  return `${window.location.origin}/viewer?share=${share_token}`;
}
