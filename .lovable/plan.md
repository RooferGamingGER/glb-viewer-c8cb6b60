

# Sonnensimulation — Tages- & Jahresverlauf mit Schattenanalyse

## Übersicht

Realistische Sonnensimulation im 3D-Viewer mit zwei Modi (Tag/Jahr), basierend auf GPS-Koordinaten aus EXIF-Daten. Schatten werden über die bestehende DirectionalLight gesteuert — keine neue Komponente nötig, sondern direkte Ref-Steuerung. Bonus: PV-Verschattungs-Heatmap pro Modul.

## Neue Dateien

### 1. `src/utils/sunPosition.ts` — SPA-Algorithmus
- Rein mathematische Berechnung nach NREL (Reda & Andreas 2004)
- Input: `latitude`, `longitude`, `Date`, `timezone`
- Output: `{ azimuth, elevation, sunrise, sunset }`
- Hilfsfunktionen: `sunriseAndSunset()`, `solarPositionToVector3()` (mit `northAngle`-Rotation)
- Equinox/Solstice-Datumskonstanten exportieren

### 2. `src/hooks/useSunSimulation.ts` — State & Animationslogik
- State: `mode` (off/day/year), `date`, `timeOfDay`, `month`, `isPlaying`, `playbackSpeed`
- GPS-Koordinaten aus gespeicherten EXIF-Daten oder manueller Fallback (51.1°N, 10.4°E)
- `northAngle` aus dem ersten Solar/Area-Measurement mit pvModuleInfo auslesen
- Berechnet pro Frame: Licht-Position, Licht-Intensität, Ambient-Intensität
- Sonnenaufgang/-untergang vorberechnen → Slider-Bereich begrenzen
- Animation: `requestAnimationFrame`-Loop für Play-Modus

### 3. `src/components/measurement/SunSimulationPanel.tsx` — UI
- Zwei Tabs: **Tagesverlauf** / **Jahresverlauf**
- **Tagesverlauf**:
  - Datepicker (Shadcn Calendar im Popover)
  - Time-Slider begrenzt auf Sonnenaufgang↔Sonnenuntergang
  - Play/Pause/Speed-Buttons
  - Anzeige: Uhrzeit, Azimut, Elevation, Sonnenauf-/untergang
  - Schnellauswahl-Buttons: Equinox & Solstice (21.3 / 21.6 / 23.9 / 21.12)
- **Jahresverlauf**:
  - Monats-Slider (Jan–Dez), feste Uhrzeit 12:00
  - Play-Animation durch alle 12 Monate
  - Equinox/Solstice als markierte Punkte
- **Standort**: Automatisch aus GPS oder manuelle Lat/Lng-Eingabe
- **PV-Heatmap-Toggle**: Schaltet Verschattungsfarben auf Modulen ein/aus

### 4. `src/components/viewer/SunLight.tsx` — Steuerbare Lichtquelle
- Doch als eigene R3F-Komponente sinnvoll (R3F-Lifecycle, Refs innerhalb Canvas)
- Props: `position`, `intensity`, `ambientIntensity`, `active`, `modelBoundingBox`
- Shadow-Map dynamisch: `renderer.capabilities.maxTextureSize` prüfen, mindestens 2048, bis 4096 auf Desktop
- Shadow-Camera-Frustum eng an Modell-BoundingBox binden
- Wenn `active=false`: bestehende Standard-Beleuchtung wiederherstellen
- Alle Meshes im Modell erhalten `castShadow`/`receiveShadow` via traverse

## Änderungen an bestehenden Dateien

### `src/components/ModelViewer.tsx`
- `SunLight`-Komponente in den Canvas einbinden (neben bestehenden Lights)
- `useSunSimulation` Hook integrieren, GPS-Koordinaten durchreichen
- Bestehende DirectionalLights dimmen wenn Simulation aktiv
- `SunSimulationPanel` als Prop/Callback an MeasurementTools weiterreichen

### `src/components/measurement/MeasurementOverlay.tsx`
- Neuer Sun-Button (☀️ Icon existiert bereits als Import) zum Öffnen des SunSimulationPanels
- Panel als Collapsible-Sektion oder als Sheet/Drawer auf Mobile

### `src/components/MeasurementTools.tsx`
- SunSimulation-State durchleiten an Overlay/Sidebar

## PV-Verschattungs-Heatmap (Bonus-Feature)

- Im Tages-Modus: Für jedes PV-Modul-Mesh per Raycasting prüfen ob Sonnenstrahl blockiert wird
- Über den Tag aufsummieren → Farbgradient (grün = volle Sonne, rot = stark verschattet)
- Ergebnis als `vertexColors` oder Material-Farbe auf dem Modul-Mesh
- Optional: Prozent-Wert der Verschattung pro Modul im Panel anzeigen

## Technische Details

- **Keine externen APIs** — SPA läuft komplett clientseitig
- **Performance auf Mobile**: Shadow-Map auf 1024 reduzieren, Heatmap-Berechnung optional
- **PWA-kompatibel**: Funktioniert offline da rein mathematisch
- **northAngle**: Bereits in pvModuleInfo gespeichert, wird für Azimut→3D-Vektor-Umrechnung verwendet

