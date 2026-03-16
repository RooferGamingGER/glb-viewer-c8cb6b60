

## Zuschneiden (Boundary) beim Task-Erstellen

### Was WebODM macht
WebODM liest die GPS-Koordinaten aus den EXIF-Daten der Drohnenbilder, zeigt diese auf einer Karte an und lässt den Benutzer ein Polygon zeichnen, das den Verarbeitungsbereich eingrenzt. Dieses Polygon wird als `boundary`-Option (GeoJSON-String) an die Task-Erstellung übergeben.

### Umsetzung

#### 1. Neue Abhängigkeiten
- **exifr** – schnelles EXIF-Parsing (GPS-Koordinaten aus JPEG extrahieren)
- **leaflet** + **react-leaflet** – Kartenkomponente
- **leaflet-draw** + **react-leaflet-draw** – Polygon-Zeichenwerkzeug auf der Karte

#### 2. GPS-Extraktion aus Bildern
Nach dem Auswählen der Bilder werden im Hintergrund die GPS-Koordinaten via `exifr.gps()` aus den EXIF-Daten gelesen. Bilder ohne GPS werden ignoriert (für die Kartenansicht).

#### 3. Neuer Zwischenschritt im CreateTaskDialog
Der Dialog bekommt nach der Bildauswahl einen **zweiten Schritt** (vor dem Upload):
- Karte mit OpenStreetMap-Tiles
- Blaue Marker für jede Fotoposition (wie im Screenshot)
- Karte zoomt automatisch auf die Foto-Positionen
- Zeichenwerkzeug: Benutzer kann ein Polygon zeichnen, das den Bereich eingrenzt
- Optional: "Kein Zuschnitt" → nur `auto-boundary` verwenden
- Button "Weiter" → zum Upload

#### 4. Boundary als Task-Option übergeben
Das gezeichnete Polygon wird als GeoJSON-String in die Task-Optionen eingefügt:
```
{ name: "boundary", value: '{"type":"Polygon","coordinates":[...]}' }
```
Falls kein Polygon gezeichnet wurde, bleibt `auto-boundary: true` aktiv (wie bisher).

#### 5. Anpassung CreateTaskDialog
Der Dialog wird von einem Ein-Schritt-Flow zu einem Zwei-Schritt-Flow:
- **Schritt 1**: Bilder auswählen, Name, Knoten, Profil (wie bisher)
- **Schritt 2**: Kartenansicht mit Foto-Positionen und optionalem Zuschnitt
- **Schritt 3**: Upload läuft

#### Technische Details

**GPS-Extraktion** (neue Utility `src/utils/exifGps.ts`):
```text
Für jedes Bild → exifr.gps(file) → { latitude, longitude } oder null
Parallel mit Promise.allSettled für Performance
```

**Kartenkomponente** (neue Komponente `src/components/TaskBoundaryMap.tsx`):
```text
├── react-leaflet MapContainer
├── TileLayer (OpenStreetMap)
├── CircleMarker für jede Foto-Position
├── FeatureGroup + EditControl (leaflet-draw) für Polygon
└── fitBounds auf alle Foto-Positionen
```

**Dialog-Flow**:
```text
idle → [Bilder gewählt] → extracting_gps → map_view → uploading → done
```

