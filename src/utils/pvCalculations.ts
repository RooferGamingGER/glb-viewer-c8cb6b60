
import { Point, PVModuleInfo, ModulePosition, Point2D } from '@/types/measurements';
import { calculatePolygonArea } from './measurementCalculations';
import * as THREE from 'three';
import earcut from 'earcut';

// Default PV module dimensions in meters
export const DEFAULT_MODULE_WIDTH = 1.041;
export const DEFAULT_MODULE_HEIGHT = 1.767;
export const DEFAULT_EDGE_DISTANCE = 0.1;  // 10cm from roof edge
export const DEFAULT_MODULE_SPACING = 0.05; // 5cm between modules

/**
 * Calculates the optimal placement of PV modules on a roof area
 * 
 * @param points - The 3D points defining the roof area polygon
 * @param moduleWidth - Width of a single PV module in meters (default: 1.041m)
 * @param moduleHeight - Height of a single PV module in meters (default: 1.767m)
 * @param edgeDistance - Distance from the roof edge in meters (default: 0.1m)
 * @param moduleSpacing - Spacing between modules in meters (default: 0.05m)
 * @returns Information about PV module placement
 */
export const calculatePVModulePlacement = (
  points: Point[], 
  moduleWidth: number = DEFAULT_MODULE_WIDTH, 
  moduleHeight: number = DEFAULT_MODULE_HEIGHT,
  edgeDistance: number = DEFAULT_EDGE_DISTANCE,
  moduleSpacing: number = DEFAULT_MODULE_SPACING
): PVModuleInfo => {
  // 1. Calculate the total area of the polygon
  const totalArea = calculatePolygonArea(points);
  
  // 2. Create a 2D projection of the roof polygon for calculations
  // Find dominant plane for projection (assuming roof is mostly flat)
  const normal = calculatePolygonNormal(points);
  
  // Determine the primary axis for projection based on normal
  let projectionPlane: 'xy' | 'xz' | 'yz';
  const absX = Math.abs(normal.x);
  const absY = Math.abs(normal.y);
  const absZ = Math.abs(normal.z);
  
  if (absY > absX && absY > absZ) {
    // Project onto XZ plane (Y is most vertical)
    projectionPlane = 'xz';
  } else if (absZ > absX && absZ > absY) {
    // Project onto XY plane (Z is most vertical)
    projectionPlane = 'xy';
  } else {
    // Project onto YZ plane (X is most vertical)
    projectionPlane = 'yz';
  }
  
  // Project 3D points to 2D based on dominant plane
  const points2D = projectPointsTo2D(points, projectionPlane);
  
  // 3. Shrink the polygon by the edge distance
  const shrunkPolygon = shrinkPolygon(points2D, edgeDistance);
  
  // If the shrunk polygon is too small, return empty result
  if (shrunkPolygon.length < 3) {
    return {
      moduleWidth,
      moduleHeight,
      moduleCount: 0,
      coveragePercent: 0,
      orientation: 'portrait',
      edgeDistance,
      moduleSpacing,
      availableArea: 0,
      portraitCount: 0,
      landscapeCount: 0
    };
  }
  
  // 4. Calculate available area after shrinking
  const availableArea = calculateArea2D(shrunkPolygon);
  
  // 5. Calculate bounding box of the shrunk polygon
  const bounds = calculateBounds(shrunkPolygon);
  
  // 6. Calculate effective module dimensions including spacing
  const effectiveModuleWidth = moduleWidth + moduleSpacing;
  const effectiveModuleHeight = moduleHeight + moduleSpacing;
  
  // 7. Calculate how many modules can fit in each direction (both portrait and landscape)
  // Portrait orientation (taller than wide)
  const portraitColsX = Math.floor(bounds.width / effectiveModuleWidth);
  const portraitRowsY = Math.floor(bounds.height / effectiveModuleHeight);
  
  // Landscape orientation (wider than tall)
  const landscapeColsX = Math.floor(bounds.width / effectiveModuleHeight);
  const landscapeRowsY = Math.floor(bounds.height / effectiveModuleWidth);
  
  // 8. Calculate total modules for each orientation
  // We'll refine this with actual placement later
  const portraitTotalModules = portraitColsX * portraitRowsY;
  const landscapeTotalModules = landscapeColsX * landscapeRowsY;
  
  // 9. Determine which orientation allows more modules
  const usePortrait = portraitTotalModules >= landscapeTotalModules;
  
  // 10. Place modules and count how many fit inside the shrunk polygon
  const modulePositions: ModulePosition[] = [];
  
  // Variables for the final count and orientation
  let finalModuleCount = 0;
  let finalOrientation: 'portrait' | 'landscape' = usePortrait ? 'portrait' : 'landscape';
  
  // If portrait is better or equal, try portrait first, then landscape if no modules fit
  if (usePortrait) {
    const portraitPositions = placeModulesInPolygon(
      shrunkPolygon,
      bounds,
      moduleWidth,
      moduleHeight,
      moduleSpacing,
      'portrait',
      projectionPlane,
      points
    );
    
    if (portraitPositions.length > 0) {
      finalModuleCount = portraitPositions.length;
      finalOrientation = 'portrait';
      modulePositions.push(...portraitPositions);
    } else {
      // Try landscape as fallback
      const landscapePositions = placeModulesInPolygon(
        shrunkPolygon,
        bounds,
        moduleWidth,
        moduleHeight,
        moduleSpacing,
        'landscape',
        projectionPlane,
        points
      );
      
      finalModuleCount = landscapePositions.length;
      finalOrientation = 'landscape';
      modulePositions.push(...landscapePositions);
    }
  } 
  // If landscape is better, try landscape first, then portrait if no modules fit
  else {
    const landscapePositions = placeModulesInPolygon(
      shrunkPolygon,
      bounds,
      moduleWidth,
      moduleHeight,
      moduleSpacing,
      'landscape',
      projectionPlane,
      points
    );
    
    if (landscapePositions.length > 0) {
      finalModuleCount = landscapePositions.length;
      finalOrientation = 'landscape';
      modulePositions.push(...landscapePositions);
    } else {
      // Try portrait as fallback
      const portraitPositions = placeModulesInPolygon(
        shrunkPolygon,
        bounds,
        moduleWidth,
        moduleHeight,
        moduleSpacing,
        'portrait',
        projectionPlane,
        points
      );
      
      finalModuleCount = portraitPositions.length;
      finalOrientation = 'portrait';
      modulePositions.push(...portraitPositions);
    }
  }
  
  // Calculate coverage percentage
  const moduleArea = moduleWidth * moduleHeight * finalModuleCount;
  const coveragePercent = (totalArea > 0) ? (moduleArea / totalArea) * 100 : 0;
  
  return {
    moduleWidth,
    moduleHeight,
    moduleCount: finalModuleCount,
    coveragePercent: Math.min(coveragePercent, 100), // Cap at 100%
    orientation: finalOrientation,
    edgeDistance,
    moduleSpacing,
    availableArea,
    modulePositions,
    portraitCount: portraitTotalModules,
    landscapeCount: landscapeTotalModules
  };
};

/**
 * Place modules in the polygon and return their positions
 */
function placeModulesInPolygon(
  polygon: Point2D[],
  bounds: { x: number, y: number, width: number, height: number },
  moduleWidth: number,
  moduleHeight: number,
  moduleSpacing: number,
  orientation: 'portrait' | 'landscape',
  projectionPlane: 'xy' | 'xz' | 'yz',
  originalPoints: Point[]
): ModulePosition[] {
  const modulePositions: ModulePosition[] = [];
  
  // Define module dimensions based on orientation
  const effectiveModuleWidth = orientation === 'portrait' ? 
    moduleWidth + moduleSpacing : moduleHeight + moduleSpacing;
  const effectiveModuleHeight = orientation === 'portrait' ? 
    moduleHeight + moduleSpacing : moduleWidth + moduleSpacing;
  
  // Calculate starting position (top-left of the bounds)
  const startX = bounds.x + moduleSpacing / 2;
  const startY = bounds.y + moduleSpacing / 2;
  
  // Calculate how many modules we can fit in each direction (grid layout)
  const cols = Math.floor(bounds.width / effectiveModuleWidth);
  const rows = Math.floor(bounds.height / effectiveModuleHeight);
  
  // Place modules in a grid and check if they fit inside the shrunk polygon
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      // Calculate module position
      const moduleX = startX + col * effectiveModuleWidth;
      const moduleY = startY + row * effectiveModuleHeight;
      
      // Check if all corners of the module are inside the polygon
      const moduleWidth2D = orientation === 'portrait' ? moduleWidth : moduleHeight;
      const moduleHeight2D = orientation === 'portrait' ? moduleHeight : moduleWidth;
      
      const corners = [
        { x: moduleX, y: moduleY },  // top-left
        { x: moduleX + moduleWidth2D, y: moduleY },  // top-right
        { x: moduleX + moduleWidth2D, y: moduleY + moduleHeight2D },  // bottom-right
        { x: moduleX, y: moduleY + moduleHeight2D }   // bottom-left
      ];
      
      // Check if all corners are inside the polygon
      const allCornersInside = corners.every(corner => isPointInPolygon(corner, polygon));
      
      if (allCornersInside) {
        // Convert back to 3D position based on the projection plane
        const pos3D = projectTo3D(
          moduleX + moduleWidth2D / 2, 
          moduleY + moduleHeight2D / 2, 
          projectionPlane,
          originalPoints
        );
        
        modulePositions.push({
          x: pos3D.x,
          y: pos3D.y,
          z: pos3D.z,
          width: orientation === 'portrait' ? moduleWidth : moduleHeight,
          height: orientation === 'portrait' ? moduleHeight : moduleWidth,
          orientation
        });
      }
    }
  }
  
  return modulePositions;
}

/**
 * Project a point from 2D back to 3D space
 */
function projectTo3D(
  x: number, 
  y: number, 
  projectionPlane: 'xy' | 'xz' | 'yz',
  originalPoints: Point[]
): { x: number, y: number, z: number } {
  // Find the average height/coordinate for the missing dimension
  let avgCoord = 0;
  
  if (projectionPlane === 'xy') {
    // Missing Z, find average Z
    avgCoord = originalPoints.reduce((sum, p) => sum + p.z, 0) / originalPoints.length;
    return { x, y, z: avgCoord };
  } else if (projectionPlane === 'xz') {
    // Missing Y, find average Y
    avgCoord = originalPoints.reduce((sum, p) => sum + p.y, 0) / originalPoints.length;
    return { x, y: avgCoord, z: y }; // Note: y in 2D becomes z in 3D
  } else {
    // Missing X, find average X
    avgCoord = originalPoints.reduce((sum, p) => sum + p.x, 0) / originalPoints.length;
    return { x: avgCoord, y: x, z: y }; // Note: x in 2D becomes y, y becomes z
  }
}

/**
 * Calculate the normal vector of a polygon
 */
function calculatePolygonNormal(points: Point[]): THREE.Vector3 {
  if (points.length < 3) {
    return new THREE.Vector3(0, 1, 0); // Default to Y-up if not enough points
  }
  
  // Create a temporary normal by taking cross product of two edges
  const a = new THREE.Vector3(points[0].x, points[0].y, points[0].z);
  const b = new THREE.Vector3(points[1].x, points[1].y, points[1].z);
  const c = new THREE.Vector3(points[2].x, points[2].y, points[2].z);
  
  const edge1 = new THREE.Vector3().subVectors(b, a);
  const edge2 = new THREE.Vector3().subVectors(c, a);
  
  const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();
  
  return normal;
}

/**
 * Project 3D points to 2D based on the dominant plane
 */
function projectPointsTo2D(points: Point[], plane: 'xy' | 'xz' | 'yz'): Point2D[] {
  return points.map(p => {
    if (plane === 'xy') {
      return { x: p.x, y: p.y };
    } else if (plane === 'xz') {
      return { x: p.x, y: p.z };
    } else {
      return { x: p.y, y: p.z };
    }
  });
}

/**
 * Calculate the bounds of a 2D polygon
 */
function calculateBounds(points: Point2D[]): { x: number, y: number, width: number, height: number } {
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;
  
  points.forEach(p => {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  });
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}

/**
 * Calculate the area of a 2D polygon
 */
function calculateArea2D(points: Point2D[]): number {
  // Shoelace formula for polygon area
  let area = 0;
  const n = points.length;
  
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  
  return Math.abs(area) / 2;
}

/**
 * Check if a point is inside a polygon (using ray casting algorithm)
 */
function isPointInPolygon(point: Point2D, polygon: Point2D[]): boolean {
  // Ray casting algorithm
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const intersect = ((polygon[i].y > point.y) !== (polygon[j].y > point.y)) &&
      (point.x < (polygon[j].x - polygon[i].x) * (point.y - polygon[i].y) / (polygon[j].y - polygon[i].y) + polygon[i].x);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Shrink a polygon by a specified distance
 */
function shrinkPolygon(polygon: Point2D[], distance: number): Point2D[] {
  if (polygon.length < 3) return [];
  
  // For simplicity, we'll use a conservative approach:
  // 1. Calculate the centroid
  // 2. For each vertex, move it towards the centroid by the distance
  
  // Calculate centroid
  let centroidX = 0, centroidY = 0;
  polygon.forEach(p => {
    centroidX += p.x;
    centroidY += p.y;
  });
  centroidX /= polygon.length;
  centroidY /= polygon.length;
  
  // Move each vertex towards the centroid
  return polygon.map(p => {
    // Calculate direction vector from point to centroid
    const dx = centroidX - p.x;
    const dy = centroidY - p.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    
    if (len < distance) {
      // If point is too close to centroid, we can't shrink properly
      return { x: p.x, y: p.y };
    }
    
    // Move point towards centroid by distance
    const ratio = distance / len;
    return {
      x: p.x + dx * ratio,
      y: p.y + dy * ratio
    };
  });
}

/**
 * Calculate the total power capacity of PV modules in kWp (kilowatt peak)
 * 
 * @param moduleCount - Number of PV modules
 * @param powerPerModule - Peak power per module in watts (default: 380W)
 * @returns Total power capacity in kWp
 */
export const calculatePVPower = (moduleCount: number, powerPerModule: number = 380): number => {
  return (moduleCount * powerPerModule) / 1000; // Convert watts to kilowatts
};

/**
 * Formats PV module information into a human-readable string
 */
export const formatPVModuleInfo = (pvInfo: PVModuleInfo): string => {
  const orientationText = pvInfo.orientation === 'portrait' ? 'Hochformat' : 'Querformat';
  return `${pvInfo.moduleCount} Module (${orientationText}), ${pvInfo.coveragePercent.toFixed(1)}% Abdeckung`;
};

/**
 * Create THREE.js objects to visualize the PV modules
 */
export const createPVModuleObjects = (pvInfo: PVModuleInfo): THREE.Group => {
  const modulesGroup = new THREE.Group();
  modulesGroup.name = "pvModules";
  
  if (!pvInfo.modulePositions || pvInfo.modulePositions.length === 0) {
    return modulesGroup;
  }
  
  pvInfo.modulePositions.forEach((modulePos, index) => {
    // Create a thin box to represent the module
    const moduleGeometry = new THREE.BoxGeometry(
      modulePos.width, 
      0.03, // Thin height for the panel
      modulePos.height
    );
    
    const moduleMaterial = new THREE.MeshLambertMaterial({
      color: 0x1a73e8, // Blue color for solar panels
      opacity: 0.85,
      transparent: true
    });
    
    const module = new THREE.Mesh(moduleGeometry, moduleMaterial);
    
    // Position the module
    module.position.set(modulePos.x, modulePos.y + 0.02, modulePos.z); // Slight Y offset
    
    // Add metadata
    module.userData = {
      type: 'pvModule',
      index,
      width: modulePos.width,
      height: modulePos.height,
      orientation: modulePos.orientation
    };
    
    modulesGroup.add(module);
  });
  
  return modulesGroup;
};
