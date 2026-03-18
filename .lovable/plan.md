

# Plan: GPS-Validierung vor Task-Upload

## Konzept

Nach dem GPS-Extrahieren (Schritt `extracting_gps`) wird eine Validierung durchgeführt, bevor die Boundary-Karte gezeigt wird. Zwei Prüfungen:

1. **Fehlende GPS-Daten**: Bilder ohne GPS-Koordinaten werden identifiziert
2. **Ausreißer-Erkennung**: Bilder, deren GPS-Position weit vom Median der Aufnahmen entfernt liegt (z.B. >500m), werden als verdächtig markiert

Falls Probleme gefunden werden, wird ein neuer Zwischenschritt `gps_review` angezeigt, der die Ergebnisse zusammenfasst und dem Nutzer ermöglicht, problematische Bilder einzeln oder gesammelt zu entfernen.

## Dateien

### `src/utils/exifGps.ts` — Neue Funktion `validateGpsData`

- Berechnet den Median-Punkt aller GPS-Koordinaten
- Berechnet die Entfernung jedes Fotos zum Median (Haversine)
- Gibt zurück: `{ noGps: File[], outliers: { file, latitude, longitude, distanceMeters }[], valid: PhotoGps[] }`
- Schwellenwert: 500m vom Median = Ausreißer

### `src/components/CreateTaskDialog.tsx` — Neuer Schritt `gps_review`

- Neuer `DialogStep`: `"gps_review"` zwischen `extracting_gps` und `boundary`
- Nach GPS-Extraktion: `validateGpsData` aufrufen
- Wenn keine Probleme: direkt zu `boundary` weiter
- Wenn Probleme gefunden:
  - Warnung mit Anzahl der Bilder ohne GPS
  - Liste der Ausreißer mit Dateiname und Entfernung
  - Besonderer Hinweis wenn die ersten 2 Aufnahmen betroffen sind (häufiges DJI-Problem)
  - Buttons: "Markierte entfernen" (entfernt problematische Bilder aus `files` und `gpsPhotos`) und "Trotzdem fortfahren"
  - "Zurück" Button zum Config-Schritt

### Visuelles Design

- Gelbe/orange Warnkarte mit `AlertTriangle`-Icon
- Auflistung der problematischen Dateien mit Entfernungsangabe
- Klarer Hinweistext: "Bilder ohne GPS-Daten oder mit abweichenden Positionen können zu Verarbeitungsfehlern führen"
- Spezialhinweis bei ersten Aufnahmen: "Die ersten Aufnahmen einer Drohnenflug-Session haben häufig fehlerhafte GPS-Daten"

