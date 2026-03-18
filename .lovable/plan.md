

# Plan: GLB-Upload als Task-Karte in der Task-Übersicht

## Änderung in `src/pages/ServerProjects.tsx`

In der Task-Grid (Zeile 306) eine zusätzliche Upload-Karte einfügen, die wie eine TaskCard aussieht aber als GLB-Upload dient:

1. **Upload-Karte im Grid** — Nach den bestehenden TaskCards eine Karte mit Upload-Icon, Titel "GLB hochladen" und kurzem Hinweistext einfügen. Gestrichelte Border wie ein Drop-Target.

2. **Verstecktes File-Input** — `<input type="file" accept=".glb">` im Component, getriggert beim Klick auf die Karte.

3. **Validierung** — GLB Magic Bytes + Max 100MB (Logik analog zu `FileUpload.tsx`).

4. **Navigation** — Nach Auswahl: `URL.createObjectURL(file)` → `navigate('/viewer?fileUrl=...&fileName=...&rotateModel=true')`. Datei wird nur temporär im Browser gehalten.

Die Karte erscheint als letztes Element im Task-Grid und hat das gleiche Karten-Layout wie die bestehenden TaskCards (gleiche Höhe, ähnliches Styling), aber mit gestrichelter Border und Upload-Icon als visueller Unterscheidung.

### Dateien
- **`src/pages/ServerProjects.tsx`**: Upload-Karte + File-Input + Validierung + Navigation hinzufügen (Import von `Upload` Icon bereits vorhanden, `useRef` für Input)

