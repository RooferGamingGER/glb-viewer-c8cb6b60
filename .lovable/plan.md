

## Flachdach: Grid-Ausrichtung an Dachkante statt an längster Kante

### Problem
Aktuell wählt `findGridAxes()` die **längste Polygonkante** als Grid-Achse (v1). Bei Steildächern ist das sinnvoll — die Module folgen dem Dachgefälle. 

Bei **Flachdächern** hingegen:
- Die Module sind aufgeständert und können frei ausgerichtet werden
- Aktuell ist die Grid-Ausrichtung zufällig (längste Kante), was bei Wechsel zwischen Süd und O/W zu schlechten Ergebnissen führt
- Ideal: Grid parallel zu einer Dachkante ausrichten, sodass die Module **optimal zur Sonne** stehen

### Lösung

**`src/utils/pvCalculations.ts`** — Neue Funktion `findFlatRoofGridAxes()`:

1. **Süd-Layout**: v1 (Spaltenrichtung) wird auf die **Ost-West-Achse** gesetzt (rechtwinklig zu Süd, basierend auf `northAngle`). Dadurch verlaufen die Modulreihen Ost-West und sind nach Süden geneigt. v1 wird dann auf die **nächstgelegene Dachkante** "gesnappt", damit das Grid parallel zum Dachrand liegt und keine schiefen Lücken entstehen.

2. **O/W-Layout**: v1 wird auf die **Nord-Süd-Achse** gesetzt (basierend auf `northAngle`), sodass die A-Form-Paare nach Ost und West schauen. Auch hier Snap auf die nächstgelegene Dachkante.

3. **Snap-Logik**: Aus allen Polygonkanten die finden, deren Richtung am nächsten an der idealen Achse liegt (kleinster Winkelunterschied). Diese Kante als v1 übernehmen → saubere Ausrichtung am Dachrand.

**`generatePVModuleGrid()`**: Bei `roofType === 'flat'` statt `findGridAxes()` die neue `findFlatRoofGridAxes(points, normal, northAngle, layout)` aufrufen.

### Änderungen

| Datei | Änderung |
|-------|----------|
| `src/utils/pvCalculations.ts` | Neue Funktion `findFlatRoofGridAxes(points, normal, northAngle, layout)` — bestimmt optimale Grid-Achse basierend auf Kompass + Snap an nächste Dachkante |
| `src/utils/pvCalculations.ts` | In `generatePVModuleGrid()`: Bei Flachdach die neue Funktion statt `findGridAxes()` verwenden |
| `src/utils/pvCalculations.ts` | In `calculatePVModuleInfo()`: Gleiche Anpassung für die initiale Berechnung |

### Logik `findFlatRoofGridAxes`

```text
1. Berechne ideale v1 aus northAngle + Layout:
   - Süd:  v1 = Ost-Vektor = (cos(na), 0, -sin(na))  → Reihen laufen O-W
   - O/W:  v1 = Nord-Vektor = (-sin(na), 0, -cos(na)) → Paare schauen O+W

2. Projiziere v1 in die Dachebene

3. Für jede Polygonkante: Berechne Winkel zu idealem v1

4. Wähle Kante mit kleinstem Winkelunterschied (±90° berücksichtigen)

5. v1 = Richtung dieser Kante (in Ebene projiziert)
   v2 = cross(normal, v1)
```

