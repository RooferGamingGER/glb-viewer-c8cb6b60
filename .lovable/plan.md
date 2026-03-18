
# PV-Belegung: Nordrichtung (northAngle) & Kompass-Korrektur

## Status: Implementiert ✅

## Problem
Das System nahm `+Z = Süd` an, aber UTM-Modelle haben `+Y = Nord` → nach -90° X-Rotation ist `+Z = Nord`. Die Azimut-Berechnung und Süd-Neigung waren invertiert.

## Lösung: `northAngle` Parameter

### 1. Typ-Erweiterung
- `northAngle?: number` in `PVModuleInfo` (beide Type-Dateien)
- 0° = +Z ist Nord (UTM-Standard)

### 2. `calculateRoofOrientation(points, northAngle)`
- Rotiert die Horizontal-Normalprojektion um `-northAngle` vor der Azimut-Berechnung
- `atan2(rhx, rhz)` gibt Winkel von Nord (CW)

### 3. `placeModule` South-Tilt
- Berechnet Süd-Vektor aus `northAngle`: `(-sin(na), -cos(na))`
- Hebt die Nordkante an (korrekt für jede Modell-Orientierung)

### 4. UI: Kompass-Slider
- 0°-359° Slider in SolarMeasurementContent
- Bei Änderung: Neuberechnung Azimut + Ertrag + Grid-Neigung
- Hinweis: "0° = +Z ist Nord (UTM-Standard)"

### 5. E-W bleibt grid-relativ (unverändert)

---

# Sonnensimulation — Tages- & Jahresverlauf

## Status: Implementiert ✅

## Neue Dateien
- `src/utils/sunPosition.ts` — SPA-Algorithmus (NREL-basiert), azimuth/elevation/sunrise/sunset
- `src/hooks/useSunSimulation.ts` — State & Animation (day/year mode, playback)
- `src/components/viewer/SunLight.tsx` — DirectionalLight mit dynamischer Shadow-Map
- `src/components/measurement/SunSimulationPanel.tsx` — UI mit Tages-/Jahres-Tabs

## Geänderte Dateien
- `src/components/ModelViewer.tsx` — SunLight-Komponente im Canvas, Default-Lights dimmen bei Simulation
- `src/components/MeasurementTools.tsx` — SunSimulation-State durchleiten, Panel in Sidebar
- `src/components/measurement/MeasurementTools.tsx` — Props erweitert für sunSimulation

## Features
- Tagesverlauf: Datepicker, Time-Slider (Sonnenaufgang↔Sonnenuntergang), Play/Pause
- Jahresverlauf: Monats-Slider, 12:00 Uhr fest, Play-Animation
- Schnellauswahl: Equinox & Solstice (21.3 / 21.6 / 23.9 / 21.12)
- Sonnenstand-Info: Azimut, Elevation, Tageslänge, Kompass-Richtung
- Standort: Auto GPS oder manuell (Default: 51.1°N, 10.4°E)
- Shadow-Map: dynamisch 1024 (Mobile) bis 2048 (Desktop)
- Keine externe API — komplett clientseitig/offline

---

# Lücke 4: PV-Modulkatalog & Montagesysteme

## Status: Implementiert ✅

### Neue Dateien
- `src/data/germanPVCatalog.ts` — 12 PV-Module (Solarwatt, Heckert, IBC, Energetica, Meyer Burger, Aleo, JA Solar, LONGi) + 20 Montagesysteme (Steildach/Flachdach/Gründach)
- Erweiterte Spezifikationen: Voc, Isc, Vmpp, Impp, Gewicht, Rahmenfarbe, Zelltyp, Garantie, Temp-Koeffizient

### Geänderte Dateien
- `src/components/measurement/PVModuleSelect.tsx` — Filter nach Hersteller/Zelltyp, gruppierte Anzeige

---

# Lücke 3: PVGIS Ertragsprognose

## Status: Implementiert ✅

### Neue Dateien
- `src/utils/pvGisData.ts` — 24 GHI-Stützpunkte für Deutschland, IDW-Interpolation, PVGIS-basierte Ertragsberechnung

### Geänderte Dateien
- `src/utils/pvCalculations.ts` — `calculateAnnualYieldWithOrientation` erweitert um optionale GPS-Koordinaten, nutzt PVGIS-Daten wenn verfügbar

---

# Lücke 2: Verschattungs-Heatmap

## Status: Implementiert ✅

### Neue Dateien
- `src/utils/pvShadowAnalysis.ts` — Raycasting-basierte Jahresverschattung, Heatmap-Rendering (grün→gelb→rot), Reset-Funktion

### Geänderte Dateien
- `src/components/measurement/SunSimulationPanel.tsx` — Heatmap-UI: Button, Progress-Bar, Farbskala-Legende
- `src/components/MeasurementTools.tsx` — Heatmap-State und Handler (`handleRunHeatmap`, `handleClearHeatmap`)

---

# Lücke 1: PDF-Export Teile 3+4

## Status: Implementiert ✅

### Geänderte Dateien
- `src/utils/pdfExport.ts` — `calculateStringAssignments` exportiert für Pre-Rendering
- `src/types/measurements.ts` — `pvSolarLayout?: string` Feld hinzugefügt
- `src/components/measurement/ExportPdfButton.tsx` — Pre-Rendering von Solar-Layouts vor PDF-Export
