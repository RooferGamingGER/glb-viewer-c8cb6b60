

# Fix: Ertragsberechnung für Deutschland + korrekte Himmelsrichtung

## Analyse

### Problem 1: Azimut-Berechnung
`calculateRoofOrientation` nutzt `atan2(normal.x, -normal.z)` — das setzt ein bestimmtes Koordinatensystem voraus. Je nach Modell-Ausrichtung kann das falsch sein. Die Flächennormale zeigt "nach oben" von der Dachfläche, ihr horizontaler Anteil zeigt die Neigungsrichtung. Das Vorzeichen von `z` bestimmt ob Nord/Süd korrekt erkannt wird.

**Fix**: Die Berechnung ist mathematisch korrekt für Three.js-Standard (+X=Ost, +Z=Süd nach Kamera). Aber die Richtung der Normale hängt von der Windungsrichtung der Polygon-Punkte ab. Wenn die Normale nach "unten" zeigt (y<0), wird sie negiert — aber der horizontale Anteil kann trotzdem in die falsche Richtung zeigen. Wir müssen die **Fallrichtung** des Dachs nehmen (Projektion der Normale auf die Horizontalebene), nicht die Normale selbst.

### Problem 2: Ertragsfaktor
`calculateYieldFactorFromOrientation` nutzt eine grobe lineare Formel mit Basisfaktor 1000. Für Deutschland brauchen wir eine realistische Lookup-Tabelle basierend auf Globalstrahlung (~1000-1100 kWh/m²/Jahr in Zentraldeutschland).

**Fix**: Ersetzen durch eine Tabelle mit Korrekturfaktoren nach DGS-Leitfaden (Deutsche Gesellschaft für Sonnenenergie):

```text
Neigung →   0°    15°   30°   45°   60°   90°
Süd (180°)  87%   95%  100%   97%   88%   55%
SW/SO       87%   93%   96%   92%   82%   52%
W/O         87%   88%   85%   78%   67%   42%
NW/NO       87%   82%   72%   60%   47%   32%
Nord (0°)   87%   80%   65%   50%   37%   25%
```

Referenzertrag für Deutschland: **1000 kWh/kWp** (Süd, 30°, optimale Bedingungen). Realistischer Durchschnitt ~950 kWh/kWp.

## Plan

### 1. `calculateRoofOrientation` korrigieren
- Azimut aus der horizontalen Projektion der Dachnormale ableiten
- Sicherstellen dass die "Fallrichtung" (downslope) korrekt als Azimut interpretiert wird
- Richtungslabels auf Deutsch: "N", "NO", "O", "SO", "S", "SW", "W", "NW"

### 2. `calculateYieldFactorFromOrientation` ersetzen
- Lookup-Tabelle mit DGS-konformen Korrekturfaktoren (Azimut × Neigung)
- Bilineare Interpolation zwischen Stützstellen
- Basisfaktor 1000 kWh/kWp für Süd/30° in Deutschland
- Ergebnis: realistischer Ertragsfaktor in kWh/kWp

### 3. SolarMeasurementContent — Richtungsanzeige
- Richtungslabels konsistent auf Deutsch ("SO" statt "SE", "NO" statt "NE")

## Dateien

| Datei | Änderung |
|---|---|
| `src/utils/pvCalculations.ts` | `calculateRoofOrientation`: Azimut-Fix + deutsche Labels. `calculateYieldFactorFromOrientation`: DGS-Tabelle mit Interpolation |
| `src/components/measurement/SolarMeasurementContent.tsx` | Richtungslabels auf Deutsch anpassen (minor) |

