import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-webodm-token, x-webodm-path",
};

const WEBODM_BASE = "https://drohnenvermessung-server.de";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webodmToken = req.headers.get("x-webodm-token");
    const webodmPath = req.headers.get("x-webodm-path");

    if (!webodmToken || !webodmPath) {
      return new Response(
        JSON.stringify({ error: "Missing x-webodm-token or x-webodm-path header" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!webodmPath.startsWith("/api/")) {
      return new Response(
        JSON.stringify({ error: "Invalid path" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const targetUrl = `${WEBODM_BASE}${webodmPath}`;

    // Forward the multipart body as-is to WebODM
    const contentType = req.headers.get("content-type") || "";
    
    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Authorization": `JWT ${webodmToken}`,
        "Content-Type": contentType,
      },
      body: req.body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(
        JSON.stringify({ error: `WebODM error ${response.status}`, detail: errorText }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Upload proxy error", detail: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
