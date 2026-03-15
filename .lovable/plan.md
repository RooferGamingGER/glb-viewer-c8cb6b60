
Ziel: Drei Themen sauber beheben: (1) Labels dauerhaft ein-/ausblendbar inkl. korrektem Icon-Status, (2) Labels und PV-Module nicht mehr „durch das Modell“ sichtbar, (3) neues PV-Modul-PNG für die Modulfläche verwenden.

1) Befund (Root Causes)
- Das eigentliche aktive UI nutzt `src/components/MeasurementTools.tsx` (nicht die gleichnamige Datei im Unterordner `components/measurement`).
- In `src/hooks/useMeasurementVisibilityToggle.ts` sind `toggleLabelVisibility` und `toggleAllLabelsVisibility` aktuell absichtlich No-Op („deprecated“). Dadurch ändert sich weder Zustand noch Icon zuverlässig.
- In `src/utils/measurementVisuals.ts` wird am Ende die Label-Sichtbarkeit ohne `measurement.labelVisible` gesetzt (`measurement.visible` only). Dadurch kommen ausgeblendete Labels bei Re-Render sofort wieder.
- Labels sind als Sprite mit `depthTest: false` gebaut (`src/utils/textSprite.ts`) und erscheinen deshalb immer durch Geometrie.
- PV-Module im Grid (`renderPVModuleGrid` in `measurementVisuals.ts`) nutzen mehrere Materialien mit `depthTest: false`, daher ebenfalls X-Ray-Effekt.
- Das aktuelle PV-Grid rendert farbige Panels ohne Texture-Map; das gewünschte neue PNG wird dort nicht verwendet.

2) Umsetzungsplan
A. Label-Visibility wieder echt stateful machen
- Datei: `src/hooks/useMeasurementVisibilityToggle.ts`
  - `toggleLabelVisibility(id)` wieder implementieren: `measurement.labelVisible` toggeln.
  - `toggleAllLabelsVisibility()` wieder implementieren:
    - `newVisibility = !allLabelsVisible`
    - `setAllLabelsVisible(newVisibility)`
    - bei allen Messungen `labelVisible = newVisibility` setzen
  - Bei Einzel-Toggle `allLabelsVisible` aus Messungen ableiten (z. B. `every(labelVisible !== false)`), damit das globale Icon korrekt mitläuft.

B. Re-Render darf Label-Status nicht überschreiben
- Datei: `src/utils/measurementVisuals.ts`
  - In der finalen `updateLabelVisibility(...)`-Logik `measurement.labelVisible !== false` berücksichtigen.
  - Gleiches Prinzip für Segment-Labels.
  - Damit bleibt „ausgeblendet“ auch nach jedem internen Update stabil.

C. Labels hinter Modell korrekt verdecken
- Datei: `src/utils/textSprite.ts`
  - `SpriteMaterial.depthTest` von `false` auf `true`.
  - `depthWrite: false` belassen/setzen (stabile Transparenz).
- Optional feinjustieren (falls nötig nach Test): `renderOrder` für Labels reduzieren, falls weiterhin visuelle Sonderfälle auftreten.

D. PV-Module hinter Modell korrekt verdecken
- Datei: `src/utils/measurementVisuals.ts` (Bereich `renderPVModuleGrid`)
  - PV-spezifische Materialien (`moduleMaterial`, Grid-/Boundary-/Cell-Lines) auf `depthTest: true` umstellen.
  - `side: THREE.FrontSide` beibehalten.
  - So bleiben Module/Modul-Linien an der Rückseite bzw. durch Dachflächen nicht mehr sichtbar.

E. Neues PNG für PV-Module verwenden
- Asset übernehmen:
  - `user-uploads://moduli_standard-2.png` nach `src/assets/` kopieren (z. B. `moduli_standard-2.png` oder bestehendes `moduli_standard.png` ersetzen).
- Datei: `src/utils/measurementVisuals.ts`
  - Modul-Panel-Material auf Textur umstellen (`map`), statt reinem Farbpanel.
  - Für das aktuelle `BufferGeometry` UV-Koordinaten ergänzen, damit das PNG korrekt auf jedem Modul liegt.
  - Bestehende Zell-/Rahmenlinien können als Overlay bleiben (optional reduzierbar).
- Datei: `src/utils/pvModuleRenderer.ts`
  - Import ggf. auf dasselbe neue Asset harmonisieren, damit beide Renderpfade konsistent sind.

3) Dateien mit Änderungen
- `src/hooks/useMeasurementVisibilityToggle.ts`
- `src/utils/measurementVisuals.ts`
- `src/utils/textSprite.ts`
- `src/utils/pvModuleRenderer.ts` (Konsistenz der Texture-Quelle)
- `src/assets/...` (neues Modul-PNG)

4) Abnahme (kurz, konkret)
- Labels global ausblenden → Icon wechselt auf „einblenden“, Labels bleiben aus auch nach Drehen/Neu-Render.
- Labels wieder einblenden → Icon wechselt zurück, Labels kommen zuverlässig wieder.
- Modell drehen (auch starke Perspektiven) → Labels und PV-Module nicht mehr durch Dach/GLB sichtbar.
- Solarfläche mit PV-Grid prüfen → Module zeigen das neue PNG korrekt (Ausrichtung/Skalierung pro Modul stimmig).
