

# Plan: Task-Löschung, verbesserte Fortschrittsanzeige und Fehlerhilfe

## 1. Task löschen (wenn WebODM-Berechtigung vorhanden)

**`src/lib/webodm.ts`**: Neue Funktion `deleteTask(token, projectId, taskId)` hinzufügen — DELETE-Request via `proxyFetch` an `/api/projects/{projectId}/tasks/{taskId}/remove/`.

**`src/pages/ServerProjects.tsx`**:
- In `TaskDetail`: Lösch-Button (Trash-Icon, destructive variant) mit Bestätigungsdialog ("Task unwiderruflich löschen?")
- Nach erfolgreichem Löschen: Toast + zurück zur Task-Liste + Tasks neu laden
- Button nur anzeigen, wenn Task nicht gerade verarbeitet wird (`status !== 20`)

## 2. Verbesserte Fortschrittsanzeige (TaskCard + TaskDetail)

**`src/lib/webodm.ts`**: `getProcessingStage` erweitern — Rückgabe als Objekt `{ label, stepNumber, totalSteps, estimatedMinutes }` statt nur String. Die 11 Stufen werden nummeriert (z.B. "Schritt 3 von 11"), mit grober Zeitschätzung pro Phase.

**`src/pages/ServerProjects.tsx`**:
- **TaskCard**: Unter dem Fortschrittsbalken zusätzlich Schritt-Info anzeigen: "Schritt 3/11 · ca. 5 Min."
- **TaskDetail** (status === 20): Statt der simplen Spinner-Karte eine detailliertere Ansicht mit:
  - Fortschrittsbalken mit Prozent
  - Aktueller Schritt-Name und Nummer
  - Geschätzte Restdauer
  - Visuelle Schritt-Indikatoren (kleine Punkte/Badges für alle 11 Schritte)

## 3. Fehlgeschlagene Tasks: Erklärung und Support-Kontakt

**`src/pages/ServerProjects.tsx`** — `TaskDetail` bei `status === 30`:
- Statt nur `last_error` eine strukturierte Fehlerkarte anzeigen mit:
  - **Häufige Ursachen** (Accordion oder Liste):
    - Zu wenige Bilder
    - Fehlerhafte GPS-Daten, insbesondere bei den ersten Aufnahmen
    - Hinweis: "Fehlerhafte oder fehlende GPS-Daten erkennen Sie daran, dass anstelle eines Straßennamens lediglich ein Aufgabenname angezeigt wird. Starten Sie das Projekt in diesem Fall ohne die ersten beiden Aufnahmen."
  - **Support-Kontakt**: Server-abhängige E-Mail-Adresse (`info@drohnenvermessung-roofergaming.de` bzw. `info@drohnenvermessung-digitab.de`) — wird anhand von `activeServer` aus `SERVERS` abgeleitet
  - **Fotos-Upload-Angebot**: Text mit Angebot, Fotos zur Prüfung bereitzustellen:
    - Download-Link senden oder
    - HiDrive Share nutzen (Link zu `https://share.hidrive.com/upload?lang=de`, kostenlos bis 2 GB)
  - Die technische Fehlermeldung (`last_error`) wird weiterhin klein darunter angezeigt

### Server → E-Mail Mapping
- `drohnenvermessung-server.de` → `info@drohnenvermessung-roofergaming.de`
- `drohnenvermessung-digitab.de` → `info@drohnenvermessung-digitab.de`

Dies wird als einfaches Mapping in `ServerProjects.tsx` oder `auth-context.tsx` definiert (z.B. als Erweiterung der `SERVERS`-Konstante mit einem `supportEmail`-Feld).

## Dateien
- **`src/lib/webodm.ts`**: `deleteTask` + `getProcessingStage` erweitern
- **`src/lib/auth-context.tsx`**: `SERVERS` um `supportEmail` erweitern
- **`src/pages/ServerProjects.tsx`**: Lösch-Button, verbesserte Fortschrittsanzeige, Fehler-Hilfskarte

