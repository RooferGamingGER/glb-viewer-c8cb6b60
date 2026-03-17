import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALLOWED_SERVERS = [
  "https://drohnenvermessung-server.de",
  "https://drohnenvermessung-digitab.de",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { path, method = "GET", body, token, server } = await req.json();

    if (!path || typeof path !== "string") {
      return new Response(JSON.stringify({ error: "Missing path" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!path.startsWith("/api/")) {
      return new Response(JSON.stringify({ error: "Invalid path" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const baseUrl = server && ALLOWED_SERVERS.includes(server)
      ? server
      : ALLOWED_SERVERS[0];

    const targetUrl = `${baseUrl}${path}`;
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

    // Timeout: 15s for API calls, 60s for binary downloads
    const timeoutMs = isBinary ? 60000 : 15000;
    const controller = new AbortController();
    fetchOptions.signal = controller.signal;
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetch(targetUrl, fetchOptions);
    } finally {
      clearTimeout(timer);
    }

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

    // For binary data, stream directly without buffering the whole thing
    if (isBinary) {
      const contentType =
        response.headers.get("content-type") || "application/octet-stream";
      const contentLength = response.headers.get("content-length");
      const responseHeaders: Record<string, string> = {
        ...corsHeaders,
        "Content-Type": contentType,
      };
      if (contentLength) {
        responseHeaders["Content-Length"] = contentLength;
      }
      return new Response(response.body, {
        status: 200,
        headers: responseHeaders,
      });
    }

    // For JSON API responses – stream through
    return new Response(response.body, {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const isTimeout = err instanceof DOMException && err.name === "AbortError";
    return new Response(
      JSON.stringify({
        error: isTimeout ? "Timeout" : "Proxy error",
        detail: String(err),
      }),
      {
        status: isTimeout ? 504 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
