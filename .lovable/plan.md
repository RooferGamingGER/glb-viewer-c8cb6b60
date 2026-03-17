

# Plan: Alle 5 Lücken umsetzen (Reihenfolge: 4 → 1 → 3 → 2)

Lücke 5 (Projektdaten/Kundenverwaltung) ist im Dokument nicht enthalten und wird hier nicht behandelt.

---

## Schritt 1: LÜCKE 4 — Modulkatalog & Montagesysteme

**Neue Datei:** `src/data/germanPVCatalog.ts`
- `PV_MODULE_DATABASE`: Array mit ~12 PV-Modulen (Solarwatt, Heckert, IBC, Energetica, Meyer Burger, Aleo, JA Solar, LONGi) — exakt wie im Prompt spezifiziert
- `MOUNTING_SYSTEMS`: Array mit ~18 Montagesystemen (Steildach: Braas, K2, Schletter etc.; Flachdach: K2, Esdec, Renusol etc.; Gründach: Soprema, Bauder, Optigrün etc.)
- Interfaces `PVModuleSpec` (erweitert um voc, isc, vmpp, impp, weight, frameColor, cellType, warranty) und `MountingSystemSpec`

**Änderung:** `src/components/measurement/PVModuleSelect.tsx`
- Import von `PV_MODULE_DATABASE` statt `PV_MODULE_TEMPLATES`
- Filter-State für Hersteller und Zelltyp
- Gruppierte Anzeige im Select-Dropdown

**Änderung:** `src/utils/pvMaterialCalculator.ts`
- Montagesystem-Lookup aus `MOUNTING_SYSTEMS` statt hartcodierter Werte

---

## Schritt 2: LÜCKE 1 — Restliche PDF-Teile (Teil 3 + 4)

**Teil 3 — Elektrische Materialliste-Seite** (`pdfExport.ts`):
- Nach Zeile ~2644 (`createMaterialListPageInline`-Aufruf): Prüfe `materialList.electricalItems.length > 0` und erstelle eine zweite Seite mit Tabelle (Pos, Beschreibung, Hersteller, Einheit, Menge, Hinweise)

**Teil 4 — Pre-Rendering in ExportPdfButton** (`ExportPdfButton.tsx`):
- `calculateStringAssignments` in `pdfExport.ts` von `const` zu `export const` ändern
- Optionales Feld `pvSolarLayout?: string` zum `Measurement`-Interface in `types/measurements.ts` hinzufügen
- In `ExportPdfButton.tsx`: Für Solar-Messungen `renderSolarLayout2D` + `calculateStringAssignments` aufrufen und als `pvSolarLayout` setzen
- In `pdfExport.ts`: Im Solar-Block `measurement.pvSolarLayout` bevorzugt verwenden, Fallback auf Live-Berechnung

---

## Schritt 3: LÜCKE 3 — Ertragsprognose mit PVGIS-Daten

**Neue Datei:** `src/utils/pvGisData.ts`
- `GHI_GRID`: 24 Stützpunkte (47–55°N, 6–15°E) mit Globalstrahlung kWh/m²/Jahr
- `getGHI(lat, lng)`: IDW-Interpolation (k=2, 5 nächste Punkte)
- `calculateYieldPVGIS(kWp, lat, lng, azimuth, inclination, systemLosses)`: Neigungskorrektur + Azimutkorrektur + Performance Ratio

**Änderung:** `src/utils/pvCalculations.ts`
- `calculateAnnualYieldWithOrientation` erweitern um optionale Parameter `latitude?: number, longitude?: number`
- Intern `calculateYieldPVGIS` aufrufen wenn GPS vorhanden, Fallback auf 51.0°N/10.5°E

**Änderung:** `SolarMeasurementContent.tsx` und andere Aufrufer
- GPS-Koordinaten aus `sunSimulation` (latitude/longitude) durchreichen

---

## Schritt 4: LÜCKE 2 — Verschattungs-Heatmap

**Neue Datei:** `src/utils/pvShadowAnalysis.ts`
- `runShadowAnalysis({ moduleMeshes, occluderMeshes, latitude, longitude, tzOffset, northAngle, onProgress })` — Raycasting-basierte Jahresverschattung pro Modul
- `applyHeatmapToMeshes(modules, results)` — Farbe grün→gelb→rot auf Module
- `resetModuleMaterials(modules)` — Originalfarbe wiederherstellen

**Änderung:** `src/components/measurement/SunSimulationPanel.tsx`
- Props erweitern: `heatmapProgress`, `heatmapReady`, `onRunHeatmap`, `onClearHeatmap`
- UI: Button "Heatmap berechnen" + Progress-Bar + Farbskala-Legende

**Änderung:** `src/components/measurement/MeasurementTools.tsx`
- State: `heatmapProgress`, `heatmapReady`
- Handler: `handleRunHeatmap` (scene.traverse → PV-Module finden, `runShadowAnalysis` aufrufen, `applyHeatmapToMeshes`)
- Handler: `handleClearHeatmap` (resetModuleMaterials)
- Neue Props an `SunSimulationPanel` übergeben

**Keine Änderungen an SunLight.tsx nötig** — berechnet Bounding Box bereits intern.

---

## Zusammenfassung

| Schritt | Neue Dateien | Geänderte Dateien |
|---------|-------------|-------------------|
| 1 (Lücke 4) | `src/data/germanPVCatalog.ts` | `PVModuleSelect.tsx`, `pvMaterialCalculator.ts` |
| 2 (Lücke 1) | — | `pdfExport.ts`, `ExportPdfButton.tsx`, `types/measurements.ts` |
| 3 (Lücke 3) | `src/utils/pvGisData.ts` | `pvCalculations.ts`, `SolarMeasurementContent.tsx` |
| 4 (Lücke 2) | `src/utils/pvShadowAnalysis.ts` | `SunSimulationPanel.tsx`, `MeasurementTools.tsx` |

Keine neuen npm-Pakete nötig. Alles offline/PWA-kompatibel.

