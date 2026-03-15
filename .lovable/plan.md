

# Fix: Messungen sichtbar halten ohne X-Ray-Effekt

## Das Problem
Klassisches 3D-Dilemma: `depthTest: false` → alles schimmert durch (X-Ray). `depthTest: true` → Messungen werden vom Dach verdeckt, auf dem sie liegen. Beides ist falsch.

## Lösung: `polygonOffset` + `renderOrder`

Die richtige Technik für Geometrie die auf einer Oberfläche liegt (Decals/Overlays):

1. **`depthTest: true`** beibehalten — so wird Geometrie hinter dem Modell korrekt verdeckt
2. **`polygonOffset: true`** mit negativen Werten — verschiebt den Depth-Wert leicht nach vorne, sodass koplanare Geometrie (Linien/Punkte auf der Dachfläche) nicht vom Dach selbst verdeckt wird
3. **`renderOrder`** erhöhen — stellt sicher dass Messungen nach dem Modell gerendert werden

Dies löst beide Seiten: Messungen auf der sichtbaren Dachfläche bleiben sichtbar, aber Messungen auf der Rückseite des Modells werden korrekt verdeckt.

## Änderungen

### `src/utils/measurementVisuals.ts`
Alle Materialien für Punkte, Linien, Flächen-Fills und Dachelemente erweitern:
```typescript
// Beispiel für Punkt-Material
const sphereMaterial = new THREE.MeshBasicMaterial({ 
  color: pointColor,
  depthTest: true,
  polygonOffset: true,
  polygonOffsetFactor: -2,
  polygonOffsetUnits: -2
});
sphere.renderOrder = 10;

// Beispiel für Linien-Material  
const lineMaterial = new THREE.LineBasicMaterial({
  color: COLORS.CYAN,
  linewidth: 3,
  depthTest: true,
  polygonOffset: true,
  polygonOffsetFactor: -2,
  polygonOffsetUnits: -2
});
line.renderOrder = 10;
```

Betrifft ca. 20 Material-Stellen (Punkte, Linien, gestrichelte Linien, Hit-Areas, Flächen-Fills, Dachelemente).

PV-Module haben bereits `polygonOffset` — deren Werte auf `-2` angleichen (aktuell `-4`).

### `src/utils/textSprite.ts`
Labels brauchen kein `polygonOffset` (Sprites haben keine Polygon-Fläche), aber `renderOrder` erhöhen:
```typescript
sprite.renderOrder = 20; // Höher als Linien/Punkte
```

### Zusammenfassung der Werte
| Element | depthTest | polygonOffset | Factor/Units | renderOrder |
|---|---|---|---|---|
| Punkte (Spheres) | true | true | -2 / -2 | 10 |
| Linien | true | true | -2 / -2 | 10 |
| Flächen-Fills | true | true | -2 / -2 | 5 |
| PV-Module | true | true | -2 / -2 | 5 |
| Labels (Sprites) | true | — | — | 20 |

