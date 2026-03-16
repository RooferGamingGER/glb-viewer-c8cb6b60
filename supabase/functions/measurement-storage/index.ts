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
  project_id?: number;
  task_id?: string;
  task_name?: string;
  project_name?: string;
  measurements?: unknown;
}

/** Validate WebODM token and return the username */
async function validateWebODMToken(token: string): Promise<string | null> {
  try {
    console.log("Validating WebODM token against:", `${WEBODM_BASE}/api/users/current/`);
    const res = await fetch(`${WEBODM_BASE}/api/users/current/`, {
      headers: { Authorization: `JWT ${token}` },
    });
    console.log("WebODM validation response status:", res.status);
    if (!res.ok) {
      const text = await res.text();
      console.log("WebODM validation failed:", text);
      return null;
    }
    const user = await res.json();
    console.log("WebODM user:", user?.username);
    return user?.username || null;
  } catch (err) {
    console.error("WebODM validation error:", err);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    const { action, token } = body;

    if (!action || !token) {
      return new Response(
        JSON.stringify({ error: "Missing action or token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate WebODM token server-side
    const username = await validateWebODMToken(token);
    if (!username) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service_role
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
      return new Response(
        JSON.stringify({ items: data, count: data?.length || 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- CHECK (check if measurements exist for a specific task) ---
    if (action === "check") {
      const { project_id, task_id } = body;
      if (project_id == null || !task_id) {
        return new Response(
          JSON.stringify({ error: "Missing project_id or task_id" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await supabase
        .from("saved_measurements")
        .select("id, updated_at")
        .eq("username", username)
        .eq("project_id", project_id)
        .eq("task_id", task_id)
        .maybeSingle();

      if (error) throw error;
      return new Response(
        JSON.stringify({ exists: !!data, updated_at: data?.updated_at || null }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- LOAD ---
    if (action === "load") {
      const { project_id, task_id } = body;
      if (project_id == null || !task_id) {
        return new Response(
          JSON.stringify({ error: "Missing project_id or task_id" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await supabase
        .from("saved_measurements")
        .select("measurements, updated_at")
        .eq("username", username)
        .eq("project_id", project_id)
        .eq("task_id", task_id)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        return new Response(
          JSON.stringify({ found: false }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ found: true, measurements: data.measurements, updated_at: data.updated_at }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- SAVE ---
    if (action === "save") {
      const { project_id, task_id, task_name, project_name, measurements } = body;
      if (project_id == null || !task_id || !measurements) {
        return new Response(
          JSON.stringify({ error: "Missing project_id, task_id, or measurements" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check user's current count
      const { count, error: countError } = await supabase
        .from("saved_measurements")
        .select("id", { count: "exact", head: true })
        .eq("username", username);

      if (countError) throw countError;

      // Check if this is an update (existing entry)
      const { data: existing } = await supabase
        .from("saved_measurements")
        .select("id")
        .eq("username", username)
        .eq("project_id", project_id)
        .eq("task_id", task_id)
        .maybeSingle();

      // If it's a new entry and user is at limit, reject
      if (!existing && (count || 0) >= MAX_MEASUREMENTS_PER_USER) {
        return new Response(
          JSON.stringify({
            error: "limit_reached",
            message: `Maximale Anzahl von ${MAX_MEASUREMENTS_PER_USER} gespeicherten Messungen erreicht. Bitte löschen Sie nicht mehr benötigte Einträge.`,
            count: count,
          }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Upsert
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
      return new Response(
        JSON.stringify({ success: true, id: data.id, updated_at: data.updated_at }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- DELETE ---
    if (action === "delete") {
      const { project_id, task_id } = body;
      if (project_id == null || !task_id) {
        return new Response(
          JSON.stringify({ error: "Missing project_id or task_id" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error } = await supabase
        .from("saved_measurements")
        .delete()
        .eq("username", username)
        .eq("project_id", project_id)
        .eq("task_id", task_id);

      if (error) throw error;
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Server error", detail: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
