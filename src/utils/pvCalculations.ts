
import { Point, PVModuleInfo } from '@/types/measurements';
import { calculatePolygonArea } from './measurementCalculations';

// Default PV module dimensions in meters
export const DEFAULT_MODULE_WIDTH = 1.041;
export const DEFAULT_MODULE_HEIGHT = 1.767;

// Default distances in meters
export const DEFAULT_EDGE_DISTANCE = 0.1;  // 10cm from roof edge
export const DEFAULT_MODULE_SPACING = 0.05;  // 5cm between modules

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
  // Calculate the area of the polygon
  const area = calculatePolygonArea(points);
  
  // Calculate the minimum and maximum X and Y coordinates
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  
  points.forEach(point => {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  });
  
  // Calculate approximate dimensions of the bounding rectangle
  const boundingWidth = maxX - minX;
  const boundingHeight = maxY - minY;
  
  // Calculate the available area after applying edge distance
  const availableWidth = Math.max(0, boundingWidth - (2 * edgeDistance));
  const availableHeight = Math.max(0, boundingHeight - (2 * edgeDistance));
  
  // Calculate effective module dimensions including spacing
  // For correct calculation, we need to consider:
  // - Each module takes its own dimensions
  // - Each module needs spacing on one side (the last module in each row/column doesn't need extra spacing)
  
  // Calculate for portrait orientation (height is the larger dimension)
  // Number of modules that can fit in the width 
  const portraitModulesX = Math.floor(availableWidth / (moduleWidth + moduleSpacing));
  // Number of modules that can fit in the height
  const portraitModulesY = Math.floor(availableHeight / (moduleHeight + moduleSpacing));
  // Total portrait modules
  const portraitModuleCount = portraitModulesX * portraitModulesY;
  
  // Calculate for landscape orientation (width is the larger dimension)
  // Number of modules that can fit in the width
  const landscapeModulesX = Math.floor(availableWidth / (moduleHeight + moduleSpacing));
  // Number of modules that can fit in the height
  const landscapeModulesY = Math.floor(availableHeight / (moduleWidth + moduleSpacing));
  // Total landscape modules
  const landscapeModuleCount = landscapeModulesX * landscapeModulesY;
  
  // Choose the orientation that fits more modules
  const usePortrait = portraitModuleCount >= landscapeModuleCount;
  
  // Final module count
  const moduleCount = usePortrait ? portraitModuleCount : landscapeModuleCount;
  
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
    orientation: usePortrait ? 'portrait' : 'landscape'
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
  return `${pvInfo.moduleCount} Module (${orientationText}), ${pvInfo.coveragePercent.toFixed(1)}% Abdeckung`;
};
