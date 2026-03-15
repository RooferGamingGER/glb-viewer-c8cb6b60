

# Visuelle Verbesserung der Messungs-Darstellung

## Vergleich: Referenzprojekt vs. aktuelles Projekt

| Element | Referenzprojekt (besser) | Aktuelles Projekt |
|---|---|---|
| **Farben** | Einheitlich Cyan `#00e5ff` fuer Punkte/Linien, Orange `#ffab00` fuer editierte Punkte | Gruen/Blau/Orange je nach Typ, Magenta/Gelb fuer Edit-Punkte |
| **Labels** | HTML-basiert (`<Html>` aus drei/drei), sauber, `font-mono`, `bg-background/90` | Canvas-basierte Sprites (textSprite.ts), schwerer zu lesen, verschwommen |
| **Punkt-Groesse** | 0.05 Standard, 0.08 editiert, Hover-Effekt (1.5x Scale) | 0.04 Standard, 0.08/0.1 editiert, kein Hover |
| **Delete-Button (×)** | Rotes Kreis-Badge direkt am Punkt, mit Bestaetigungs-Dialog | Nicht direkt am Punkt, nur ueber Sidebar |
| **Insert-Button (+)** | Gruenes Kreis-Badge am Kanten-Mittelpunkt, mit Bestaetigungs-Dialog | 3D-Box-Geometrie Plus-Zeichen, schwer erkennbar |
| **depthTest** | `false` ueberall -- immer sichtbar | Teilweise `true` -- Punkte/Linien verschwinden hinter dem Modell |
| **Linien** | Immer `depthTest: false`, dadurch sichtbar | Linien koennen hinter dem Modell verschwinden |

## Geplante Aenderungen

### 1. `src/utils/measurementVisuals.ts` -- Visuelle Anpassungen

**Farben vereinheitlichen:**
- Punkte und Linien: `#00e5ff` (Cyan) statt Gruen/Blau/Orange pro Typ
- Edit-Punkte: `#ffab00` (Orange) statt Magenta/Gelb
- Behalte Typ-spezifische Farben nur fuer Solar (`#1EAEDB`) und Dachelemente

**depthTest auf `false` setzen:**
- Alle `LineBasicMaterial`, `LineDashedMaterial` und `MeshBasicMaterial` fuer Punkte bekommen `depthTest: false`
- Dadurch sind Linien und Punkte immer sichtbar, auch wenn sie geometrisch hinter dem Modell liegen

**Punkt-Groesse erhoehen:**
- Standard-Punkte: 0.05 statt 0.04
- Punkte bei laufender Messung: 0.05 statt 0.05 (bleibt)

### 2. `src/utils/measurementVisuals.ts` -- `renderEditPoints()` verbessern

- Edit-Punkte: 0.05 Standard, 0.08 wenn selektiert (statt 0.08/0.1)
- Farbe: `#00e5ff` normal, `#ffab00` selektiert
- `depthTest: false` fuer alle Edit-Punkte
- Hover-Cursor (`pointer`) wird bereits ueber Events in `useMeasurementEvents.ts` gehandhabt

### 3. `src/hooks/useAddPointIndicators.ts` -- "+" Buttons ueberarbeiten

Statt der 3D-Box-Geometrie Plus-Zeichen: HTML-basierte gruene Kreis-Buttons (wie im Referenzprojekt). Da wir hier kein React Three Fiber nutzen, verwenden wir `CSS2DRenderer` oder alternativ einfach bessere 3D-Sprites.

**Pragmatischer Ansatz:** Die Plus-Symbole als gruene Kreis-Sprites mit "+" Text rendern (ueber `createTextSprite` mit angepasstem Styling), oder die bestehende 3D-Geometrie optisch verbessern:
- Gruene Kugel statt Box-Plus
- Groesserer Klick-Bereich
- `depthTest: false` fuer Sichtbarkeit

### 4. Labels bleiben Canvas-Sprites

Das Referenzprojekt nutzt React Three Fiber mit `<Html>` fuer Labels. Unser Projekt nutzt imperativen Three.js-Code ohne R3F. Eine Umstellung auf HTML-Labels wuerde einen `CSS2DRenderer` erfordern, was eine groessere Architektur-Aenderung waere. Die Canvas-Sprites behalten wir bei, verbessern aber die Lesbarkeit durch:
- Hoeheren Kontrast
- `depthTest: false` auf allen Label-Sprites

### Zusammenfassung der Dateien

| Datei | Aenderung |
|---|---|
| `src/utils/measurementVisuals.ts` | Farben auf Cyan/Orange, `depthTest: false` ueberall, Punkt-Groessen anpassen |
| `src/hooks/useAddPointIndicators.ts` | Plus-Indikatoren als gruene Kugeln mit `depthTest: false`, optisch klarer |

Keine neuen Abhaengigkeiten noetig. Die Aenderungen sind rein visuell und aendern keine Mess-Logik.

