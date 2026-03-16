

## Messungen als JSON pro Benutzer speichern & laden

### Konzept
Jeder WebODM-Benutzer (identifiziert durch `username` aus dem Auth-Context) kann seine Messungen als JSON in einer Supabase-Tabelle speichern – verknüpft mit `projectId` und `taskId`. Pro Benutzer max. 100 Einträge; älteste können gelöscht werden.

**Wichtig:** Da die App WebODM-Auth nutzt (Token + Username in sessionStorage), nicht Supabase Auth, verwenden wir eine DB-Tabelle mit `username`-Spalte statt Supabase Storage mit RLS. Zugriff wird über eine Edge Function gesichert, die den WebODM-Token validiert.

### Änderungen

#### 1. DB-Tabelle `saved_measurements` (Migration)
```sql
CREATE TABLE public.saved_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL,
  project_id integer NOT NULL,
  task_id text NOT NULL,
  task_name text,
  project_name text,
  measurements jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(username, project_id, task_id)
);
ALTER TABLE public.saved_measurements ENABLE ROW LEVEL SECURITY;
-- Kein RLS-Select für anon, Zugriff nur über Edge Function (service_role)
```

#### 2. Edge Function `measurement-storage` (NEU)
Endpunkt mit Aktionen: `save`, `load`, `delete`, `list`
- Validiert den WebODM-Token über einen Proxy-Call an den WebODM-Server
- Filtert immer nach `username` → Benutzer sieht nur eigene Daten
- Bei `save`: Prüft ob Benutzer bereits 100 Einträge hat → Fehler mit Liste der vorhandenen
- Upsert bei gleichem `username + project_id + task_id`

#### 3. Client-Utility `src/utils/measurementStorage.ts` (NEU)
- `saveMeasurements(token, username, projectId, taskId, measurements, taskName?, projectName?)` → ruft Edge Function auf
- `loadMeasurements(token, username, projectId, taskId)` → gibt `Measurement[]` zurück oder `null`
- `listSavedMeasurements(token, username)` → Liste aller gespeicherten Einträge
- `deleteSavedMeasurements(token, username, projectId, taskId)` → löscht Eintrag

#### 4. UI: Speichern-Button in MeasurementOverlay/Sidebar
- Button "Messungen speichern" (Wolken-Icon) – nur sichtbar wenn `projectId` und `taskId` in URL vorhanden
- Bei Klick: Messungen serialisieren und über Edge Function speichern
- Toast bei Erfolg/Fehler/Limit erreicht

#### 5. UI: Laden beim Viewer-Start
- Wenn Viewer mit `projectId` und `taskId` geöffnet wird: automatisch prüfen ob gespeicherte Messungen existieren
- Falls ja: Toast mit "Gespeicherte Messungen gefunden" + Button "Laden" oder automatischer Import

#### 6. UI: Verwaltung gespeicherter Messungen
- In ServerProjects: kleines Badge/Icon an Tasks die gespeicherte Messungen haben
- Dialog/Liste zum Verwalten (Löschen) gespeicherter Messungen wenn Limit erreicht

#### 7. URL-Parameter erweitern
- `openGlbInViewer` in ServerProjects übergibt `projectId` und `taskId` als zusätzliche URL-Parameter:
  ```
  /viewer?fileUrl=...&fileName=...&rotateModel=true&projectId=123&taskId=abc-def
  ```

### Datenformat (JSONB-Inhalt)
```json
{
  "version": 1,
  "measurements": [
    {
      "id": "...", "type": "area", "label": "Dachfläche 1",
      "points": [{"x":0,"y":0,"z":0}],
      "value": 12.5, "color": "#ff0000",
      "segments": [...], "pvModuleInfo": {...}
    }
  ]
}
```

### Sicherheitskonzept
- Edge Function nutzt `service_role` Key für DB-Zugriff
- WebODM-Token wird bei jedem Request validiert (Proxy-Call zu `/api/users/current/`)
- `username` wird serverseitig aus der Token-Validierung extrahiert, nicht vom Client übernommen
- Benutzer kann nur eigene Einträge lesen/löschen (WHERE username = validierter_username)

### Implementierungsreihenfolge
1. DB-Migration (Tabelle)
2. Edge Function `measurement-storage`
3. Client-Utility `measurementStorage.ts`
4. URL-Parameter in `openGlbInViewer` erweitern
5. Speichern-Button in Measurement-UI
6. Auto-Load im Viewer
7. Verwaltungs-UI für Löschung

