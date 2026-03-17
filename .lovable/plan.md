

# Analyse: GLB-Speicherung beim Teilen

## Das Problem

GLB-Dateien von Drohnenvermessungen sind typischerweise **50–500 MB** groß. Jeder Share würde eine Kopie im Storage erzeugen → Speicherverbrauch explodiert schnell.

## Bessere Alternativen

### Option A: Proxy-Ansatz (kein Storage nötig) ✅ Empfohlen

Statt das GLB zu kopieren, erstellt die Edge Function einen **Proxy-Endpunkt**, der das Modell on-demand vom WebODM-Server streamt:

```text
Empfänger öffnet Link → Edge Function → holt GLB live vom WebODM-Server → streamt an Browser
```

- **0 MB** zusätzlicher Speicher
- Share-Token in DB speichert nur: WebODM-URL, Credentials (verschlüsselt), Measurements
- Nachteil: WebODM-Server muss online sein, etwas langsamer beim ersten Laden

### Option B: Temporärer signierter URL

- GLB wird **nicht** kopiert, stattdessen generiert die Edge Function einen signierten/temporären Download-Link direkt zum WebODM-Server
- Ähnlich wie Option A, aber der Browser lädt direkt vom WebODM
- Nachteil: WebODM-Authentifizierung müsste öffentlich exponiert werden → Sicherheitsrisiko

### Option C: Storage mit automatischem Cleanup

- GLB wird in Storage gespeichert, aber mit **TTL von 7 Tagen** automatisch gelöscht
- Cron-Job oder DB-Trigger räumt abgelaufene Dateien auf
- Nachteil: Immer noch temporär hoher Speicherverbrauch

## Empfehlung: Option A (Proxy)

**Tabelle `shared_views`:**
- `share_token`, `webodm_server_url`, `webodm_token`, `project_id`, `task_id`, `measurements` (JSONB), `file_name`, `created_at`, `expires_at`

**Edge Function `share-view`:**
- `create`: Speichert WebODM-Zugangsinfos + Measurements in DB, gibt Share-Token zurück
- `get`: Gibt Measurements + Metadaten zurück
- `model`: Proxy-Endpunkt der das GLB vom WebODM-Server streamt und an den Browser weitergibt

**Frontend:**
- Share-Link: `/viewer?share=TOKEN`
- Viewer erkennt Share-Modus → lädt Measurements aus DB, GLB über Proxy-Edge-Function
- Read-Only Modus, kein Login nötig

**Vorteile:**
- **0 MB** zusätzlicher Storage
- Funktioniert solange der WebODM-Server erreichbar ist
- Einfach zu implementieren, kein Cleanup nötig
- Share kann mit Ablaufdatum versehen werden

**Dateien:**

| Datei | Änderung |
|---|---|
| DB Migration | `shared_views` Tabelle |
| `supabase/functions/share-view/index.ts` | Neue Edge Function (create/get/model-proxy) |
| `supabase/config.toml` | Function registrieren |
| `src/utils/shareView.ts` | Client-Hilfsfunktionen |
| `src/components/measurement/ShareDialog.tsx` | Share-Dialog UI |
| `src/pages/Viewer.tsx` | Share-Button + Share-Token-Erkennung |

