

# Fix: "Keine Daten zum Teilen vorhanden"

## Ursache

`getShareParams` in `Viewer.tsx` liest den Token aus `sessionStorage.getItem('webodm_token')` — diesen Key gibt es aber nicht. Der Token wird als Teil des `webodm_sessions`-Arrays gespeichert und ist nur über den `useWebODMAuth()`-Context verfügbar.

Da `token` und `server` beide `null` sind, gibt `getShareParams()` sofort `null` zurück → "Keine Daten zum Teilen vorhanden".

## Lösung

In `Viewer.tsx` den Token und Server aus dem bereits vorhandenen Auth-Context (`useWebODMAuth`) beziehen statt aus `sessionStorage`:

**`src/pages/Viewer.tsx`** — `getShareParams` ändern:
- `token` und `activeServer` aus dem Auth-Context verwenden (der Hook `useWebODMAuth` wird bereits in der Datei importiert/verwendet oder muss hinzugefügt werden)
- `sessionStorage.getItem('webodm_token')` → `token` aus Context
- `sessionStorage.getItem('webodm_active_server')` → `activeServer` aus Context  
- `sessionStorage.getItem('webodm_username')` → `username` aus Context
- Die `useCallback`-Dependencies entsprechend aktualisieren

