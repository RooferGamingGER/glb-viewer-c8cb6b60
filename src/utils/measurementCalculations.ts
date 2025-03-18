
import * as THREE from 'three';
import { nanoid } from 'nanoid';
import { Point, Segment } from '@/types/measurements';
import { MIN_INCLINATION_THRESHOLD } from '@/constants/measurements';
import { earClip, projectPointsToPlane } from './triangulation';

/**
 * Calculate 3D distance between two points
 */
export const calculateDistance = (point1: Point, point2: Point): number => {
  return Math.sqrt(
    Math.pow(point2.x - point1.x, 2) +
    Math.pow(point2.y - point1.y, 2) +
    Math.pow(point2.z - point1.z, 2)
  );
};

/**
 * Calculate height (Y-axis difference) between two points
 */
export const calculateHeight = (point1: Point, point2: Point): number => {
  return Math.abs(point2.y - point1.y);
};

/**
 * Calculate area of polygon defined by points
 */
export const calculateArea = (points: Point[]): number => {
  if (points.length < 3) return 0;
  
  // Projektion auf die am besten passende Ebene durchführen
  const { projectedPoints, planeNormal } = projectPointsToPlane(points);
  
  // Ear-Clipping für robuste Triangulation verwenden
  const triangles = earClip(projectedPoints);
  
  let totalArea = 0;
  
  // Fläche der einzelnen Dreiecke berechnen und summieren
  for (const triangle of triangles) {
    const p0 = projectedPoints[triangle[0]];
    const p1 = projectedPoints[triangle[1]];
    const p2 = projectedPoints[triangle[2]];
    
    // 3D-Vektoren für präzise Berechnung erstellen
    const v0 = new THREE.Vector3(p0.x, p0.y, p0.z);
    const v1 = new THREE.Vector3(p1.x, p1.y, p1.z);
    const v2 = new THREE.Vector3(p2.x, p2.y, p2.z);
    
    // Dreiecksseiten berechnen
    const a = v0.distanceTo(v1);
    const b = v1.distanceTo(v2);
    const c = v2.distanceTo(v0);
    
    // Halbumfang berechnen
    const s = (a + b + c) / 2;
    
    // Dreiecksfläche mit der Formel von Heron berechnen
    const triangleArea = Math.sqrt(Math.max(0, s * (s - a) * (s - b) * (s - c)));
    
    totalArea += triangleArea;
  }
  
  // Korrektur für geneigte Flächen
  // Wichtig: Da wir bereits die tatsächliche 3D-Fläche berechnet haben,
  // müssen wir hier KEINE Korrektur für die Neigung anwenden.
  // Die Heronsche Formel gibt bereits die korrekte Dreiecksfläche im 3D-Raum.
  
  return totalArea;
};

/**
 * Calculate length of a segment between two points
 */
export const calculateSegmentLength = (point1: Point, point2: Point): number => {
  return Math.sqrt(
    Math.pow(point2.x - point1.x, 2) +
    Math.pow(point2.y - point1.y, 2) +
    Math.pow(point2.z - point1.z, 2)
  );
};

/**
 * Calculate inclination in degrees between two points
 */
export const calculateInclination = (p1: THREE.Vector3, p2: THREE.Vector3): number => {
  const deltaY = p2.y - p1.y;
  const horizontalDistance = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.z - p1.z, 2));
  
  // Calculate inclination in radians
  const inclinationRad = Math.atan2(deltaY, horizontalDistance);
  
  // Convert radians to degrees
  return inclinationRad * (180 / Math.PI);
};

/**
 * Calculate average inclination from all segments
 */
export const calculateAverageInclination = (segments: Segment[]): number | undefined => {
  if (!segments || segments.length === 0) return undefined;
  
  let totalInclination = 0;
  let segmentsWithSignificantInclination = 0;
  
  for (const segment of segments) {
    const p1 = new THREE.Vector3(segment.points[0].x, segment.points[0].y, segment.points[0].z);
    const p2 = new THREE.Vector3(segment.points[1].x, segment.points[1].y, segment.points[1].z);
    
    // Skip horizontal segments (no inclination)
    if (Math.abs(p1.y - p2.y) < 0.001) continue;
    
    const inclination = calculateInclination(p1, p2);
    
    // Only consider inclinations above the minimum threshold
    if (Math.abs(inclination) >= MIN_INCLINATION_THRESHOLD) {
      totalInclination += Math.abs(inclination);
      segmentsWithSignificantInclination++;
    }
  }
  
  // Only return if we have segments with significant inclination
  if (segmentsWithSignificantInclination > 0) {
    return totalInclination / segmentsWithSignificantInclination;
  }
  
  return undefined;
};

/**
 * Generate segments from an array of points
 */
export const generateSegments = (points: Point[]): Segment[] => {
  if (points.length < 3) return [];
  
  const segments: Segment[] = [];
  
  // Create a segment for each pair of consecutive points
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length]; // Connect back to first point
    
    const length = calculateSegmentLength(p1, p2);
    const label = `${length.toFixed(2)} m`;
    
    // Calculate inclination for each segment
    const v1 = new THREE.Vector3(p1.x, p1.y, p1.z);
    const v2 = new THREE.Vector3(p2.x, p2.y, p2.z);
    const inclination = calculateInclination(v1, v2);
    
    // For area measurements, don't include inclination in segment label
    segments.push({
      id: nanoid(),
      points: [p1, p2],
      length,
      label
    });
  }
  
  return segments;
};

/**
 * Get the nearest point index in a measurement
 */
export const getNearestPointIndex = (measurement: any, position: Point): number => {
  // Find the index of the closest point in the measurement
  let nearestIndex = 0;
  let minDistance = Number.MAX_VALUE;
  
  measurement.points.forEach((point: Point, index: number) => {
    const distance = Math.sqrt(
      Math.pow(position.x - point.x, 2) +
      Math.pow(position.y - point.y, 2) +
      Math.pow(position.z - point.z, 2)
    );
    
    if (distance < minDistance) {
      minDistance = distance;
      nearestIndex = index;
    }
  });
  
  return nearestIndex;
};

/**
 * Validate a polygon to check if it's valid for area calculation
 */
export const validatePolygon = (points: Point[]): { 
  valid: boolean; 
  message?: string;
} => {
  if (points.length < 3) {
    return { valid: false, message: 'Mindestens 3 Punkte werden benötigt.' };
  }
  
  // Prüfen, ob alle Punkte koplanar (auf einer Ebene) sind
  if (points.length > 3) {
    const { projectedPoints } = projectPointsToPlane(points);
    
    // Vergleiche die Originalpunkte mit den projizierten Punkten
    let maxDeviation = 0;
    for (let i = 0; i < points.length; i++) {
      const deviation = calculateDistance(points[i], projectedPoints[i]);
      maxDeviation = Math.max(maxDeviation, deviation);
    }
    
    // Wenn die maximale Abweichung zu groß ist, ist das Polygon nicht ausreichend planar
    if (maxDeviation > 0.5) {  // 0.5 Meter Toleranz
      return { 
        valid: true,  // Immer noch gültig, aber mit Warnung
        message: 'Warnung: Die Punkte liegen nicht auf einer Ebene. Die Flächenberechnung könnte ungenau sein.' 
      };
    }
  }
  
  return { valid: true };
};
