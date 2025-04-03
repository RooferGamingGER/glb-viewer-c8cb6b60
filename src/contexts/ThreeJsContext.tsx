
import React, { createContext, useContext, useRef, useCallback, useEffect } from 'react';
import * as THREE from 'three';
import { Measurement } from '@/types/measurements';

interface ThreeJsContextValue {
  // Group references
  pointsRef: React.MutableRefObject<THREE.Group | null>;
  linesRef: React.MutableRefObject<THREE.Group | null>;
  measurementsRef: React.MutableRefObject<THREE.Group | null>;
  editPointsRef: React.MutableRefObject<THREE.Group | null>;
  labelsRef: React.MutableRefObject<THREE.Group | null>;
  segmentLabelsRef: React.MutableRefObject<THREE.Group | null>;
  
  // Utility functions
  initializeGroups: (scene: THREE.Scene) => void;
  cleanupGroups: () => void;
  clearGroup: (group: THREE.Group | null) => void;
  getAllGroups: () => THREE.Group[];
  updateLabelScaling: (camera: THREE.Camera) => void;
}

export const ThreeJsContext = createContext<ThreeJsContextValue | undefined>(undefined);

export const ThreeJsProvider: React.FC<{ 
  children: React.ReactNode;
  scene: THREE.Scene | null;
  enabled: boolean;
}> = ({ children, scene, enabled }) => {
  // Create refs for all the Three.js object groups
  const pointsRef = useRef<THREE.Group | null>(null);
  const linesRef = useRef<THREE.Group | null>(null);
  const measurementsRef = useRef<THREE.Group | null>(null);
  const editPointsRef = useRef<THREE.Group | null>(null);
  const labelsRef = useRef<THREE.Group | null>(null);
  const segmentLabelsRef = useRef<THREE.Group | null>(null);

  // Initialize the groups in the scene
  const initializeGroups = useCallback((scene: THREE.Scene) => {
    if (!scene) return;

    // Create points group
    if (!pointsRef.current) {
      pointsRef.current = new THREE.Group();
      pointsRef.current.name = "measurementPoints";
      scene.add(pointsRef.current);
    }

    // Create lines group
    if (!linesRef.current) {
      linesRef.current = new THREE.Group();
      linesRef.current.name = "measurementLines";
      scene.add(linesRef.current);
    }
    
    // Create measurements group
    if (!measurementsRef.current) {
      measurementsRef.current = new THREE.Group();
      measurementsRef.current.name = "measurementLabels";
      scene.add(measurementsRef.current);
    }

    // Create edit points group
    if (!editPointsRef.current) {
      editPointsRef.current = new THREE.Group();
      editPointsRef.current.name = "editPoints";
      scene.add(editPointsRef.current);
    }
    
    // Create labels group
    if (!labelsRef.current) {
      labelsRef.current = new THREE.Group();
      labelsRef.current.name = "textLabels";
      scene.add(labelsRef.current);
    }

    // Create segment labels group
    if (!segmentLabelsRef.current) {
      segmentLabelsRef.current = new THREE.Group();
      segmentLabelsRef.current.name = "segmentLabels";
      scene.add(segmentLabelsRef.current);
    }
  }, []);

  // Clean up all the groups and dispose of resources
  const cleanupGroups = useCallback(() => {
    // Helper function to dispose of a group and its children
    const disposeGroup = (group: THREE.Group | null) => {
      if (!group || !scene) return;
      
      // Remove all children with proper disposal
      while (group.children.length > 0) {
        const object = group.children[0];
        
        // Dispose of geometries and materials if they exist
        if (object instanceof THREE.Mesh) {
          if (object.geometry) object.geometry.dispose();
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach(material => material.dispose());
            } else {
              object.material.dispose();
            }
          }
        }
        
        // Remove from parent
        group.remove(object);
      }
      
      // Remove the group from the scene
      scene.remove(group);
    };

    // Dispose of all groups
    disposeGroup(pointsRef.current);
    disposeGroup(linesRef.current);
    disposeGroup(measurementsRef.current);
    disposeGroup(editPointsRef.current);
    disposeGroup(labelsRef.current);
    disposeGroup(segmentLabelsRef.current);
    
    // Reset refs
    pointsRef.current = null;
    linesRef.current = null;
    measurementsRef.current = null;
    editPointsRef.current = null;
    labelsRef.current = null;
    segmentLabelsRef.current = null;
  }, [scene]);

  // Clear a specific group without disposing
  const clearGroup = useCallback((group: THREE.Group | null) => {
    if (!group) return;
    
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
    }
  }, []);

  // Get all measurement groups as an array
  const getAllGroups = useCallback(() => {
    return [
      pointsRef.current,
      linesRef.current,
      measurementsRef.current,
      editPointsRef.current,
      labelsRef.current,
      segmentLabelsRef.current
    ].filter(Boolean) as THREE.Group[];
  }, []);

  // Update label scaling based on camera distance
  const updateLabelScaling = useCallback((camera: THREE.Camera) => {
    if (!labelsRef.current || !segmentLabelsRef.current) return;
    
    const updateGroupScaling = (group: THREE.Group) => {
      group.children.forEach(label => {
        // Check if the label has a position
        if (label.position) {
          // Calculate distance to camera
          const distance = new THREE.Vector3()
            .copy(label.position as THREE.Vector3)
            .distanceTo(camera.position);
          
          // Scale inversely proportional to distance, within bounds
          const baseScale = 0.5;
          const maxDistance = 20;
          const minScale = 0.5;
          const maxScale = 2.0;
          
          // Calculate scale factor based on distance
          let scaleFactor = baseScale * (maxDistance / Math.max(distance, 1));
          
          // Clamp scale factor between min and max values
          scaleFactor = Math.max(minScale, Math.min(maxScale, scaleFactor));
          
          // Apply scale to label
          label.scale.set(scaleFactor, scaleFactor, scaleFactor);
        }
      });
    };
    
    // Update scaling for both label groups
    updateGroupScaling(labelsRef.current);
    updateGroupScaling(segmentLabelsRef.current);
  }, []);

  // Initialize groups when scene is available and enabled
  useEffect(() => {
    if (scene && enabled) {
      initializeGroups(scene);
    }
    
    return () => {
      if (!enabled) {
        cleanupGroups();
      }
    };
  }, [scene, enabled, initializeGroups, cleanupGroups]);

  const value: ThreeJsContextValue = {
    // Group references
    pointsRef,
    linesRef,
    measurementsRef,
    editPointsRef,
    labelsRef,
    segmentLabelsRef,
    
    // Utility functions
    initializeGroups,
    cleanupGroups,
    clearGroup,
    getAllGroups,
    updateLabelScaling
  };

  return (
    <ThreeJsContext.Provider value={value}>
      {children}
    </ThreeJsContext.Provider>
  );
};

export const useThreeJs = () => {
  const context = useContext(ThreeJsContext);
  if (context === undefined) {
    throw new Error('useThreeJs must be used within a ThreeJsProvider');
  }
  return context;
};

