
import * as THREE from 'three';
import { PVModuleInfo, PVModuleSpec, Point, PVModuleRenderData, PVModuleGridLine } from '@/types/measurements';

// Constants for PV module visualization
const DEFAULT_MODULE_THICKNESS = 0.04; // 4cm thickness for modules
const DEFAULT_FRAME_THICKNESS = 0.02; // 2cm frame thickness
const DEFAULT_FRAME_COLOR = '#8E9196'; // Aluminum gray
const DEFAULT_CELL_COLOR = '#1A1F2C'; // Dark blue/black for cells

/**
 * Generate 3D visualization data for PV modules on a roof surface
 */
export function generatePVModuleRenderData(
  pvModuleInfo: PVModuleInfo,
  baseY: number = 0
): PVModuleRenderData {
  // Extract module information
  const {
    moduleWidth = 1.0,
    moduleHeight = 1.7,
    moduleCount = 0,
    columns = 1,
    rows = 1,
    orientation = 'portrait',
    moduleSpacing = 0.02,
    edgeDistance = 0.3,
    minX = 0,
    minZ = 0,
    maxX = 0,
    maxZ = 0,
    startX = 0,
    startZ = 0,
    boundingWidth = 0,
    boundingLength = 0,
    roofInclination = 0,
    roofOrientation = 0,
    pvModuleSpec
  } = pvModuleInfo;

  // If there are no modules to render, return empty data
  if (moduleCount <= 0) {
    return { modules: [], gridLines: [], boundaryPoints: [], availableAreaPoints: [] };
  }

  // Calculate actual module dimensions based on orientation
  const actualWidth = orientation === 'portrait' ? moduleHeight : moduleWidth;
  const actualHeight = orientation === 'portrait' ? moduleWidth : moduleHeight;

  // Calculate module dimensions with spacing
  const moduleWidthWithSpacing = actualWidth + moduleSpacing;
  const moduleHeightWithSpacing = actualHeight + moduleSpacing;

  // Convert roof inclination to radians for calculations
  const inclinationRadians = (roofInclination || 0) * (Math.PI / 180);
  const orientationRadians = (roofOrientation || 0) * (Math.PI / 180);

  // Create rotation matrix for the module placement
  const rotationMatrix = new THREE.Matrix4();
  rotationMatrix.makeRotationY(orientationRadians);
  
  // Create inclination matrix (rotation around X axis)
  const inclinationMatrix = new THREE.Matrix4();
  inclinationMatrix.makeRotationX(inclinationRadians);
  
  // Combine rotations
  rotationMatrix.multiply(inclinationMatrix);

  // Function to transform a point using our rotation matrices
  const transformPoint = (x: number, y: number, z: number): Point => {
    const point = new THREE.Vector3(x, y, z);
    point.applyMatrix4(rotationMatrix);
    
    return {
      x: point.x,
      y: point.y + baseY, // Add base height
      z: point.z
    };
  };

  // Generate module corners and other visualization data
  const modules: PVModuleRenderData['modules'] = [];
  const gridLines: PVModuleGridLine[] = [];
  
  // Calculate boundary points for the entire PV area
  const boundaryPoints: Point[] = [
    transformPoint(minX, 0, minZ),
    transformPoint(maxX, 0, minZ),
    transformPoint(maxX, 0, maxZ),
    transformPoint(minX, 0, maxZ)
  ];
  
  // Calculate available area points (after edge distance)
  const availableAreaPoints: Point[] = [
    transformPoint(minX + edgeDistance, 0, minZ + edgeDistance),
    transformPoint(maxX - edgeDistance, 0, minZ + edgeDistance),
    transformPoint(maxX - edgeDistance, 0, maxZ - edgeDistance),
    transformPoint(minX + edgeDistance, 0, maxZ - edgeDistance)
  ];

  // Generate module data
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const index = row * columns + col;
      
      // Skip if we've reached the module count
      if (index >= moduleCount) continue;
      
      // Calculate module position
      const x = startX + col * moduleWidthWithSpacing;
      const z = startZ + row * moduleHeightWithSpacing;
      
      // Calculate module corners
      const corners: Point[] = [
        transformPoint(x, 0, z), // Bottom left
        transformPoint(x + actualWidth, 0, z), // Bottom right
        transformPoint(x + actualWidth, 0, z + actualHeight), // Top right
        transformPoint(x, 0, z + actualHeight) // Top left
      ];
      
      // Add module data
      modules.push({
        corners,
        index,
        row,
        column: col,
        power: pvModuleSpec?.power || 380
      });
      
      // Add module border lines
      for (let i = 0; i < 4; i++) {
        gridLines.push({
          from: corners[i],
          to: corners[(i + 1) % 4],
          type: 'module'
        });
      }
    }
  }
  
  // Add boundary lines
  for (let i = 0; i < 4; i++) {
    gridLines.push({
      from: boundaryPoints[i],
      to: boundaryPoints[(i + 1) % 4],
      type: 'boundary'
    });
  }
  
  // Add available area lines
  for (let i = 0; i < 4; i++) {
    gridLines.push({
      from: availableAreaPoints[i],
      to: availableAreaPoints[(i + 1) % 4],
      type: 'availableArea'
    });
  }

  return {
    modules,
    gridLines,
    boundaryPoints,
    availableAreaPoints
  };
}

/**
 * Create a detailed 3D model of a PV module
 */
export function createPVModuleMesh(
  corners: Point[],
  spec?: PVModuleSpec
): THREE.Group {
  // Create a group to hold the module parts
  const moduleGroup = new THREE.Group();
  
  // Use default or provided specifications
  const moduleThickness = spec?.thickness || DEFAULT_MODULE_THICKNESS;
  const frameThickness = spec?.frameThickness || DEFAULT_FRAME_THICKNESS;
  const frameColor = spec?.frameColor || DEFAULT_FRAME_COLOR;
  const cellColor = spec?.cellColor || DEFAULT_CELL_COLOR;
  
  // Calculate module dimensions from corners
  const point0 = new THREE.Vector3(corners[0].x, corners[0].y, corners[0].z);
  const point1 = new THREE.Vector3(corners[1].x, corners[1].y, corners[1].z);
  const point2 = new THREE.Vector3(corners[2].x, corners[2].y, corners[2].z);
  const point3 = new THREE.Vector3(corners[3].x, corners[3].y, corners[3].z);
  
  // Calculate width and height
  const width = point0.distanceTo(point1);
  const height = point0.distanceTo(point3);
  
  // Calculate normal vector to determine module orientation
  const edge1 = new THREE.Vector3().subVectors(point1, point0);
  const edge2 = new THREE.Vector3().subVectors(point3, point0);
  const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();
  
  // Create module backsheet
  const backsheetGeometry = new THREE.BoxGeometry(width, moduleThickness, height);
  const backsheetMaterial = new THREE.MeshPhongMaterial({ 
    color: 0x333333, 
    shininess: 30 
  });
  const backsheet = new THREE.Mesh(backsheetGeometry, backsheetMaterial);
  
  // Create glass front with cells
  const glassGeometry = new THREE.BoxGeometry(
    width - frameThickness * 2, 
    moduleThickness * 0.2, 
    height - frameThickness * 2
  );
  const glassMaterial = new THREE.MeshPhongMaterial({ 
    color: new THREE.Color(cellColor), 
    shininess: 100,
    transparent: true,
    opacity: 0.9,
    specular: 0xffffff
  });
  const glass = new THREE.Mesh(glassGeometry, glassMaterial);
  glass.position.y = moduleThickness * 0.4;
  
  // Create frame
  const frameGroup = new THREE.Group();
  
  // Top frame
  const topFrameGeo = new THREE.BoxGeometry(width, moduleThickness, frameThickness);
  const frameMaterial = new THREE.MeshPhongMaterial({ 
    color: new THREE.Color(frameColor),
    shininess: 50
  });
  const topFrame = new THREE.Mesh(topFrameGeo, frameMaterial);
  topFrame.position.z = height / 2 - frameThickness / 2;
  
  // Bottom frame
  const bottomFrame = new THREE.Mesh(topFrameGeo, frameMaterial);
  bottomFrame.position.z = -height / 2 + frameThickness / 2;
  
  // Left frame
  const sideFrameGeo = new THREE.BoxGeometry(frameThickness, moduleThickness, height - frameThickness * 2);
  const leftFrame = new THREE.Mesh(sideFrameGeo, frameMaterial);
  leftFrame.position.x = -width / 2 + frameThickness / 2;
  
  // Right frame
  const rightFrame = new THREE.Mesh(sideFrameGeo, frameMaterial);
  rightFrame.position.x = width / 2 - frameThickness / 2;
  
  // Add frame parts to frame group
  frameGroup.add(topFrame, bottomFrame, leftFrame, rightFrame);
  
  // Add all parts to module group
  moduleGroup.add(backsheet, glass, frameGroup);
  
  // Create a rotation matrix from the normal vector to align the module
  const alignmentMatrix = new THREE.Matrix4();
  const upVector = new THREE.Vector3(0, 1, 0);
  
  // Use the quaternion to create rotation from up vector to normal
  const quaternion = new THREE.Quaternion().setFromUnitVectors(upVector, normal);
  alignmentMatrix.makeRotationFromQuaternion(quaternion);
  
  // Apply rotation
  moduleGroup.applyMatrix4(alignmentMatrix);
  
  // Position at center of corners
  const center = new THREE.Vector3()
    .add(point0).add(point1).add(point2).add(point3)
    .divideScalar(4);
  
  moduleGroup.position.copy(center);
  
  // Allow for raycasting selection
  moduleGroup.userData = {
    type: 'pvModule'
  };
  
  return moduleGroup;
}

/**
 * Create a simple representation of a PV module for performance
 */
export function createSimplePVModuleMesh(corners: Point[]): THREE.Mesh {
  // Create a shape from the four corner points
  const shape = new THREE.Shape();
  
  // Project points to XZ plane for the shape
  shape.moveTo(corners[0].x, corners[0].z);
  shape.lineTo(corners[1].x, corners[1].z);
  shape.lineTo(corners[2].x, corners[2].z);
  shape.lineTo(corners[3].x, corners[3].z);
  shape.lineTo(corners[0].x, corners[0].z);
  
  // Create geometry from the shape
  const geometry = new THREE.ShapeGeometry(shape);
  
  // Calculate normal vector to determine module orientation
  const point0 = new THREE.Vector3(corners[0].x, corners[0].y, corners[0].z);
  const point1 = new THREE.Vector3(corners[1].x, corners[1].y, corners[1].z);
  const point3 = new THREE.Vector3(corners[3].x, corners[3].y, corners[3].z);
  
  const edge1 = new THREE.Vector3().subVectors(point1, point0);
  const edge2 = new THREE.Vector3().subVectors(point3, point0);
  const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();
  
  // Create material for the module
  const material = new THREE.MeshBasicMaterial({
    color: 0x1A1F2C,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.7
  });
  
  // Create the mesh
  const mesh = new THREE.Mesh(geometry, material);
  
  // Adjust the geometry vertices to match the actual 3D points
  const positions = geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const z = positions.getY(i);  // Y in shape is Z in 3D
    
    // Find matching corner or interpolate
    // This is a simple implementation that works for rectangles
    let y = 0;
    const cornerX = [corners[0].x, corners[1].x, corners[2].x, corners[3].x];
    const cornerZ = [corners[0].z, corners[1].z, corners[2].z, corners[3].z];
    const cornerY = [corners[0].y, corners[1].y, corners[2].y, corners[3].y];
    
    // Simple bilinear interpolation for the Y coordinate
    // Normalize x and z positions to 0-1 range for interpolation
    const normalizedX = (x - Math.min(...cornerX)) / (Math.max(...cornerX) - Math.min(...cornerX) || 1);
    const normalizedZ = (z - Math.min(...cornerZ)) / (Math.max(...cornerZ) - Math.min(...cornerZ) || 1);
    
    // Interpolate Y based on position
    y = cornerY[0] * (1 - normalizedX) * (1 - normalizedZ) +
        cornerY[1] * normalizedX * (1 - normalizedZ) +
        cornerY[2] * normalizedX * normalizedZ +
        cornerY[3] * (1 - normalizedX) * normalizedZ;
    
    // Set the 3D position
    positions.setXYZ(i, x, y, z);
  }
  
  // Update the geometry buffers
  geometry.computeVertexNormals();
  geometry.attributes.position.needsUpdate = true;
  
  // Set custom userData for identification
  mesh.userData = {
    type: 'pvModuleSimple'
  };
  
  return mesh;
}
