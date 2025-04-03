
import { Measurement, PVModuleSpec, PVModuleInfo } from '@/types/measurements';
import { calculateArea, calculateDistance } from './measurementCalculations';
import * as THREE from 'three';

// Default PV module templates
export const PV_MODULE_TEMPLATES: PVModuleSpec[] = [
  {
    name: 'Standard 425W',
    width: 1.1,  // 1.1m
    height: 1.8, // 1.8m
    power: 425,  // 425W
    efficiency: 21.5  // 21.5%
  },
  {
    name: 'Premium 450W',
    width: 1.05,
    height: 1.9,
    power: 450,
    efficiency: 22.8
  },
  {
    name: 'Compact 380W',
    width: 1.0,
    height: 1.7,
    power: 380,
    efficiency: 20.4
  }
];

// Default edge distance and spacing constants
export const DEFAULT_EDGE_DISTANCE = 0.5; // 50cm from roof edge
export const DEFAULT_MODULE_SPACING = 0.02; // 2cm between modules

// Calculates PV power in kilowatts
export const calculatePVPower = (moduleCount: number, modulePower: number = 425): number => {
  return (moduleCount * modulePower) / 1000; // Convert to kWp
};

// Estimates annual yield based on power and location-specific yield factor
export const calculateAnnualYield = (powerKWp: number, yieldFactor: number = 950): number => {
  return powerKWp * yieldFactor; // kWh per year
};

// Calculate PV module placement on a roof area
export const calculatePVModulePlacement = (
  measurement: Measurement,
  pvModuleInfo: PVModuleInfo
): PVModuleInfo => {
  // Get dimensions of the area
  const { points } = measurement;
  
  // Simple rectangular approximation if not a rectangle
  const boundingBox = new THREE.Box3();
  const tempVector = new THREE.Vector3();
  
  // Add all points to calculate bounding box
  points.forEach(point => {
    tempVector.set(point.x, point.y, point.z);
    boundingBox.expandByPoint(tempVector);
  });
  
  // Get dimensions from bounding box
  const size = new THREE.Vector3();
  boundingBox.getSize(size);
  
  // Get module dimensions
  const moduleWidth = pvModuleInfo.moduleWidth;
  const moduleHeight = pvModuleInfo.moduleHeight;
  const edgeDistance = pvModuleInfo.edgeDistance || DEFAULT_EDGE_DISTANCE;
  const moduleSpacing = pvModuleInfo.moduleSpacing || DEFAULT_MODULE_SPACING;
  
  // Calculate available area dimensions after edge distance
  const availableWidth = size.x - (2 * edgeDistance);
  const availableLength = size.z - (2 * edgeDistance);
  
  // Calculate how many modules fit in each direction
  let columns, rows;
  let orientation = pvModuleInfo.orientation;
  
  if (orientation === 'portrait') {
    columns = Math.floor((availableWidth + moduleSpacing) / (moduleWidth + moduleSpacing));
    rows = Math.floor((availableLength + moduleSpacing) / (moduleHeight + moduleSpacing));
  } else {
    columns = Math.floor((availableWidth + moduleSpacing) / (moduleHeight + moduleSpacing));
    rows = Math.floor((availableLength + moduleSpacing) / (moduleWidth + moduleSpacing));
  }
  
  // Calculate total modules
  const moduleCount = columns * rows;
  
  // Calculate coverage percentage
  const actualArea = calculateArea(points);
  const totalModuleArea = moduleWidth * moduleHeight * moduleCount;
  const coveragePercent = Math.min((totalModuleArea / actualArea) * 100, 100);
  
  // Create updated PV module info
  return {
    ...pvModuleInfo,
    moduleCount,
    columns,
    rows,
    boundingWidth: size.x,
    boundingLength: size.z,
    boundingHeight: size.y,
    availableWidth,
    availableLength,
    actualArea,
    coveragePercent,
    // Calculate start positions for grid
    startX: boundingBox.min.x + edgeDistance,
    startZ: boundingBox.min.z + edgeDistance,
    minX: boundingBox.min.x,
    maxX: boundingBox.max.x,
    minZ: boundingBox.min.z,
    maxZ: boundingBox.max.z
  };
};

// Extract roof edge measurements for determining roof azimuth and inclination
export const extractRoofEdgeMeasurements = (
  measurements: Measurement[],
  areaId: string
): { ridges: Measurement[], eaves: Measurement[], verges: Measurement[] } => {
  // Find the area measurement
  const areaMeasurement = measurements.find(m => m.id === areaId);
  if (!areaMeasurement) {
    return { ridges: [], eaves: [], verges: [] };
  }
  
  // Get the bounding points of the area
  const { points } = areaMeasurement;
  
  // Create a bounding box for the area
  const boundingBox = new THREE.Box3();
  const tempVector = new THREE.Vector3();
  
  points.forEach(point => {
    tempVector.set(point.x, point.y, point.z);
    boundingBox.expandByPoint(tempVector);
  });
  
  // Find all roof edge measurements
  const ridges = measurements.filter(m => m.type === 'ridge');
  const eaves = measurements.filter(m => m.type === 'eave');
  const verges = measurements.filter(m => m.type === 'verge');
  
  // Filter only those that are close to or intersect the area's bounding box
  const isClose = (edge: Measurement): boolean => {
    return edge.points.some(point => {
      tempVector.set(point.x, point.y, point.z);
      return boundingBox.containsPoint(tempVector) || 
        boundingBox.distanceToPoint(tempVector) < 1; // Within 1m
    });
  };
  
  return {
    ridges: ridges.filter(isClose),
    eaves: eaves.filter(isClose),
    verges: verges.filter(isClose)
  };
};
