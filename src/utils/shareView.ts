const FUNCTION_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/share-view`;

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
