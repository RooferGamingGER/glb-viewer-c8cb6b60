

# Task-Erstellung und Bild-Upload aus dem WebODM-Projekt übernehmen

## Analyse

Das Projekt [Roofers WebODM neu](/projects/3cdcf850-d4f7-456b-89ca-73c1a0495792) hat einen `CreateTaskDialog` mit:
- Taskname eingeben
- Verarbeitungsknoten (Processing Node) auswählen
- Verarbeitungsprofil (Preset) auswählen
- JPEG-Drohnenbilder per Drag & Drop hochladen (mit Thumbnail-Vorschau)
- Upload-Fortschrittsanzeige via XHR
- Task wird direkt an WebODM gesendet (FormData mit Bildern)

**Problem**: Das aktuelle Projekt nutzt einen Edge-Function-Proxy (`webodm-proxy`), der nur JSON/URL-encoded Bodies weiterleitet. Multipart-FormData mit hunderten MB an Drohnenbildern kann nicht durch den Proxy geschickt werden (Body-Size-Limit).

**Lösung**: Für den Bild-Upload einen separaten Edge-Function-Endpunkt erstellen, der die Bilder einzeln oder in Chunks weiterleitet. Alternativ: Die `createTask`-API von WebODM unterstützt auch das Erstellen ohne Bilder + nachträgliches Hochladen einzelner Bilder — so kann der Proxy pro Bild aufgerufen werden.

## Plan

### 1. WebODM-API erweitern (`src/lib/webodm.ts`)
- `getProcessingNodes(token)` — GET `/api/processingnodes/`
- `getPresets(token)` — GET `/api/presets/`
- `createTask(token, projectId, name, files, options, onProgress, nodeId)` — Zweistufig:
  1. Task ohne Bilder erstellen via Proxy (POST `/api/projects/{id}/tasks/`)
  2. Bilder einzeln via neuen Upload-Proxy hochladen

### 2. Neuer Edge Function: `webodm-upload` 
- Nimmt multipart FormData mit **einem einzelnen Bild** entgegen
- Leitet es als FormData an WebODM weiter (POST `/api/projects/{id}/tasks/{taskId}/upload/`)
- Umgeht das Size-Limit, da pro Bild ~5-15 MB

### 3. `CreateTaskDialog` Komponente
- Aus dem anderen Projekt übernehmen und anpassen:
  - `proxyFetch` statt direktem `fetch` für API-Calls
  - Upload-Logik auf Einzel-Bild-Upload umstellen
  - Processing Node + Preset Dropdowns
  - Thumbnail-Grid mit Vorschau
  - Fortschrittsanzeige (Bild X von Y)

### 4. `ServerProjects.tsx` erweitern
- "Neuer Task" Button in der Tasks-Ansicht
- `CreateTaskDialog` einbinden
- Nach Erstellung Task-Liste neu laden

## Dateien

| Datei | Änderung |
|---|---|
| `supabase/functions/webodm-upload/index.ts` | Neuer Edge Function für Einzel-Bild-Upload |
| `src/lib/webodm.ts` | `getProcessingNodes`, `getPresets`, `createTask` hinzufügen |
| `src/components/CreateTaskDialog.tsx` | Neue Komponente (adaptiert vom anderen Projekt) |
| `src/pages/ServerProjects.tsx` | "Neuer Task" Button + Dialog einbinden |

