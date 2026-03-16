

## Detaillierte Ertragstabelle für PV-Ertragsberechnung

### Aktueller Stand
Die Ertragsberechnung nutzt eine **vereinfachte DGS-Tabelle** mit nur 5 Azimut-Kategorien (S, SO/SW, O/W, NO/NW, N) und 6 Neigungswinkeln (0°, 15°, 30°, 45°, 60°, 90°). Die Interpolation ist grob.

### Verbesserung
Die hochgeladene Tabelle bietet **wesentlich feinere Auflösung**:
- **Azimut**: 10°-Schritte von -180° bis 180° (37 Zeilen)
- **Neigung**: 5°-Schritte von 0° bis 90° (19 Spalten)
- **Werte**: Prozent des Maximalertrags (z.B. 100% = Süd/30°)

### Änderungen in `src/utils/pvCalculations.ts`

1. **Neue Lookup-Tabelle**: Die bestehende `DGS_TABLE` (5×6) durch die vollständige Tabelle (37×19) ersetzen. Azimut-Werte von -180° bis 180° in 10°-Schritten, Neigung von 0° bis 90° in 5°-Schritten.

2. **Neue Interpolationsfunktion**: Bilineare Interpolation über beide Achsen (Azimut + Neigung) statt nur über Neigung wie bisher. Die Azimut-Konvertierung (`azimuthToDGSCategory`) wird durch eine direkte numerische Interpolation ersetzt.

3. **Azimut-Mapping anpassen**: Die Tabelle nutzt -180° bis 180° (wobei 0° = Süd). Unsere internen Werte (0° = Nord, 180° = Süd) müssen umgerechnet werden: `tableAzimuth = azimuth - 180` (dann -180° bis 180° mit 0° = Süd).

4. **`calculateYieldFactorFromOrientation` aktualisieren**: Nutzt die neue bilineare Interpolation. Rückgabewert bleibt kWh/kWp (Prozentwert × Referenzertrag / 100).

### Betroffene Funktionen
- `DGS_TABLE`, `DGS_TILT_ANGLES` → ersetzt durch neue Datenstruktur
- `azimuthToDGSCategory` → entfällt (nicht mehr nötig)
- `interpolateDGS` → neue bilineare 2D-Interpolation
- `calculateYieldFactorFromOrientation` → minimale Anpassung

Alle nachgelagerten Funktionen (`calculateAnnualYieldWithOrientation`, `updatePVModuleInfoWithOrientation`, `calculatePVMaterials`) bleiben unverändert, da sie nur `calculateYieldFactorFromOrientation` aufrufen.

