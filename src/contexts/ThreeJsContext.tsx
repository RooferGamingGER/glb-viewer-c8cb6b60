
import React, { createContext, useContext, useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';

// Define context type
type ThreeJsContextType = {
  scene: THREE.Scene | null;
  camera: THREE.Camera | null;
  pointsRef: React.RefObject<THREE.Group>;
  linesRef: React.RefObject<THREE.Group>;
  measurementsRef: React.RefObject<THREE.Group>;
  editPointsRef: React.RefObject<THREE.Group>;
  labelsRef: React.RefObject<THREE.Group>;
  segmentLabelsRef: React.RefObject<THREE.Group>;
  initializeGroups: (scene: THREE.Scene) => void;
  cleanupGroups: () => void;
  getAllGroups: () => THREE.Group[];
  clearGroup: (group: THREE.Group) => void;
  updateLabelScaling: (camera: THREE.Camera) => void;
};

// Create context with default values
const ThreeJsContext = createContext<ThreeJsContextType>({
  scene: null,
  camera: null,
  pointsRef: { current: null },
  linesRef: { current: null },
  measurementsRef: { current: null },
  editPointsRef: { current: null },
  labelsRef: { current: null },
  segmentLabelsRef: { current: null },
  initializeGroups: () => {},
  cleanupGroups: () => {},
  getAllGroups: () => [],
  clearGroup: () => {},
  updateLabelScaling: () => {},
});

// Interface for provider props
interface ThreeJsProviderProps {
  children: React.ReactNode;
  scene: THREE.Scene | null;
  camera?: THREE.Camera | null;
  enabled: boolean;
}

// Provider component
export const ThreeJsProvider: React.FC<ThreeJsProviderProps> = ({ 
  children, 
  scene,
  camera = null,
  enabled
}) => {
  // Create refs for all groups
  const pointsRef = useRef<THREE.Group>(new THREE.Group());
  const linesRef = useRef<THREE.Group>(new THREE.Group());
  const measurementsRef = useRef<THREE.Group>(new THREE.Group());
  const editPointsRef = useRef<THREE.Group>(new THREE.Group());
  const labelsRef = useRef<THREE.Group>(new THREE.Group());
  const segmentLabelsRef = useRef<THREE.Group>(new THREE.Group());

  // Flag to track if groups are initialized
  const isInitializedRef = useRef(false);

  // Initialize groups in the scene
  const initializeGroups = useCallback((sceneToUse: THREE.Scene) => {
    if (!sceneToUse || isInitializedRef.current) return;

    // Set names for the groups
    pointsRef.current.name = "pointsGroup";
    linesRef.current.name = "linesGroup";
    measurementsRef.current.name = "measurementsGroup";
    editPointsRef.current.name = "editPointsGroup";
    labelsRef.current.name = "labelsGroup";
    segmentLabelsRef.current.name = "segmentLabelsGroup";

    // Add groups to the scene
    sceneToUse.add(pointsRef.current);
    sceneToUse.add(linesRef.current);
    sceneToUse.add(measurementsRef.current);
    sceneToUse.add(editPointsRef.current);
    sceneToUse.add(labelsRef.current);
    sceneToUse.add(segmentLabelsRef.current);

    isInitializedRef.current = true;
  }, []);

  // Clear all objects from a group
  const clearGroup = useCallback((group: THREE.Group | null) => {
    if (!group) return;

    // Remove all children
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);

      // Dispose of geometries and materials
      if (child instanceof THREE.Mesh) {
        if (child.geometry) {
          child.geometry.dispose();
        }
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((material) => material.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    }
  }, []);

  // Cleanup all groups
  const cleanupGroups = useCallback(() => {
    if (!isInitializedRef.current) return;

    // Clear all groups
    clearGroup(pointsRef.current);
    clearGroup(linesRef.current);
    clearGroup(measurementsRef.current);
    clearGroup(editPointsRef.current);
    clearGroup(labelsRef.current);
    clearGroup(segmentLabelsRef.current);
  }, [clearGroup]);

  // Get all groups
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

    const updateGroupLabels = (group: THREE.Group) => {
      group.children.forEach(child => {
        if (child instanceof THREE.Group && child.userData.isLabel) {
          // Get distance to camera
          const position = new THREE.Vector3();
          child.getWorldPosition(position);
          const distanceToCamera = position.distanceTo(camera.position);
          
          // Scale based on distance
          const baseScale = 0.01;
          const scaleFactor = Math.max(baseScale, distanceToCamera * 0.004);
          
          // Apply scale
          child.scale.set(scaleFactor, scaleFactor, scaleFactor);
        }
      });
    };

    // Update both label groups
    updateGroupLabels(labelsRef.current);
    updateGroupLabels(segmentLabelsRef.current);
  }, []);

  // Initialize groups when scene and enabled change
  useEffect(() => {
    if (scene && enabled) {
      initializeGroups(scene);
    }
    
    // Cleanup when component unmounts
    return () => {
      if (scene && isInitializedRef.current) {
        // Remove groups from scene
        scene.remove(pointsRef.current);
        scene.remove(linesRef.current);
        scene.remove(measurementsRef.current);
        scene.remove(editPointsRef.current);
        scene.remove(labelsRef.current);
        scene.remove(segmentLabelsRef.current);
        
        isInitializedRef.current = false;
      }
    };
  }, [scene, enabled, initializeGroups]);

  // Provide context values
  const contextValue = {
    scene,
    camera,
    pointsRef,
    linesRef,
    measurementsRef,
    editPointsRef,
    labelsRef,
    segmentLabelsRef,
    initializeGroups,
    cleanupGroups,
    getAllGroups,
    clearGroup,
    updateLabelScaling
  };

  return (
    <ThreeJsContext.Provider value={contextValue}>
      {children}
    </ThreeJsContext.Provider>
  );
};

// Hook for using the context
export const useThreeJs = () => useContext(ThreeJsContext);
