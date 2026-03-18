

# Plan: Admin-Dashboard mit Task-Übersicht, Accounts, Nodes und Suche

## Übersicht

Neue Admin-Seite (`/admin`) mit Tabs für: Task-Übersicht (alle Server), Account-Verwaltung, Processing Nodes und einer globalen Suche. Zugang nur für eingeloggte Benutzer.

## 1. Neue API-Funktionen in `src/lib/webodm.ts`

- **`getAdminUsers(token)`** — GET `/api/admin/users/` (WebODM Admin-API für Benutzerliste)
- **`getAllTasks(token)`** — Alle Projekte laden, dann Tasks pro Projekt sammeln → flache Liste mit Projekt-Name/Server-Info angereichert
- Bestehende `getProcessingNodes` wird bereits exportiert

## 2. Neue Seite `src/pages/AdminDashboard.tsx`

Vier Tabs:

### Tab 1: Task-Übersicht
- Lädt Tasks von **allen** verbundenen Servern (iteriert über `sessions`)
- Tabelle mit Spalten: Task-Name, Projekt, Server, Status, Erstellt am, Bilder-Anzahl, Größe
- Sortierbar nach Datum, Status
- Farbige Status-Badges (bestehende `TASK_STATUS`-Map)
- Klick auf Task → Navigation zur TaskDetail-Ansicht in ServerProjects

### Tab 2: Account-Verwaltung
- Ruft `/api/admin/users/` auf (WebODM Admin-Endpoint, nur wenn Berechtigungen vorhanden)
- Zeigt Benutzerliste: Username, E-Mail, aktiv/inaktiv, Erstelldatum
- Falls API 403 zurückgibt: Hinweis "Keine Admin-Berechtigung auf diesem Server"

### Tab 3: Processing Nodes
- Nutzt bestehende `getProcessingNodes()` pro Server
- Zeigt: Hostname, Port, Label, Online-Status (grün/rot Badge)
- Für jeden verbundenen Server separat

### Tab 4: Suche
- Suchfeld das Projekte und Tasks gleichzeitig durchsucht
- Client-seitige Filterung: Lädt alle Projekte + Tasks, filtert nach Name/ID
- Ergebnisse gruppiert nach "Projekte" und "Tasks"
- Klick navigiert zum entsprechenden Projekt/Task

## 3. Navigation / Routing

**`src/App.tsx`**: Neue Route `/admin` → `AdminDashboard`

**`src/pages/ServerProjects.tsx`**: Admin-Button (Shield-Icon) im Header neben Logout, nur sichtbar wenn eingeloggt. Navigiert zu `/admin`.

## 4. Dateien

- **Neu:** `src/pages/AdminDashboard.tsx` — Komplette Admin-Seite mit 4 Tabs
- **Edit:** `src/lib/webodm.ts` — `getAdminUsers()` hinzufügen
- **Edit:** `src/App.tsx` — Route `/admin` hinzufügen
- **Edit:** `src/pages/ServerProjects.tsx` — Admin-Button im Header

## Technische Details

- WebODM Admin-API (`/api/admin/users/`) ist nur für Superuser zugänglich — bei 403 wird ein freundlicher Hinweis angezeigt statt eines Fehlers
- Task-Übersicht iteriert über alle `sessions` und merged die Ergebnisse mit Server-Label als Spalte
- Suche arbeitet rein client-seitig auf den bereits geladenen Daten
- Gleiche Dark-Theme-Styling wie ServerProjects (Slate/Gray-Palette)

