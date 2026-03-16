

## E-W Ausrichtung & Wartungsweg für Flachdach

### Problem
1. **E-W Neigung ist grid-relativ**: Module werden entlang der Grid-W-Achse geneigt, nicht nach echtem Osten/Westen. Die Tilt-Richtung muss kompassbasiert sein (wie bei Süd-Aufständerung mit `northAngle`).
2. **Kein zentraler Wartungsweg**: Aktuell gibt es nur kleine 40cm-Lücken alle 3 Paare. Es fehlt ein durchgehender zentraler Wartungsgang (wie die rote Linie im Bild zeigt).

### Änderungen

**`src/utils/pvCalculations.ts`**

1. **E-W Neigung kompassbasiert machen**:
   - Statt `east-grid`/`west-grid` (rein grid-relativ) einen neuen Ansatz: Aus `northAngle` den Ost- und West-Vektor berechnen
   - East-Modul: Nordkante/Westkante angehoben → Neigung nach Osten
   - West-Modul: Nordkante/Ostkante angehoben → Neigung nach Westen
   - Die A-Form-Paare bleiben, aber die Neigungsrichtung folgt dem Kompass

2. **Zentraler Wartungsweg**:
   - Neue Konstante `EW_MAIN_MAINTENANCE_PATH = 0.80` (80cm Standard-Wartungsgang)
   - Das Modulfeld wird in der Mitte (entlang der U-Achse / Längsrichtung) geteilt
   - Links und rechts des Wartungswegs werden Module platziert
   - Die kleinen Maintenance-Gaps alle 3 Paare bleiben zusätzlich erhalten

3. **Neues Feld in `PVModuleInfo`**: `maintenancePathWidth?: number` (Standard 0.80m)

**`src/types/measurements.ts` + `measurements.d.ts`**
- `maintenancePathWidth?: number` in `PVModuleInfo`

**`src/components/measurement/SolarMeasurementContent.tsx`**
- Slider für Wartungsweg-Breite (0.60m - 1.20m) im E-W Bereich
- Label: "Wartungsgang"

### Logik Wartungsweg
Das Modulfeld wird horizontal in zwei Hälften geteilt:
- Verfügbare Breite (U-Richtung) = Gesamtbreite - 2×Randabstand - Wartungswegbreite
- Linke Hälfte: cols_left = floor(halbeBreite / (mw + spacing))
- Rechte Hälfte: cols_right = floor(halbeBreite / (mw + spacing))
- Module links: startU bis startU + cols_left × pitch
- Wartungsweg: Lücke in der Mitte
- Module rechts: nach Wartungsweg bis Rand

