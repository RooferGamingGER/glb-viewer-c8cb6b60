
import * as THREE from 'three';
import { Measurement, Point, PVModuleInfo } from '@/types/measurements';

/**
 * Constants for instanced mesh rendering of PV modules
 */
const MODULE_COLORS = {
  FRAME: 0x444444, // Dark grey frame
  PANEL: 0x0a4b8f, // Dark blue panel
  CELL: 0x225289,  // Slightly brighter blue for cells
  SELECTED: 0x00aaff // Bright blue for selected modules
};

interface InstancedMeshes {
  frames: THREE.InstancedMesh;
  panels: THREE.InstancedMesh;
  dummy: THREE.Object3D;
}

/**
 * Create instanced meshes for PV modules for greatly improved performance
 */
export const createPVModuleInstancedMeshes = (
  moduleCount: number,
  moduleWidth: number,
  moduleHeight: number,
  frameThickness: number = 0.02
): InstancedMeshes => {
  // Create dummy object for positioning instances
  const dummy = new THREE.Object3D();

  // Create frame geometry (outer frame)
  const frameGeometry = new THREE.BoxGeometry(moduleWidth, 0.02, moduleHeight);
  const frameMaterial = new THREE.MeshPhongMaterial({
    color: MODULE_COLORS.FRAME,
    shininess: 30
  });
  const frames = new THREE.InstancedMesh(frameGeometry, frameMaterial, moduleCount);
  frames.name = "PVModuleFrames";
  frames.castShadow = true;
  frames.receiveShadow = true;

  // Create panel geometry (inner panel)
  const panelWidth = moduleWidth - (frameThickness * 2);
  const panelHeight = moduleHeight - (frameThickness * 2);
  const panelGeometry = new THREE.BoxGeometry(panelWidth, 0.01, panelHeight);
  const panelMaterial = new THREE.MeshPhongMaterial({
    color: MODULE_COLORS.PANEL,
    shininess: 80,
    specular: 0x333333
  });
  const panels = new THREE.InstancedMesh(panelGeometry, panelMaterial, moduleCount);
  panels.name = "PVModulePanels";
  panels.castShadow = true;
  panels.receiveShadow = true;

  return { frames, panels, dummy };
};

/**
 * Update instanced PV module positions based on measurement data
 */
export const updatePVModuleInstances = (
  instancedMeshes: InstancedMeshes,
  measurement: Measurement,
  moduleInfo: PVModuleInfo,
  selected: boolean = false
): void => {
  if (!moduleInfo.modulePositions || moduleInfo.modulePositions.length === 0) {
    console.warn('No module positions available for instanced rendering');
    return;
  }

  const moduleCount = moduleInfo.modulePositions.length;
  const { frames, panels, dummy } = instancedMeshes;

  // Set visibility based on measurement visibility
  frames.visible = measurement.visible !== false;
  panels.visible = measurement.visible !== false;

  // Update each instance
  for (let i = 0; i < moduleCount; i++) {
    if (i >= moduleInfo.modulePositions.length) break;
    
    const position = moduleInfo.modulePositions[i];

    // Calculate normal vector for roof surface
    const normal = calculateNormalVector(measurement.points);

    // Position frame instance
    dummy.position.set(position.x, position.y + 0.01, position.z);
    
    // Apply rotation if specified
    if (moduleInfo.rotation !== undefined) {
      dummy.rotation.set(0, 0, 0); // Reset rotation
      
      // Align to normal vector
      const upVector = new THREE.Vector3(0, 1, 0);
      dummy.quaternion.setFromUnitVectors(upVector, normal);
      
      // Apply additional rotation around the normal
      const rotationMatrix = new THREE.Matrix4().makeRotationAxis(normal, moduleInfo.rotation);
      dummy.applyMatrix4(rotationMatrix);
    } else {
      // Default orientation aligned to normal
      const upVector = new THREE.Vector3(0, 1, 0);
      dummy.quaternion.setFromUnitVectors(upVector, normal);
    }

    // Update the matrix for this instance
    dummy.updateMatrix();
    frames.setMatrixAt(i, dummy.matrix);
    
    // Position panel instance (slightly above frame)
    dummy.position.y += 0.01;
    dummy.updateMatrix();
    panels.setMatrixAt(i, dummy.matrix);

    // Set custom color for selected state
    if (selected) {
      frames.setColorAt(i, new THREE.Color(MODULE_COLORS.SELECTED));
      panels.setColorAt(i, new THREE.Color(MODULE_COLORS.SELECTED));
    }
  }

  // Update instance matrices and colors
  frames.instanceMatrix.needsUpdate = true;
  panels.instanceMatrix.needsUpdate = true;
  
  if (frames.instanceColor) {
    frames.instanceColor.needsUpdate = true;
  }

  if (panels.instanceColor) {
    panels.instanceColor.needsUpdate = true;
  }
};

/**
 * Generate module positions for a solar area
 */
export const generatePVModulePositions = (
  measurement: Measurement,
  moduleInfo: PVModuleInfo
): Point[] => {
  if (!measurement.points || measurement.points.length < 3) {
    console.error('Invalid measurement points for PV module positioning');
    return [];
  }

  // Extract module dimensions from either direct properties or from moduleWidth/Height
  const moduleWidth = moduleInfo.width !== undefined ? moduleInfo.width : moduleInfo.moduleWidth;
  const moduleHeight = moduleInfo.height !== undefined ? moduleInfo.height : moduleInfo.moduleHeight;

  if (!moduleWidth || !moduleHeight) {
    console.error('Invalid module dimensions for positioning');
    return [];
  }

  // Calculate normal vector for the roof surface
  const normal = calculateNormalVector(measurement.points);

  // Generate grid of positions based on area bounds
  const modulePositions: Point[] = [];
  const spacing = moduleInfo.moduleSpacing || 0.05; // Default 5cm spacing
  
  // Get or calculate the module count
  const moduleCount = moduleInfo.moduleCount || 
    Math.floor(moduleInfo.coveragePercent * calculateAreaFromPoints(measurement.points) / (moduleWidth * moduleHeight));

  // Use columns and rows if available, otherwise estimate them
  const columns = moduleInfo.columns || Math.ceil(Math.sqrt(moduleCount));
  const rows = moduleInfo.rows || Math.ceil(moduleCount / columns);

  // Find the center of the area
  const center = findCenterOfPoints(measurement.points);
  
  // Define the starting corner (offset to position modules in center of area)
  const startX = center.x - (columns * (moduleWidth + spacing)) / 2;
  const startZ = center.z - (rows * (moduleHeight + spacing)) / 2;

  // Create grid of modules
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      // Skip if we've reached the module count
      if (modulePositions.length >= moduleCount) break;
      
      // Calculate position
      const x = startX + col * (moduleWidth + spacing) + moduleWidth/2;
      const z = startZ + row * (moduleHeight + spacing) + moduleHeight/2;
      
      // Project onto the roof plane (y-coordinate)
      const y = calculateYOnPlane(x, z, measurement.points);
      
      modulePositions.push({ x, y: y + 0.01, z }); // Slight y offset to avoid z-fighting
    }
  }

  // Apply rotation if specified
  if (moduleInfo.rotation !== undefined && moduleInfo.rotation !== 0) {
    // Rotate each module position around the center
    const rotatedPositions = modulePositions.map(pos => {
      const rotated = rotatePointAroundCenter(
        pos, 
        center, 
        moduleInfo.rotation || 0
      );
      return { ...rotated, y: pos.y }; // Keep the same y-coordinate
    });
    
    return rotatedPositions;
  }

  return modulePositions;
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
 * Calculate the area of a polygon from its points
 */
export const calculateAreaFromPoints = (points: Point[]): number => {
  if (points.length < 3) return 0;
  
  // Project points onto XZ plane for area calculation
  const projectedPoints = points.map(p => ({ x: p.x, z: p.z }));
  
  // Calculate area using the shoelace formula
  let area = 0;
  for (let i = 0; i < projectedPoints.length; i++) {
    const j = (i + 1) % projectedPoints.length;
    area += projectedPoints[i].x * projectedPoints[j].z;
    area -= projectedPoints[j].x * projectedPoints[i].z;
  }
  
  return Math.abs(area) / 2;
};

/**
 * Find the center point of a set of points
 */
export const findCenterOfPoints = (points: Point[]): Point => {
  if (points.length === 0) return { x: 0, y: 0, z: 0 };
  
  const sumX = points.reduce((sum, p) => sum + p.x, 0);
  const sumY = points.reduce((sum, p) => sum + p.y, 0);
  const sumZ = points.reduce((sum, p) => sum + p.z, 0);
  
  return {
    x: sumX / points.length,
    y: sumY / points.length,
    z: sumZ / points.length
  };
};

/**
 * Calculate Y coordinate on a plane defined by points
 */
export const calculateYOnPlane = (x: number, z: number, planePoints: Point[]): number => {
  if (planePoints.length < 3) {
    console.error('At least 3 points needed to define a plane');
    return 0;
  }
  
  // Calculate plane equation: ax + by + cz + d = 0
  const normal = calculateNormalVector(planePoints);
  const point = planePoints[0];
  
  // d = -(ax + by + cz)
  const d = -(normal.x * point.x + normal.y * point.y + normal.z * point.z);
  
  // Solve for y: y = -(ax + cz + d) / b
  if (Math.abs(normal.y) < 0.001) {
    console.warn('Plane is nearly vertical, Y calculation may be inaccurate');
    return point.y; // Return a point's Y as fallback
  }
  
  return -(normal.x * x + normal.z * z + d) / normal.y;
};

/**
 * Rotate a point around a center point by given angle
 */
export const rotatePointAroundCenter = (
  point: Point, 
  center: Point, 
  angleRadians: number
): Point => {
  // Translate point to origin
  const x = point.x - center.x;
  const z = point.z - center.z;
  
  // Rotate point
  const xRot = x * Math.cos(angleRadians) - z * Math.sin(angleRadians);
  const zRot = x * Math.sin(angleRadians) + z * Math.cos(angleRadians);
  
  // Translate back
  return {
    x: xRot + center.x,
    y: point.y,
    z: zRot + center.z
  };
};
