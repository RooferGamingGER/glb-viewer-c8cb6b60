
# Occlusion-korrektes Rendering: depthTest aktivieren mit polygonOffset

## Problem
Mit `depthTest: false` sind alle Messungen, Labels und PV-Module immer sichtbar — auch durch das Modell hindurch (X-Ray). Das ist unnatürlich.

## Warum der erste Versuch scheiterte
`polygonOffset` mit `-2/-2` war zu schwach. Außerdem hatten die Y-Offsets (`POINT_Y_OFFSET = 0.01`, `LINE_Y_OFFSET = 0.025`) nicht ausgereicht, um die Geometrie zuverlässig von der Dachfläche abzuheben.

## Neuer Ansatz: Stärkere Offsets + höhere Y-Anhebung

### 1. `src/utils/measurementVisuals.ts` — Alle Materialien
Überall `depthTest: false` → `depthTest: true` ändern, plus `polygonOffset`:

**Punkte (Spheres):**
```typescript
depthTest: true,
polygonOffset: true,
polygonOffsetFactor: -4,
polygonOffsetUnits: -4
```
`renderOrder = 10`

**Linien:**
```typescript
depthTest: true,
polygonOffset: true,
polygonOffsetFactor: -4,
polygonOffsetUnits: -4
```
`renderOrder = 10`

**Flächen-Fills (Area, Solar):**
```typescript
depthTest: true,
polygonOffset: true,
polygonOffsetFactor: -4,
polygonOffsetUnits: -4
```
`renderOrder = 5`

**PV-Module:**
```typescript
depthTest: true,
polygonOffset: true,
polygonOffsetFactor: -4,
polygonOffsetUnits: -4
```
`renderOrder = 5`

### 2. Y-Offsets erhöhen
Die bestehenden Offsets sind zu klein für zuverlässige Sichtbarkeit auf Dachflächen:
```typescript
const POINT_Y_OFFSET = 0.03;   // war 0.01
const LINE_Y_OFFSET = 0.04;    // war 0.025
const LABEL_Y_OFFSET = 0.20;   // war 0.15
const PV_LINE_Y_OFFSET = 0.05; // war 0.03
```

PV-Modul `OFFSET_DISTANCE`: `0.01` → `0.03`

### 3. `src/utils/textSprite.ts` — Labels
```typescript
depthTest: true,  // war false
depthWrite: false  // bleibt
```
`renderOrder = 20` (bleibt)

### 4. Snapping-Indikatoren (`PointSnappingContext.tsx`, `useAddPointIndicators.ts`)
Hier `depthTest: false` belassen — diese temporären Hilfsanzeigen sollen immer sichtbar sein.

### Zusammenfassung
~30 Stellen in `measurementVisuals.ts` ändern (jedes `depthTest: false` → `true` + `polygonOffset` hinzufügen), Y-Offsets vergrößern, und in `textSprite.ts` `depthTest: true` setzen. Snapping-Indikatoren bleiben bei `depthTest: false`.
