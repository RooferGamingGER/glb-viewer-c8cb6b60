import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { moduleLayout } = await req.json();

    if (!moduleLayout) {
      return new Response(
        JSON.stringify({ error: "moduleLayout is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `Du bist ein erfahrener PV-Planer und Elektroingenieur.
Deine Aufgabe: Aus einem gegebenen Modullayout auf einem Dach die Stringplanung ableiten und strukturiert ausgeben.

Arbeite in drei Schritten:

1. Eingabestruktur verstehen
Du erhältst ein Modullayout mit:
- Gesamtanzahl Module
- Dachflächen-Informationen (Ausrichtung, Neigung)
- Moduldaten (Leerlaufspannung U_oc, MPP-Spannung U_mpp, Kurzschlussstrom I_sc, MPP-Strom I_mpp)
- Wechselrichterdaten (max. DC-Eingangsspannung, MPP-Spannungsbereich, max. Eingangsstrom)

2. Strings planen
Grundsätze:
- In einem String nur Module mit gleicher Ausrichtung/Neigung
- Pro MPP-Tracker nur Strings die zueinander passen
- Max. Anzahl Module im String: so dass Summe der U_oc bei -10°C (Faktor 1.14) unterhalb der max. DC-Eingangsspannung bleibt
- Min. Anzahl Module im String: so dass Summe der U_mpp bei 70°C (Faktor 0.82) innerhalb des MPP-Spannungsbereichs liegt
- Wähle eine praxisnahe Stringlänge zwischen diesen Grenzen
- Alle Module sollen verwendet werden

3. Stringplanung ausgeben

A) Technische Übersicht als Tabelle (Textformat):
String-ID | MPP-Tracker | Modul-IDs | Anzahl Module | Ausrichtung | Neigung

B) Beschreibung in Worten:
Pro Dachfläche kurz beschreiben, wie die Strings über die Module laufen.

Zusätzlich:
- Spannungsgrenzen prüfen und zusammenfassen
- Kurze Begründung der Stringaufteilung

Nutze klare, technische Sprache. Keine Marketingtexte, sondern eine saubere Ingenieur-Stringplanung.
Antworte auf Deutsch.`;

    const userPrompt = `Hier ist das Modullayout für die Stringplanung:

${JSON.stringify(moduleLayout, null, 2)}

Bitte erstelle die Stringplanung.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          stream: false,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Bitte versuchen Sie es später erneut." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Keine Credits verfügbar. Bitte laden Sie Ihr Guthaben auf." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "KI-Gateway Fehler" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    return new Response(
      JSON.stringify({ stringPlan: content }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("solar-string-planning error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
