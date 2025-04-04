
import * as THREE from 'three';
import { PVModuleInfo, Point } from '@/types/measurements';

// Default visuals for PV modules
export const DEFAULT_MODULE_VISUALS = {
  frameBorder: 0.02,          // 2cm frame border
  frameColor: 0x444444,       // Dark grey frame
  panelColor: 0x0a4b8f,       // Dark blue panel
  cellRows: 6,                // 6 rows of cells
  cellColumns: 10,            // 10 columns of cells
  cellSpacing: 0.005,         // 5mm spacing between cells
  cellColor: 0x225289,        // Slightly brighter blue for cells
  busbarCount: 3              // 3 busbars per cell
};

/**
 * Creates a detailed PV module mesh with frame, panel and cells
 */
export const createDetailedPVModuleMesh = (
  position: THREE.Vector3,
  width: number,
  height: number,
  rotation: number,
  normal: THREE.Vector3,
  visuals = DEFAULT_MODULE_VISUALS,
  measurementId: string,
  moduleIndex: number
): THREE.Group => {
  // Create a group to hold all module elements
  const moduleGroup = new THREE.Group();
  moduleGroup.name = `pvModule_${moduleIndex}`;
  moduleGroup.userData = {
    isPVModule: true,
    measurementId: measurementId,
    moduleIndex: moduleIndex
  };
  
  // 1. Create the module frame (outer rectangle)
  const frameGeometry = new THREE.PlaneGeometry(width, height);
  const frameMaterial = new THREE.MeshBasicMaterial({
    color: visuals.frameColor,
    side: THREE.DoubleSide,
    transparent: false
  });
  const frameMesh = new THREE.Mesh(frameGeometry, frameMaterial);
  frameMesh.name = `pvModuleFrame_${moduleIndex}`;
  frameMesh.userData = {
    isPVModule: true,
    moduleElementType: 'frame',
    measurementId: measurementId,
    moduleIndex: moduleIndex
  };
  
  // 2. Create the module panel (inner rectangle)
  const innerWidth = width - (visuals.frameBorder * 2);
  const innerHeight = height - (visuals.frameBorder * 2);
  const panelGeometry = new THREE.PlaneGeometry(innerWidth, innerHeight);
  const panelMaterial = new THREE.MeshBasicMaterial({
    color: visuals.panelColor,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.9
  });
  const panelMesh = new THREE.Mesh(panelGeometry, panelMaterial);
  panelMesh.name = `pvModulePanel_${moduleIndex}`;
  panelMesh.userData = {
    isPVModulePanel: true,
    measurementId: measurementId,
    moduleIndex: moduleIndex
  };
  panelMesh.position.y = 0.001; // Slightly above frame
  
  // 3. Create the individual cells
  const cellGroup = new THREE.Group();
  cellGroup.name = `pvModuleCells_${moduleIndex}`;
  
  // Calculate cell sizes
  const totalCellSpacingWidth = visuals.cellSpacing * (visuals.cellColumns - 1);
  const totalCellSpacingHeight = visuals.cellSpacing * (visuals.cellRows - 1);
  const cellWidth = (innerWidth - totalCellSpacingWidth) / visuals.cellColumns;
  const cellHeight = (innerHeight - totalCellSpacingHeight) / visuals.cellRows;
  
  // Calculate starting position (top-left of the panel's inner area)
  const startX = -innerWidth / 2 + cellWidth / 2;
  const startY = innerHeight / 2 - cellHeight / 2;
  
  // Create cells in a grid
  for (let row = 0; row < visuals.cellRows; row++) {
    for (let col = 0; col < visuals.cellColumns; col++) {
      const cellGeometry = new THREE.PlaneGeometry(cellWidth * 0.98, cellHeight * 0.98);
      const cellMaterial = new THREE.MeshBasicMaterial({
        color: visuals.cellColor,
        side: THREE.DoubleSide
      });
      const cell = new THREE.Mesh(cellGeometry, cellMaterial);
      
      // Position cell within the grid
      cell.position.x = startX + col * (cellWidth + visuals.cellSpacing);
      cell.position.y = startY - row * (cellHeight + visuals.cellSpacing);
      cell.position.z = 0.002; // Slightly above panel
      
      cell.name = `pvCell_${moduleIndex}_r${row}c${col}`;
      cell.userData = {
        isPVModuleCell: true,
        measurementId: measurementId,
        moduleIndex: moduleIndex,
        row: row,
        column: col
      };
      
      cellGroup.add(cell);
    }
  }
  
  // Add all elements to the module group
  moduleGroup.add(frameMesh);
  moduleGroup.add(panelMesh);
  moduleGroup.add(cellGroup);
  
  // Position and orient the module
  moduleGroup.position.copy(position);
  
  // Align the module to the roof surface
  if (normal) {
    const upVector = new THREE.Vector3(0, 1, 0);
    moduleGroup.quaternion.setFromUnitVectors(upVector, normal);
  }
  
  // Apply additional rotation around the normal axis
  if (rotation !== 0) {
    const rotationMatrix = new THREE.Matrix4().makeRotationAxis(normal, rotation);
    moduleGroup.applyMatrix4(rotationMatrix);
  }
  
  return moduleGroup;
};

/**
 * Creates detailed PV module meshes for an array of positions
 */
export const createDetailedPVModules = (
  modulePositions: Point[],
  moduleWidth: number, 
  moduleHeight: number,
  moduleRotation: number,
  roofNormal: THREE.Vector3,
  visuals = DEFAULT_MODULE_VISUALS,
  measurementId: string
): THREE.Group => {
  const moduleParentGroup = new THREE.Group();
  moduleParentGroup.name = `pvModuleParent_${measurementId}`;
  moduleParentGroup.userData = {
    isPVModuleParent: true,
    measurementId: measurementId
  };
  
  modulePositions.forEach((pos, index) => {
    const position = new THREE.Vector3(pos.x, pos.y, pos.z);
    const moduleGroup = createDetailedPVModuleMesh(
      position, 
      moduleWidth, 
      moduleHeight,
      moduleRotation,
      roofNormal,
      visuals,
      measurementId,
      index
    );
    
    moduleParentGroup.add(moduleGroup);
  });
  
  return moduleParentGroup;
};

/**
 * Calculate normal vector from triangle points
 */
export const calculateNormalVector = (points: Point[]): THREE.Vector3 => {
  if (points.length < 3) {
    console.error("At least 3 points are required to calculate a normal vector");
    return new THREE.Vector3(0, 1, 0); // Default to up vector
  }
  
  const p1 = new THREE.Vector3(points[0].x, points[0].y, points[0].z);
  const p2 = new THREE.Vector3(points[1].x, points[1].y, points[1].z);
  const p3 = new THREE.Vector3(points[2].x, points[2].y, points[2].z);
  
  const v1 = new THREE.Vector3().subVectors(p2, p1);
  const v2 = new THREE.Vector3().subVectors(p3, p1);
  
  const normal = new THREE.Vector3().crossVectors(v1, v2).normalize();
  
  return normal;
};

/**
 * Prepare module corner points from center position
 */
export const calculateModuleCorners = (
  centerPoint: Point,
  width: number,
  height: number,
  rotation: number,
  normal: THREE.Vector3
): Point[] => {
  // Create vectors for the four corners (relative to center)
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  
  // Start with corners in XZ plane
  const corners = [
    new THREE.Vector3(-halfWidth, 0, -halfHeight), // Bottom-left
    new THREE.Vector3(halfWidth, 0, -halfHeight),  // Bottom-right
    new THREE.Vector3(halfWidth, 0, halfHeight),   // Top-right
    new THREE.Vector3(-halfWidth, 0, halfHeight),  // Top-left
  ];
  
  // Create rotation quaternion from normal vector
  const upVector = new THREE.Vector3(0, 1, 0);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(upVector, normal);
  
  // Apply additional rotation around normal if specified
  if (rotation !== 0) {
    const rotationQuaternion = new THREE.Quaternion().setFromAxisAngle(normal, rotation);
    quaternion.multiply(rotationQuaternion);
  }
  
  // Apply rotation and translate to center position
  const center = new THREE.Vector3(centerPoint.x, centerPoint.y, centerPoint.z);
  
  // Apply rotation and translation to each corner
  return corners.map(corner => {
    corner.applyQuaternion(quaternion);
    corner.add(center);
    
    return {
      x: corner.x,
      y: corner.y,
      z: corner.z
    };
  });
};
