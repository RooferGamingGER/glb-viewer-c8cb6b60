
import * as THREE from 'three';
import { Measurement, Point, PVModuleInfo, RoofOrientation } from '@/types/measurements';
import { calculatePolygonArea } from './measurementCalculations';

// Default PV module dimensions in meters
export const DEFAULT_MODULE_WIDTH = 1.041;
export const DEFAULT_MODULE_HEIGHT = 1.767;

// Default distances in meters
export const DEFAULT_EDGE_DISTANCE = 0.1;  // 10cm from roof edge
export const DEFAULT_MODULE_SPACING = 0.05;  // 5cm between modules

/**
 * Detect ridge and eave lines from available measurements to determine optimal orientation
 * 
 * @param roofArea - The roof area measurement
 * @param allMeasurements - All measurements to check for ridge and eave
 * @returns Roof orientation information
 */
export const detectRoofOrientation = (
  roofArea: Measurement,
  allMeasurements: Measurement[]
): RoofOrientation => {
  const orientation: RoofOrientation = {};
  
  // Find ridge and eave measurements that might be related to this roof area
  const ridgeMeasurements = allMeasurements.filter(m => m.type === 'ridge');
  const eaveMeasurements = allMeasurements.filter(m => m.type === 'eave');
  
  // Function to check if a line is near/inside the roof area
  const isNearRoofArea = (linePoints: Point[]): boolean => {
    // Basic proximity check - at least one point should be near the roof area
    // For a real implementation, this would use more sophisticated spatial checks
    const roofMinX = Math.min(...roofArea.points.map(p => p.x));
    const roofMaxX = Math.max(...roofArea.points.map(p => p.x));
    const roofMinZ = Math.min(...roofArea.points.map(p => p.z));
    const roofMaxZ = Math.max(...roofArea.points.map(p => p.z));
    
    // Expand the bounds slightly to catch nearby elements
    const expandedMinX = roofMinX - 0.5;
    const expandedMaxX = roofMaxX + 0.5;
    const expandedMinZ = roofMinZ - 0.5;
    const expandedMaxZ = roofMaxZ + 0.5;
    
    return linePoints.some(p => 
      p.x >= expandedMinX && p.x <= expandedMaxX && 
      p.z >= expandedMinZ && p.z <= expandedMaxZ
    );
  };
  
  // Find closest ridge
  let closestRidge: Measurement | null = null;
  let minRidgeDistance = Infinity;
  
  for (const ridge of ridgeMeasurements) {
    if (isNearRoofArea(ridge.points)) {
      // Calculate approximate "center" of the roof area
      const roofCenterX = roofArea.points.reduce((sum, p) => sum + p.x, 0) / roofArea.points.length;
      const roofCenterZ = roofArea.points.reduce((sum, p) => sum + p.z, 0) / roofArea.points.length;
      
      // Calculate distance from ridge to roof center
      const ridgeCenterX = ridge.points.reduce((sum, p) => sum + p.x, 0) / ridge.points.length;
      const ridgeCenterZ = ridge.points.reduce((sum, p) => sum + p.z, 0) / ridge.points.length;
      
      const distance = Math.sqrt(
        Math.pow(ridgeCenterX - roofCenterX, 2) + 
        Math.pow(ridgeCenterZ - roofCenterZ, 2)
      );
      
      if (distance < minRidgeDistance) {
        minRidgeDistance = distance;
        closestRidge = ridge;
      }
    }
  }
  
  // Find closest eave
  let closestEave: Measurement | null = null;
  let minEaveDistance = Infinity;
  
  for (const eave of eaveMeasurements) {
    if (isNearRoofArea(eave.points)) {
      // Calculate approximate "center" of the roof area
      const roofCenterX = roofArea.points.reduce((sum, p) => sum + p.x, 0) / roofArea.points.length;
      const roofCenterZ = roofArea.points.reduce((sum, p) => sum + p.z, 0) / roofArea.points.length;
      
      // Calculate distance from eave to roof center
      const eaveCenterX = eave.points.reduce((sum, p) => sum + p.x, 0) / eave.points.length;
      const eaveCenterZ = eave.points.reduce((sum, p) => sum + p.z, 0) / eave.points.length;
      
      const distance = Math.sqrt(
        Math.pow(eaveCenterX - roofCenterX, 2) + 
        Math.pow(eaveCenterZ - roofCenterZ, 2)
      );
      
      if (distance < minEaveDistance) {
        minEaveDistance = distance;
        closestEave = eave;
      }
    }
  }
  
  // If we found a ridge, calculate its direction vector
  if (closestRidge && closestRidge.points.length >= 2) {
    const p1 = closestRidge.points[0];
    const p2 = closestRidge.points[1];
    
    const ridgeDirection = new THREE.Vector3(
      p2.x - p1.x,
      p2.y - p1.y,
      p2.z - p1.z
    ).normalize();
    
    orientation.ridgeDirection = ridgeDirection;
    orientation.ridgeId = closestRidge.id;
  }
  
  // If we found an eave, calculate its direction vector
  if (closestEave && closestEave.points.length >= 2) {
    const p1 = closestEave.points[0];
    const p2 = closestEave.points[1];
    
    const eaveDirection = new THREE.Vector3(
      p2.x - p1.x,
      p2.y - p1.y,
      p2.z - p1.z
    ).normalize();
    
    orientation.eaveDirection = eaveDirection;
    orientation.eaveId = closestEave.id;
  }
  
  // Determine the principal direction (ridge or eave)
  // Typically, modules are installed parallel to the eave, perpendicular to the ridge-to-eave line
  if (orientation.eaveDirection) {
    orientation.principalDirection = "eave";
  } else if (orientation.ridgeDirection) {
    orientation.principalDirection = "ridge";
  }
  
  return orientation;
}

/**
 * Calculate the optimal module layout when aligned with the roof structure
 * 
 * @param points - The points defining the roof area
 * @param orientation - The detected roof orientation
 * @param moduleWidth - Width of a module
 * @param moduleHeight - Height of a module
 * @param edgeDistance - Distance from roof edge
 * @param moduleSpacing - Spacing between modules
 * @returns Module count and whether to use portrait or landscape orientation
 */
export const calculateAlignedModulePlacement = (
  points: Point[],
  orientation: RoofOrientation,
  moduleWidth: number,
  moduleHeight: number,
  edgeDistance: number,
  moduleSpacing: number
): { moduleCount: number, usePortrait: boolean } => {
  // This is a simplified implementation
  // In a real-world scenario, this would use the roof orientation to:
  // 1. Project the roof points onto the principal direction plane
  // 2. Calculate available rows and columns along principal directions
  // 3. Determine optimal module layout
  
  // For now, we'll use a simplified approach using the bounding box
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  
  points.forEach(point => {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minZ = Math.min(minZ, point.z);
    maxZ = Math.max(maxZ, point.z);
  });
  
  // Calculate the width along the eave direction (if available)
  // For simplicity in this implementation, we'll align with the X and Z axes
  const width = maxX - minX;
  const length = maxZ - minZ;
  
  // Calculate available area after applying edge distance
  const availableWidth = Math.max(0, width - (2 * edgeDistance));
  const availableLength = Math.max(0, length - (2 * edgeDistance));
  
  // Portrait orientation (modules perpendicular to eave)
  const portraitModulesX = Math.floor(availableWidth / (moduleWidth + moduleSpacing));
  const portraitModulesY = Math.floor(availableLength / (moduleHeight + moduleSpacing));
  const portraitModuleCount = portraitModulesX * portraitModulesY;
  
  // Landscape orientation (modules parallel to eave)
  const landscapeModulesX = Math.floor(availableWidth / (moduleHeight + moduleSpacing));
  const landscapeModulesY = Math.floor(availableLength / (moduleWidth + moduleSpacing));
  const landscapeModuleCount = landscapeModulesX * landscapeModulesY;
  
  // Choose orientation with more modules
  const usePortrait = portraitModuleCount >= landscapeModuleCount;
  const moduleCount = usePortrait ? portraitModuleCount : landscapeModuleCount;
  
  return { moduleCount, usePortrait };
}

/**
 * Calculates the optimal placement of PV modules on a roof area
 * 
 * @param points - The 3D points defining the roof area polygon
 * @param moduleWidth - Width of a single PV module in meters (default: 1.041m)
 * @param moduleHeight - Height of a single PV module in meters (default: 1.767m)
 * @param edgeDistance - Distance from the roof edge in meters (default: 0.1m)
 * @param moduleSpacing - Spacing between modules in meters (default: 0.05m)
 * @param roofMeasurement - The full roof measurement object (optional)
 * @param allMeasurements - All measurements for detecting ridge and eave (optional)
 * @returns Information about PV module placement
 */
export const calculatePVModulePlacement = (
  points: Point[], 
  moduleWidth: number = DEFAULT_MODULE_WIDTH, 
  moduleHeight: number = DEFAULT_MODULE_HEIGHT,
  edgeDistance: number = DEFAULT_EDGE_DISTANCE,
  moduleSpacing: number = DEFAULT_MODULE_SPACING,
  roofMeasurement?: Measurement,
  allMeasurements?: Measurement[]
): PVModuleInfo => {
  // Calculate the area of the polygon
  const area = calculatePolygonArea(points);
  
  // Detect roof orientation if we have all measurements
  const roofOrientation = (roofMeasurement && allMeasurements) 
    ? detectRoofOrientation(roofMeasurement, allMeasurements) 
    : undefined;
  
  // Calculate the minimum and maximum X and Z coordinates (not Y, because Y is height)
  // This ensures we get the actual roof surface dimensions
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  
  points.forEach(point => {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minZ = Math.min(minZ, point.z);
    maxZ = Math.max(maxZ, point.z);
  });
  
  // Calculate approximate dimensions of the bounding rectangle
  const boundingWidth = maxX - minX;
  const boundingLength = maxZ - minZ;
  
  // Calculate the available area after applying edge distance
  const availableWidth = Math.max(0, boundingWidth - (2 * edgeDistance));
  const availableLength = Math.max(0, boundingLength - (2 * edgeDistance));
  
  // DEBUG: Log calculation values to diagnose the issue
  console.log("PV Calculation Debug:", {
    area,
    boundingWidth,
    boundingLength,
    availableWidth,
    availableLength,
    moduleWidth,
    moduleHeight,
    edgeDistance,
    moduleSpacing,
    hasRoofOrientation: !!roofOrientation
  });
  
  let moduleCount, usePortrait;
  
  // If we have roof orientation, use the aligned calculation
  if (roofOrientation && (roofOrientation.ridgeDirection || roofOrientation.eaveDirection)) {
    const alignedResult = calculateAlignedModulePlacement(
      points, 
      roofOrientation, 
      moduleWidth, 
      moduleHeight, 
      edgeDistance, 
      moduleSpacing
    );
    moduleCount = alignedResult.moduleCount;
    usePortrait = alignedResult.usePortrait;
    
    console.log("Aligned PV calculation result:", {
      moduleCount,
      usePortrait,
      orientationSource: roofOrientation.principalDirection
    });
  } else {
    // Standard calculation without roof orientation
    // FIXED CALCULATION: Portrait orientation calculations
    // How many complete modules fit along width
    const portraitModulesX = Math.max(0, Math.floor(availableWidth / (moduleWidth + moduleSpacing)));
    
    // How many complete modules fit along length
    const portraitModulesY = Math.max(0, Math.floor(availableLength / (moduleHeight + moduleSpacing)));
    
    // Total modules in portrait orientation
    const portraitModuleCount = portraitModulesX * portraitModulesY;
    
    // FIXED CALCULATION: Landscape orientation calculations
    // How many complete modules fit along width
    const landscapeModulesX = Math.max(0, Math.floor(availableWidth / (moduleHeight + moduleSpacing)));
    
    // How many complete modules fit along length
    const landscapeModulesY = Math.max(0, Math.floor(availableLength / (moduleWidth + moduleSpacing)));
    
    // Total modules in landscape orientation
    const landscapeModuleCount = landscapeModulesX * landscapeModulesY;
    
    // DEBUG: Log the module counts to diagnose the issue
    console.log("PV Module Counts:", {
      portraitModulesX,
      portraitModulesY,
      portraitModuleCount,
      landscapeModulesX,
      landscapeModulesY,
      landscapeModuleCount
    });
    
    // Choose the orientation that fits more modules
    usePortrait = portraitModuleCount >= landscapeModuleCount;
    moduleCount = usePortrait ? portraitModuleCount : landscapeModuleCount;
  }
  
  // Calculate the actual area covered by the modules (without spacing at the outer edges)
  const moduleArea = moduleCount * moduleWidth * moduleHeight;
  
  // Calculate coverage percentage
  const coveragePercent = (area > 0) ? (moduleArea / area) * 100 : 0;
  
  return {
    moduleWidth,
    moduleHeight,
    moduleCount,
    edgeDistance,
    moduleSpacing,
    coveragePercent: Math.min(coveragePercent, 100), // Cap at 100%
    orientation: usePortrait ? 'portrait' : 'landscape',
    roofOrientation,
    alignWithRoof: !!roofOrientation && (!!roofOrientation.ridgeDirection || !!roofOrientation.eaveDirection)
  };
};

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
  const alignmentText = pvInfo.alignWithRoof ? ' (firstausgerichtet)' : '';
  return `${pvInfo.moduleCount} Module (${orientationText}${alignmentText}), ${pvInfo.coveragePercent.toFixed(1)}% Abdeckung`;
};
