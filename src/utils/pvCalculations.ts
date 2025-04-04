import * as THREE from 'three';
import { Point, PVModuleInfo, PVModuleSpec, Measurement, PVMaterials, PVMountingSystem, PVElectricalSystem } from '@/types/measurements';
import { calculatePolygonArea, calculateQuadrilateralDimensions, generateSegments } from './measurementCalculations';
import { findLargestRectangle } from './rectangleFinder';

// Default PV module dimensions in meters
export const DEFAULT_MODULE_WIDTH = 1.041;
export const DEFAULT_MODULE_HEIGHT = 1.767;

// Default distances in meters
export const DEFAULT_EDGE_DISTANCE = 0.1;  // 10cm from roof edge
export const DEFAULT_MODULE_SPACING = 0.05;  // 5cm between modules

// Common PV module templates that users can select from
export const PV_MODULE_TEMPLATES: PVModuleSpec[] = [
  {
    name: "Standard (425W)",
    width: 1.04,
    height: 1.77,
    power: 425,
    efficiency: 21.0
  }
];

// Default values for material calculations
export const DEFAULT_ROOF_HOOK_SPACING = 0.8; // meters (80cm between hooks)
export const DEFAULT_CABLE_PER_MODULE = 1.2; // meters of string cable per module
export const DEFAULT_INVERTER_SIZING_FACTOR = 0.85; // Inverter should be 85% of module power
export const DEFAULT_MODULES_PER_STRING = 10; // Default modules per string

// Constants for material calculation
const RAIL_LENGTH_PER_MODULE = 0.35; // meters of rail per module (approximation)
const RAIL_STANDARD_LENGTH = 3.0; // Standard rail length in meters
const END_CLAMPS_PER_ARRAY = 4; // 4 end clamps per array (one at each corner)

// Constants for yield calculation
const ANNUAL_YIELD_FACTOR_DEFAULT = 950; // kWh/kWp (estimated annual yield per kWp in Germany)
const YIELD_FACTORS: Record<string, number> = {
  'hochformat': 950, // Portrait orientation
  'querformat': 970, // Landscape orientation
  'default': 950
};

/**
 * Generates a grid of PV modules for the given area
 */
export function generatePVModuleGrid(
  points: Point[],
  pvModuleInfo: PVModuleInfo,
  segments?: Segment[]
): { positions: THREE.Vector3[], moduleCount: number } {
  if (!points || points.length < 3) {
    return { positions: [], moduleCount: 0 };
  }

  // Convert points to THREE.Vector3
  const points3D = points.map(p => new THREE.Vector3(p.x, p.y, p.z));

  // Find horizontal segments (ridge or eave) with minimal inclination
  let alignmentVector: THREE.Vector3 | null = null;
  let foundHorizontalEdge = false;
  
  if (segments && segments.length > 0) {
    // Find the segment with minimal inclination (most horizontal)
    let minInclinationSegment: { segment: Segment, inclination: number } | null = null;
    let maxLength = 0;
    
    for (const segment of segments) {
      if (segment.points && segment.points.length === 2) {
        const [p1, p2] = segment.points;
        const v1 = new THREE.Vector3(p1.x, p1.y, p1.z);
        const v2 = new THREE.Vector3(p2.x, p2.y, p2.z);
        
        // Create a direction vector from the segment
        const direction = new THREE.Vector3().subVectors(v2, v1);
        const length = direction.length();
        
        // Calculate how horizontal this segment is (0 means perfectly horizontal)
        const horizontalVector = new THREE.Vector3(direction.x, 0, direction.z).normalize();
        const inclination = Math.abs(direction.normalize().y);
        
        // Find the longest segment with minimal inclination
        if ((minInclinationSegment === null || inclination < minInclinationSegment.inclination) && 
            length > maxLength) {
          minInclinationSegment = { segment, inclination };
          maxLength = length;
          
          // Use the horizontalVector (projected into XZ plane) for alignment
          alignmentVector = horizontalVector;
          foundHorizontalEdge = true;
        }
      }
    }
  }

  // If no horizontal edge was found, fall back to using the points to determine orientation
  if (!foundHorizontalEdge) {
    // Calculate the normal vector of the roof plane
    const normal = calculateNormal(points3D);
    
    // Create a horizontal vector (in the XZ plane)
    const horizontalVector = new THREE.Vector3(1, 0, 0);
    
    // Project the horizontal vector onto the roof plane
    alignmentVector = projectVectorOntoPlane(horizontalVector, normal);
  }

  // Ensure we have a valid alignment vector
  if (!alignmentVector) {
    // Fallback to using the longest edge of the polygon as alignment
    const edges = [];
    for (let i = 0; i < points3D.length; i++) {
      const p1 = points3D[i];
      const p2 = points3D[(i + 1) % points3D.length];
      const edge = new THREE.Vector3().subVectors(p2, p1);
      edges.push({ start: p1, end: p2, length: edge.length(), direction: edge.clone().normalize() });
    }
    
    // Sort edges by length (descending)
    edges.sort((a, b) => b.length - a.length);
    
    // Use the direction of the longest edge
    if (edges.length > 0) {
      alignmentVector = edges[0].direction;
    } else {
      // Ultimate fallback
      alignmentVector = new THREE.Vector3(1, 0, 0);
    }
  }

  // Create a perpendicular vector in the roof plane
  const normal = calculateNormal(points3D);
  const perpendicularVector = new THREE.Vector3().crossVectors(normal, alignmentVector).normalize();

  // Calculate the module dimensions based on orientation
  const { moduleWidth, moduleHeight } = pvModuleInfo;
  
  // Determine if we're in portrait or landscape orientation
  const orientation = pvModuleInfo.orientation || 'portrait';
  
  // Set module dimensions based on orientation
  const moduleWidthVector = alignmentVector.clone().multiplyScalar(
    orientation === 'portrait' ? moduleWidth : moduleHeight
  );
  
  const moduleHeightVector = perpendicularVector.clone().multiplyScalar(
    orientation === 'portrait' ? moduleHeight : moduleWidth
  );

  // Calculate the bounding box of the roof area
  const boundingBox = new THREE.Box3().setFromPoints(points3D);
  const size = new THREE.Vector3();
  boundingBox.getSize(size);
  
  // Find the lowest point (by Y coordinate) to start placing modules
  let minY = Infinity;
  let startPoint: THREE.Vector3 | null = null;
  
  for (const point of points3D) {
    if (point.y < minY) {
      minY = point.y;
      startPoint = point.clone();
    }
  }
  
  if (!startPoint) {
    startPoint = points3D[0].clone();
  }
  
  // Add edge distance to the start point
  startPoint.add(
    alignmentVector.clone().multiplyScalar(pvModuleInfo.edgeDistance || DEFAULT_EDGE_DISTANCE)
  ).add(
    perpendicularVector.clone().multiplyScalar(pvModuleInfo.edgeDistance || DEFAULT_EDGE_DISTANCE)
  );

  // Calculate available area dimensions
  const availableWidth = size.x - 2 * (pvModuleInfo.edgeDistance || DEFAULT_EDGE_DISTANCE);
  const availableLength = size.z - 2 * (pvModuleInfo.edgeDistance || DEFAULT_EDGE_DISTANCE);
  
  // Calculate number of modules that can fit
  const moduleSpacing = pvModuleInfo.moduleSpacing || DEFAULT_MODULE_SPACING;
  
  const modulesInWidth = Math.floor(availableWidth / 
    (orientation === 'portrait' ? moduleWidth : moduleHeight + moduleSpacing));
  
  const modulesInLength = Math.floor(availableLength / 
    (orientation === 'portrait' ? moduleHeight : moduleWidth + moduleSpacing));
  
  // Generate positions for each module
  const positions: THREE.Vector3[] = [];
  let moduleCount = 0;
  
  for (let row = 0; row < modulesInLength; row++) {
    for (let col = 0; col < modulesInWidth; col++) {
      // Calculate the center position of this module
      const position = startPoint.clone()
        .add(moduleWidthVector.clone().multiplyScalar(col + 0.5))
        .add(moduleHeightVector.clone().multiplyScalar(row + 0.5))
        // Add spacing between modules
        .add(alignmentVector.clone().multiplyScalar(col * moduleSpacing))
        .add(perpendicularVector.clone().multiplyScalar(row * moduleSpacing));
      
      // Check if this position is inside the roof polygon
      if (isPointInPolygon(position, points3D, normal)) {
        positions.push(position);
        moduleCount++;
      }
    }
  }

  return { positions, moduleCount };
}

/**
 * Calculates the normal vector of a plane defined by points
 */
function calculateNormal(points: THREE.Vector3[]): THREE.Vector3 {
  if (points.length < 3) {
    // Default normal if we don't have enough points
    return new THREE.Vector3(0, 1, 0);
  }

  // Take the first three points to define the plane
  const v1 = new THREE.Vector3().subVectors(points[1], points[0]);
  const v2 = new THREE.Vector3().subVectors(points[2], points[0]);
  
  // Calculate the cross product to get the normal
  const normal = new THREE.Vector3().crossVectors(v1, v2).normalize();
  
  return normal;
}

/**
 * Projects a vector onto a plane defined by its normal
 */
function projectVectorOntoPlane(vector: THREE.Vector3, normal: THREE.Vector3): THREE.Vector3 {
  // Calculate projection of vector onto normal
  const projection = normal.clone().multiplyScalar(vector.dot(normal));
  
  // Subtract projection from vector to get the component in the plane
  return vector.clone().sub(projection).normalize();
}

/**
 * Checks if a point is inside a polygon defined by points
 */
function isPointInPolygon(point: THREE.Vector3, polygonPoints: THREE.Vector3[], normal: THREE.Vector3): boolean {
  // Create a plane from the normal and a point in the polygon
  const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, polygonPoints[0]);
  
  // Project the point and polygon onto the plane
  const projectedPoint = new THREE.Vector3();
  plane.projectPoint(point, projectedPoint);
  
  // Find a basis for the plane
  const basis1 = new THREE.Vector3(1, 0, 0);
  if (Math.abs(normal.dot(basis1)) > 0.9) {
    basis1.set(0, 1, 0);
  }
  basis1.cross(normal).normalize();
  const basis2 = new THREE.Vector3().crossVectors(normal, basis1).normalize();
  
  // Project the polygon points to 2D
  const polygon2D: { x: number, y: number }[] = [];
  for (const p of polygonPoints) {
    const projected = new THREE.Vector3();
    plane.projectPoint(p, projected);
    
    // Calculate 2D coordinates in the basis
    const x = projected.clone().sub(polygonPoints[0]).dot(basis1);
    const y = projected.clone().sub(polygonPoints[0]).dot(basis2);
    polygon2D.push({ x, y });
  }
  
  // Calculate 2D coordinates of the point
  const px = projectedPoint.clone().sub(polygonPoints[0]).dot(basis1);
  const py = projectedPoint.clone().sub(polygonPoints[0]).dot(basis2);
  
  // Do point-in-polygon test (ray casting algorithm)
  let inside = false;
  for (let i = 0, j = polygon2D.length - 1; i < polygon2D.length; j = i++) {
    const intersect = ((polygon2D[i].y > py) !== (polygon2D[j].y > py)) &&
      (px < (polygon2D[j].x - polygon2D[i].x) * (py - polygon2D[i].y) / (polygon2D[j].y - polygon2D[i].y) + polygon2D[i].x);
    if (intersect) inside = !inside;
  }
  
  return inside;
}
