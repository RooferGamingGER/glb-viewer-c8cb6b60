
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { PVModuleInfo, PVModuleSpec } from '@/types/measurements';

interface PVModuleVisualizerProps {
  scene: THREE.Scene;
  moduleInfo: PVModuleInfo;
  moduleSpec?: PVModuleSpec;
  detailLevel?: 'simple' | 'detailed';
  moduleGroup?: THREE.Group;
  measurementId: string;
  isInteractive?: boolean;
}

/**
 * Component for rendering realistic 3D PV modules
 */
const PVModuleVisualizer: React.FC<PVModuleVisualizerProps> = ({
  scene,
  moduleInfo,
  moduleSpec,
  detailLevel = 'detailed',
  moduleGroup,
  measurementId,
  isInteractive = false
}) => {
  const modulesRef = useRef<THREE.Group | null>(null);
  
  // Create the module visuals when the component mounts or when the module info changes
  useEffect(() => {
    // If no valid module info is provided, don't render anything
    if (!moduleInfo || !moduleInfo.modulePositions || moduleInfo.moduleCount <= 0) return;
    
    // Use provided group or create a new one
    if (!modulesRef.current) {
      if (moduleGroup) {
        modulesRef.current = moduleGroup;
      } else {
        modulesRef.current = new THREE.Group();
        modulesRef.current.name = `pvModules-${measurementId}`;
        scene.add(modulesRef.current);
      }
    }
    
    // Clear existing modules
    while (modulesRef.current.children.length > 0) {
      modulesRef.current.remove(modulesRef.current.children[0]);
    }
    
    // Get module dimensions and other info
    const spec = moduleSpec || {
      width: moduleInfo.moduleWidth || 1.0,
      height: moduleInfo.moduleHeight || 1.7,
      power: 400,
      efficiency: 21.3,
      name: 'Standard PV Module'
    };
    
    const { width, height } = spec;
    
    // Default module visuals if not provided
    const visuals = moduleInfo.moduleVisuals || {
      frameBorder: 0.02,
      frameColor: 0x333333,
      panelColor: 0x2C5282,
      cellRows: 6,
      cellColumns: 10,
      cellSpacing: 0.01,
      cellColor: 0x1A365D,
      busbarCount: 5
    };
    
    // Create module meshes
    if (moduleInfo.modulePositions) {
      moduleInfo.modulePositions.forEach((position, index) => {
        // Create module mesh based on detail level
        let moduleMesh: THREE.Mesh;
        
        if (detailLevel === 'simple') {
          // Simple representation - just a colored rectangle
          const geometry = new THREE.BoxGeometry(width, 0.03, height);
          const material = new THREE.MeshBasicMaterial({ 
            color: 0x0EA5E9,
            transparent: true,
            opacity: 0.9
          });
          moduleMesh = new THREE.Mesh(geometry, material);
          
        } else {
          // Detailed representation with frame, panel, and cells
          moduleMesh = createDetailedModule(width, height, visuals);
        }
        
        // Position and orient the module
        moduleMesh.position.set(position.x, position.y + 0.02, position.z);
        
        // Determine orientation based on the bounding box or specified orientation
        if (moduleInfo.orientation === 'landscape') {
          moduleMesh.rotateY(Math.PI / 2);
        }
        
        // Add metadata to the mesh
        moduleMesh.userData = {
          isPVModule: true,
          moduleIndex: index,
          measurementId,
          power: spec.power,
          moduleSpec: spec,
          position
        };
        
        // Add to the group
        if (modulesRef.current) {
          modulesRef.current.add(moduleMesh);
        }
        
        // Add interactive features if enabled
        if (isInteractive) {
          makeInteractive(moduleMesh);
        }
      });
    }
    
    // Clean up on unmount
    return () => {
      if (modulesRef.current && !moduleGroup) {
        scene.remove(modulesRef.current);
        modulesRef.current = null;
      }
    };
  }, [
    scene, 
    moduleInfo, 
    moduleSpec, 
    detailLevel, 
    moduleGroup, 
    measurementId, 
    isInteractive
  ]);
  
  // Create detailed module with frame, panel and cells
  const createDetailedModule = (
    width: number, 
    height: number, 
    visuals: any
  ): THREE.Mesh => {
    const frameGroup = new THREE.Group();
    
    // Calculate inner dimensions
    const innerWidth = width - (visuals.frameBorder * 2);
    const innerHeight = height - (visuals.frameBorder * 2);
    
    // Create frame
    const frameGeometry = new THREE.BoxGeometry(width, 0.04, height);
    const frameMaterial = new THREE.MeshPhongMaterial({ 
      color: visuals.frameColor,
      specular: 0x222222,
      shininess: 30
    });
    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
    frameGroup.add(frame);
    
    // Create panel background
    const panelGeometry = new THREE.BoxGeometry(innerWidth, 0.02, innerHeight);
    const panelMaterial = new THREE.MeshPhongMaterial({ 
      color: visuals.panelColor,
      specular: 0x666666,
      shininess: 80
    });
    const panel = new THREE.Mesh(panelGeometry, panelMaterial);
    panel.position.y = 0.01; // Slightly above frame
    frameGroup.add(panel);
    
    // Create cells if detailed view is enabled
    if (visuals.cellRows && visuals.cellColumns) {
      const cellWidth = (innerWidth - visuals.cellSpacing * (visuals.cellColumns + 1)) / visuals.cellColumns;
      const cellHeight = (innerHeight - visuals.cellSpacing * (visuals.cellRows + 1)) / visuals.cellRows;
      
      // Calculate starting position (top-left corner of panel)
      const startX = -innerWidth / 2 + visuals.cellSpacing;
      const startZ = -innerHeight / 2 + visuals.cellSpacing;
      
      // Create each cell
      for (let row = 0; row < visuals.cellRows; row++) {
        for (let col = 0; col < visuals.cellColumns; col++) {
          const cellGeometry = new THREE.BoxGeometry(cellWidth, 0.01, cellHeight);
          const cellMaterial = new THREE.MeshPhongMaterial({ 
            color: visuals.cellColor,
            specular: 0x0066FF,
            shininess: 100
          });
          
          const cell = new THREE.Mesh(cellGeometry, cellMaterial);
          
          // Position the cell
          cell.position.x = startX + col * (cellWidth + visuals.cellSpacing) + cellWidth / 2;
          cell.position.z = startZ + row * (cellHeight + visuals.cellSpacing) + cellHeight / 2;
          cell.position.y = 0.02; // Slightly above panel
          
          frameGroup.add(cell);
          
          // Add busbars if specified
          if (visuals.busbarCount && visuals.busbarCount > 0) {
            const busbarWidth = 0.001;
            const busbarSpacing = cellWidth / (visuals.busbarCount + 1);
            
            for (let b = 0; b < visuals.busbarCount; b++) {
              const busbarGeometry = new THREE.BoxGeometry(busbarWidth, 0.012, cellHeight - 0.01);
              const busbarMaterial = new THREE.MeshBasicMaterial({ color: 0xCCCCCC });
              const busbar = new THREE.Mesh(busbarGeometry, busbarMaterial);
              
              busbar.position.x = cell.position.x - cellWidth / 2 + (b + 1) * busbarSpacing;
              busbar.position.z = cell.position.z;
              busbar.position.y = 0.03; // Slightly above cells
              
              frameGroup.add(busbar);
            }
          }
        }
      }
    }
    
    return frameGroup as unknown as THREE.Mesh;
  };
  
  // Add interactive features to a module
  const makeInteractive = (moduleMesh: THREE.Mesh) => {
    // This will be implemented in the interactive controller component
    moduleMesh.userData.isInteractive = true;
  };
  
  return null; // This component doesn't render any DOM elements
};

export default PVModuleVisualizer;
