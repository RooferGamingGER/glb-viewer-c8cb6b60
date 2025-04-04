import { Point, PVModuleInfo, PVModuleSpec, Measurement, PVMaterials, PVMountingSystem, PVElectricalSystem } from '@/types/measurements';
import { calculatePolygonArea, calculateQuadrilateralDimensions, generateSegments } from './measurementCalculations';
import * as THREE from 'three';

// Default PV Module dimensions (in meters)
const DEFAULT_MODULE_WIDTH = 1.0;
const DEFAULT_MODULE_HEIGHT = 1.7;

// Default PV Module specifications
const DEFAULT_MODULE_SPEC: PVModuleSpec = {
  manufacturer: 'Generic',
  model: 'Standard',
  width: DEFAULT_MODULE_WIDTH,
  height: DEFAULT_MODULE_HEIGHT,
  power: 380, // in Watts
  efficiency: 0.20,
  cost: 200, // in EUR
};

// Default PV System materials
const DEFAULT_PV_MATERIALS: PVMaterials = {
  pvModule: DEFAULT_MODULE_SPEC,
  inverter: {
    manufacturer: 'Generic',
    model: 'Standard',
    efficiency: 0.96,
    cost: 500, // in EUR
  },
  cables: {
    type: 'Copper',
    costPerMeter: 5, // in EUR/m
  },
  connectors: {
    type: 'MC4',
    costPerUnit: 2, // in EUR/unit
  },
  mountingSystem: {
    type: 'Roof Integrated',
    costPerModule: 50, // in EUR/module
  },
};

// Default PV Mounting System
const DEFAULT_MOUNTING_SYSTEM: PVMountingSystem = {
  type: 'Roof Integrated',
  costPerModule: 50, // in EUR/module
};

// Default PV Electrical System
const DEFAULT_ELECTRICAL_SYSTEM: PVElectricalSystem = {
  inverter: {
    manufacturer: 'Generic',
    model: 'Standard',
    efficiency: 0.96,
    cost: 500, // in EUR
  },
  cables: {
    type: 'Copper',
    costPerMeter: 5, // in EUR/m
  },
  connectors: {
    type: 'MC4',
    costPerUnit: 2, // in EUR/unit
  },
};

/**
 * Generate a grid layout for PV modules within a boundary
 */
export function generatePVModuleGrid(
  pvModuleInfo: PVModuleInfo, 
  baseHeight: number = 0
): { 
  modulePoints: THREE.Vector3[][], 
  gridLines: { from: THREE.Vector3, to: THREE.Vector3 }[] 
} {
  // Ensure moduleCount and boundary points exist
  if (!pvModuleInfo || !pvModuleInfo.moduleCount || !pvModuleInfo.boundaryPoints || pvModuleInfo.boundaryPoints.length < 3) {
    console.error("Invalid PV module info for grid generation");
    return { modulePoints: [], gridLines: [] };
  }
  
  // Extract info from pvModuleInfo
  const { 
    moduleCount, 
    orientation, 
    boundaryPoints, 
    rows, 
    columns, 
    pvModuleSpec,
    spacingX,
    spacingY,
    marginX,
    marginY,
    roofEdgeSegments,
    alignmentDirection
  } = pvModuleInfo;
  
  // Use default values if not provided
  const moduleWidth = pvModuleSpec?.width || DEFAULT_MODULE_WIDTH;
  const moduleHeight = pvModuleSpec?.height || DEFAULT_MODULE_HEIGHT;
  
  // Calculate module dimensions based on orientation
  const moduleWidthActual = orientation === 'landscape' ? moduleWidth : moduleHeight;
  const moduleHeightActual = orientation === 'landscape' ? moduleHeight : moduleWidth;
  
  console.log(`Generating PV grid with ${moduleCount} modules (${rows} rows × ${columns} columns)`, {
    orientation,
    moduleWidth: moduleWidthActual,
    moduleHeight: moduleHeightActual,
    boundaryPoints: boundaryPoints.length,
    spacingX,
    spacingY,
    marginX,
    marginY,
    hasRoofEdges: roofEdgeSegments && roofEdgeSegments.length > 0
  });
  
  // Convert boundary points to THREE.Vector3 for calculations
  const boundaryPoints3D = boundaryPoints.map(p => new THREE.Vector3(p.x, p.y || baseHeight, p.z));
  
  // Determine grid orientation vector - improved to use roof edge segments if available
  let orientationVector: THREE.Vector3;
  
  // Use provided alignment direction if available, otherwise use the first roof edge segment
  if (alignmentDirection) {
    // Use the user-provided alignment direction
    orientationVector = new THREE.Vector3(alignmentDirection.x, 0, alignmentDirection.z).normalize();
    console.log("Using provided alignment direction:", alignmentDirection);
  } 
  else if (roofEdgeSegments && roofEdgeSegments.length > 0) {
    // Use the first (longest) roof edge segment for alignment
    const segment = roofEdgeSegments[0];
    
    // Create direction vector in XZ plane (ignoring Y component for roof slope)
    const from = new THREE.Vector3(segment.from.x, 0, segment.from.z);
    const to = new THREE.Vector3(segment.to.x, 0, segment.to.z);
    
    orientationVector = new THREE.Vector3().subVectors(to, from).normalize();
    
    console.log("Using roof edge segment for alignment:", {
      from: [segment.from.x, segment.from.z],
      to: [segment.to.x, segment.to.z],
      vector: [orientationVector.x, orientationVector.z],
      length: new THREE.Vector3().subVectors(to, from).length()
    });
  } 
  else {
    // Fallback: use the first two boundary points
    const p0 = boundaryPoints3D[0];
    const p1 = boundaryPoints3D[1];
    
    // Create direction vector in XZ plane (ignoring Y component)
    orientationVector = new THREE.Vector3(
      p1.x - p0.x,
      0,
      p1.z - p0.z
    ).normalize();
    
    console.log("Fallback: Using boundary edge for alignment");
  }
  
  // Find perpendicular vector (in XZ plane)
  const perpendicularVector = new THREE.Vector3(-orientationVector.z, 0, orientationVector.x);
  
  // Calculate boundary center
  const center = new THREE.Vector3();
  boundaryPoints3D.forEach(p => center.add(p));
  center.divideScalar(boundaryPoints3D.length);
  
  // Apply base height
  center.y = baseHeight;
  
  // Calculate available area dimensions
  const totalWidth = columns * moduleWidthActual + (columns - 1) * spacingX;
  const totalHeight = rows * moduleHeightActual + (rows - 1) * spacingY;
  
  // Calculate start corner of grid (top left)
  const startCorner = new THREE.Vector3().copy(center)
    .sub(new THREE.Vector3(
      orientationVector.x * totalWidth / 2,
      0,
      orientationVector.z * totalWidth / 2
    ))
    .sub(new THREE.Vector3(
      perpendicularVector.x * totalHeight / 2,
      0,
      perpendicularVector.z * totalHeight / 2
    ));
  
  // Generate grid points for each module
  const modulePoints: THREE.Vector3[][] = [];
  const gridLines: { from: THREE.Vector3, to: THREE.Vector3 }[] = [];
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const moduleIndex = row * columns + col;
      
      // Skip if we've reached the requested module count
      if (moduleIndex >= moduleCount) break;
      
      // Calculate the position of this module's top-left corner
      const moduleCorner = new THREE.Vector3().copy(startCorner)
        .add(new THREE.Vector3(
          orientationVector.x * col * (moduleWidthActual + spacingX),
          0,
          orientationVector.z * col * (moduleWidthActual + spacingX)
        ))
        .add(new THREE.Vector3(
          perpendicularVector.x * row * (moduleHeightActual + spacingY),
          0,
          perpendicularVector.z * row * (moduleHeightActual + spacingY)
        ));
      
      // Calculate the four corners of this module
      const moduleCorners = [
        new THREE.Vector3().copy(moduleCorner), // Top-left
        new THREE.Vector3().copy(moduleCorner).add(new THREE.Vector3(
          orientationVector.x * moduleWidthActual,
          0,
          orientationVector.z * moduleWidthActual
        )), // Top-right
        new THREE.Vector3().copy(moduleCorner).add(new THREE.Vector3(
          orientationVector.x * moduleWidthActual,
          0,
          orientationVector.z * moduleWidthActual
        )).add(new THREE.Vector3(
          perpendicularVector.x * moduleHeightActual,
          0,
          perpendicularVector.z * moduleHeightActual
        )), // Bottom-right
        new THREE.Vector3().copy(moduleCorner).add(new THREE.Vector3(
          perpendicularVector.x * moduleHeightActual,
          0,
          perpendicularVector.z * moduleHeightActual
        )) // Bottom-left
      ];
      
      // Set Y values to baseHeight
      moduleCorners.forEach(corner => {
        corner.y = baseHeight;
      });
      
      // Add module corners to result
      modulePoints.push(moduleCorners);
      
      // Add grid lines for this module
      for (let i = 0; i < 4; i++) {
        gridLines.push({
          from: moduleCorners[i],
          to: moduleCorners[(i + 1) % 4]
        });
      }
    }
  }
  
  // Add boundary lines
  if (boundaryPoints3D.length > 0) {
    const p0 = startCorner;
    const p1 = new THREE.Vector3().copy(p0).add(new THREE.Vector3(
      orientationVector.x * totalWidth,
      0,
      orientationVector.z * totalWidth
    ));
    const p2 = new THREE.Vector3().copy(p1).add(new THREE.Vector3(
      perpendicularVector.x * totalHeight,
      0,
      perpendicularVector.z * totalHeight
    ));
    const p3 = new THREE.Vector3().copy(p0).add(new THREE.Vector3(
      perpendicularVector.x * totalHeight,
      0,
      perpendicularVector.z * totalHeight
    ));
    
    // Set Y values to baseHeight
    [p0, p1, p2, p3].forEach(p => {
      p.y = baseHeight;
    });
    
    // Add boundary lines
    gridLines.push({ from: p0, to: p1 });
    gridLines.push({ from: p1, to: p2 });
    gridLines.push({ from: p2, to: p3 });
    gridLines.push({ from: p3, to: p0 });
    
    // Add available area lines (adjusted by margin)
    const a0 = new THREE.Vector3().copy(p0).add(new THREE.Vector3(
      orientationVector.x * marginX + perpendicularVector.x * marginY,
      0,
      orientationVector.z * marginX + perpendicularVector.z * marginY
    ));
    const a1 = new THREE.Vector3().copy(p1).add(new THREE.Vector3(
      -orientationVector.x * marginX + perpendicularVector.x * marginY,
      0,
      -orientationVector.z * marginX + perpendicularVector.z * marginY
    ));
    const a2 = new THREE.Vector3().copy(p2).add(new THREE.Vector3(
      -orientationVector.x * marginX - perpendicularVector.x * marginY,
      0,
      -orientationVector.z * marginX - perpendicularVector.z * marginY
    ));
    const a3 = new THREE.Vector3().copy(p3).add(new THREE.Vector3(
      orientationVector.x * marginX - perpendicularVector.x * marginY,
      0,
      orientationVector.z * marginX - perpendicularVector.z * marginY
    ));
    
    // Set Y values to baseHeight
    [a0, a1, a2, a3].forEach(p => {
      p.y = baseHeight;
    });
    
    // Add available area lines
    gridLines.push({ from: a0, to: a1 });
    gridLines.push({ from: a1, to: a2 });
    gridLines.push({ from: a2, to: a3 });
    gridLines.push({ from: a3, to: a0 });
  }
  
  return { modulePoints, gridLines };
}
