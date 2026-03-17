

# Plan: Realistischere Schatten + Navigation-Fix

## 1. Realistischere Schatten (Gebäudehöhen & Sonnenhöhe)

Die aktuelle Shadow-Camera-Konfiguration verwendet ein einheitliches Frustum basierend auf der Bounding-Box, berücksichtigt aber nicht die Sonnenhöhe für die Schattenlänge. Das Three.js `DirectionalLight` mit Orthographic Shadow Camera projiziert Schatten korrekt entlang der Lichtrichtung — die Sonnenhöhe beeinflusst also bereits die Schattenrichtung und -länge geometrisch korrekt.

**Was fehlt:**
- **Shadow-Bias zu hoch** → Schatten „schweben" über dem Boden, Details gehen verloren
- **Shadow-Camera Frustum nicht an Sonnenhöhe angepasst** → Bei flachem Sonnenstand (morgens/abends) werden die langen Schatten abgeschnitten, weil `cam.far` zu klein ist
- **Shadow-Map-Auflösung** → Bei großem Frustum wird die Resolution pro Pixel schlecht

### Änderungen in `src/components/viewer/SunLight.tsx`:

**`configureShadowCamera`** anpassen:
- Frustum dynamisch an Sonnenelevation anpassen: bei flachem Stand (< 20°) das Frustum vergrößern (Faktor ~1.5-2x), damit lange Schatten nicht abgeschnitten werden
- `cam.far` auf `maxDim * 8` erhöhen für flache Winkel
- `shadow.bias` auf `-0.001` reduzieren für schärfere Kontaktschatten
- `shadow.normalBias` auf `0.02` reduzieren
- Shadow-Map-Size auf Desktop erhöhen: `Math.min(4096, maxSize)` statt 2048

**Neue Prop `elevation: number`** an `SunLight` übergeben (aus `useSunSimulation`), damit die Shadow-Camera die Sonnenhöhe berücksichtigen kann.

### Änderungen in `src/hooks/useSunSimulation.ts` und `src/components/ModelViewer.tsx`:
- `elevation` aus dem Hook exponieren und als Prop an `SunLight` weiterreichen

---

## 2. Navigation: Zurück-Button im Viewer → Task statt Startseite

Aktuell navigiert der Zurück-Button im Viewer immer zu `/`. Wenn der User aus einem WebODM-Task kommt, soll er zurück zur Task-Detailansicht gelangen.

### Änderungen in `src/pages/Viewer.tsx`:
- URL-Parameter `projectId`, `taskId`, `projectName` sind bereits vorhanden (werden bei `openGlbInViewer` gesetzt)
- Zurück-Button prüft: wenn `projectId` und `taskId` vorhanden → navigiere zu `/server-projects` mit State `{ returnToTask: { projectId, taskId } }`
- Sonst: navigiere zu `/`

### Neue Route `/server-projects` in `src/App.tsx`:
- Ist bereits vorhanden ✓

### Änderungen in `src/pages/ServerProjects.tsx`:
- `useLocation()` prüfen für `state.returnToTask` → beim Mount direkt zur Task-Detailansicht springen
- Im Header bei `taskDetail`-View: Breadcrumb-artige Navigation anzeigen: `Projekte > Projektname > Taskname`
- `goBack()` funktioniert bereits korrekt (taskDetail → tasks → projects)
- Logout navigiert zur Startseite (bereits implementiert ✓)

### Zusammenfassung der Navigation:
```text
Startseite (/) → Server-Login → Projekte → Tasks → Task-Detail → Viewer
                                                                    ↓
Viewer Zurück-Button → Task-Detail (wenn von Server) oder / (wenn lokale Datei)
```

