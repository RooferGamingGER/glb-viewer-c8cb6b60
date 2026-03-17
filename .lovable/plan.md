

# Fix: Schatten fallen in die falsche Richtung

## Analyse

Zwei Probleme identifiziert:

### 1. Nord-Korrektur (northAngle) wird nicht synchronisiert
Die Sonnensimulation liest `northAngle` nicht aus den PV-Messungen aus. Sie verwendet immer den Default-Wert 0°. Wenn das Modell aber nicht exakt nach +Z=Nord ausgerichtet ist (was über den PV-Kompass-Regler korrigiert wird), stimmt die Schattenrichtung nicht.

**Lösung:** Beim Aktivieren der Sonnensimulation den `northAngle` aus der ersten PV-relevanten Messung (`pvModuleInfo.northAngle`) auslesen und in den Sun-Simulation-State übernehmen.

### 2. Azimut-zu-Vektor-Umrechnung potentiell invertiert
Die Funktion `solarPositionToVector3()` erzeugt einen Positionsvektor, der die DirectionalLight-Position bestimmt. Das Licht scheint dann von dieser Position zum Modellzentrum. 

Aktuell für Azimut 180° (Süd): Vektor = (0, y, **-Z**) → Licht kommt von -Z (= Süd bei +Z=Nord). Schatten fallen nach +Z (= Nord). Das ist mathematisch korrekt.

**Mögliches Problem:** Falls die `sin(lha)`-Bedingung den Azimut für bestimmte Uhrzeiten/Standorte noch falsch spiegelt, zeigt die Sonne in die falsche Richtung. Zur Diagnose füge ich eine Anzeige des berechneten Sonnen-Vektors im Panel hinzu.

## Änderungen

### `src/components/ModelViewer.tsx`
- `northAngle` aus den Measurements synchronisieren → beim Finden einer Messung mit `pvModuleInfo.northAngle` diesen Wert via `sunSimulation.setNorthAngle()` setzen

### `src/components/measurement/SunSimulationPanel.tsx`
- Den aktuell verwendeten `northAngle` anzeigen (Nur-Lesen, kommt aus PV-Kompass)
- Debug-Info: berechnete Lichtposition (x, y, z) anzeigen zur Validierung

### `src/hooks/useSunSimulation.ts`
- Integration: `northAngle` nicht nur als manuellen State halten, sondern auch eine `syncNorthAngle(measurements)` Funktion exponieren, die automatisch den Wert aus PV-Messungen extrahiert

### `src/utils/sunPosition.ts`
- Azimut-Berechnung mit einem Referenztest validieren: Deutschland 51.1°N, 10.4°E, 21.6. 12:00 UTC+2 → Azimut muss ~180° (Süd) ergeben, Vektor muss nach -Z zeigen

