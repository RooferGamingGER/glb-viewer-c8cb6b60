
# PV-Belegung: Hochkant-Standard & Flachdach-Unterstützung

## Status: Implementiert ✅

## Änderungen

### 1. Typ-Erweiterung (`src/types/measurements.ts`)
- `roofType`, `flatRoofLayout`, `tiltAngle`, `rowSpacing`, `flatRoofEdgeDistance` zu PVModuleInfo hinzugefügt

### 2. Standard-Orientierung auf Hochkant (`src/utils/pvCalculations.ts`)
- Auto-Modus wählt jetzt immer Portrait (Hochkant) als Standard
- PVModuleSelect zeigt "Hochkant (Standard)" / "Quer" / "Auto"

### 3. Flachdach-Erkennung & Berechnung
- `isRoofFlat()`: Erkennt Flachdach bei Neigung < 5°
- `calculateFlatRoofRowSpacing()`: L = h/tan(15°) für Wintersonnenwende-Abstand
- `getDefaultFlatRoofConfig()`: Standard-Werte (25° Süd, 12° O/W, 50cm Rand)
- `calculatePVModulePlacement` setzt automatisch Flachdach-Werte

### 4. Grid-Generierung für Flachdach
- **Süd**: Reihen mit berechnetem Reihenabstand, Hinterkante angehoben
- **Ost-West**: Modulpaare Rücken an Rücken (5cm Paarabstand, 30cm Wartungsgang)
- 3D-Tilt: Ecken werden in Y-Richtung angehoben basierend auf Kippwinkel

### 5. Ertragsberechnung
- Flachdach nutzt tiltAngle als effektive Neigung
- O/W: Durchschnitt aus Ost- und West-Ertragsfaktor

### 6. UI-Steuerung (`SolarMeasurementContent.tsx`)
- Flachdach-Banner mit Info-Alert
- Layout-Toggle: Süd / O/W
- Slider: Aufständerungswinkel (5°-35°)
- Slider: Randabstand (30-100cm)
- Reihenabstand-Anzeige für Süd-Variante
