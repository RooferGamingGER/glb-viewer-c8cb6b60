/**
 * solar-string-planning/index.ts (Erweiterte Version)
 *
 * Supabase Edge Function für KI-gestützte Stringplanung
 * Erweitert um strukturierten JSON-Output und verbesserten Prompt
 *
 * ERSETZT die bestehende solar-string-planning/index.ts
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Du bist ein erfahrener PV-Planer und Elektroingenieur für den deutschen Markt.
Deine Aufgabe: Aus einem gegebenen Modullayout und vorberechneten Strings eine qualitätsgesicherte Stringplanung erstellen und kommentieren.

Normative Grundlagen:
- VDE 0100-712 (Photovoltaische Stromversorgungssysteme)
- IEC 62548 (PV-Anlagen – Anforderungen an die Auslegung)
- DIN EN 61215 (Module Qualifizierung)
- Temperaturkorrektur: Voc bei -10°C (Faktor ≈1.14), Vmpp bei 70°C (Faktor ≈0.84)

Arbeite in diesen Schritten:

1. PRÜFUNG der vorberechneten Strings
   Prüfe jeden String auf:
   - Spannungskonformität (Voc < maxDCVoltage, Vmpp ≥ mppVoltageMin)
   - Stromkonformität (Isc ≤ maxCurrentPerMPPT)
   - Ausgewogene Stringlängen je MPPT-Tracker

2. OPTIMIERUNGSVORSCHLÄGE
   Falls Strings nicht optimal sind, schlage Verbesserungen vor.
   Begründe Änderungen kurz und technisch präzise.

3. STRINGPLAN-AUSGABE
   Erstelle eine tabellarische Übersicht:
   String-ID | MPPT-Tracker | Module | Voc(-10°C) | Vmpp(STC) | Status

4. KABELPLANUNG
   Schätze Kabelmengen (DC: 6mm² H1Z2Z2-K, AC: NYMJz 5×6mm²)
   Empfehle Querschnitte basierend auf Länge und Strom.

5. SICHERHEITSTECHNIK
   Nenne alle erforderlichen Schutzeinrichtungen:
   - DC-Trennschalter (VDE 0100-712)
   - Überspannungsschutz (Typ 2, IEC 61643-32)
   - Leitungsschutz AC
   - Potenzialausgleich

6. ABNAHME-CHECKLISTE
   Kurze Checkliste für die Inbetriebnahme.

Antworte auf Deutsch. Nutze klare, technische Sprache ohne Marketingtext.
Formatiere die Ausgabe mit Überschriften und Tabellen für maximale Lesbarkeit.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const body = await req.json();
    const { moduleLayout } = body;

    if (!moduleLayout) {
      return new Response(
        JSON.stringify({ error: "moduleLayout is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validierung der Pflichtfelder
    if (!moduleLayout.inverterSpec) {
      return new Response(
        JSON.stringify({ error: "inverterSpec is required in moduleLayout" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userPrompt = `Hier ist das Modullayout für die Stringplanung:

**Projektdaten:**
- Gesamtmodule: ${moduleLayout.totalModules}
- Gesamtleistung: ${moduleLayout.totalPowerKWp?.toFixed(2) ?? "–"} kWp

**Wechselrichter:**
- Modell: ${moduleLayout.inverterSpec.manufacturer} ${moduleLayout.inverterSpec.model}
- Nennleistung: ${moduleLayout.inverterSpec.nominalPowerKW} kW AC
- Max. DC-Spannung: ${moduleLayout.inverterSpec.maxDCVoltage} V
- MPP-Bereich: ${moduleLayout.inverterSpec.mppVoltageMin}–${moduleLayout.inverterSpec.mppVoltageMax} V
- Max. Strom/MPPT: ${moduleLayout.inverterSpec.maxCurrentPerMPPT} A
- MPPT-Tracker: ${moduleLayout.inverterSpec.mpptCount}

**Modulparameter:**
- Modell: ${moduleLayout.moduleSpec?.name ?? "Standard"}
- Leistung: ${moduleLayout.moduleSpec?.power ?? 420} Wp
- Voc: ${moduleLayout.moduleSpec?.uoc ?? 41.5} V
- Vmpp: ${moduleLayout.moduleSpec?.umpp ?? 34.5} V
- Isc: ${moduleLayout.moduleSpec?.isc ?? 12.8} A
- Impp: ${moduleLayout.moduleSpec?.impp ?? 12.1} A
- Temp.-koeff. Voc: ${moduleLayout.moduleSpec?.tempCoeffVoc ?? -0.29} %/°C

**Dachflächen:**
${(moduleLayout.roofFaces ?? []).map((f: Record<string, unknown>) =>
  `- Fläche ${f.id}: ${f.moduleCount} Module, Azimut ${f.azimuth}°, Neigung ${f.inclination}°, Typ: ${f.roofType}`
).join("\n")}

**Vorberechnete Strings:**
${JSON.stringify(moduleLayout.calculatedStrings ?? [], null, 2)}

Bitte analysiere die Stringplanung und erstelle das vollständige Planungsprotokoll.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-preview",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          max_tokens: 4096,
          temperature: 0.1, // Niedrig für konsistente technische Ausgaben
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
          JSON.stringify({ error: "Keine Credits verfügbar." }),
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

    // Logging für Debugging
    console.log("solar-string-planning: Generated plan length:", content.length);

    return new Response(
      JSON.stringify({
        stringPlan: content,
        model: data.model,
        usage: data.usage,
      }),
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
