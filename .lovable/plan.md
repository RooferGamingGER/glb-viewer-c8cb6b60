

# Server-Login & GLB-Import von drohnenvermessung-server.de

## Uebersicht

Integration des WebODM-Servers (drohnenvermessung-server.de) in den GLB-Viewer. Benutzer melden sich mit ihren WebODM-Zugangsdaten an, sehen ihre Projekte und Tasks, und koennen GLB-Dateien direkt in den Viewer laden -- ohne manuellen Download.

## Problem: CORS

Der WebODM-Server erlaubt keine Cross-Origin-Requests von fremden Domains. Daher muessen alle API-Aufrufe ueber eine Edge Function als Proxy laufen.

## Architektur

```text
Browser (drohnenglb.de)
  |
  |-- POST /webodm-proxy  (Edge Function)
  |     |
  |     |-- drohnenvermessung-server.de/api/token-auth/
  |     |-- drohnenvermessung-server.de/api/projects/
  |     |-- drohnenvermessung-server.de/api/projects/:id/tasks/
  |     |-- drohnenvermessung-server.de/api/projects/:id/tasks/:id/download/textured_model.glb
  |     |
  |     +-- Response zurueck an Browser
  |
  +-- Blob URL --> Viewer-Seite (/viewer)
```

## Aenderungen

### 1. Edge Function: `supabase/functions/webodm-proxy/index.ts`

Ein generischer Proxy, der Requests an drohnenvermessung-server.de weiterleitet:
- Empfaengt `{ path, method, body, token }` als JSON POST
- Fuer GLB-Downloads: streamt die Binaerdaten zurueck als `application/octet-stream`
- Fuer API-Calls: leitet JSON weiter
- Setzt CORS-Header fuer die eigene Domain

### 2. Lib: `src/lib/webodm.ts`

Portiert aus dem anderen Projekt, angepasst auf Edge-Function-Proxy statt direkte Aufrufe:
- `authenticate(username, password)` → Token zurueck
- `getProjects(token)` → Projektliste
- `getProjectTasks(token, projectId)` → Task-Liste
- `downloadGlbAsBlob(token, projectId, taskId, asset)` → Blob URL
- Typen: `Project`, `Task`, Status-Konstanten

### 3. Auth-Context: `src/lib/auth-context.tsx`

Einfacher React-Context (wie im Referenzprojekt):
- Token + Username in `sessionStorage`
- `login()`, `logout()`, `isAuthenticated`
- Kein Supabase-Auth -- rein WebODM JWT

### 4. Login-Seite: `src/pages/ServerLogin.tsx`

- Username + Passwort Formular
- Ruft `authenticate()` auf
- Bei Erfolg: Weiterleitung zu `/server-projects`

### 5. Projekt-Browser: `src/pages/ServerProjects.tsx`

Drei Ansichten in einer Seite (wie Dashboard im Referenzprojekt):
- **Projekte**: Karten mit Name, Datum, Anzahl Tasks
- **Tasks** (nach Projekt-Klick): Karten mit Status, Bildanzahl, Datum
- **Task-Detail**: Zeigt verfuegbare Assets, GLB-Import-Button

Der GLB-Import-Button:
1. Laedt die GLB-Datei ueber den Proxy als Blob
2. Erstellt eine Blob-URL
3. Navigiert zu `/viewer?fileUrl=blob:...&fileName=...&rotateModel=true`

### 6. Routing: `src/App.tsx`

Neue Routen:
- `/server-login` → ServerLogin
- `/server-projects` → ServerProjects (geschuetzt: redirect zu /server-login wenn kein Token)

AuthProvider um die Router-Komponente wrappen.

### 7. Index-Seite: `src/pages/Index.tsx`

Neuer Button/Link "Vom Server laden" neben dem bestehenden Upload-Bereich, der zu `/server-login` navigiert.

## Ablauf fuer den Benutzer

1. Startseite → "Vom Server laden" klicken
2. Login mit WebODM-Zugangsdaten
3. Projekte werden angezeigt → Projekt anklicken
4. Tasks werden angezeigt → Task anklicken
5. GLB-Datei sichtbar → "Im Viewer oeffnen" klicken
6. GLB wird heruntergeladen (mit Fortschrittsanzeige)
7. Viewer oeffnet sich mit dem Modell -- alle Messwerkzeuge verfuegbar

## Sicherheit

- WebODM-Token wird nur in sessionStorage gehalten (nicht persistent)
- Token wird nie an den Browser-Client exponiert ausserhalb des Auth-Context
- Edge Function leitet nur an drohnenvermessung-server.de weiter (kein offener Proxy)

