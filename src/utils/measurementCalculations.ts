
import * as THREE from 'three';
import { Point, Segment } from '@/types/measurements';
import { nanoid } from 'nanoid';
import earcut from 'earcut';
import { 
  triangulatePolygon, 
  projectPointsToPlane, 
  earClip, 
  triangulate3D, 
  calculate3DTriangleArea,
  isAreaPlausible 
} from './triangulation';

/**
 * Calculate the distance between two 3D points
 * @param p1 - First point
 * @param p2 - Second point
 * @returns Distance in meters
 */
export const calculateDistance = (p1: Point, p2: Point): number => {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dz = p2.z - p1.z;
  
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

/**
 * Calculate the height difference between two 3D points (y-axis)
 * @param p1 - First point
 * @param p2 - Second point
 * @returns Height difference in meters
 */
export const calculateHeight = (p1: Point, p2: Point): number => {
  return Math.abs(p2.y - p1.y);
};

/**
 * Calculate the inclination (slope) between two 3D points in degrees
 * @param p1 - First point (THREE.Vector3)
 * @param p2 - Second point (THREE.Vector3)
 * @returns Inclination in degrees
 */
export const calculateInclination = (p1: THREE.Vector3, p2: THREE.Vector3): number => {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const distanceXZ = Math.sqrt(dx * dx + (p2.z - p1.z) * (p2.z - p1.z));
  
  // Avoid division by zero
  if (distanceXZ === 0) {
    return 0;
  }
  
  const inclinationRad = Math.atan(dy / distanceXZ);
  return THREE.MathUtils.radToDeg(inclinationRad);
};

/**
 * Calculate the average inclination of multiple segments
 * @param segments - Array of segments with inclination data
 * @returns Average inclination in degrees
 */
export const calculateAverageInclination = (segments: Segment[]): number => {
  if (segments.length === 0) return 0;
  
  const totalInclination = segments.reduce((sum, segment) => sum + (segment.inclination || 0), 0);
  return totalInclination / segments.length;
};

/**
 * Generate segments from an array of 3D points
 * @param points - Array of 3D points
 * @returns Array of segments with length and inclination
 */
export const generateSegments = (points: Point[]): Segment[] => {
  const segments: Segment[] = [];
  
  for (let i = 0; i < points.length; i++) {
    const p1 = new THREE.Vector3(points[i].x, points[i].y, points[i].z);
    const p2 = new THREE.Vector3(points[(i + 1) % points.length].x, points[(i + 1) % points.length].y, points[(i + 1) % points.length].z);
    
    const length = calculateDistance(points[i], points[(i + 1) % points.length]);
    const inclination = calculateInclination(p1, p2);
    
    // Format segment label with length
    let label = `${length.toFixed(2)} m`;
    
    segments.push({
      id: nanoid(),
      points: [points[i], points[(i + 1) % points.length]],
      length,
      inclination,
      label
    });
  }
  
  return segments;
};

/**
 * Calculate the area of a polygon defined by 3D points using improved triangulation
 * @param points - Array of 3D points defining the polygon
 * @returns Area in square meters
 */
export const calculateArea = (points: Point[]): number => {
  if (points.length < 3) return 0;
  
  try {
    console.log("Starting area calculation for polygon with", points.length, "points");
    
    // Use enhanced 3D triangulation for more accurate results
    const { area, triangles, triangleAreas, method } = triangulate3D(points);
    
    console.log(`Area calculation result using ${method}:`, area);
    console.log("Triangulation created", triangles.length, "triangles");
    
    // Perform plausibility check
    if (!isAreaPlausible(area, points)) {
      console.warn("Area calculation failed plausibility check, trying fallback method");
      return calculateAreaFallback(points);
    }
    
    return area;
  } catch (error) {
    console.error("Error in primary area calculation:", error);
    return calculateAreaFallback(points);
  }
};

/**
 * Fallback method for area calculation when the primary method fails
 */
function calculateAreaFallback(points: Point[]): number {
  console.log("Using fallback area calculation method");
  
  try {
    // Method 1: Calculate direct 3D area by manually triangulating
    let totalArea = 0;
    
    // Triangulate using the first point as a common vertex
    const basePoint = points[0];
    for (let i = 1; i < points.length - 1; i++) {
      const triangleArea = calculate3DTriangleArea(
        basePoint,
        points[i],
        points[i + 1]
      );
      
      totalArea += triangleArea;
    }
    
    console.log("Fallback direct triangulation area:", totalArea);
    
    // Method 2: Project to best fit plane and use earcut
    const { projectedPoints } = projectPointsToPlane(points);
    
    // Flatten for earcut
    const vertices: number[] = [];
    for (const point of projectedPoints) {
      vertices.push(point.x, point.z);
    }
    
    // Get earcut triangulation
    const indices = earcut(vertices, undefined, 2);
    
    // Calculate area of each triangle in 3D
    let earcutArea = 0;
    for (let i = 0; i < indices.length; i += 3) {
      const a = points[indices[i]];
      const b = points[indices[i + 1]];
      const c = points[indices[i + 2]];
      
      earcutArea += calculate3DTriangleArea(a, b, c);
    }
    
    console.log("Fallback earcut-based area:", earcutArea);
    
    // Choose the more reasonable result
    if (isAreaPlausible(totalArea, points)) {
      return totalArea;
    } else if (isAreaPlausible(earcutArea, points)) {
      return earcutArea;
    }
    
    // Last resort: simple 2D projection to XZ plane
    return calculateSimple2DArea(points);
  } catch (error) {
    console.error("Fallback area calculation also failed:", error);
    return calculateSimple2DArea(points);
  }
}

/**
 * Very simple 2D area calculation using the shoelace formula on XZ projection
 * This is the last resort if all 3D methods fail
 */
function calculateSimple2DArea(points: Point[]): number {
  try {
    console.log("Using simple 2D projection (shoelace formula) as last resort");
    
    // Project points to XZ plane for 2D area calculation
    const flatPoints = points.map(p => ({ x: p.x, z: p.z }));
    
    // Calculate area using shoelace formula (Gauss's area formula)
    let area = 0;
    for (let i = 0; i < flatPoints.length; i++) {
      const j = (i + 1) % flatPoints.length;
      area += flatPoints[i].x * flatPoints[j].z;
      area -= flatPoints[j].x * flatPoints[i].z;
    }
    area = Math.abs(area) / 2;
    
    console.log("Emergency fallback 2D area calculation result:", area);
    
    return area;
  } catch (fallbackError) {
    console.error("All area calculations failed. Returning 0:", fallbackError);
    return 0;
  }
}

/**
 * Calculate the nearest point index on a list of points
 * @param points - Array of points to search
 * @param point - The reference point
 * @param threshold - Maximum distance threshold (optional)
 * @returns The index of the nearest point, or -1 if none found within threshold
 */
export const getNearestPointIndex = (points: Point[], point: Point, threshold: number = Infinity): number => {
  let nearestIndex = -1;
  let minDistance = Infinity;
  
  for (let i = 0; i < points.length; i++) {
    const distance = calculateDistance(point, points[i]);
    if (distance < minDistance && distance <= threshold) {
      minDistance = distance;
      nearestIndex = i;
    }
  }
  
  return nearestIndex;
};

/**
 * Calculate the length of a segment
 */
export const calculateSegmentLength = (segment: Segment): number => {
  return calculateDistance(segment.points[0], segment.points[1]);
};

/**
 * Calculate dimensions (width, length, area, perimeter) of a quadrilateral
 * @param points - Array of 4 points defining the quadrilateral
 * @returns Object with dimensions
 */
export const calculateQuadrilateralDimensions = (points: Point[]): {
  width: number;
  length: number;
  area: number;
  perimeter: number;
} => {
  if (points.length !== 4) {
    return { width: 0, length: 0, area: 0, perimeter: 0 };
  }
  
  // Calculate the lengths of the sides
  const side1 = calculateDistance(points[0], points[1]);
  const side2 = calculateDistance(points[1], points[2]);
  const side3 = calculateDistance(points[2], points[3]);
  const side4 = calculateDistance(points[3], points[0]);
  
  // Instead of taking average of opposite sides, take minimum for width (height)
  // and minimum for length to be more conservative in estimates
  const width = Math.min(side1, side3);
  const length = Math.min(side2, side4);
  
  // Calculate area using full 3D calculation
  const area = calculateArea(points);
  
  // Calculate perimeter
  const perimeter = side1 + side2 + side3 + side4;
  
  return { width, length, area, perimeter };
};

/**
 * Calculate the bounding box of a set of points
 * @param points - Array of 3D points
 * @returns Object with min and max coordinates
 */
export const calculateBoundingBox = (points: Point[]): {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
} => {
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  
  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    minZ = Math.min(minZ, point.z);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
    maxZ = Math.max(maxZ, point.z);
  }
  
  return { minX, minY, minZ, maxX, maxY, maxZ };
};

/**
 * Calculate the centroid (center point) of a set of points
 * @param points - Array of 3D points
 * @returns Object with centroid coordinates
 */
export const calculateCentroid = (points: Point[]): { x: number; y: number; z: number } => {
  let sumX = 0, sumY = 0, sumZ = 0;
  
  for (const point of points) {
    sumX += point.x;
    sumY += point.y;
    sumZ += point.z;
  }
  
  const count = points.length;
  return {
    x: sumX / count,
    y: sumY / count,
    z: sumZ / count
  };
};

/**
 * Calculate the area of a polygon defined by 3D points using projection
 * This is kept for compatibility with existing code
 * @param points - Array of 3D points defining the polygon
 * @returns Area in square meters
 */
export const calculatePolygonArea = (points: Point[]): number => {
  if (points.length < 3) return 0;
  
  return calculateArea(points);
};

/**
 * Validate if the polygon is valid (has at least 3 points and is not self-intersecting)
 * @param points - Array of 3D points defining the polygon
 * @returns Object with validity status and message
 */
export const validatePolygon = (points: Point[]): { valid: boolean; message?: string } => {
  if (points.length < 3) {
    return {
      valid: false,
      message: 'Fläche benötigt mindestens 3 Punkte.'
    };
  }
  
  // Check if the polygon is self-intersecting
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    
    for (let j = i + 2; j < points.length; j++) {
      // Skip adjacent edges
      if ((j + 1) % points.length === i) continue;
      
      const p3 = points[j];
      const p4 = points[(j + 1) % points.length];
      
      if (doIntersect(p1, p2, p3, p4)) {
        return {
          valid: false,
          message: 'Polygon schneidet sich selbst. Bitte anpassen.'
        };
      }
    }
  }
  
  return { valid: true };
};

/**
 * Basic line segment intersection check
 * @param p1 - Start point of the first line segment
 * @param p2 - End point of the first line segment
 * @param p3 - Start point of the second line segment
 * @param p4 - End point of the second line segment
 * @returns True if the line segments intersect, false otherwise
 */
const doIntersect = (p1: Point, p2: Point, p3: Point, p4: Point): boolean => {
  const o1 = orientation(p1, p2, p3);
  const o2 = orientation(p1, p2, p4);
  const o3 = orientation(p3, p4, p1);
  const o4 = orientation(p3, p4, p2);
  
  if (o1 !== o2 && o3 !== o4) {
    return true; // General case
  }
  
  // Special Cases
  // p1, p2 and p3 are collinear and p3 lies on segment p1p2
  if (o1 === 0 && onSegment(p1, p3, p2)) return true;
  
  // p1, p2 and p4 are collinear and p4 lies on segment p1p2
  if (o2 === 0 && onSegment(p1, p4, p2)) return true;
  
  // p3, p4 and p1 are collinear and p1 lies on segment p3p4
  if (o3 === 0 && onSegment(p3, p1, p4)) return true;
  
  // p3, p4 and p2 are collinear and p2 lies on segment p3p4
  if (o4 === 0 && onSegment(p3, p2, p4)) return true;
  
  return false; // Doesn't fall in any of the above cases
};

/**
 * Utility function to check if point q lies on segment p-r
 * @param p - Start point of the segment
 * @param q - Point to check
 * @param r - End point of the segment
 * @returns True if q lies on segment p-r, false otherwise
 */
const onSegment = (p: Point, q: Point, r: Point): boolean => {
  if (q.x <= Math.max(p.x, r.x) && q.x >= Math.min(p.x, r.x) &&
      q.z <= Math.max(p.z, r.z) && q.z >= Math.min(p.z, r.z))
    return true;
  
  return false;
};

/**
 * Utility function to find the orientation of ordered triplet (p, q, r)
 * @param p - First point
 * @param q - Second point
 * @param r - Third point
 * @returns 0 if p, q and r are collinear, 1 if Clockwise, 2 if Counterclockwise
 */
const orientation = (p: Point, q: Point, r: Point): number => {
  // Using XZ plane for 2D orientation test
  const val = (q.z - p.z) * (r.x - q.x) -
              (q.x - p.x) * (r.z - q.z);
  
  if (val === 0) return 0;  // collinear
  
  return (val > 0) ? 1 : 2; // clock or counterclock wise
};
