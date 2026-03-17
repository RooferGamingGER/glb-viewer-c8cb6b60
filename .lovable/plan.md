

# Fix: Sonne auf der falschen Seite

## Problem

Die Azimut-zu-3D-Vektor-Umrechnung in `solarPositionToVector3()` hat die Ost-West-Richtung invertiert. In Deutschland steht die Sonne mittags im **Süden** (Azimut ~180°), aber der Lichtvektor zeigt in die entgegengesetzte Richtung.

## Ursache

In `src/utils/sunPosition.ts` Zeile 89-91 bestimmt die Bedingung `Math.sin(lha) > 0`, ob der Azimut gespiegelt wird. Diese Bedingung ist für unsere LHA-Konvention invertiert — Vormittags-Azimute landen im Westen und umgekehrt.

## Lösung

**Datei: `src/utils/sunPosition.ts`**

1. **Azimut-Spiegelung korrigieren** (Zeile 89): Bedingung von `> 0` auf `< 0` ändern:
   ```typescript
   if (Math.sin(lha) < 0) {
     azimuth = 360 - azimuth;
   }
   ```

Das dreht die gesamte Sonnenbahn um 180° auf die korrekte Seite — Mittags Süden, Morgens Osten, Abends Westen.

