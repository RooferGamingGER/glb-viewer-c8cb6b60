
import { Point, PVModuleInfo, PVModuleSpec, PVMaterials, PVMountingSystem, PVElectricalSystem } from '@/types/measurements';
import * as THREE from 'three';
import { calculateArea, projectPointsToPlane } from './measurementCalculations';

// Default edge distance in meters
export const DEFAULT_EDGE_DISTANCE = 0.3;

// Default module spacing in meters
export const DEFAULT_MODULE_SPACING = 0.02;

// Standard PV module templates
export const PV_MODULE_TEMPLATES: PVModuleSpec[] = [
  {
    name: 'Standard 400W Modul',
    width: 1.038,
    height: 1.755,
    power: 400,
    efficiency: 20.4
  },
  {
    name: 'Hochleistungsmodul 450W',
    width: 1.134,
    height: 2.094,
    power: 450,
    efficiency: 21.5
  },
  {
    name: 'Kompaktmodul 380W',
    width: 1.032,
    height: 1.726,
    power: 380,
    efficiency: 20.1
  }
];

// Calculate PV module placement on a roof area
export const calculatePVModulePlacement = (points: Point[]): PVModuleInfo => {
  if (points.length < 3) {
    return {
      moduleWidth: 0,
      moduleHeight: 0,
      moduleCount: 0,
      coveragePercent: 0,
      orientation: 'landscape'
    };
  }

  const moduleSpec = PV_MODULE_TEMPLATES[0];
  const moduleWidth = moduleSpec.width;
  const moduleHeight = moduleSpec.height;
  
  // Calculate the bounding box of the area
  const bbox = calculateBoundingBox(points);
  
  // Define the edge distance
  const edgeDistance = DEFAULT_EDGE_DISTANCE;
  
  // Calculate the available area dimensions accounting for edge distance
  const availableWidth = bbox.width - (edgeDistance * 2);
  const availableLength = bbox.height - (edgeDistance * 2);
  
  if (availableWidth <= 0 || availableLength <= 0) {
    return {
      moduleWidth,
      moduleHeight,
      moduleCount: 0,
      coveragePercent: 0,
      orientation: 'landscape',
      edgeDistance,
      moduleSpacing: DEFAULT_MODULE_SPACING,
      boundingWidth: bbox.width,
      boundingLength: bbox.height,
      minX: bbox.minX,
      maxX: bbox.maxX,
      minZ: bbox.minZ,
      maxZ: bbox.maxZ,
      actualArea: calculateArea(points)
    };
  }
  
  // Try both orientations and pick the one that fits more modules
  const landscapeModules = calculateModuleLayout(
    availableWidth, 
    availableLength, 
    moduleWidth, 
    moduleHeight,
    DEFAULT_MODULE_SPACING
  );
  
  const portraitModules = calculateModuleLayout(
    availableWidth, 
    availableLength, 
    moduleHeight, 
    moduleWidth,
    DEFAULT_MODULE_SPACING
  );
  
  let moduleCount, orientation, rows, columns;
  
  if (landscapeModules.count >= portraitModules.count) {
    moduleCount = landscapeModules.count;
    orientation = 'landscape';
    rows = landscapeModules.rows;
    columns = landscapeModules.columns;
  } else {
    moduleCount = portraitModules.count;
    orientation = 'portrait';
    rows = portraitModules.rows;
    columns = portraitModules.columns;
  }
  
  // Calculate the coverage percentage
  const totalArea = calculateArea(points);
  const moduleArea = moduleWidth * moduleHeight * moduleCount;
  const coveragePercent = totalArea > 0 ? (moduleArea / totalArea) * 100 : 0;
  
  return {
    moduleWidth,
    moduleHeight,
    moduleCount,
    coveragePercent,
    orientation,
    edgeDistance,
    moduleSpacing: DEFAULT_MODULE_SPACING,
    rows,
    columns,
    boundingWidth: bbox.width,
    boundingLength: bbox.height,
    availableWidth,
    availableLength,
    minX: bbox.minX,
    maxX: bbox.maxX,
    minZ: bbox.minZ,
    maxZ: bbox.maxZ,
    actualArea: totalArea,
    pvModuleSpec: moduleSpec
  };
};

// Calculate module layout based on available space
export const calculateModuleLayout = (
  availableWidth: number,
  availableLength: number,
  moduleWidth: number,
  moduleHeight: number,
  spacing: number
) => {
  // How many modules fit across the width (including spacing)
  const columnsWithoutSpacing = Math.floor(availableWidth / moduleWidth);
  const columnsWithSpacing = Math.floor(availableWidth / (moduleWidth + spacing));
  const columns = Math.max(0, spacing > 0 ? columnsWithSpacing : columnsWithoutSpacing);
  
  // How many modules fit along the length (including spacing)
  const rowsWithoutSpacing = Math.floor(availableLength / moduleHeight);
  const rowsWithSpacing = Math.floor(availableLength / (moduleHeight + spacing));
  const rows = Math.max(0, spacing > 0 ? rowsWithSpacing : rowsWithoutSpacing);
  
  return {
    columns,
    rows,
    count: columns * rows
  };
};

// Calculate the bounding box of a roof area
export const calculateBoundingBox = (points: Point[]) => {
  if (points.length === 0) {
    return { minX: 0, maxX: 0, minZ: 0, maxZ: 0, width: 0, height: 0 };
  }
  
  // Project the points to get the 2D representation
  const projectedPoints = projectPointsToPlane(points);
  
  let minX = projectedPoints[0].x;
  let maxX = projectedPoints[0].x;
  let minZ = projectedPoints[0].y;
  let maxZ = projectedPoints[0].y;
  
  for (let i = 1; i < projectedPoints.length; i++) {
    minX = Math.min(minX, projectedPoints[i].x);
    maxX = Math.max(maxX, projectedPoints[i].x);
    minZ = Math.min(minZ, projectedPoints[i].y);
    maxZ = Math.max(maxZ, projectedPoints[i].y);
  }
  
  return {
    minX,
    maxX,
    minZ,
    maxZ,
    width: maxX - minX,
    height: maxZ - minZ
  };
};

// Extract roof edge measurements to determine roof geometry
export const extractRoofEdgeMeasurements = (points: Point[]) => {
  if (points.length < 3) {
    return {
      valid: false,
      message: 'Nicht genügend Punkte für eine gültige Dachfläche'
    };
  }
  
  // Compute edge vectors
  const edges: Array<{
    start: Point,
    end: Point,
    length: number,
    vector: THREE.Vector3,
    normalized: THREE.Vector3
  }> = [];
  
  for (let i = 0; i < points.length; i++) {
    const start = points[i];
    const end = points[(i + 1) % points.length];
    
    const vector = new THREE.Vector3(
      end.x - start.x,
      end.y - start.y,
      end.z - start.z
    );
    
    const length = vector.length();
    const normalized = vector.clone().normalize();
    
    edges.push({
      start,
      end,
      length,
      vector,
      normalized
    });
  }
  
  return {
    valid: true,
    edges
  };
};
