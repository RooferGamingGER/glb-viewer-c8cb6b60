

# Sidebar-Redesign: Messwerkzeuge als Overlay, Sidebar nur fuer Solar/Dachelemente/Massen

## Ueberblick

Die Sidebar ist aktuell ueberladen: Messwerkzeuge, Messungsliste, Exportoptionen und Solar/Dachelemente sind alle gleichzeitig sichtbar. Das Referenzprojekt loest das eleganter mit einem kompakten Overlay oben-links fuer die Grundwerkzeuge und einem Dialog fuer den Export.

## Aenderungen

### 1. Neues Measurement-Overlay (oben-links im Viewer)

**Neue Datei: `src/components/measurement/MeasurementOverlay.tsx`**

Kompakte Toolbar wie im Referenzprojekt -- schwebt oben-links ueber dem 3D-Viewer:
- Tool-Buttons in einer Zeile: Laenge, Hoehe, Flaeche, Abzugsflaeche, Snap, Alle loeschen
- Darunter: Kontext-Hinweis (z.B. "Klicke 2 Punkte fuer eine Strecke") mit Undo/Fertig/Abbrechen
- Darunter: Kompakte Messungsliste (Typ + Wert + X-Button pro Messung)
- Edit-Modus-Anzeige wenn ein Punkt verschoben wird

```text
┌──────────────────────────────────┐
│ [Länge] [Höhe] [Fläche] [Abzug] │
│ [Snap] [Neigung] [🗑 Alle]       │
├──────────────────────────────────┤
│ Klicke 2 Punkte für eine Strecke│
│ [Rückgängig] [Abbrechen]        │
├──────────────────────────────────┤
│ Messungen                        │
│ Länge: 8.54 m              [×]  │
│ Fläche: 45.23 m²           [×]  │
│ Höhe: 3.20 m               [×]  │
└──────────────────────────────────┘
```

### 2. Export-Dialog statt permanenter Exportliste

**Neue Datei: `src/components/measurement/ExportDialog.tsx`**

Ein einzelner "Export"-Button im Overlay oeffnet einen Dialog mit Tabs:
- **PDF**: Formular fuer Deckblatt-Daten + "PDF erstellen" Button
- **CSV**: Vorschau + "CSV herunterladen" Button
- **GLB**: "GLB mit Messungen exportieren" Button
- **ABS**: "ABS-Export" Button
- **Dachplan**: "Dachplan generieren" Button

### 3. Sidebar nur fuer Solar, Dachelemente und Massen-Details

**`src/components/MeasurementTools.tsx` aendern:**

Die Sidebar (rechts, 320px) wird:
- **Standardmaessig zugeklappt** (nur ein kleiner Toggle-Button am rechten Rand sichtbar)
- Enthaelt nur noch: SolarToolbar, RoofElementsToolbar, und die ausklappbare Massen-Detailliste
- Oeffnet sich automatisch wenn Solar- oder Dachelement-Tool aktiviert wird

**`src/components/measurement/MeasurementToolControls.tsx` aendern:**

- Messwerkzeuge-Buttons (Laenge/Hoehe/Flaeche/Abzug) und Exportoptionen entfernen -- sind jetzt im Overlay
- Nur noch SolarToolbar, RoofElementsToolbar und die Messungsliste (als aufklappbare Gruppen) behalten

### 4. Messungsliste kompakter

Die Messungsliste im Overlay zeigt nur Typ + Wert + Loeschen-Button.
Die detaillierte Liste mit Segmenten, Punkt-Bearbeitung etc. bleibt in der Sidebar unter "Massen" als aufklappbare Gruppen (wie im Referenzprojekt: kompakte Zeilen die man aufklappen kann).

### 5. Bearbeitung vereinfachen

Aktuell muss man in der Sidebar eine Flaeche auswaehlen um sie zu bearbeiten. Stattdessen:
- Wenn kein Werkzeug aktiv ist und man auf einen Punkt klickt: Punkt wird direkt zum Verschieben ausgewaehlt
- Rote × Badges an jedem Punkt (bei Flaechen mit >3 Punkten) zum Loeschen
- Gruene + Badges an Kanten-Mittelpunkten zum Einfuegen
- Dies ist bereits ueber `useAddPointIndicators.ts` und `useMeasurementEvents.ts` teilweise implementiert -- muss aber ohne vorheriges "Bearbeiten starten" funktionieren

## Dateien

| Datei | Aenderung |
|---|---|
| `src/components/measurement/MeasurementOverlay.tsx` | **Neu** -- Kompakte Tool-Buttons + Messungsliste als Overlay |
| `src/components/measurement/ExportDialog.tsx` | **Neu** -- Dialog mit Tabs fuer alle Exportformate |
| `src/components/MeasurementTools.tsx` | Sidebar standardmaessig zugeklappt, Overlay einbinden, Sidebar nur fuer Solar/Dachelemente/Massen |
| `src/components/measurement/MeasurementToolControls.tsx` | Messwerkzeuge und Export entfernen, nur Solar/Dach/Massen behalten |
| `src/hooks/useMeasurementEvents.ts` | Direkte Punkt-Bearbeitung ohne vorheriges "Edit starten" ermoeglichen |

