
import { Point, PVModuleInfo, Point2D } from '@/types/measurements';
import { calculatePolygonArea } from './measurementCalculations';
import { projectPointsToPlane, triangulatePolygon } from './triangulation';
import * as THREE from 'three';

// Default PV module dimensions in meters
export const DEFAULT_MODULE_WIDTH = 1.041;
export const DEFAULT_MODULE_HEIGHT = 1.767;
export const DEFAULT_EDGE_DISTANCE = 0.1;   // 10cm from roof edge
export const DEFAULT_MODULE_SPACING = 0.05; // 5cm between modules

/**
 * Calculates the optimal placement of PV modules on a roof area with edge distance and module spacing
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
  // 1. First calculate the total area of the polygon
  const totalArea = calculatePolygonArea(points);
  
  // 2. Project points to 2D for easier placement calculation
  const { projectedPoints, planeNormal } = projectPointsToPlane(points);
  
  // 3. Find the bounding box of the projected points
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  
  projectedPoints.forEach(point => {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minZ = Math.min(minZ, point.z);
    maxZ = Math.max(maxZ, point.z);
  });
  
  // 4. Calculate the size of the bounding rectangle
  const boundingWidth = maxX - minX;
  const boundingHeight = maxZ - minZ;
  
  // 5. Calculate effective module dimensions including spacing
  const effectiveModuleWidth = moduleWidth + moduleSpacing;
  const effectiveModuleHeight = moduleHeight + moduleSpacing;
  
  // 6. Calculate reduced area dimensions after applying edge distance
  const reducedWidth = Math.max(0, boundingWidth - (2 * edgeDistance));
  const reducedHeight = Math.max(0, boundingHeight - (2 * edgeDistance));
  
  // Skip if the area is too small after applying edge distance
  if (reducedWidth <= 0 || reducedHeight <= 0) {
    return {
      moduleWidth,
      moduleHeight,
      moduleCount: 0,
      coveragePercent: 0,
      orientation: 'portrait',
      edgeDistance,
      moduleSpacing,
      availableArea: 0,
      modulesX: 0,
      modulesY: 0,
      effectiveWidth: effectiveModuleWidth,
      effectiveHeight: effectiveModuleHeight
    };
  }
  
  // 7. Calculate how many modules fit in portrait and landscape orientations
  // Portrait: Modules are taller than wide (height > width)
  const portraitModulesX = Math.floor(reducedWidth / effectiveModuleWidth);
  const portraitModulesY = Math.floor(reducedHeight / effectiveModuleHeight);
  const portraitModuleCount = portraitModulesX * portraitModulesY;
  
  // Landscape: Modules are wider than tall (width > height)
  const landscapeModulesX = Math.floor(reducedWidth / effectiveModuleHeight);
  const landscapeModulesY = Math.floor(reducedHeight / effectiveModuleWidth);
  const landscapeModuleCount = landscapeModulesX * landscapeModulesY;
  
  // 8. Choose the orientation that fits more modules
  const usePortrait = portraitModuleCount >= landscapeModuleCount;
  
  // Calculate final values based on chosen orientation
  const finalModulesX = usePortrait ? portraitModulesX : landscapeModulesX;
  const finalModulesY = usePortrait ? portraitModulesY : landscapeModulesY;
  const finalModuleCount = usePortrait ? portraitModuleCount : landscapeModuleCount;
  const finalEffectiveWidth = usePortrait ? effectiveModuleWidth : effectiveModuleHeight;
  const finalEffectiveHeight = usePortrait ? effectiveModuleHeight : effectiveModuleWidth;
  
  // 9. Calculate module positions (top-left corners)
  const modulePositions: Point2D[] = [];
  
  for (let y = 0; y < finalModulesY; y++) {
    for (let x = 0; x < finalModulesX; x++) {
      // Calculate the position of the module's top-left corner
      const posX = minX + edgeDistance + (x * finalEffectiveWidth);
      const posZ = minZ + edgeDistance + (y * finalEffectiveHeight);
      
      // Add the position to the array
      modulePositions.push({ x: posX, y: posZ });
    }
  }
  
  // 10. Calculate available area and coverage percentage
  const availableArea = reducedWidth * reducedHeight;
  const moduleArea = finalModuleCount * moduleWidth * moduleHeight;
  const coveragePercent = (totalArea > 0) ? (moduleArea / totalArea) * 100 : 0;
  
  return {
    moduleWidth,
    moduleHeight,
    moduleCount: finalModuleCount,
    coveragePercent: Math.min(coveragePercent, 100), // Cap at 100%
    orientation: usePortrait ? 'portrait' : 'landscape',
    edgeDistance,
    moduleSpacing,
    modulePositions,
    availableArea,
    modulesX: finalModulesX,
    modulesY: finalModulesY,
    effectiveWidth: finalEffectiveWidth,
    effectiveHeight: finalEffectiveHeight
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
  const layout = pvInfo.modulesX && pvInfo.modulesY ? `${pvInfo.modulesX}×${pvInfo.modulesY}` : '';
  return `${pvInfo.moduleCount} Module (${orientationText}${layout ? `, ${layout}` : ''}), ${pvInfo.coveragePercent.toFixed(1)}% Abdeckung`;
};

/**
 * Creates THREE.js visualization objects for PV modules
 */
export const createPVModuleVisuals = (
  pvInfo: PVModuleInfo,
  color: number = 0x2266cc
): THREE.Group => {
  const group = new THREE.Group();
  group.name = "pvModules";
  
  if (!pvInfo.modulePositions || pvInfo.modulePositions.length === 0) {
    return group;
  }
  
  // Material for the PV modules
  const material = new THREE.MeshStandardMaterial({
    color: color,
    metalness: 0.7,
    roughness: 0.3,
    side: THREE.DoubleSide
  });
  
  // Frame material
  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x888888,
    metalness: 0.5,
    roughness: 0.4
  });
  
  // Determine the actual width and height based on orientation
  const moduleWidth = pvInfo.orientation === 'portrait' ? pvInfo.moduleWidth : pvInfo.moduleHeight;
  const moduleHeight = pvInfo.orientation === 'portrait' ? pvInfo.moduleHeight : pvInfo.moduleWidth;
  
  // Create a module for each position
  pvInfo.modulePositions.forEach((pos, index) => {
    // Create module geometry
    const moduleGeometry = new THREE.BoxGeometry(moduleWidth, 0.04, moduleHeight);
    const module = new THREE.Mesh(moduleGeometry, material);
    
    // Position the module
    module.position.set(
      pos.x + (moduleWidth / 2),
      0.02, // Slightly above the roof surface
      pos.y + (moduleHeight / 2)
    );
    
    // Add frame
    const frameThickness = 0.02;
    const innerWidth = moduleWidth - (frameThickness * 2);
    const innerHeight = moduleHeight - (frameThickness * 2);
    
    // Create frame segments
    const frameSegments = [
      // Top frame
      new THREE.BoxGeometry(moduleWidth, 0.05, frameThickness),
      // Bottom frame
      new THREE.BoxGeometry(moduleWidth, 0.05, frameThickness),
      // Left frame
      new THREE.BoxGeometry(frameThickness, 0.05, innerHeight),
      // Right frame
      new THREE.BoxGeometry(frameThickness, 0.05, innerHeight)
    ];
    
    // Position frame segments
    const framePositions = [
      [0, 0, -(moduleHeight/2) + (frameThickness/2)],
      [0, 0, (moduleHeight/2) - (frameThickness/2)],
      [-(moduleWidth/2) + (frameThickness/2), 0, 0],
      [(moduleWidth/2) - (frameThickness/2), 0, 0]
    ];
    
    // Add frame segments to the module
    frameSegments.forEach((geometry, i) => {
      const framePart = new THREE.Mesh(geometry, frameMaterial);
      framePart.position.set(
        framePositions[i][0],
        framePositions[i][1] + 0.01, // Slightly above the module
        framePositions[i][2]
      );
      module.add(framePart);
    });
    
    // Add metadata
    module.userData = {
      type: 'pvModule',
      index: index,
      width: moduleWidth,
      height: moduleHeight
    };
    
    group.add(module);
  });
  
  return group;
};
