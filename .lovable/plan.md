

## Plan: Materialliste überarbeiten, Stringplanung entfernen, Nutzerdatenbank für Material

### Übersicht

5 Arbeitsbereiche:
1. **Stringplanung komplett entfernen** (UI, Utils, Edge Function, PDF-Extensions)
2. **Preise aus Materialliste entfernen** (Typen, UI, Berechnung, CSV/Text-Export)
3. **Disclaimer-Text erweitern** (Hinweis auf mögliche Fehler bei Materialberechnung)
4. **Nutzer-Materialdatenbank** mit Hersteller/Typ-Sortierung, Melde-Funktion, Admin-Löschung
5. **Materialliste in PDF** automatisch einbinden wenn vorhanden

---

### 1. Stringplanung entfernen

**Dateien löschen:**
- `src/components/measurement/StringPlanPanel.tsx`
- `src/utils/pvStringPlanning.ts`
- `src/utils/pvPdfExtensions.ts` (enthält hauptsächlich Stringplan-PDF-Seiten; Materiallisten-PDF-Seite wird in `pdfExport.ts` direkt integriert)

**Dateien ändern:**
- `SolarMeasurementContentExtension.tsx`: String-Tab, StringPlanPanel-Import, alle String-State-Variablen und KI-Planung entfernen. Tabs von 3 auf 2 reduzieren (WR + Material)
- `pvPlanning.ts`: `StringPlan`, `PVString`, `MPPTTracker`, `ModuleElectricalSpec`, `DEFAULT_MODULE_ELECTRICAL` Interfaces/Exports entfernen. `getElectricalMaterials()` anpassen (braucht kein `StringPlan` mehr als Parameter, stattdessen einfache Kennwerte)
- `pvMaterialCalculator.ts`: Abhängigkeit von `StringPlan` entfernen, `calculateCompleteMaterialList()` vereinfachen
- `ExportPdfButton.tsx`: `includeStringPlan` Toggle und `ExportPdfStringPlanTab` entfernen
- `ExportPdfButtonPatch.tsx`: `ExportPdfStringPlanTab` Komponente entfernen
- `pdfExport.ts`: String-Plan-Seiten-Aufrufe entfernen
- `supabase/functions/solar-string-planning/index.ts`: Kann entfernt werden (oder für spätere Nutzung beibehalten — ich würde löschen)

### 2. Preise aus Materialliste entfernen

**`src/types/pvPlanning.ts`:**
- `MaterialItem`: `pricePerUnit` und `totalPrice` Felder entfernen
- `CompleteMaterialList`: `totalNetPrice` und `totalGrossPrice` entfernen
- `buildCompleteMaterialList()`: Preisberechnung entfernen
- Alle `getPitchedRoofMaterials()`, `getFlatRoofMaterials()`, `getGreenRoofMaterials()`, `getElectricalMaterials()`: `pricePerUnit`-Werte überall entfernen

**`src/components/measurement/MaterialListPanel.tsx`:**
- `MaterialItemRow`: Spalten für EP und GP entfernen (Grid von 12 auf ~8 Spalten vereinfachen)
- `SectionCollapsible`: Preissumme aus Header entfernen
- Gesamtpreis-Card am Ende komplett entfernen
- CSV-Export: Preisspalten entfernen

**`src/utils/pvMaterialCalculator.ts`:**
- `formatMaterialListAsText()`: Preiszeilen entfernen

### 3. Disclaimer erweitern

**`src/components/pvplanning/PVPlanningDisclaimer.tsx`:**
Einen zusätzlichen Absatz einfügen:

> „Die automatisch generierte Materialliste dient als Orientierung und kann Fehler enthalten. Mengen, Materialtypen und Kompatibilität müssen vor der Bestellung durch einen Fachbetrieb geprüft und bestätigt werden."

### 4. Nutzer-Materialdatenbank (Supabase)

**Neue Datenbanktabellen (2 Migrationen):**

```sql
-- Tabelle: pv_materials (Community-Materialdatenbank)
CREATE TABLE public.pv_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,        -- 'module', 'mounting', 'electrical', etc.
  manufacturer TEXT NOT NULL,
  product_name TEXT NOT NULL,
  article_number TEXT,
  unit TEXT NOT NULL DEFAULT 'Stk.',
  notes TEXT,
  created_by TEXT NOT NULL,      -- WebODM username
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabelle: pv_material_reports (Meldungen falscher Daten)
CREATE TABLE public.pv_material_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid REFERENCES public.pv_materials(id) ON DELETE CASCADE,
  reported_by TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

RLS: Alle authentifizierten Nutzer können lesen und eigene Einträge erstellen. Nur Admin (Username = 'RooferGaming') kann löschen.

Da die App WebODM-Token-Auth nutzt (kein Supabase Auth), wird die Admin-Prüfung in einer Edge Function gemacht, nicht via RLS mit `auth.uid()`. Stattdessen:
- Eine Edge Function `pv-materials` mit Aktionen: `list`, `create`, `report`, `delete` (nur für Admin)
- Admin-Check: Username aus dem Request-Body gegen hardcoded Admin-Liste prüfen (im Edge Function Code)

**Neue UI in MaterialListPanel:**
- Button "Material vorschlagen" öffnet ein kleines Formular (Kategorie, Hersteller, Produktname, Artikelnr., Einheit)
- Button "Fehler melden" an jedem Material-Eintrag aus der DB
- Admin-Ansicht: Liste der Meldungen mit "Löschen"-Button (sichtbar wenn username === 'RooferGaming')

**Sortierung:** Materialien werden nach `category` gruppiert, innerhalb nach `manufacturer` alphabetisch sortiert.

### 5. Materialliste in PDF automatisch einbinden

**`src/utils/pdfExport.ts`:**
- Wenn `materialList` vorhanden ist, automatisch eine Materiallisten-Seite anhängen (direkt in `pdfExport.ts` statt über die gelöschte `pvPdfExtensions.ts`)
- Einfache Tabelle: Pos | Bezeichnung | Hersteller | Einheit | Menge | Hinweise (ohne Preise)

**`src/components/measurement/ExportPdfButton.tsx`:**
- `includeMaterialList` Toggle bleibt, aber ist standardmäßig `true` wenn `materialList` vorhanden

---

### Zusammenfassung der Änderungen

| Aktion | Dateien |
|---|---|
| **Löschen** | `StringPlanPanel.tsx`, `pvStringPlanning.ts`, `pvPdfExtensions.ts`, `solar-string-planning` Edge Fn |
| **Neu erstellen** | Edge Function `pv-materials`, 2 DB-Tabellen, Admin-UI in MaterialListPanel |
| **Ändern** | `pvPlanning.ts`, `pvMaterialCalculator.ts`, `SolarMeasurementContentExtension.tsx`, `MaterialListPanel.tsx`, `ExportPdfButton.tsx`, `ExportPdfButtonPatch.tsx`, `pdfExport.ts`, `PVPlanningDisclaimer.tsx` |

