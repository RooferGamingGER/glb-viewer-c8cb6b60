import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const WEBODM_BASE = "https://drohnenvermessung-server.de";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { path, method = "GET", body, token } = await req.json();

    if (!path || typeof path !== "string") {
      return new Response(JSON.stringify({ error: "Missing path" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only allow requests to the WebODM API
    if (!path.startsWith("/api/")) {
      return new Response(JSON.stringify({ error: "Invalid path" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const targetUrl = `${WEBODM_BASE}${path}`;
    const headers: Record<string, string> = {};

    if (token) {
      headers["Authorization"] = `JWT ${token}`;
    }

    const isDownload = path.includes("/download/");
    const isThumbnail = path.includes("/thumbnail/");
    const isBinary = isDownload || isThumbnail;

    if (method === "POST" && body) {
      headers["Content-Type"] = "application/x-www-form-urlencoded";
    }

    const fetchOptions: RequestInit = {
      method,
      headers,
    };

    if (method === "POST" && body) {
      fetchOptions.body =
        typeof body === "string" ? body : new URLSearchParams(body).toString();
    }

    const response = await fetch(targetUrl, fetchOptions);

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(
        JSON.stringify({
          error: `WebODM error ${response.status}`,
          detail: errorText,
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // For binary data (downloads, thumbnails, images), stream the response
    if (isBinary) {
      const arrayBuffer = await response.arrayBuffer();
      const contentType =
        response.headers.get("content-type") || "application/octet-stream";
      return new Response(arrayBuffer, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": contentType,
          "Content-Length": String(arrayBuffer.byteLength),
        },
      });
    }

    // For JSON API responses
    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Proxy error", detail: String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
