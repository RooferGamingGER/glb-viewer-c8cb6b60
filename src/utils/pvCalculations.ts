
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
  
  // DEBUG: Log calculation values to diagnose the issue
  console.log("PV Calculation Debug:", {
    area,
    boundingWidth,
    boundingHeight,
    availableWidth,
    availableHeight,
    moduleWidth,
    moduleHeight,
    edgeDistance,
    moduleSpacing
  });
  
  // Calculate how many modules can fit in each direction
  // For portrait orientation (height > width)
  // We need to account for spacing between modules, but not after the last module
  
  // Portrait orientation calculations
  // How many complete modules+spacing units fit along width
  let portraitModulesX = Math.floor((availableWidth + moduleSpacing) / (moduleWidth + moduleSpacing));
  // How many complete modules+spacing units fit along height
  let portraitModulesY = Math.floor((availableHeight + moduleSpacing) / (moduleHeight + moduleSpacing));
  
  // Ensure we have at least 1 module if there's enough space for it
  portraitModulesX = Math.max(portraitModulesX, availableWidth >= moduleWidth ? 1 : 0);
  portraitModulesY = Math.max(portraitModulesY, availableHeight >= moduleHeight ? 1 : 0);
  
  // Total modules in portrait orientation
  const portraitModuleCount = portraitModulesX * portraitModulesY;
  
  // Landscape orientation calculations
  // How many complete modules+spacing units fit along width
  let landscapeModulesX = Math.floor((availableWidth + moduleSpacing) / (moduleHeight + moduleSpacing));
  // How many complete modules+spacing units fit along height
  let landscapeModulesY = Math.floor((availableHeight + moduleSpacing) / (moduleWidth + moduleSpacing));
  
  // Ensure we have at least 1 module if there's enough space for it
  landscapeModulesX = Math.max(landscapeModulesX, availableWidth >= moduleHeight ? 1 : 0);
  landscapeModulesY = Math.max(landscapeModulesY, availableHeight >= moduleWidth ? 1 : 0);
  
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
