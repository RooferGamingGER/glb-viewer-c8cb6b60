

# Plan: Fix PV Module Count & 2D Orientation in PDF

## Bug 1: Module Count Mismatch (Doppelte Subtraktion)

**Root Cause**: When a module is removed (`pvModuleRemoved` event in `useMeasurementCore.ts` line 165), `moduleCount` is decremented by 1 AND the index is added to `removedModuleIndices`. After removing 2 modules from a 15-module grid: `moduleCount = 13`, `removedModuleIndices.length = 2`.

The PDF rendering then double-subtracts:
- `renderSolarLayout2D` line 391: `activeModules = moduleCount - removedModuleIndices.length = 13 - 2 = 11` (wrong)
- `pdfExport.ts` line 2137: `totalKWp = moduleCount * power / 1000` uses 13 (correct)

So the plan header says "11 Module" while the info card says "13". The drawing also skips modules incorrectly because the `removedIndices` set filters them out, but `moduleCount` is already reduced.

**Fix**: Everywhere that calculates active module count, use `moduleCount` directly — it already represents the active count. Remove the subtraction of `removedModuleIndices.length`.

### Files to change:
- **`src/utils/renderPolygon2D.ts` line 391**: Change `activeModules` to just use `pvInfo.moduleCount`
- **`src/utils/pdfExport.ts`**: Audit all occurrences where `moduleCount - removedModuleIndices.length` is used and fix to use `moduleCount` directly

## Bug 2: 2D Drawing Orientation (Traufe nicht unten)

**Root Cause**: `projectPointsTo2D` creates a 2D coordinate system from the first two polygon points as X-axis. This is arbitrary — it depends on which point the user drew first. The Y-flip `(maxY - point.y)` flips the projected Y, not the 3D world Y. So the eave can end up anywhere.

**Fix**: After projecting to 2D, rotate the entire 2D point set so that the eave edge (lowest 3D Y points) maps to the bottom of the canvas. The approach:

1. Identify the eave: the polygon edge with the lowest average 3D Y-coordinate
2. After 2D projection, find the corresponding 2D edge
3. Calculate the rotation needed to place that edge horizontally at the bottom
4. Apply rotation to all projected points (polygon + module corners)

### Implementation in `renderPolygon2D.ts`:

Create a new function `projectPointsTo2DWithEaveDown(points: Point[])` that:
1. Calls existing projection to get raw 2D coordinates
2. Finds the eave edge (lowest avg Y in 3D)
3. Calculates the angle of that edge in 2D space
4. Rotates all points so the eave edge becomes horizontal
5. Re-normalizes to 0–1 range with the eave at the bottom

Update `renderSolarLayout2D` to use this new projection for both the roof polygon and module corners, ensuring consistent orientation.

### Summary of changes:
1. **`src/utils/renderPolygon2D.ts`**: Add eave-oriented projection function; use it in `renderSolarLayout2D` and `renderPolygon2D`
2. **`src/utils/renderPolygon2D.ts` line 391**: Fix `activeModules` calculation
3. **`src/utils/pdfExport.ts`**: Fix all `moduleCount` calculations to not double-subtract removals

