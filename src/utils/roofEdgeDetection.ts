
import { Point, Segment, Measurement } from '@/types/measurements';
import { calculateDistance, calculateInclination } from './measurementCalculations';
import { nanoid } from 'nanoid';
import * as THREE from 'three';

/**
 * Detects ridge, eave, and verge from a roof polygon
 * @param points - Array of 3D points defining the roof area
 * @returns Object containing the detected edges
 */
export const detectRoofEdges = (points: Point[]): {
  ridge: { points: [Point, Point]; inclination: number } | null;
  eave: { points: [Point, Point]; inclination: number } | null;
  verge: { points: [Point, Point]; inclination: number } | null;
} => {
  if (points.length < 3) {
    return { ridge: null, eave: null, verge: null };
  }

  const segments: Array<{
    points: [Point, Point];
    inclination: number;
    length: number;
    index: number;
  }> = [];

  // Create segments from the polygon points
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    
    const v1 = new THREE.Vector3(p1.x, p1.y, p1.z);
    const v2 = new THREE.Vector3(p2.x, p2.y, p2.z);
    
    const inclination = calculateInclination(v1, v2);
    const length = calculateDistance(p1, p2);
    
    segments.push({
      points: [p1, p2],
      inclination,
      length,
      index: i
    });
  }

  // Sort segments by inclination
  const sortedByInclination = [...segments].sort((a, b) => 
    Math.abs(b.inclination) - Math.abs(a.inclination)
  );

  // Sort segments by length
  const sortedByLength = [...segments].sort((a, b) => b.length - a.length);

  // Ridge is typically the highest segment with significant inclination
  let ridge = null;
  for (const segment of sortedByInclination) {
    if (Math.abs(segment.inclination) > 10) {
      ridge = {
        points: segment.points,
        inclination: segment.inclination
      };
      break;
    }
  }

  // Eave is typically a long segment at the bottom of the roof
  // It usually has a lower inclination than the ridge
  let eave = null;
  for (const segment of sortedByLength) {
    // Avoid selecting the same segment as ridge
    if (ridge && 
      ((segment.points[0].x === ridge.points[0].x && segment.points[0].y === ridge.points[0].y && segment.points[0].z === ridge.points[0].z) ||
       (segment.points[1].x === ridge.points[1].x && segment.points[1].y === ridge.points[1].y && segment.points[1].z === ridge.points[1].z))) {
      continue;
    }
    
    // Eaves are typically at the lowest Y position
    const avgY = (segment.points[0].y + segment.points[1].y) / 2;
    if (avgY < (ridge ? (ridge.points[0].y + ridge.points[1].y) / 2 : Infinity)) {
      eave = {
        points: segment.points,
        inclination: segment.inclination
      };
      break;
    }
  }

  // Verge is typically one of the remaining segments, usually perpendicular to ridge/eave
  let verge = null;
  for (const segment of segments) {
    // Avoid selecting the same segment as ridge or eave
    if ((ridge && 
      ((segment.points[0].x === ridge.points[0].x && segment.points[0].y === ridge.points[0].y && segment.points[0].z === ridge.points[0].z) ||
       (segment.points[1].x === ridge.points[1].x && segment.points[1].y === ridge.points[1].y && segment.points[1].z === ridge.points[1].z))) ||
        (eave && 
      ((segment.points[0].x === eave.points[0].x && segment.points[0].y === eave.points[0].y && segment.points[0].z === eave.points[0].z) ||
       (segment.points[1].x === eave.points[1].x && segment.points[1].y === eave.points[1].y && segment.points[1].z === eave.points[1].z)))) {
      continue;
    }
    
    verge = {
      points: segment.points,
      inclination: segment.inclination
    };
    break;
  }

  return { ridge, eave, verge };
};

/**
 * Creates measurement objects for roof edges
 * @param points - Array of 3D points defining the roof area
 * @param parentId - ID of the parent area measurement
 * @returns Array of edge measurements
 */
export const createRoofEdgeMeasurements = (points: Point[], parentId: string): Measurement[] => {
  const edges = detectRoofEdges(points);
  const measurements: Measurement[] = [];

  if (edges.ridge) {
    const distance = calculateDistance(edges.ridge.points[0], edges.ridge.points[1]);
    measurements.push({
      id: nanoid(),
      type: 'ridge',
      points: [...edges.ridge.points],
      value: distance,
      label: `First: ${distance.toFixed(2)} m`,
      visible: false, // Hidden by default
      labelVisible: false,
      unit: 'm',
      description: 'Automatisch erkannter First',
      inclination: edges.ridge.inclination,
      relatedMeasurements: [parentId]
    });
  }

  if (edges.eave) {
    const distance = calculateDistance(edges.eave.points[0], edges.eave.points[1]);
    measurements.push({
      id: nanoid(),
      type: 'eave',
      points: [...edges.eave.points],
      value: distance,
      label: `Traufe: ${distance.toFixed(2)} m`,
      visible: false, // Hidden by default
      labelVisible: false,
      unit: 'm',
      description: 'Automatisch erkannte Traufe',
      inclination: edges.eave.inclination,
      relatedMeasurements: [parentId]
    });
  }

  if (edges.verge) {
    const distance = calculateDistance(edges.verge.points[0], edges.verge.points[1]);
    measurements.push({
      id: nanoid(),
      type: 'verge',
      points: [...edges.verge.points],
      value: distance,
      label: `Ortgang: ${distance.toFixed(2)} m`,
      visible: false, // Hidden by default
      labelVisible: false,
      unit: 'm',
      description: 'Automatisch erkannter Ortgang',
      inclination: edges.verge.inclination,
      relatedMeasurements: [parentId]
    });
  }

  return measurements;
};
