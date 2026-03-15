
import * as THREE from 'three';
import { PVModuleInfo, Point } from '@/types/measurements';
import moduleTexturePath from '@/assets/moduli_standard.png';

// Shared texture loader and cached texture
let cachedModuleTexture: THREE.Texture | null = null;

const getModuleTexture = (): THREE.Texture => {
  if (!cachedModuleTexture) {
    const loader = new THREE.TextureLoader();
    cachedModuleTexture = loader.load(moduleTexturePath);
    cachedModuleTexture.colorSpace = THREE.SRGBColorSpace;
    cachedModuleTexture.minFilter = THREE.LinearMipmapLinearFilter;
    cachedModuleTexture.magFilter = THREE.LinearFilter;
  }
  return cachedModuleTexture;
};

// Default visuals for PV modules (kept for compatibility)
export const DEFAULT_MODULE_VISUALS = {
  frameBorder: 0.02,
  frameColor: 0x444444,
  panelColor: 0x0a4b8f,
  cellRows: 6,
  cellColumns: 10,
  cellSpacing: 0.005,
  cellColor: 0x225289,
  busbarCount: 3
};

/**
 * Creates a PV module mesh using the real module PNG texture
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
  const moduleGroup = new THREE.Group();
  moduleGroup.name = `pvModule_${moduleIndex}`;
  moduleGroup.userData = {
    isPVModule: true,
    measurementId: measurementId,
    moduleIndex: moduleIndex
  };

  // Single textured plane for the module
  const geometry = new THREE.PlaneGeometry(width, height);
  const texture = getModuleTexture();
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.DoubleSide,
    transparent: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = `pvModulePanel_${moduleIndex}`;
  mesh.userData = {
    isPVModule: true,
    isPVModulePanel: true,
    measurementId: measurementId,
    moduleIndex: moduleIndex
  };

  moduleGroup.add(mesh);

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
