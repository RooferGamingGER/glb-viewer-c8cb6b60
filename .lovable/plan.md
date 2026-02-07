

# Mobile Hochkant-Layout: Bottom-Bar, Overlays und Mess-Toolbar

## Zusammenfassung

Die aktuelle mobile Portrait-Ansicht zeigt ein statisches Bottom-Sheet (33vh hoch) mit allen Werkzeugen und Messungen. Das wird ersetzt durch ein platzsparendes Layout mit drei Hauptbereichen:

1. **Bottom-Bar** mit drei Buttons: Messen / Export / Massen
2. **Mess-Panel** (nur Werkzeuge, keine Messliste) + **Mess-Toolbar** (Rueckgaengig/Abschliessen bei aktiver Messung)
3. **Vollbild-Overlays** fuer Massen (Messliste) und Export (alle Export-Optionen)

## Betroffene Dateien

### Datei 1: `src/components/MeasurementTools.tsx` (Hauptaenderungen)

Die groesste Aenderung findet hier statt. Das aktuelle Bottom-Sheet (Zeilen 476-480) wird komplett ersetzt.

**A) Neue State-Variablen (nach Zeile 398)**

Drei neue States fuer die mobilen Panels:
- `isMobileMeasurePanelOpen` -- Werkzeug-Panel (oben auf/zu)
- `isMobileMassesOpen` -- Massen-Overlay (Vollbild mit Messliste)
- `isMobileExportOpen` -- Export-Overlay (Vollbild mit Export-Buttons)

Plus abgeleitete Flags:
- `showMobileBottomBar = useBottomSheet && enabled` -- Bottom-Bar anzeigen
- `showMobileMeasureToolbar = useBottomSheet && enabled && activeMode !== 'none'` -- Toolbar bei aktiver Messung

**B) Neue Imports**

Zusaetzliche Imports fuer die Export-Komponenten und Hilfsfunktionen:
- `Button` aus UI-Bibliothek
- `getMeasurementTypeDisplayName` aus exportUtils
- `ExportGLBWithMeasurementsButton`, `GenerateRoofPlanButton`, `ExportPdfButton`
- `generateDetailedCSV`, `exportMeasurementsToAbsJson` aus exportUtils
- Icons: `Ruler`, `Download`, `List`, `Undo2`, `Check`, `FileText`, `X`

**C) CSV/ABS-Export-Funktionen**

Da die Export-Logik momentan nur in `MeasurementToolControls.tsx` lebt, wird sie auch hier benoetigt. Dafuer werden die `exportMeasurementsAsCSV()` und `exportMeasurementsAsAbsJson()` Funktionen hier dupliziert (oder aus einer Hilfsfunktion importiert).

**D) Bottom-Sheet (Zeilen 476-480) ersetzen durch neues Layout**

Das bisherige statische 33vh-Bottom-Sheet wird ersetzt durch vier separate UI-Bereiche:

1. **Mess-Toolbar** (ueber der Bottom-Bar, nur bei aktiver Messung):
   - Zeigt den aktuellen Messungstyp-Namen
   - "Rueckgaengig"-Button (ruft `handleUndoLastPoint`)
   - "Abschliessen"-Button (ruft `handleFinalizeMeasurement`)
   - Positioniert direkt ueber der Bottom-Bar

2. **Bottom-Bar** (feste Leiste am unteren Rand):
   - Drei gleichgrosse Buttons: "Messen" / "Export" / "Massen"
   - "Messen" togglet das Werkzeug-Panel
   - "Export" oeffnet das Export-Overlay
   - "Massen" oeffnet das Massen-Overlay
   - Safe-Area-Inset fuer Geraete mit Home-Indicator

3. **Mess-Panel** (wenn `isMobileMeasurePanelOpen`):
   - Rendert `panelContent` (MeasurementToolControls + Controls)
   - Positioniert ueber der Bottom-Bar
   - Scrollbar bei vielen Werkzeugen

4. **Massen-Overlay** (wenn `isMobileMassesOpen`):
   - Vollbild-Overlay mit Kopfzeile "Massen" + Schliessen-Button
   - Liste aller Messungen mit Label, Typ und Wert
   - Einheit wird je nach Typ bestimmt (m2 fuer Flaechen, m fuer Laengen/Hoehen)
   - Scrollbar fuer lange Listen

5. **Export-Overlay** (wenn `isMobileExportOpen`):
   - Vollbild-Overlay mit Kopfzeile "Export" + Schliessen-Button
   - Alle Export-Optionen: GLB, Dachplan, CSV, ABS-JSON, PDF
   - Verwendet die bestehenden Export-Komponenten

### Datei 2: `src/components/measurement/MeasurementToolControls.tsx`

**A) Orientation-Hook einbauen**

Import und Verwendung von `useScreenOrientation`:
```text
const { isPortrait, isTablet, isPhone } = useScreenOrientation();
const isMobilePortrait = isPortrait && (isPhone || isTablet);
```

**B) Messungen-Tab auf Mobile ausblenden**

In der `TabsList` (Zeile 216) wird der "Messungen"-Tab auf Mobile ausgeblendet:
- Die TabsList wird nur noch 1 Spalte breit auf Mobile (statt 2)
- Der TabsTrigger fuer "measurements" wird mit `{!isMobilePortrait && ...}` umschlossen

**C) Messungen-Content auf Mobile ausblenden**

Der gesamte `TabsContent value="measurements"` (Zeilen 258-361) wird mit `{!isMobilePortrait && ...}` umschlossen. So sieht man auf Mobile nur die Werkzeuge, waehrend die Messliste und Exporte ueber die separaten Overlays zugaenglich sind.

## Visuelles Layout (Mobile Portrait)

```text
+---------------------------+
|                           |
|                           |
|      3D Viewer            |
|      (maximale Flaeche)   |
|                           |
|                           |
+---------------------------+  <-- nur bei aktiver Messung:
| Laenge aktiv   [Undo][OK]|  <-- Mess-Toolbar
+---------------------------+
| [Messen] [Export] [Massen]|  <-- Bottom-Bar
+---------------------------+

Beim Tippen auf "Messen":
+---------------------------+
|      3D Viewer            |
+---------------------------+
| Messwerkzeuge             |  <-- Mess-Panel (scrollbar)
| [Laenge] [Hoehe] [Fl.]   |
| [Solar] [Dachelemente]    |
+---------------------------+
| Laenge aktiv   [Undo][OK]|  <-- Mess-Toolbar (falls aktiv)
+---------------------------+
| [Messen] [Export] [Massen]|
+---------------------------+

Beim Tippen auf "Massen":
+---------------------------+
| Massen              [X]  |  <-- Vollbild-Overlay
|---------------------------|
| Dachflaeche 1             |
|   Typ: Flaeche            |
|   45.23 m2                |
|                           |
| Firstlaenge               |
|   Typ: Laenge              |
|   12.50 m                 |
|                           |
| ...                       |
+---------------------------+

Beim Tippen auf "Export":
+---------------------------+
| Export               [X]  |  <-- Vollbild-Overlay
|---------------------------|
| [GLB Export]              |
| [Dachplan]                |
| [CSV Export]              |
| [ABS-Export (Test)]       |
| [PDF Export]              |
+---------------------------+
```

## Desktop-Verhalten

Keine Aenderung. Die Desktop-Sidebar (rechts, 20rem breit) bleibt komplett wie bisher mit allen Tabs (Werkzeuge + Messungen inkl. Export).

## Technische Details

### Bedingungs-Logik

- `useBottomSheet = isPortrait && (isPhone || isTablet)` -- identisch zum bestehenden Hook
- Bottom-Bar sichtbar: `useBottomSheet && enabled`
- Mess-Toolbar sichtbar: `useBottomSheet && enabled && activeMode !== 'none'`
- Mess-Panel: `useBottomSheet && enabled && isMobileMeasurePanelOpen`
- Massen-Overlay: `useBottomSheet && enabled && isMobileMassesOpen`
- Export-Overlay: `useBottomSheet && enabled && isMobileExportOpen`

### Z-Index-Hierarchie

- Bottom-Bar: z-40
- Mess-Toolbar: z-40 (ueber der Bottom-Bar positioniert)
- Mess-Panel: z-30 (zwischen 3D-Viewer und Bottom-Bar)
- Vollbild-Overlays (Massen, Export): z-50 (ueber allem)

### Einheiten-Logik fuer Massen-Overlay

```text
['area','solar','chimney','deductionarea','skylight'].includes(m.type) -> m2
['height','length'].includes(m.type) -> m
Sonst: leer
```

