

# PV-Planung: Korrekte Modulplatzierung und professionelle Berechnung

## Kernprobleme

1. **Module schweben / liegen nicht auf der Dachflaeche**: `generatePVModuleGrid` berechnet v1/v2 Richtungsvektoren aus P0→P1 und P0→P3, aber bei Polygonen mit >4 Punkten ist P3 nicht zwingend die "gegenueberliegende Ecke". Die Projektion auf die Dachebene funktioniert nur fuer die ersten 3 Punkte korrekt.

2. **Ausrichtung stimmt nicht**: Die Orientierung (Portrait/Landscape) wird korrekt berechnet, aber die Gitter-Vektoren v1/v2 werden aus beliebigen Polygon-Kanten abgeleitet statt aus der laengsten und kuerzesten Kante. Bei nicht-rechteckigen Dachflaechen fuehrt das zu schiefer Modulplatzierung.

3. **Module ragen ueber die Dachflaeche hinaus**: Es gibt keinen Clipping-Check -- Module werden in einem Rechteck platziert, aber nicht geprueft ob sie innerhalb des tatsaechlichen Dach-Polygons liegen.

4. **Berechnung zu vereinfacht**: Nur ein Modultyp (450W), keine Beruecksichtigung von Randabstaenden nach Norm (30-50cm), String-Berechnung zu simpel.

## Geplante Aenderungen

### 1. `src/utils/pvCalculations.ts` -- Modulplatzierung komplett ueberarbeiten

**`generatePVModuleGrid()` neu schreiben:**

- **Korrekte Achsenbestimmung**: Statt P0→P1/P0→P3, finde die zwei laengsten aufeinanderfolgenden Kanten des Polygons. Die laengere definiert die "Laengsachse" (v1), die kuerzere die "Querachse" (v2). Orthogonalisiere v2 gegen v1 in der Dachebene.

- **Polygon-Clipping**: Nach Berechnung jeder Modul-Position pruefen ob alle 4 Ecken innerhalb des Dach-Polygons liegen (via `isPointInPolygon` aus `rectangleFinder.ts`). Module ausserhalb weglassen.

- **Randabstaende normgerecht**: Default von 20cm auf 30cm erhoehen. Randabstand wird als Polygon-Inset berechnet (alle Kanten um `edgeDistance` nach innen verschieben), nicht nur als Offset vom Startpunkt.

- **Stabile Ebenenprojektion**: Fuer Polygone mit >3 Punkten die Ebene per Least-Squares-Fit berechnen statt nur aus den ersten 3 Punkten.

**`calculatePVModulePlacement()` verbessern:**

- Korrekte Orientierungsberechnung: Die laengste Kante des Polygons bestimmt die Hauptausrichtung.
- Bei "auto" Orientierung: Beide Orientierungen mit Polygon-Clipping durchrechnen und die mit mehr Modulen waehlen.

**Neue Modulvorlagen hinzufuegen:**

```typescript
export const PV_MODULE_TEMPLATES: PVModuleSpec[] = [
  { name: "Standard 450W", width: 1.140, height: 1.770, power: 450, efficiency: 21.0 },
  { name: "Standard 420W", width: 1.134, height: 1.722, power: 420, efficiency: 21.4 },
  { name: "Standard 400W", width: 1.052, height: 1.757, power: 400, efficiency: 21.6 },
  { name: "Hochleistung 500W", width: 1.134, height: 2.094, power: 500, efficiency: 22.3 },
];
```

**Normgerechte Randabstaende:**

```typescript
export const DEFAULT_EDGE_DISTANCE = 0.30;  // 30cm (Norm: 30-50cm)
export const DEFAULT_RIDGE_DISTANCE = 0.50;  // 50cm zum First
export const DEFAULT_MODULE_SPACING = 0.02;  // 2cm zwischen Modulen
```

### 2. `src/utils/pvCalculations.ts` -- Elektrische Auslegung verbessern

**String-Berechnung realistischer:**

- Max 600V DC Systemspannung (Standard fuer Wohngebaeude)
- Typische Modul-Leerlaufspannung ~41V → max ~14 Module pro String
- Wechselrichter-Dimensionierung: 0.85-1.0x der Generatorleistung
- Mehrere gaengige WR-Groessen: 5kW, 8kW, 10kW, 15kW, 20kW

```typescript
const MAX_SYSTEM_VOLTAGE = 600; // V DC
const MODULE_VOC = 41.5; // Typical Voc for 450W module
const MAX_MODULES_PER_STRING = Math.floor(MAX_SYSTEM_VOLTAGE / MODULE_VOC);
```

**Materialliste erweitern:**

- Dachhaken-Berechnung: 1 pro 1.2m Schiene (statt 0.8m)
- Schienen: 2 Schienen pro Modulreihe, Laenge = Modulbreite × Anzahl + Spacing
- End-/Mittelklemmen korrekt: 2 Endklemmen pro Schienenende, 2 Mittelklemmen zwischen Modulen

### 3. `src/utils/pvModuleRenderer.ts` -- Rendering anpassen

- Module direkt aus den korrekten Corner-Points rendern (bereits teilweise implementiert in `measurementVisuals.ts`)
- Sicherstellen dass der Normal-Offset konsistent 0.01-0.02m betraegt

### 4. `src/components/measurement/PVMaterialsList.tsx` -- Ertragsberechnung anzeigen

Erweiterung der Materialliste um:
- Jahresertrag (kWh) basierend auf kWp × Standortfaktor
- String-Aufteilung (z.B. "2 Strings a 14 Module")
- WR-Empfehlung mit Leistungsklasse

## Zusammenfassung der Dateien

| Datei | Aenderung |
|---|---|
| `src/utils/pvCalculations.ts` | Modulplatzierung mit Polygon-Clipping, korrekte Achsen, normgerechte Abstaende, bessere Elektrik |
| `src/utils/pvModuleRenderer.ts` | Keine groessere Aenderung, nur Konsistenz-Fixes |
| `src/components/measurement/PVMaterialsList.tsx` | Ertragsanzeige und String-Details ergaenzen |

Keine neuen Abhaengigkeiten. Die Kernverbesserung ist das Polygon-Clipping in `generatePVModuleGrid`, wodurch Module nicht mehr ueber den Dachrand hinausragen und korrekt auf der geneigten Flaeche liegen.

