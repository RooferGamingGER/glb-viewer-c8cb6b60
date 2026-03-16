

## Plan: E-W Modulausrichtung korrigieren & Wartungswege implementieren

### Problem 1: Identische Ausrichtung bei Süd und O/W

Die aktuelle Logik nutzt für **beide** Layouts (Süd und O/W) eine Kompass-basierte Eckpunkt-Anhebung. Das ist für Süd korrekt (Nordkante anheben), aber für O/W **falsch**. Bei O/W muss die Neigung **relativ zur Paar-Geometrie** sein (innere Kanten zum First hin anheben), nicht nach Himmelsrichtung.

**Aktuelle Logik (falsch für O/W):**
- Ost-Modul: Prüft Kompass → hebt "West-Kante" an
- West-Modul: Prüft Kompass → hebt "Ost-Kante" an
- → Auf einem Dach wo v2 nicht Ost-West ausgerichtet ist, werden gleiche Kanten angehoben

**Korrekte Logik:**
- Ost-Modul (vorne im Paar, niedrigeres W): Corners 2,3 anheben (high-W = Richtung First/Mitte)
- West-Modul (hinten im Paar, höheres W): Corners 0,1 anheben (low-W = Richtung First/Mitte)
- → Rein Grid-relativ, kein Kompass nötig. Die Module neigen sich immer zueinander.

### Problem 2: Fehlende Wartungswege

User möchte: Fester Abstand (umschaltbar 50/60cm) nach jedem O/W-Feld **plus** periodisch ein breiterer Wartungsgang.

### Änderungen in `src/utils/pvCalculations.ts`

**1. E-W Tilt-Logik in `placeModule` korrigieren:**
- Neuer Tilt-Direction-Typ: `'south' | 'east-grid' | 'west-grid'`
- `'east-grid'`: Hebt immer Corners 2,3 an (high-W, keine Kompass-Prüfung)
- `'west-grid'`: Hebt immer Corners 0,1 an (low-W, keine Kompass-Prüfung)
- `'south'`: Bleibt wie bisher (Kompass-basiert, Nordkante anheben)

**2. Konstanten anpassen:**
- `EW_PAIR_GAP` → Standardwert 0.50, aber jetzt konfigurierbar über `PVModuleInfo`
- `EW_MAINTENANCE_GAP = 0.40` bleibt
- `EW_MAINTENANCE_INTERVAL = 3` bleibt
- Neues Feld in PVModuleInfo: `ewPairGap?: number` (50 oder 60cm, Standard 50)

**3. E-W Aufrufe ändern:**
```
placeModule(cu, cwEast, { angle: tiltAngle, direction: 'east-grid' });
placeModule(cu, cwWest, { angle: tiltAngle, direction: 'west-grid' });
```

### Änderungen in `src/types/measurements.ts`

- Neues Feld: `ewPairGap?: number` in PVModuleInfo (Standard 0.50m)

### Änderungen in `src/components/measurement/SolarMeasurementContent.tsx`

- Neuer Slider für E-W Feldabstand (50-60cm) bei O/W Layout, nur sichtbar wenn `flatRoofLayout === 'east-west'`

### Zusammenfassung
- **Kern-Fix**: E-W Module nutzen Grid-relative Neigung statt Kompass → A-Form entsteht immer korrekt
- **Süd** bleibt Kompass-basiert (Nordkante anheben)
- **Wartungswege**: Fester Abstand (50/60cm wählbar) nach jedem Feld + periodischer Wartungsgang alle 3 Felder

