

## Fix: Azimut ist 180° invertiert

### Ursache
`fitPlane()` erzwingt `normal.y > 0` (Zeile 173). Dadurch zeigt die Horizontalprojektion der Normalen **bergauf** (weg von der Dachneigung), nicht **bergab** (Richtung in die das Dach "schaut").

Für ein Süd-Dach: Normale zeigt nach oben+nord → Horizontalprojektion = Nord → Azimut ≈ 0° (N) statt ≈ 180° (S).

### Fix (1 Zeile)
In `calculateRoofOrientation()` in `src/utils/pvCalculations.ts`, die Horizontalkomponenten **negieren** um von "uphill" auf "downhill/facing" umzurechnen:

```typescript
// Zeile 1075-1076 ändern von:
const hx = normal.x;
const hz = normal.z;

// zu:
const hx = -normal.x;
const hz = -normal.z;
```

Das ist alles. Die Rotation um `northAngle`, die `atan2`-Berechnung und die Himmelsrichtungs-Zuordnung bleiben unverändert korrekt — sie arbeiten nur jetzt mit dem richtigen Vektor (Gefällerichtung statt Steigungsrichtung).

### Auswirkung
- Süd-Dach → zeigt jetzt S (~180°) statt N (~0°)
- Alle anderen Richtungen ebenfalls korrekt invertiert
- Ertragsfaktor-Berechnung stimmt dann auch (Süd = höchster Ertrag)
- `placeModule` South-Tilt bleibt korrekt (nutzt eigenen Süd-Vektor aus `northAngle`)

