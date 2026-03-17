

## Erweiterte PV-Planung: Vollständige Umsetzung

Integration aller 9 hochgeladenen Dateien (inkl. der neuen Edge Function) in das Projekt.

---

### Neue Dateien (8)

| Datei | Zweck |
|---|---|
| `src/types/pvPlanning.ts` | Typen, WR-Datenbank (8 Hersteller), Materialkatalog, Montagesysteme |
| `src/utils/pvStringPlanning.ts` | Stringplanung-Algorithmus (VDE/IEC), Temperaturkorrektur, Validierung |
| `src/utils/pvMaterialCalculator.ts` | Materiallisten-Berechnung nach Dachtyp, CSV/Text-Export |
| `src/utils/pvPdfExtensions.ts` | PDF-Seiten für Stringplan, Materialliste, PV-Layout |
| `src/components/measurement/InverterPlanningPanel.tsx` | WR-Auswahl UI mit Auto-Empfehlung |
| `src/components/measurement/StringPlanPanel.tsx` | String-Übersicht, MPPT-Karten, Spannungsdiagramme, KI-Planung |
| `src/components/measurement/MaterialListPanel.tsx` | Materialliste mit Dachtyp-Konfiguration, Export |
| `src/components/measurement/SolarMeasurementContentExtension.tsx` | Tab-Wrapper (WR / Strings / Material) |

### Geänderte Dateien (3)

1. **`src/components/measurement/SolarMeasurementContent.tsx`** — Import + Einbindung der `SolarPlanningExtension` unterhalb der bestehenden Tabs
2. **`src/utils/pdfExport.ts`** — Parameter-Erweiterung um `stringPlan` + `materialList`, Einbindung der neuen PDF-Seiten aus `pvPdfExtensions`
3. **`src/components/measurement/ExportPdfButton.tsx`** — Neue Toggle-Switches im Export-Dialog für Stringplan und Materialliste

### Edge Function Update (1)

**`supabase/functions/solar-string-planning/index.ts`** — Erweiterter Prompt mit strukturiertem WR-Daten-Input (`inverterSpec`), Dachflächen-Details, vorberechneten Strings und verbesserter Fehlerbehandlung (Rate-Limit, Credits). Modell: `gemini-2.5-flash-preview`.

### Reihenfolge der Umsetzung

1. Typen + Utilities anlegen (pvPlanning.ts, pvStringPlanning.ts, pvMaterialCalculator.ts)
2. UI-Komponenten anlegen (3 Panels + Extension-Wrapper)
3. PDF-Extensions anlegen (pvPdfExtensions.ts)
4. Bestehende Dateien anpassen (SolarMeasurementContent, pdfExport, ExportPdfButton)
5. Edge Function ersetzen + deployen

