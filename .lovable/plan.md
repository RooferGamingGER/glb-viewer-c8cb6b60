

# 4 Änderungen: Impressum, Dachfenster-Bug, Rechtsklick, Leertaste

## 1. Impressum & Datenschutz im Footer

**Datei:** `src/pages/Index.tsx` (Zeile 319-322)

Footer erweitern um zwei Links:
- Impressum → `https://drohnenvermessung-roofergaming.de/impressum/`
- Datenschutzerklärung → `https://drohnenvermessung-roofergaming.de/datenschutzerklarung/`

Beide als externe Links mit `target="_blank"`, getrennt durch `·`.

## 2. Dachfenster PDF-Export: Zweites Maß = 0,00 m

**Ursache:** Dachfenster-Dimensionen werden als `{ width, length }` gespeichert (in `useMeasurementCore.ts`), aber der PDF-Export und `exportUtils.ts` lesen `dimensions.height` statt `dimensions.length`.

**Fix in 3 Dateien:**
- **`src/utils/exportUtils.ts`** (Zeile 82): `measurement.dimensions.height` → `measurement.dimensions.height || measurement.dimensions.length` (Fallback auf `length`)
- **`src/utils/pdfExport.ts`** (Zeile 2648): Gleicher Fallback bei `dimensions?.height`
- **`src/components/measurement/ExportPdfButton.tsx`** (Zeile 163): Prüfung erweitern auf `!dimensions.height && !dimensions.length`

## 3. Rechtsklick im Viewer deaktivieren

**Datei:** `src/hooks/useMeasurementEvents.ts` (Zeile 541-575)

Im `useEffect` wo die Event-Listener registriert werden, einen `contextmenu`-Handler auf dem Canvas hinzufügen:
```
canvasElement.addEventListener('contextmenu', (e) => e.preventDefault());
```

## 4. Leertaste gedrückt = Modell drehen statt Punkt setzen

**Datei:** `src/hooks/useMeasurementEvents.ts`

- Neuen `useRef<boolean>` für `spaceHeldRef` anlegen
- `keydown`/`keyup`-Listener auf `window` registrieren (im gleichen `useEffect`): Bei Space `spaceHeldRef.current = true/false`
- In `handleMouseDown` und `processInteraction`: Wenn `spaceHeldRef.current === true`, sofort `return` ohne Punkt zu setzen → OrbitControls übernimmt die Mausinteraktion automatisch

