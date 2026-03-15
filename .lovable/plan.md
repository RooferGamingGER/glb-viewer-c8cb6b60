

# Fix: Sichtbarkeit zurückgesetzt, PV-Module durchsichtig, Bearbeitung bei aktivem Zeichentool

## 3 Probleme identifiziert

### Problem 1: Messungen werden nach Ausblenden wieder eingeblendet
In `useMeasurementInteraction.ts` (Zeile 140-179) gibt es einen `useEffect` der bei jeder Änderung von `enabled` oder `measurements` alle PV-Module durchgeht und deren Material-Properties überschreibt — inklusive `side: THREE.DoubleSide`. Zusätzlich überschreibt `useMeasurementVisibility.ts` bei `updateMeasurementMarkers()` ebenfalls Material-Properties und setzt `DoubleSide`. Diese Funktionen werden bei vielen State-Änderungen getriggert und setzen die Sichtbarkeit effektiv zurück.

**Fix**: Den `useEffect` in `useMeasurementInteraction.ts` (Zeile 140-179) entfernen — er überschreibt die korrekt gesetzten Visibility-States. In `useMeasurementVisibility.ts` die Material-Überschreibungen in `updateMeasurementMarkers` auf reine Sichtbarkeits-Toggles reduzieren (kein Material-Reset mehr).

### Problem 2: PV-Module von der anderen Seite sichtbar
Obwohl `pvModuleRenderer.ts` bereits `FrontSide` nutzt, setzen mehrere Stellen das Material zurück auf `DoubleSide`:
- `useMeasurementInteraction.ts` Zeile 164: `module.material.side = THREE.DoubleSide`
- `useMeasurementVisibility.ts` Zeilen 123, 148, 171, 190: `material.side = THREE.DoubleSide`
- `measurementVisuals.ts` Zeile 1307: Solar-Fill mit `DoubleSide`

**Fix**: Alle `DoubleSide`-Zuweisungen für PV/Solar-Meshes auf `FrontSide` ändern. Die Area-Fill-Meshes für reguläre Flächen können `DoubleSide` behalten, aber Solar/PV-spezifische müssen `FrontSide` sein.

### Problem 3: Bearbeitung anderer Flächen bei aktivem Zeichentool
In `useMeasurementEvents.ts` prüft `processInteraction` bei Klicks auf Messpunkte (Zeile 229-260) und Edit-Punkte (Zeile 172-197) NICHT ob gerade ein Zeichentool aktiv ist (`activeMode !== 'none'`). Dadurch kann ein Klick auf einen bestehenden Punkt den Edit-Modus einer anderen Messung aktivieren, obwohl der User eigentlich einen neuen Punkt setzen will.

**Fix**: Die Blöcke für Edit-Point-Interaktion und Measurement-Point-Klicks nur ausführen wenn `activeMode === 'none'` (kein Zeichentool aktiv). Wenn ein Tool aktiv ist, sollen Klicks immer als neue Punkte interpretiert werden.

## Dateien

| Datei | Änderung |
|---|---|
| `src/hooks/useMeasurementInteraction.ts` | `useEffect` für PV-Module (Z.140-179) entfernen |
| `src/hooks/useMeasurementVisibility.ts` | Material-Resets in `updateMeasurementMarkers` entfernen, nur `visible` toggeln |
| `src/hooks/useMeasurementEvents.ts` | Edit-Point + Measurement-Point Klick-Blöcke nur bei `activeMode === 'none'` ausführen |
| `src/utils/measurementVisuals.ts` | Solar-Fill `DoubleSide` → `FrontSide` (Zeile 1307) |

