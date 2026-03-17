import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ADMIN_USERNAMES = ["RooferGaming"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { action, username } = body;

    if (!action) {
      return new Response(JSON.stringify({ error: "action is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // LIST materials
    if (action === "list") {
      const { data, error } = await supabase
        .from("pv_materials")
        .select("*")
        .order("category", { ascending: true })
        .order("manufacturer", { ascending: true });
      if (error) throw error;
      return new Response(JSON.stringify({ materials: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // CREATE material
    if (action === "create") {
      const { category, manufacturer, product_name, article_number, unit, notes } = body;
      if (!category || !manufacturer || !product_name || !username) {
        return new Response(JSON.stringify({ error: "category, manufacturer, product_name, username required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data, error } = await supabase.from("pv_materials").insert({
        category,
        manufacturer,
        product_name,
        article_number: article_number || null,
        unit: unit || "Stk.",
        notes: notes || null,
        created_by: username,
      }).select().single();
      if (error) throw error;
      return new Response(JSON.stringify({ material: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // REPORT material
    if (action === "report") {
      const { material_id, reason } = body;
      if (!material_id || !reason || !username) {
        return new Response(JSON.stringify({ error: "material_id, reason, username required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data, error } = await supabase.from("pv_material_reports").insert({
        material_id,
        reported_by: username,
        reason,
      }).select().single();
      if (error) throw error;
      return new Response(JSON.stringify({ report: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // DELETE material (admin only)
    if (action === "delete") {
      if (!ADMIN_USERNAMES.includes(username)) {
        return new Response(JSON.stringify({ error: "Nur Administratoren können Material löschen." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { material_id } = body;
      if (!material_id) {
        return new Response(JSON.stringify({ error: "material_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await supabase.from("pv_materials").delete().eq("id", material_id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // LIST reports (admin only)
    if (action === "list_reports") {
      if (!ADMIN_USERNAMES.includes(username)) {
        return new Response(JSON.stringify({ error: "Nur Administratoren können Meldungen einsehen." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data, error } = await supabase
        .from("pv_material_reports")
        .select("*, pv_materials(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify({ reports: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("pv-materials error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
