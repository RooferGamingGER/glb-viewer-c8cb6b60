

# Undo für Punkt-Löschung im 3D-Viewer

## Konzept

Ein Undo-Stack speichert gelöschte Punkte (inkl. Messung-ID, Index und den alten Measurement-Snapshot). Nach dem Löschen erscheint ein Toast mit "Rückgängig"-Button (wie bei Gmail). Zusätzlich funktioniert `Strg+Z` als Tastenkürzel.

## Änderungen

### `src/hooks/useMeasurementEditing.ts`

- Neuen `useRef<Array<{ measurementId, pointIndex, previousMeasurement }>>` als `undoStackRef` anlegen
- In `deletePoint`: Vor dem Splice den aktuellen Measurement-Zustand im Stack speichern
- Neue Funktion `undoDeletePoint`: Letzten Eintrag vom Stack poppen und die gespeicherte Messung wiederherstellen
- Beides exportieren

### `src/hooks/useMeasurements.ts`

- `undoDeletePoint` aus `useMeasurementEditing` durchreichen

### `src/hooks/useMeasurementEvents.ts`

- `undoDeletePoint` in die `handlers`-Schnittstelle aufnehmen
- Bei jedem `deletePoint`-Aufruf (Rechtsklick + Delete-Taste): Toast mit `action`-Button "Rückgängig" anzeigen, der `undoDeletePoint` aufruft
- `Strg+Z` / `Cmd+Z` Tastenkürzel im `keydown`-Listener: ruft `undoDeletePoint` auf

### `src/hooks/useMeasurementInteraction.ts`

- `undoDeletePoint` durchreichen an `useMeasurementEvents`

### `src/components/MeasurementTools.tsx`

- `undoDeletePoint` aus Context/Props durchreichen

