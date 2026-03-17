

# Plan: Task-Karten mit Vorschaubildern

## Problem
Die Task-Karten zeigen nur ein Kamera-Platzhalter-Icon statt eines echten Vorschaubilds. Die Funktion `loadThumbnailBlob` existiert bereits und wird in der TaskDetail-Ansicht genutzt — sie muss nur in die `TaskCard`-Komponente integriert werden.

## Ansatz

### 1. Thumbnail-Dateinamen ermitteln
WebODM stellt Thumbnails über `/api/projects/{pid}/tasks/{tid}/images/thumbnail/{filename}` bereit. Wir brauchen einen Dateinamen des ersten Bildes. Zwei Wege:
- **Option A**: `shots.geojson` laden (enthält alle Bildnamen) — aber das ist ein Extra-Request pro Task
- **Option B**: WebODM liefert im Task-Objekt oft ein `orthophoto`-Asset → darüber geht kein Thumbnail

**Gewählter Ansatz**: Beim Laden der Tasks für ein Projekt einmalig `getTaskShots` für jeden abgeschlossenen Task aufrufen, den ersten Dateinamen extrahieren, und dann `loadThumbnailBlob` für das Vorschaubild nutzen. Um die Anzahl der Requests zu begrenzen, wird dies lazy/asynchron pro Karte gemacht.

### 2. TaskCard erweitern
- `TaskCard` bekommt zusätzliche Props: `token: string` (bereits im Parent verfügbar)
- Intern: `useEffect` lädt beim Mount den ersten Shot-Dateinamen via `getTaskShots`, dann das Thumbnail via `loadThumbnailBlob`
- State: `thumbnailUrl: string | null` — wenn vorhanden, wird ein `<img>` statt des Camera-Icons gerendert
- Cleanup: `URL.revokeObjectURL` beim Unmount

### 3. Änderungen

**`src/pages/ServerProjects.tsx`**:
- `TaskCard` Props um `token` erweitern
- Im `TaskCard`: `useEffect` mit `getTaskShots` → erstes Feature → `loadThumbnailBlob` → `setThumbnailUrl`
- Thumbnail-Bereich: `{thumbnailUrl ? <img src={thumbnailUrl} ... /> : <Camera ... />}`
- Token vom Parent durchreichen (Zeile ~308)

Keine neuen Dateien, keine neuen API-Funktionen nötig — alles existiert bereits.

