
import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid';
import { PVModuleInfo, Measurement } from '@/types/measurements';

// Constants for visualization
const MODULE_Y_OFFSET = 0.05; // Height above roof surface
const SELECTION_COLOR = 0x8E8EFF; // Highlight color for selected modules

interface PVModuleRenderOptions {
  baseY?: number;
  includeLabels?: boolean;
  showModuleNumbers?: boolean;
  isInteractive?: boolean;
}

/**
 * Creates a realistic PV module mesh
 */
export function createPVModuleMesh(
  width: number, 
  height: number,
  position: THREE.Vector3,
  moduleIndex: number,
  isSelected: boolean = false
): THREE.Group {
  // Create a group to hold all parts of the module
  const moduleGroup = new THREE.Group();
  moduleGroup.name = `pvModule_${moduleIndex}`;
  
  // Generate a unique ID for this module
  const moduleId = uuidv4();
  moduleGroup.userData = {
    moduleId,
    moduleIndex,
    isSelectable: true,
    isSelected,
    type: 'pvModule'
  };
  
  // Create the module frame
  const frameGeometry = new THREE.BoxGeometry(width, 0.04, height);
  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x8E9196, // Medium gray for frame
    roughness: 0.5,
    metalness: 0.7
  });
  const frame = new THREE.Mesh(frameGeometry, frameMaterial);
  frame.receiveShadow = true;
  frame.castShadow = true;
  
  // Create the glass panel (slightly smaller than frame)
  const glassGeometry = new THREE.BoxGeometry(width - 0.05, 0.01, height - 0.05);
  const glassMaterial = new THREE.MeshStandardMaterial({
    color: isSelected ? SELECTION_COLOR : 0x1EAEDB,
    roughness: 0.1,
    metalness: 0.2,
    transparent: true,
    opacity: 0.9
  });
  const glass = new THREE.Mesh(glassGeometry, glassMaterial);
  glass.position.y = 0.021; // Position slightly above frame
  glass.receiveShadow = true;
  glass.castShadow = true;
  glass.name = 'glass';
  
  // Create solar cells (dark material, slightly smaller than glass)
  const cellsGeometry = new THREE.BoxGeometry(width - 0.1, 0.005, height - 0.1);
  const cellsMaterial = new THREE.MeshStandardMaterial({
    color: 0x1A1F2C, // Very dark blue/black
    roughness: 0.1,
    metalness: 0.3
  });
  const cells = new THREE.Mesh(cellsGeometry, cellsMaterial);
  cells.position.y = 0.022; // Position just above glass
  cells.receiveShadow = true;
  
  // Add all components to the group
  moduleGroup.add(frame);
  moduleGroup.add(glass);
  moduleGroup.add(cells);
  
  // Position the entire module group
  moduleGroup.position.copy(position);
  
  // Add a slight random rotation for realism
  const randomTilt = 0.005 * (Math.random() - 0.5);
  moduleGroup.rotation.x += randomTilt;
  moduleGroup.rotation.z += randomTilt;
  
  return moduleGroup;
}

/**
 * Creates a number label for a module
 */
export function createModuleLabel(
  position: THREE.Vector3,
  moduleIndex: number,
  isSelected: boolean = false
): THREE.Sprite {
  // Create canvas for label texture
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = 64;
  canvas.height = 64;
  
  if (context) {
    context.fillStyle = isSelected ? '#8E8EFF' : '#1EAEDB';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = '#FFFFFF';
    context.lineWidth = 2;
    context.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
    
    context.fillStyle = 'white';
    context.font = 'bold 32px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText((moduleIndex + 1).toString(), canvas.width / 2, canvas.height / 2);
  }
  
  // Create texture from canvas
  const texture = new THREE.CanvasTexture(canvas);
  
  // Create sprite material
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true
  });
  
  // Create sprite with the material
  const sprite = new THREE.Sprite(material);
  sprite.position.copy(position);
  sprite.position.y += 0.1; // Position above module
  sprite.scale.set(0.2, 0.2, 0.2);
  
  // Add user data for interaction
  sprite.userData = {
    moduleIndex,
    isLabel: true
  };
  
  return sprite;
}

/**
 * Renders PV modules in a 3D scene based on measurement data
 */
export function renderPVModules(
  measurement: Measurement,
  targetGroup: THREE.Group,
  labelGroup: THREE.Group | null,
  options: PVModuleRenderOptions = {}
): void {
  if (!measurement.pvModuleInfo || !targetGroup) return;
  
  const {
    baseY = measurement.points[0]?.y || 0,
    includeLabels = true,
    showModuleNumbers = true,
    isInteractive = true
  } = options;
  
  const pvInfo = measurement.pvModuleInfo;
  
  // Clear any existing modules in the target group
  while (targetGroup.children.length > 0) {
    const child = targetGroup.children[0];
    if (child.userData && child.userData.type === 'pvModule') {
      targetGroup.remove(child);
    }
  }
  
  // Clear any existing module labels
  if (labelGroup) {
    const labelsToRemove = [];
    for (let i = 0; i < labelGroup.children.length; i++) {
      const child = labelGroup.children[i];
      if (child.userData && child.userData.moduleIndex !== undefined) {
        labelsToRemove.push(child);
      }
    }
    labelsToRemove.forEach(label => labelGroup.remove(label));
  }
  
  // Calculate module dimensions
  const moduleWidth = pvInfo.moduleWidth || 1.0; 
  const moduleHeight = pvInfo.moduleHeight || 1.7;
  const moduleSpacing = pvInfo.moduleSpacing || 0.05;
  
  // Calculate rows and columns
  const columns = pvInfo.columns || 1;
  const rows = pvInfo.rows || 1;
  
  // Get origin point for the grid
  let startX = pvInfo.startX || 0;
  let startZ = pvInfo.startZ || 0;
  
  // Get selected modules (if any)
  const selectedModules = new Set(measurement.selectedModules || []);
  
  // Create modules
  let moduleIndex = 0;
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      // Calculate position for this module
      const isPortrait = pvInfo.orientation === 'portrait';
      const xPos = startX + col * (isPortrait ? moduleWidth : moduleHeight + moduleSpacing);
      const zPos = startZ + row * (isPortrait ? moduleHeight : moduleWidth + moduleSpacing);
      
      const position = new THREE.Vector3(
        xPos + (isPortrait ? moduleWidth/2 : moduleHeight/2),
        baseY + MODULE_Y_OFFSET,
        zPos + (isPortrait ? moduleHeight/2 : moduleWidth/2)
      );
      
      // Check if this module is selected
      const isSelected = selectedModules.has(moduleIndex);
      
      // Create module mesh
      const module = createPVModuleMesh(
        isPortrait ? moduleWidth : moduleHeight,
        isPortrait ? moduleHeight : moduleWidth,
        position,
        moduleIndex,
        isSelected
      );
      
      // Store the measurement ID in the module's user data
      module.userData.measurementId = measurement.id;
      module.userData.isSelected = isSelected;
      
      // Add the module to the target group
      targetGroup.add(module);
      
      // Add module number label if enabled
      if (includeLabels && showModuleNumbers && labelGroup) {
        const label = createModuleLabel(position, moduleIndex, isSelected);
        label.userData.measurementId = measurement.id;
        labelGroup.add(label);
      }
      
      moduleIndex++;
    }
  }
}

/**
 * Updates selection state of PV modules
 */
export function updatePVModuleSelection(
  targetGroup: THREE.Group,
  labelGroup: THREE.Group | null,
  measurementId: string,
  selectedModuleIndices: number[]
): void {
  // Convert indices to a set for faster lookups
  const selectedSet = new Set(selectedModuleIndices);
  
  // Update modules in the target group
  targetGroup.children.forEach(child => {
    if (child.userData && 
        child.userData.measurementId === measurementId && 
        child.userData.type === 'pvModule') {
      
      const isSelected = selectedSet.has(child.userData.moduleIndex);
      child.userData.isSelected = isSelected;
      
      // Update visual appearance for selection
      const glass = child.getObjectByName('glass') as THREE.Mesh;
      if (glass && glass.material) {
        const material = glass.material as THREE.MeshStandardMaterial;
        material.color.set(isSelected ? SELECTION_COLOR : 0x1EAEDB);
        material.emissive.set(isSelected ? SELECTION_COLOR : 0x000000);
        material.emissiveIntensity = isSelected ? 0.3 : 0;
      }
    }
  });
  
  // Update labels if they exist
  if (labelGroup) {
    labelGroup.children.forEach(child => {
      if (child.userData && 
          child.userData.measurementId === measurementId && 
          child.userData.moduleIndex !== undefined) {
        
        const isSelected = selectedSet.has(child.userData.moduleIndex);
        
        // Recreate the label with new selection state
        const position = child.position.clone();
        const moduleIndex = child.userData.moduleIndex;
        
        // Remove old label
        labelGroup.remove(child);
        
        // Create new label with updated selection state
        const newLabel = createModuleLabel(position, moduleIndex, isSelected);
        newLabel.userData.measurementId = measurementId;
        labelGroup.add(newLabel);
      }
    });
  }
}
