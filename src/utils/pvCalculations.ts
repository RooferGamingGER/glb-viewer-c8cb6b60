
import { Point, PVModuleInfo } from '@/types/measurements';
import { calculatePolygonArea } from './measurementCalculations';

// Default PV module dimensions in meters
export const DEFAULT_MODULE_WIDTH = 1.041;
export const DEFAULT_MODULE_HEIGHT = 1.767;

/**
 * Calculates the optimal placement of PV modules on a roof area
 * 
 * @param points - The 3D points defining the roof area polygon
 * @param moduleWidth - Width of a single PV module in meters (default: 1.041m)
 * @param moduleHeight - Height of a single PV module in meters (default: 1.767m)
 * @returns Information about PV module placement
 */
export const calculatePVModulePlacement = (
  points: Point[], 
  moduleWidth: number = DEFAULT_MODULE_WIDTH, 
  moduleHeight: number = DEFAULT_MODULE_HEIGHT
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
  
  // Try module placement in both landscape and portrait orientations
  
  // Landscape orientation: width is along the longer dimension
  const isWidthLonger = boundingWidth > boundingHeight;
  
  // Calculate for landscape orientation (modules laid horizontally)
  const landscapeModulesX = Math.floor(boundingWidth / moduleWidth);
  const landscapeModulesY = Math.floor(boundingHeight / moduleHeight);
  const landscapeModuleCount = landscapeModulesX * landscapeModulesY;
  const landscapeArea = landscapeModuleCount * moduleWidth * moduleHeight;
  
  // Calculate for portrait orientation (modules laid vertically)
  const portraitModulesX = Math.floor(boundingWidth / moduleHeight);
  const portraitModulesY = Math.floor(boundingHeight / moduleWidth);
  const portraitModuleCount = portraitModulesX * portraitModulesY;
  const portraitArea = portraitModuleCount * moduleWidth * moduleHeight;
  
  // Choose the orientation that fits more modules
  const usePortrait = portraitModuleCount > landscapeModuleCount;
  
  // Apply an efficiency factor to account for irregularities in the roof shape
  const efficiencyFactor = 0.85; // Approximate factor to account for unusable spaces
  
  const moduleCount = Math.floor((usePortrait ? portraitModuleCount : landscapeModuleCount) * efficiencyFactor);
  const moduleArea = moduleCount * moduleWidth * moduleHeight;
  const coveragePercent = (area > 0) ? (moduleArea / area) * 100 : 0;
  
  return {
    moduleWidth,
    moduleHeight,
    moduleCount,
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
