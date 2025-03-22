
import * as THREE from 'three';
import { ModulePosition } from '@/types/measurements';

// Constants for PV module appearance
const MODULE_COLORS = {
  FRAME: 0x555555,        // Dark gray for the frame
  BACKSHEET: 0x333333,    // Darker gray for backsheet
  CELLS: 0x1a5276,        // Deep blue for solar cells
  CELL_DETAILS: 0x0e4062, // Darker blue for cell grid lines
  GLASS: 0x555555,        // Glass reflection color
};

// Module construction constants
const MODULE_SETTINGS = {
  FRAME_THICKNESS: 0.02,    // Frame thickness in meters
  MODULE_THICKNESS: 0.035,  // Total module thickness
  CELLS_MARGIN: 0.04,       // Margin between cells and frame
  CELLS_GAP: 0.005,         // Gap between individual cells
  CELLS_PER_ROW: 6,         // Number of cells in a row
  CELLS_PER_COLUMN: 10,     // Number of cells in a column
};

/**
 * Creates a detailed 3D mesh for a PV module with realistic appearance
 */
export function createPVModuleMesh(
  modulePosition: ModulePosition, 
  baseColor = MODULE_COLORS.CELLS
): THREE.Group {
  const moduleGroup = new THREE.Group();
  
  const { width, height, depth } = modulePosition.dimensions;
  const actualDepth = depth || MODULE_SETTINGS.MODULE_THICKNESS;
  
  // Create the frame (outer box)
  const frameGeometry = new THREE.BoxGeometry(
    width, 
    MODULE_SETTINGS.MODULE_THICKNESS, 
    height
  );
  
  const frameMaterial = new THREE.MeshPhongMaterial({ 
    color: MODULE_COLORS.FRAME,
    shininess: 30
  });
  
  const frame = new THREE.Mesh(frameGeometry, frameMaterial);
  moduleGroup.add(frame);
  
  // Create the glass/cell area (inner box)
  const innerWidth = width - (MODULE_SETTINGS.FRAME_THICKNESS * 2);
  const innerHeight = height - (MODULE_SETTINGS.FRAME_THICKNESS * 2);
  
  const glassGeometry = new THREE.BoxGeometry(
    innerWidth, 
    MODULE_SETTINGS.MODULE_THICKNESS * 0.9, 
    innerHeight
  );
  
  const glassMaterial = new THREE.MeshPhongMaterial({ 
    color: baseColor,
    shininess: 90,
    specular: new THREE.Color(0x555555),
    opacity: 0.9,
    transparent: true
  });
  
  const glass = new THREE.Mesh(glassGeometry, glassMaterial);
  glass.position.y = MODULE_SETTINGS.MODULE_THICKNESS * 0.05; // Slightly raised
  moduleGroup.add(glass);
  
  // Add the cell grid pattern
  const cellsWidth = innerWidth - (MODULE_SETTINGS.CELLS_MARGIN * 2);
  const cellsHeight = innerHeight - (MODULE_SETTINGS.CELLS_MARGIN * 2);
  
  const cellWidth = (cellsWidth - (MODULE_SETTINGS.CELLS_GAP * (MODULE_SETTINGS.CELLS_PER_ROW - 1))) / MODULE_SETTINGS.CELLS_PER_ROW;
  const cellHeight = (cellsHeight - (MODULE_SETTINGS.CELLS_GAP * (MODULE_SETTINGS.CELLS_PER_COLUMN - 1))) / MODULE_SETTINGS.CELLS_PER_COLUMN;
  
  // Create cell grid pattern texture
  const renderCellGridTexture = (): THREE.Texture => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.Texture();
    
    // Background color (backsheet)
    ctx.fillStyle = '#1a5276';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Cell pattern
    ctx.fillStyle = '#0e4062';
    
    const margin = canvas.width * 0.05;
    const availableWidth = canvas.width - (margin * 2);
    const availableHeight = canvas.height - (margin * 2);
    
    const cellSpacingH = availableWidth / MODULE_SETTINGS.CELLS_PER_ROW;
    const cellSpacingV = availableHeight / MODULE_SETTINGS.CELLS_PER_COLUMN;
    
    const cellMargin = 2; // Pixels between cells
    
    for (let row = 0; row < MODULE_SETTINGS.CELLS_PER_COLUMN; row++) {
      for (let col = 0; col < MODULE_SETTINGS.CELLS_PER_ROW; col++) {
        ctx.fillRect(
          margin + (col * cellSpacingH) + cellMargin,
          margin + (row * cellSpacingV) + cellMargin,
          cellSpacingH - (cellMargin * 2),
          cellSpacingV - (cellMargin * 2)
        );
        
        // Add thin grid lines inside each cell
        ctx.strokeStyle = '#173952';
        ctx.lineWidth = 1;
        const gridSize = 4; // Number of internal grid lines
        const cellX = margin + (col * cellSpacingH) + cellMargin;
        const cellY = margin + (row * cellSpacingV) + cellMargin;
        const cellW = cellSpacingH - (cellMargin * 2);
        const cellH = cellSpacingV - (cellMargin * 2);
        
        // Horizontal lines
        for (let i = 1; i < gridSize; i++) {
          ctx.beginPath();
          ctx.moveTo(cellX, cellY + (cellH / gridSize) * i);
          ctx.lineTo(cellX + cellW, cellY + (cellH / gridSize) * i);
          ctx.stroke();
        }
        
        // Vertical lines
        for (let i = 1; i < gridSize; i++) {
          ctx.beginPath();
          ctx.moveTo(cellX + (cellW / gridSize) * i, cellY);
          ctx.lineTo(cellX + (cellW / gridSize) * i, cellY + cellH);
          ctx.stroke();
        }
      }
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  };
  
  // Apply the texture to the glass/cell area
  const cellTexture = renderCellGridTexture();
  glass.material.map = cellTexture;
  
  // Add slight modifications to make module look more realistic
  const addHighlights = true;
  if (addHighlights) {
    // Add a slight highlight on the top edge
    const highlightGeometry = new THREE.BoxGeometry(width, 0.002, 0.01);
    const highlightMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xffffff,
      opacity: 0.3,
      transparent: true
    });
    const highlight = new THREE.Mesh(highlightGeometry, highlightMaterial);
    highlight.position.set(0, MODULE_SETTINGS.MODULE_THICKNESS / 2 + 0.001, -height / 2 + 0.005);
    moduleGroup.add(highlight);
  }
  
  // Set the group position and rotation
  moduleGroup.position.copy(modulePosition.position);
  moduleGroup.rotation.copy(modulePosition.rotation);
  
  // Store metadata in userData
  moduleGroup.userData = {
    isPVModule: true,
    moduleIndex: modulePosition.index,
    moduleRow: modulePosition.row,
    moduleColumn: modulePosition.column,
    moduleType: 'standard'
  };
  
  return moduleGroup;
}

/**
 * Creates a simplified PV module mesh for performance
 * Used when many modules need to be displayed
 */
export function createSimplifiedPVModuleMesh(
  modulePosition: ModulePosition, 
  baseColor = MODULE_COLORS.CELLS
): THREE.Group {
  const moduleGroup = new THREE.Group();
  
  const { width, height } = modulePosition.dimensions;
  
  // Create a single box for the module
  const geometry = new THREE.BoxGeometry(
    width, 
    MODULE_SETTINGS.MODULE_THICKNESS, 
    height
  );
  
  // Create materials for each face
  const materials = [
    new THREE.MeshPhongMaterial({ color: MODULE_COLORS.FRAME }), // Right side
    new THREE.MeshPhongMaterial({ color: MODULE_COLORS.FRAME }), // Left side
    new THREE.MeshPhongMaterial({ color: MODULE_COLORS.FRAME }), // Top side
    new THREE.MeshPhongMaterial({ color: MODULE_COLORS.FRAME }), // Bottom side
    new THREE.MeshPhongMaterial({ color: baseColor, shininess: 80 }), // Front side (cells)
    new THREE.MeshPhongMaterial({ color: MODULE_COLORS.BACKSHEET }) // Back side
  ];
  
  const module = new THREE.Mesh(geometry, materials);
  moduleGroup.add(module);
  
  // Set the group position and rotation
  moduleGroup.position.copy(modulePosition.position);
  moduleGroup.rotation.copy(modulePosition.rotation);
  
  // Store metadata in userData
  moduleGroup.userData = {
    isPVModule: true,
    moduleIndex: modulePosition.index,
    moduleRow: modulePosition.row,
    moduleColumn: modulePosition.column,
    moduleType: 'simplified'
  };
  
  return moduleGroup;
}

/**
 * Function to generate a module positions array from PV module info
 */
export function generateModulePositions(
  pvModuleInfo: any, 
  baseY: number
): ModulePosition[] {
  const modulePositions: ModulePosition[] = [];
  
  if (!pvModuleInfo || !pvModuleInfo.moduleWidth || !pvModuleInfo.moduleHeight) {
    return modulePositions;
  }
  
  const {
    moduleWidth,
    moduleHeight,
    orientation,
    rows = 1,
    columns = 1,
    startX = 0,
    startZ = 0,
    moduleSpacing = 0.05,
    roofPitch = 0
  } = pvModuleInfo;
  
  // Calculate actual module dimensions based on orientation
  const actualWidth = orientation === 'landscape' ? moduleHeight : moduleWidth;
  const actualHeight = orientation === 'landscape' ? moduleWidth : moduleHeight;
  
  // Convert roof pitch to radians
  const pitchRadians = (roofPitch || 0) * (Math.PI / 180);
  
  // Create rotation for all modules
  const moduleRotation = new THREE.Euler(
    pitchRadians, // X rotation (pitch)
    0,           // Y rotation
    0            // Z rotation
  );
  
  // Calculate the total width and height the array will span
  const totalWidth = columns * actualWidth + (columns - 1) * moduleSpacing;
  const totalHeight = rows * actualHeight + (rows - 1) * moduleSpacing;
  
  // Generate module positions
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const index = row * columns + col;
      
      // Calculate position (center of module)
      const xPos = startX + (col * (actualWidth + moduleSpacing)) + (actualWidth / 2);
      const zPos = startZ + (row * (actualHeight + moduleSpacing)) + (actualHeight / 2);
      
      // Account for roof slope by adjusting Y position based on Z position
      const yOffset = Math.sin(pitchRadians) * (zPos - startZ);
      const yPos = baseY + MODULE_SETTINGS.MODULE_THICKNESS / 2 + yOffset;
      
      modulePositions.push({
        position: new THREE.Vector3(xPos, yPos, zPos),
        rotation: moduleRotation.clone(),
        dimensions: {
          width: actualWidth,
          height: actualHeight,
          depth: MODULE_SETTINGS.MODULE_THICKNESS
        },
        index,
        row,
        column: col
      });
    }
  }
  
  return modulePositions;
}
