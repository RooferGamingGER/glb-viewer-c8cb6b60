

## Problem

PV-Module werden bei komplexen Gebäuden vom Dach-Mesh überdeckt (z-fighting/Okklusion). Das liegt daran, dass die Module zwar einen kleinen Offset von 2cm + 2.5cm Dicke haben, aber `depthWrite: false` gesetzt ist und der `renderOrder` nur 5 beträgt. Bei komplexen Geometrien reicht das nicht aus.

## Lösung

Zwei Anpassungen in `src/utils/measurementVisuals.ts`:

1. **`OFFSET_DISTANCE` erhöhen** – von `0.02` auf `0.05` (5cm statt 2cm über der Dachfläche), damit die Module sicher über dem Mesh liegen
2. **`renderOrder` erhöhen** – von `5` auf `10`, um sicherzustellen, dass Module nach dem Dach-Mesh gerendert werden
3. **`polygonOffsetFactor` für PV-Module verstärken** – eigene, stärkere Werte (`-10, -10`) statt der allgemeinen `DEPTH_SETTINGS` (`-4, -4`), damit die Module bei der Tiefenberechnung bevorzugt werden
4. **`depthWrite: true`** für das Modul-Material setzen, damit Module sich korrekt gegen das Dach durchsetzen

### Betroffene Datei
- `src/utils/measurementVisuals.ts` (Zeilen 1568-1584, 1603, 1662-1666, 1677)

### Änderungen im Detail

**Zeile 1603**: `OFFSET_DISTANCE` von `0.02` auf `0.05`

**Zeilen 1568-1584**: Eigene PV-Depth-Settings für beide Materialien:
```typescript
polygonOffset: true,
polygonOffsetFactor: -10,
polygonOffsetUnits: -10,
depthTest: true,
depthWrite: true
```

**Zeile 1662-1666**: Gleiches für `sideMaterial`

**Zeile 1677**: `renderOrder` von `5` auf `10`

