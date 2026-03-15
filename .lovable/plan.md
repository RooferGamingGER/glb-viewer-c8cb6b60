

# Fixes: Messungen umbenennen, PV-Orientierung, Solar-Workflow

## 1. Messungen umbenennen — UI-Problem

Die Rename-Logik existiert bereits im Code (`startLabelEdit`, `saveLabelEdit`), aber:
- Der Pencil-Button hat `opacity-0 group-hover:opacity-100` — auf Touch/Tablet unsichtbar
- Double-Click ist nicht intuitiv ohne visuellen Hinweis

**Fix in `MeasurementToolControls.tsx`:**
- Pencil-Icon immer sichtbar machen (nicht nur on hover)
- Alternativ: Single-Click auf den Label-Text startet die Bearbeitung
- Segment-Labels (Teilstrecken bei Flächen) ebenfalls editierbar machen, damit man einzelne Kanten als "First", "Traufe", "Ortgang" benennen kann

## 2. PV-Orientierung vertauscht (portrait/landscape)

**Bug in `pvCalculations.ts` Zeile 348-350:**
```typescript
// AKTUELL (falsch):
const mw = portrait ? moduleHeight : moduleWidth;  // 1.722m horizontal = Querformat!
const mh = portrait ? moduleWidth : moduleHeight;   // 1.134m vertikal

// KORREKT:
const mw = portrait ? moduleWidth : moduleHeight;   // 1.134m horizontal = Hochformat ✓
const mh = portrait ? moduleHeight : moduleWidth;    // 1.722m vertikal
```

Portrait (Hochformat) = lange Seite (1.722m) vertikal, kurze Seite (1.134m) horizontal.
Aktuell ist es invertiert: "portrait" legt die lange Seite horizontal — das ist Querformat.

Gleicher Fix in `generatePVModuleGrid()` Zeile 473-474.

## 3. Solar-Workflow: Bestehende Fläche für PV nutzen + Sperrflächen

Statt eine neue "Solarfläche" zu zeichnen, soll der Nutzer:
1. Eine bereits vermessene Fläche (Typ `area`) auswählen
2. Auf "PV-Planung starten" klicken
3. Das System prüft automatisch ob Dachelemente (Fenster, Kamine) innerhalb der Fläche liegen
4. Diese werden als Sperrflächen (No-Go-Zonen) markiert
5. Module werden nur ausserhalb der Sperrflächen platziert

**Änderungen:**

**`SolarToolbar.tsx`:** Statt "Solarfläche zeichnen" Button, einen "PV-Planung für Fläche" Button der ein Dropdown zeigt mit allen vorhandenen `area`-Messungen. Nach Auswahl wird die Fläche in eine `solar`-Messung konvertiert (oder eine Kopie erstellt).

**`pvCalculations.ts`:** Neue Funktion `findExclusionZones(solarPoints, allMeasurements)` die prüft ob `deductionarea`, `skylight`, `chimney` etc. Messungen geometrisch innerhalb der Solarfläche liegen. Diese werden als Sperrflächen-Polygone an `calculatePVModulePlacement` übergeben.

**`calculatePVModulePlacement`:** Neuer Parameter `exclusionZones: Point[][]`. Beim Polygon-Clipping-Check wird zusätzlich geprüft ob ein Modul mit einer Sperrfläche kollidiert (`isModuleInsidePolygon` gegen jede Sperrfläche). Falls ja, wird das Modul übersprungen.

## Dateien

| Datei | Änderung |
|---|---|
| `src/components/measurement/MeasurementToolControls.tsx` | Rename-Button immer sichtbar, Segment-Labels editierbar |
| `src/utils/pvCalculations.ts` | Portrait/Landscape-Mapping korrigieren, Exclusion-Zones-Support |
| `src/components/measurement/SolarToolbar.tsx` | "PV für bestehende Fläche" statt "Solarfläche zeichnen" |
| `src/components/measurement/SolarMeasurementContent.tsx` | Orientierungsanzeige an korrigierte Logik anpassen |

