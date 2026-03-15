

# Fix: PV-Module per Klick visuell entfernen

## Root Cause

`renderPVModuleGrid` (measurementVisuals.ts:1530) calls `generatePVModuleGrid` which recalculates the entire module grid from scratch using rows/cols/spacing — it never checks `moduleCorners` or `modulePositions`. So even though `useMeasurementCore` correctly removes a module from `moduleCorners`/`modulePositions`, the visual re-render regenerates all modules again.

## Fix

**Track removed module indices in `pvModuleInfo`** and skip them during grid generation.

### `src/types/measurements.ts`
- Add `removedModuleIndices?: number[]` to `PVModuleInfo`

### `src/hooks/useMeasurementCore.ts`
- Instead of filtering `moduleCorners`/`modulePositions` (which breaks index mapping), **add the clicked moduleIndex to `removedModuleIndices`** array
- Keep `moduleCount` decremented as before

### `src/utils/pvCalculations.ts` — `generatePVModuleGrid()`
- After computing each module's grid position, check if its sequential index is in `pvInfo.removedModuleIndices`
- If yes, skip adding it to `modulePoints` and `gridLines`

### `src/utils/measurementVisuals.ts` — `renderPVModuleGrid()`
- No changes needed — it already iterates `modulePoints` from `generatePVModuleGrid`

## Files

| File | Change |
|---|---|
| `src/types/measurements.ts` | Add `removedModuleIndices` to PVModuleInfo |
| `src/hooks/useMeasurementCore.ts` | Track removed indices instead of filtering arrays |
| `src/utils/pvCalculations.ts` | Skip removed indices in generatePVModuleGrid |

