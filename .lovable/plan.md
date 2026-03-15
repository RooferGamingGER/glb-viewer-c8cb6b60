

# Fix: PV-Module über Dachelemente + Sichtbarkeit durch Modell

## Problem 1: Module werden über Dachelemente gezeichnet

Dachelemente (Dachfenster, Kamine, Lüfter etc.) sind als eigene Messungen mit Typ `skylight`, `chimney`, `vent`, `hook`, `other`, `deductionarea` gespeichert. Jede hat `points[]` (Polygon) oder `position` (Punkt).

**Lösung**: In `generatePVModuleGrid` (pvCalculations.ts) alle Dachelemente als Ausschlusszonen berücksichtigen:
- Neue Parameter: `exclusionZones: Point[][]` — Liste von Polygonen die blockiert sind
- Für jedes Modul prüfen ob seine 4 Ecken oder sein Zentrum mit einer Ausschlusszone überlappt
- Punkt-Elemente (vent, hook) bekommen einen Sicherheitsradius (z.B. 30cm) als kreisförmige Ausschlusszone
- Die Ausschlusszonen werden aus allen Messungen mit Typ `skylight`, `chimney`, `deductionarea` und Punkt-Elementen extrahiert
- Auch `calculatePVModulePlacement` muss die Zählung anpassen (reduzierte Modulanzahl)

Aufrufstelle anpassen: Wo `generatePVModuleGrid` / `calculatePVModulePlacement` aufgerufen wird, die relevanten Messungen als Ausschlusszonen übergeben.

## Problem 2: PV-Module durch GLB-Modell sichtbar

Die Module nutzen `THREE.DoubleSide` Material → sie sind von beiden Seiten sichtbar, auch wenn man durch das Modell hindurchschaut.

**Lösung**: In `pvModuleRenderer.ts` das Material auf `THREE.FrontSide` ändern. Da die Module auf der Dachoberfläche liegen und ihre Normale nach außen zeigt, reicht `FrontSide` — sie sind nur von der korrekten Seite sichtbar.

## Dateien

| Datei | Änderung |
|---|---|
| `src/utils/pvModuleRenderer.ts` | `side: THREE.DoubleSide` → `THREE.FrontSide` |
| `src/utils/pvCalculations.ts` | `generatePVModuleGrid` + `calculatePVModulePlacement`: Ausschlusszonen-Parameter + Überlappungsprüfung |
| Aufrufstellen von `generatePVModuleGrid`/`calculatePVModulePlacement` | Dachelemente als Ausschlusszonen übergeben |

