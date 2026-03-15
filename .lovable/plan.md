

# Server-Projekt-Browser: Fehlerbehebung und Erweiterung

## Probleme

1. **GLB-Fehler**: Der "Im Viewer oeffnen"-Button wird angezeigt obwohl `findGlbAsset` ein Asset findet, das auf dem Server gar nicht als GLB existiert (z.B. ein ZIP das `.glb` enthaelt). Der Blob-URL wird erstellt, aber beim Laden im Viewer schlaegt der Fetch fehl ("Failed to fetch" auf blob: URL).

2. **Fehlende Asset-Downloads**: Aktuell werden nur GLB-Dateien angeboten. Der Benutzer moechte alle verfuegbaren Assets sehen und herunterladen koennen.

3. **Keine Drohnenbilder-Vorschau**: Die Aufnahmen eines Tasks sind nicht sichtbar.

## Loesung

### 1. GLB-Validierung und Fehlerbehandlung

**`src/lib/webodm.ts`:**
- `findGlbAsset()` bleibt, aber `downloadGlbAsBlob()` wird robuster: Pruefen ob die Response tatsaechlich binary/GLB ist (Content-Type oder Groesse > 0), sonst Fehler werfen
- Neue Funktion `getDownloadableAssets(assets)`: Filtert `available_assets` und gibt nur erlaubte Dateien zurueck. Blacklist: `report.pdf`, `all.zip`

**`src/pages/ServerProjects.tsx`:**
- "Im Viewer oeffnen" Button nur wenn `findGlbAsset()` ein Ergebnis liefert UND Task-Status === 40 (abgeschlossen)
- Bessere Fehlermeldung wenn Download fehlschlaegt

### 2. Asset-Liste mit Download-Buttons

**`src/pages/ServerProjects.tsx` -- TaskList erweitern:**
- Unter jedem Task eine Liste der verfuegbaren Assets anzeigen (gefiltert, ohne `report.pdf` und `all.zip`)
- Jedes Asset bekommt einen Download-Button der die Datei ueber den Proxy laedt und als Browser-Download anbietet
- Asset-Typen mit passenden Icons (GLB = 3D-Box, Orthofoto = Bild, Punktwolke = Dots, etc.)

**`src/lib/webodm.ts` -- Neue Funktionen:**
- `downloadAssetAsFile(token, projectId, taskId, asset)`: Laedt Asset ueber Proxy und triggert Browser-Download via temporaerem `<a>` Element
- `EXCLUDED_ASSETS = ['report.pdf', 'all.zip']` -- Blacklist-Konstante
- `getFilteredAssets(assets)`: Gibt alle Assets zurueck ausser die auf der Blacklist

### 3. Drohnenbilder-Vorschau und Download

**WebODM API-Endpunkte fuer Bilder:**
- `GET /api/projects/{id}/tasks/{id}/images/` -- Liste aller Bilder mit Thumbnails
- Bild-URLs koennen direkt als `<img src>` genutzt werden (ueber Proxy)

**`src/lib/webodm.ts` -- Neue Funktionen:**
- `getTaskImages(token, projectId, taskId)`: Ruft die Bilderliste ab
- `getImageThumbnailUrl(projectId, taskId, imageFilename)`: Baut den Proxy-Pfad fuer Thumbnails

**`src/pages/ServerProjects.tsx` -- Neuer Bereich "Drohnenaufnahmen":**
- Klappbarer Bereich unter den Assets
- Zeigt Bilder als Thumbnail-Grid (via Proxy geladen)
- Jedes Bild: Vorschau-Thumbnail + Download-Button fuer das Originalbild
- Lazy-Loading der Thumbnails (nur laden wenn Bereich geoeffnet)

**`supabase/functions/webodm-proxy/index.ts`:**
- Erweitern um auch `/api/projects/.../images/` Pfade und Thumbnail-Pfade (die als GET mit Query-Parametern kommen) korrekt weiterzuleiten
- Bild-Responses als Binary zurueckgeben (aehnlich wie Downloads)

### 4. Erweiterte Task-Ansicht (neues Layout)

```text
┌─────────────────────────────────────────────┐
│ ✓ Task-Name                                 │
│   Abgeschlossen • 45 Bilder • 1.2 GB       │
│                                              │
│   [Im Viewer oeffnen]  (nur wenn GLB da)    │
│                                              │
│   ▸ Verfuegbare Dateien (3)                 │
│     textured_model.glb     [⬇ Download]     │
│     orthophoto.tif         [⬇ Download]     │
│     georeferenced_model.laz [⬇ Download]    │
│                                              │
│   ▸ Drohnenaufnahmen (45)                   │
│     [thumb] [thumb] [thumb] [thumb] ...     │
│     [thumb] [thumb] [thumb] [thumb] ...     │
└─────────────────────────────────────────────┘
```

## Dateien die geaendert werden

| Datei | Aenderung |
|-------|-----------|
| `src/lib/webodm.ts` | Neue Funktionen: `getFilteredAssets`, `downloadAssetAsFile`, `getTaskImages`, Blacklist-Konstante |
| `src/pages/ServerProjects.tsx` | TaskList komplett ueberarbeitet: Asset-Liste, Drohnenbilder-Grid, bessere GLB-Validierung |
| `supabase/functions/webodm-proxy/index.ts` | Erweitern fuer Bild-/Thumbnail-Proxy (Binary-Responses fuer nicht-download Pfade die Bilder liefern) |

