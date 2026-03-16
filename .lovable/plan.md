

## Problem

Das System nimmt an, dass `+Z = Süd` in Three.js ist. Aber Photogrammetrie-Modelle aus WebODM/OpenDroneMap sind in UTM-Koordinaten, wo `+Y = Nord`. Nach der -90° X-Rotation wird das originale `+Y (Nord)` zu `+Z` — aber der Code behandelt `+Z` als Süd. Das ist **invertiert**, und bei Modellen ohne garantierte Nordausrichtung komplett unzuverlässig.

## Lösungsansatz: Kombination aus Auto-Erkennung + manuellem Kompass

### 1. Nordrichtungs-Offset (`northAngle`)
Ein neues Feld `northAngle` (in Grad) das angibt, in welche Richtung Norden im Modell-Koordinatensystem zeigt. Standard: 0° = `+Z ist Nord` (korrekt für UTM-Modelle nach -90° X-Rotation).

### 2. Auto-Erkennung für WebODM-Modelle
Wenn das Modell über WebODM geladen wird (projectId/taskId vorhanden), setzen wir `northAngle = 0°` automatisch, da ODM-Modelle in UTM georeferenziert sind und +Y = Nord.

### 3. Manueller Kompass-Regler
Ein Rotations-Slider (0°-360°) im Solar-Panel, mit dem der User die Nordrichtung korrigieren kann. Visuell als Kompass-Rose dargestellt.

### Technische Änderungen

**`src/types/measurements.ts` + `measurements.d.ts`**
- Neues Feld in `PVModuleInfo`: `northAngle?: number` (Grad, 0 = +Z ist Nord)

**`src/utils/pvCalculations.ts`**
- `calculateRoofOrientation()`: Nimmt `northAngle` als Parameter, rotiert die Normalprojektion entsprechend vor der Azimut-Berechnung
- `placeModule()` South-Logik: Nutzt `northAngle` um den korrekten Süd-Vektor zu berechnen statt hardcoded `{x:0, z:1}`
- Fix: Standard `northAngle = 0` bedeutet +Z = Nord (nicht Süd wie bisher angenommen)

**`src/components/measurement/SolarMeasurementContent.tsx`**
- Neuer Kompass-Slider (0°-360°) im Solar-Bereich
- Label: "Nordrichtung im Modell"
- Bei Änderung: Neuberechnung der Dachausrichtung + Modul-Neigungsrichtung
- Auto-Erkennung-Hinweis wenn WebODM-Modell

### Ablauf
1. Modell wird geladen → `northAngle` wird auf 0° gesetzt (Standard für UTM)
2. Azimut-Berechnung nutzt `northAngle` um den echten Süd-Vektor zu bestimmen
3. `placeModule` south-Tilt nutzt den rotierten Süd-Vektor
4. User kann per Slider korrigieren falls die Ausrichtung nicht stimmt
5. E-W bleibt grid-relativ (braucht keinen Kompass)

