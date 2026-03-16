import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const WEBODM_BASE = "https://drohnenvermessung-server.de";
const MAX_MEASUREMENTS_PER_USER = 100;

interface RequestBody {
  action: "save" | "load" | "delete" | "list" | "check";
  token: string;
  username?: string; // fallback username from client
  project_id?: number;
  task_id?: string;
  task_name?: string;
  project_name?: string;
  measurements?: unknown;
}

/** Validate WebODM token and return the username */
async function validateWebODMToken(token: string, clientUsername?: string): Promise<string | null> {
  try {
    // Try /api/users/current/ first
    const res = await fetch(`${WEBODM_BASE}/api/users/current/`, {
      headers: { Authorization: `JWT ${token}` },
    });
    console.log("WebODM validation status:", res.status);

    if (res.ok) {
      const text = await res.text();
      try {
        const parsed = JSON.parse(text);
        // If it's an object (not array), extract username directly
        if (parsed && !Array.isArray(parsed)) {
          const name = parsed?.username || parsed?.user?.username || parsed?.name || parsed?.email;
          if (name) {
            console.log("Resolved username from /api/users/current/:", name);
            return String(name);
          }
        }
        // If array, skip — fallback below will validate token
        console.log("Response was array or no username field, using fallback");
      } catch {
        // not JSON
      }
    }

    // Fallback: validate token via /api/projects/ and use client-provided username
    if (clientUsername) {
      console.log("Trying fallback validation via /api/projects/");
      const fallbackRes = await fetch(`${WEBODM_BASE}/api/projects/?limit=1`, {
        headers: { Authorization: `JWT ${token}` },
      });
      console.log("Fallback validation status:", fallbackRes.status);
      if (fallbackRes.ok) {
        console.log("Token valid, using client username:", clientUsername);
        return clientUsername;
      }
    }

    return null;
  } catch (err) {
    console.error("WebODM validation error:", err);
    return null;
  }
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    const { action, token } = body;

    if (!action || !token) {
      return jsonResponse({ error: "Missing action or token" }, 400);
    }

    const username = await validateWebODMToken(token, body.username);
    if (!username) {
      return jsonResponse({ error: "Invalid or expired token" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // --- LIST ---
    if (action === "list") {
      const { data, error } = await supabase
        .from("saved_measurements")
        .select("id, project_id, task_id, task_name, project_name, created_at, updated_at")
        .eq("username", username)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return jsonResponse({ items: data, count: data?.length || 0 });
    }

    // --- CHECK ---
    if (action === "check") {
      const { project_id, task_id } = body;
      if (project_id == null || !task_id) {
        return jsonResponse({ error: "Missing project_id or task_id" }, 400);
      }
      const { data, error } = await supabase
        .from("saved_measurements")
        .select("id, updated_at")
        .eq("username", username)
        .eq("project_id", project_id)
        .eq("task_id", task_id)
        .maybeSingle();
      if (error) throw error;
      return jsonResponse({ exists: !!data, updated_at: data?.updated_at || null });
    }

    // --- LOAD ---
    if (action === "load") {
      const { project_id, task_id } = body;
      if (project_id == null || !task_id) {
        return jsonResponse({ error: "Missing project_id or task_id" }, 400);
      }
      const { data, error } = await supabase
        .from("saved_measurements")
        .select("measurements, updated_at")
        .eq("username", username)
        .eq("project_id", project_id)
        .eq("task_id", task_id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return jsonResponse({ found: false });
      return jsonResponse({ found: true, measurements: data.measurements, updated_at: data.updated_at });
    }

    // --- SAVE ---
    if (action === "save") {
      const { project_id, task_id, task_name, project_name, measurements } = body;
      if (project_id == null || !task_id || !measurements) {
        return jsonResponse({ error: "Missing project_id, task_id, or measurements" }, 400);
      }

      const { count, error: countError } = await supabase
        .from("saved_measurements")
        .select("id", { count: "exact", head: true })
        .eq("username", username);
      if (countError) throw countError;

      const { data: existing } = await supabase
        .from("saved_measurements")
        .select("id")
        .eq("username", username)
        .eq("project_id", project_id)
        .eq("task_id", task_id)
        .maybeSingle();

      if (!existing && (count || 0) >= MAX_MEASUREMENTS_PER_USER) {
        return jsonResponse({
          error: "limit_reached",
          message: `Maximale Anzahl von ${MAX_MEASUREMENTS_PER_USER} gespeicherten Messungen erreicht.`,
          count,
        }, 409);
      }

      const { data, error } = await supabase
        .from("saved_measurements")
        .upsert(
          {
            username,
            project_id,
            task_id,
            task_name: task_name || null,
            project_name: project_name || null,
            measurements,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "username,project_id,task_id" }
        )
        .select("id, updated_at")
        .single();
      if (error) throw error;
      return jsonResponse({ success: true, id: data.id, updated_at: data.updated_at });
    }

    // --- DELETE ---
    if (action === "delete") {
      const { project_id, task_id } = body;
      if (project_id == null || !task_id) {
        return jsonResponse({ error: "Missing project_id or task_id" }, 400);
      }
      const { error } = await supabase
        .from("saved_measurements")
        .delete()
        .eq("username", username)
        .eq("project_id", project_id)
        .eq("task_id", task_id);
      if (error) throw error;
      return jsonResponse({ success: true });
    }

    return jsonResponse({ error: "Unknown action" }, 400);
  } catch (err) {
    console.error("measurement-storage error:", err);
    return jsonResponse({ error: "Server error", detail: String(err) }, 500);
  }
});
