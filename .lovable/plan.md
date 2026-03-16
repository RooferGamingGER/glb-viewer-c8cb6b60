
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
