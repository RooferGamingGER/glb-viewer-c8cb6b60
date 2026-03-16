

## Fix: E/W-Module von V-Form auf A-Form umstellen

### Problem
Die Module werden aktuell in **V-Form** (`\_/`) statt **A-Form** (`/\`) platziert. Das bedeutet:
- Die **niedrigen** Kanten treffen sich in der Mitte (statt die hohen)
- Der Wartungsweg liegt am **Hochpunkt** statt am Tiefpunkt (Tal)
- Das ist das Gegenteil des Referenzbilds

### Ursache
In der Platzierungsschleife (Zeile 895-896) werden die Richtungen falsch zugeordnet:
- Erstes Modul (niedrigerer W-Wert) bekommt `direction: 'east'` → hebt Westkante an
- Zweites Modul (höherer W-Wert) bekommt `direction: 'west'` → hebt Ostkante an
- Beide heben die **äußeren** Kanten an → V-Form

### Lösung (`src/utils/pvCalculations.ts`)

**Richtungen tauschen** in den `placeModule`-Aufrufen (Zeilen 895-896, 901-902):
- Erstes Modul: `direction: 'west'` (hebt Ostkante = innere Kante an → zum Partner hin)
- Zweites Modul: `direction: 'east'` (hebt Westkante = innere Kante an → zum Partner hin)

Dadurch treffen sich die **hohen** Kanten in der Mitte → A-Form (`/\`), und der freie Wartungsweg liegt korrekt am Tiefpunkt zwischen den Paaren.

Eine einzeilige Änderung pro Platzierungsblock (4 Zeilen total). Keine Änderungen an der Tilt-Berechnung oder den Abständen nötig.

