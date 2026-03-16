

## Schnelleres Laden + PV-Planung mitspeichern

### Problem 1: Langsames Laden
Aktuell werden **zwei sequenzielle API-Calls** gemacht: erst `check` (existiert?), dann nach User-Klick `load`. Jeder Call validiert den WebODM-Token separat (externer HTTP-Request) → doppelte Latenz.

### Problem 2: PV-Daten unvollständig gespeichert
Die `pvModuleInfo` wird zwar teilweise serialisiert, aber einige wichtige Felder fehlen: `roofType`, `flatRoofLayout`, `tiltAngle`, `rowSpacing`, `flatRoofEdgeDistance`, `ewPairGap`, `northAngle`, `maintenancePathWidth`, `pvMaterials`, `roofAzimuth`, `roofDirection`, `roofInclination`, `yieldFactor`. Ohne diese kann die PV-Belegung nicht vollständig wiederhergestellt werden.

### Lösung

**1. Auto-Load beschleunigen (`useAutoLoadMeasurements.ts`)**
- Statt `check` + `load` als zwei separate Calls: direkt `load` aufrufen. Wenn nichts gefunden → nichts anzeigen. Wenn gefunden → sofort Toast mit Laden-Option zeigen, Daten sind bereits da.
- Spart einen kompletten Roundtrip (inkl. WebODM-Token-Validierung).

**2. Vollständige PV-Serialisierung (`measurementStorage.ts`)**
- In `serializeMeasurements`: alle fehlenden `pvModuleInfo`-Felder mitserialisieren (roofType, flatRoofLayout, tiltAngle, rowSpacing, flatRoofEdgeDistance, ewPairGap, northAngle, maintenancePathWidth, pvMaterials, roofAzimuth, roofDirection, roofInclination, yieldFactor, moduleVisuals, points).
- Statt einzelne Felder aufzulisten, einfach `...m.pvModuleInfo` verwenden (alle Felder sind JSON-serialisierbar).

### Betroffene Dateien
- `src/hooks/useAutoLoadMeasurements.ts` — von check+load auf single-load umstellen
- `src/utils/measurementStorage.ts` — pvModuleInfo vollständig serialisieren

