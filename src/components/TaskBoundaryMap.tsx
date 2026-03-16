import { useEffect, useRef, useState, useCallback } from "react";
import type { PhotoGps } from "@/utils/exifGps";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet-draw";

interface Props {
  photos: PhotoGps[];
  onBoundaryChange: (geojson: string | null) => void;
}

export default function TaskBoundaryMap({ photos, onBoundaryChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const drawnRef = useRef<L.FeatureGroup | null>(null);
  const [ready, setReady] = useState(false);

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: false,
    }).setView([51.16, 10.45], 6);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 22,
    }).addTo(map);

    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    drawnRef.current = drawnItems;

    const drawControl = new (L.Control as any).Draw({
      position: "topright",
      draw: {
        polygon: {
          allowIntersection: false,
          shapeOptions: { color: "#3b82f6", weight: 2, fillOpacity: 0.1 },
        },
        polyline: false,
        rectangle: {
          shapeOptions: { color: "#3b82f6", weight: 2, fillOpacity: 0.1 },
        },
        circle: false,
        circlemarker: false,
        marker: false,
      },
      edit: {
        featureGroup: drawnItems,
        remove: true,
      },
    });
    map.addControl(drawControl);

    map.on(L.Draw.Event.CREATED, (e: any) => {
      drawnItems.clearLayers();
      drawnItems.addLayer(e.layer);
    });

    map.on(L.Draw.Event.DELETED, () => {
      // handled in the interval below
    });

    mapRef.current = map;
    setReady(true);

    return () => {
      map.remove();
      mapRef.current = null;
      drawnRef.current = null;
    };
  }, []);

  // Add photo markers & fit bounds
  useEffect(() => {
    if (!ready || !mapRef.current || photos.length === 0) return;

    const map = mapRef.current;
    const markers: L.CircleMarker[] = [];

    photos.forEach((p) => {
      const m = L.circleMarker([p.latitude, p.longitude], {
        radius: 5,
        color: "#3b82f6",
        fillColor: "#3b82f6",
        fillOpacity: 0.7,
        weight: 1,
      }).addTo(map);
      markers.push(m);
    });

    const bounds = L.latLngBounds(photos.map((p) => [p.latitude, p.longitude]));
    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 18 });

    return () => {
      markers.forEach((m) => map.removeLayer(m));
    };
  }, [ready, photos]);

  // Sync drawn polygon to parent
  useEffect(() => {
    if (!ready || !drawnRef.current) return;

    const interval = setInterval(() => {
      const layers = drawnRef.current!.getLayers();
      if (layers.length === 0) {
        onBoundaryChange(null);
        return;
      }

      const layer = layers[0] as any;
      if (layer.toGeoJSON) {
        const geojson = layer.toGeoJSON().geometry;
        onBoundaryChange(JSON.stringify(geojson));
      }
    }, 500);

    return () => clearInterval(interval);
  }, [ready, onBoundaryChange]);

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className="w-full rounded-lg border border-border overflow-hidden"
        style={{ height: 320 }}
      />
      <p className="text-xs text-muted-foreground">
        Zeichne ein Polygon oder Rechteck, um den Verarbeitungsbereich einzugrenzen. Ohne Zeichnung wird der gesamte Bereich verarbeitet.
      </p>
    </div>
  );
}
