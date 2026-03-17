import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALLOWED_SERVERS = [
  "https://drohnenvermessung-server.de",
  "https://drohnenvermessung-digitab.de",
];

function generateToken(length = 12): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => chars[b % chars.length]).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const url = new URL(req.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  // Edge function path: /share-view/model/TOKEN or /share-view (POST body action)
  const subPath = pathParts.length > 1 ? pathParts[pathParts.length - 2] : null;
  const tokenFromPath = pathParts.length > 1 ? pathParts[pathParts.length - 1] : null;

  // Handle model proxy: GET /share-view/model/<TOKEN>
  if (req.method === "GET" && subPath === "model" && tokenFromPath) {
    const { data: share, error } = await supabase
      .from("shared_views")
      .select("*")
      .eq("share_token", tokenFromPath)
      .single();

    if (error || !share) {
      return new Response(JSON.stringify({ error: "Share nicht gefunden" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check expiry
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "Share abgelaufen" }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate server
    if (!ALLOWED_SERVERS.includes(share.webodm_server_url)) {
      return new Response(JSON.stringify({ error: "Ungültiger Server" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Proxy the GLB from WebODM
    const glbPath = `/api/projects/${share.project_id}/tasks/${share.task_id}/download/textured_model.glb`;
    const targetUrl = `${share.webodm_server_url}${glbPath}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 120000);

    try {
      const webodmRes = await fetch(targetUrl, {
        headers: { Authorization: `JWT ${share.webodm_token}` },
        signal: controller.signal,
      });

      if (!webodmRes.ok) {
        const errText = await webodmRes.text();
        return new Response(
          JSON.stringify({ error: `WebODM Fehler ${webodmRes.status}`, detail: errText }),
          {
            status: webodmRes.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const contentLength = webodmRes.headers.get("content-length");
      const responseHeaders: Record<string, string> = {
        ...corsHeaders,
        "Content-Type": "model/gltf-binary",
        "Cache-Control": "public, max-age=3600",
      };
      if (contentLength) responseHeaders["Content-Length"] = contentLength;

      return new Response(webodmRes.body, { status: 200, headers: responseHeaders });
    } finally {
      clearTimeout(timer);
    }
  }

  // POST actions: create / get
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "create") {
      const {
        webodm_server_url,
        webodm_token,
        project_id,
        task_id,
        file_name,
        measurements,
        created_by,
      } = body;

      if (!webodm_server_url || !webodm_token || !project_id || !task_id || !file_name) {
        return new Response(JSON.stringify({ error: "Fehlende Parameter" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!ALLOWED_SERVERS.includes(webodm_server_url)) {
        return new Response(JSON.stringify({ error: "Ungültiger Server" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const share_token = generateToken(16);

      const { data, error } = await supabase.from("shared_views").insert({
        share_token,
        webodm_server_url,
        webodm_token,
        project_id,
        task_id,
        file_name,
        measurements: measurements || [],
        created_by: created_by || "unknown",
      }).select("share_token, created_at, expires_at").single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get") {
      const { share_token } = body;

      if (!share_token) {
        return new Response(JSON.stringify({ error: "Token fehlt" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data, error } = await supabase
        .from("shared_views")
        .select("share_token, file_name, measurements, created_at, expires_at, project_id, task_id")
        .eq("share_token", share_token)
        .single();

      if (error || !data) {
        return new Response(JSON.stringify({ error: "Share nicht gefunden" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: "Share abgelaufen" }), {
          status: 410,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unbekannte Aktion" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Fehler", detail: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
