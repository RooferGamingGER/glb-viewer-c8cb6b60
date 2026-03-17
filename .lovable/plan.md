

# Fix: Schatten zeigen in die falsche Richtung — Koordinatensystem-Bug

## Ursache

Das Modell wird mit `rotation.x = -π/2` geladen (Z-up → Y-up Konvertierung). Dadurch wird das UTM-Koordinatensystem so transformiert:

```text
UTM (Modell)     →   Three.js (World)
X (Ost)          →   X (Ost)         ✓
Y (Nord)         →   -Z              ← Nord = -Z in World!
Z (Höhe)         →   +Y (oben)       ✓
```

`solarPositionToVector3()` nimmt aber an, dass **+Z = Nord** in World-Space ist. Tatsächlich ist **-Z = Nord**. Dadurch ist der Lichtvektor um 180° gedreht — die Schatten fallen in die exakt falsche Richtung.

## Lösung

**Datei: `src/utils/sunPosition.ts`** — Funktion `solarPositionToVector3()`

Die Z-Komponente negieren, damit die Konvention korrekt auf das rotierte Modell passt:

```typescript
// Vorher (falsch):
const z = Math.cos(azRad) * Math.cos(elevRad);

// Nachher (korrekt):
const z = -Math.cos(azRad) * Math.cos(elevRad);
```

Kommentar aktualisieren:
```text
// Nach -90° X-Rotation: Nord(UTM) = -Z(World)
// Azimuth 0° (Nord) → z negativ (Light aus Norden)
// Azimuth 180° (Süd) → z positiv (Light aus Süden)
```

**Nur diese eine Zeile ändert sich.** Keine anderen Dateien betroffen.

## Validierung

Bei Azimut 180° (Süd), 12:00 Uhr:
- `z = -cos(π) * cos(elev) = +cos(elev)` → Licht bei +Z
- Licht scheint von +Z Richtung Mitte → Schatten fallen nach -Z = **Nord** ✓

Bei Azimut 90° (Ost):
- `x = sin(π/2) * cos(elev) = +cos(elev)` → Licht bei +X (Ost bleibt korrekt)
- Schatten fallen nach -X = **West** ✓

