
import { useCallback } from 'react';
import * as THREE from 'three';
import { useThreeJs } from '@/contexts/ThreeJsContext';

/**
 * Hook that provides simplified access to Three.js objects and management functions
 */
export const useThreeObjectsManager = (scene: THREE.Scene | null, enabled: boolean) => {
  // Get Three.js context
  const {
    pointsRef,
    linesRef,
    measurementsRef,
    editPointsRef,
    labelsRef,
    segmentLabelsRef,
    initializeGroups,
    cleanupGroups,
    getAllGroups
  } = useThreeJs();

  // Initialize groups if scene is available
  const initialize = useCallback(() => {
    if (scene && enabled) {
      initializeGroups(scene);
    }
  }, [scene, enabled, initializeGroups]);

  // Cleanup function for components
  const cleanup = useCallback(() => {
    if (!enabled) {
      cleanupGroups();
    }
  }, [enabled, cleanupGroups]);

  return {
    // Group references
    pointsRef,
    linesRef,
    measurementsRef,
    editPointsRef,
    labelsRef,
    segmentLabelsRef,
    
    // Management functions
    initialize,
    cleanup,
    getAllGroups
  };
};

