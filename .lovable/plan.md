

## Plan: Dual-Server-Integration & Fremdanbieter-Upload entfernen

### Was sich ändert

1. **Fremdanbieter-Option entfernen** – Der Switch "RooferGaming / Fremdanbieter" in `FileUpload.tsx` wird entfernt. Das Modell wird immer als RooferGaming-Modell behandelt (`rotateModel=true`). Eturnity-Konvertierung bleibt erhalten.

2. **Zwei Server unterstützen** – Login versucht automatisch beide Server parallel. Normaler Kunde hat Zugriff auf einen, RooferGaming auf beide.

3. **Server-Umschalter** – In `ServerProjects.tsx` erscheint bei Dual-Access ein Tab/Dropdown zum Wechseln zwischen den Servern.

### Dateien & Änderungen

| Datei | Änderung |
|---|---|
| **`src/components/FileUpload.tsx`** | Switch (RooferGaming/Fremdanbieter) entfernen, `rotateModel` ist immer `true`. Eturnity-Button bleibt. |
| **`src/pages/Index.tsx`** | Hinweistext zu Fremdanbieter entfernen |
| **`src/lib/auth-context.tsx`** | Multi-Session-Support: `sessions: { server: string; token: string; username: string }[]`, `activeServer` State, `getActiveToken()` Helper |
| **`src/lib/webodm.ts`** | `proxyFetch` erhält optionalen `server`-Parameter, der im Request-Body mitgeschickt wird |
| **`src/pages/ServerLogin.tsx`** | Parallel-Login gegen beide Server (`Promise.allSettled`). Erfolgreiche Logins werden als Sessions gespeichert. Logintext anpassen (nicht mehr nur einen Server nennen) |
| **`src/pages/ServerProjects.tsx`** | Server-Tabs bei Dual-Access anzeigen, aktiven Server umschalten |
| **`supabase/functions/webodm-proxy/index.ts`** | `server`-Feld aus Request-Body lesen, gegen Allowlist validieren (`drohnenvermessung-server.de`, `drohnenvermessung-digitab.de`), dynamisch als Base-URL nutzen |
| **`supabase/functions/webodm-upload/index.ts`** | Gleiche Änderung: `x-webodm-server` Header lesen & validieren |

### Login-Flow

```text
User gibt Credentials ein
        │
        ▼
Parallel-Login: Server 1 + Server 2
        │
        ▼
┌─────────────────────────┐
│ Erfolg auf 1 Server?    │──► Single-Session, direkt weiter
│ Erfolg auf 2 Servern?   │──► Dual-Session, Server-Auswahl
│ Kein Erfolg?            │──► Fehlermeldung
└─────────────────────────┘
```

### Edge Function Allowlist

```typescript
const ALLOWED_SERVERS = [
  "https://drohnenvermessung-server.de",
  "https://drohnenvermessung-digitab.de",
];
// server aus Request lesen, validieren, als Base-URL nutzen
```

