
# PV-Anlage verschieben & drehen im 3D-Viewer

## Überblick
Die PV-Modulanlage soll direkt im 3D-Viewer per Drag verschoben und per Rotation-Handle gedreht werden können. Die Rotation erfolgt um den Mittelpunkt des Modul-Grids.

## Datenmodell-Erweiterung

### `PVModuleInfo` (src/types/measurements.ts)
Neue Felder:
```typescript
gridOffsetU?: number;    // Verschiebung entlang der Hauptachse (v1) in Metern
gridOffsetW?: number;    // Verschiebung entlang der Nebenachse (v2) in Metern
gridRotation?: number;   // Rotation in Grad um den Grid-Mittelpunkt
```

## Änderungen

### 1. Type-Erweiterung (`src/types/measurements.ts`)
- `gridOffsetU`, `gridOffsetW`, `gridRotation` zu `PVModuleInfo` hinzufügen

### 2. Grid-Generierung (`src/utils/pvCalculations.ts` → `generatePVModuleGrid`)
- Nach Berechnung der Module-Positionen im 2D-Raum (u/w), vor der Projektion nach 3D:
  1. Grid-Mittelpunkt berechnen (Durchschnitt aller Modul-Zentren)
  2. Rotation um diesen Mittelpunkt anwenden (cos/sin Transform)
  3. Offset (gridOffsetU, gridOffsetW) addieren
- Module die nach Transform außerhalb des Dachpolygons liegen werden weiterhin gefiltert

### 3. Interaktions-Modus (`src/hooks/usePVGridInteraction.ts` – NEU)
Neuer Hook der PV-Grid Drag & Rotate handhabt:

**Drag (Verschieben):**
- Klick auf ein PV-Modul → Grid wird "ausgewählt" (visueller Highlight)
- Drag → Raycaster berechnet Intersection mit Dachfläche → Delta in u/w-Koordinaten → `gridOffsetU/W` aktualisieren
- Modul-Grid wird in Echtzeit neu gerendert

**Rotate (Drehen):**
- Wenn Grid ausgewählt: Ein Rotations-Handle (kleiner Kreis/Pfeil) am Rand des Grids
- Drag am Handle → Winkel zum Grid-Mittelpunkt berechnen → `gridRotation` aktualisieren
- Alternative: Zwei-Finger-Geste auf Touch-Geräten

**State-Management:**
- `selectedPVGridId: string | null` – aktuell ausgewählte Solarfläche
- `isDraggingPVGrid: boolean`
- `isRotatingPVGrid: boolean`
- Bei Änderung: `updateMeasurement()` mit neuen gridOffset/Rotation-Werten aufrufen

### 4. Visuelle Handles (`src/utils/measurementVisuals.ts`)
- Wenn ein PV-Grid ausgewählt ist:
  - Blaue Umrandung um das gesamte Grid
  - Rotations-Handle (kleiner Kreis) an einer Ecke des Grids
  - Move-Cursor beim Hovern über Module

### 5. Integration in bestehende Measurement-Events
- `useMeasurementEvents.ts` oder `useMeasurementInteraction.ts`: 
  - PV-Grid Klick-Erkennung (userData.isPVModule → Grid auswählen)
  - Drag-Events weiterleiten an `usePVGridInteraction`
  - ESC oder Klick außerhalb → Grid deselektieren

## Implementierungsreihenfolge
1. Type-Erweiterung (PVModuleInfo)
2. generatePVModuleGrid mit Offset/Rotation
3. usePVGridInteraction Hook
4. Visuelle Handles
5. Integration in Event-System

## Technische Details
- Die Transformation passiert im 2D u/w-Koordinatensystem (vor der 3D-Projektion), damit die Module korrekt auf der Dachfläche bleiben
- Rotation: Standard 2D-Rotation `u' = cos(θ)*(u-cu) - sin(θ)*(w-cw) + cu`, `w' = sin(θ)*(u-cu) + cos(θ)*(w-cw) + cw`
- Module die nach Transform außerhalb liegen werden automatisch ausgeblendet (bestehende Polygon-Clipping-Logik)
