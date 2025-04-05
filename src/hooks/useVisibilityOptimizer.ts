
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { getVisibilityOptimizer } from '@/utils/visibilityOptimizer';

/**
 * Hook to integrate the VisibilityOptimizer with React components
 */
export const useVisibilityOptimizer = (
  camera: THREE.Camera | null, 
  enabled: boolean
) => {
  // Get the singleton visibility optimizer
  const optimizer = getVisibilityOptimizer();
  
  // Store animation frame ID for cleanup
  const frameIdRef = useRef<number | null>(null);
  
  // Set up the optimizer when camera changes or enabled state changes
  useEffect(() => {
    optimizer.setCamera(camera);
    optimizer.setEnabled(enabled);
    
    // Clean up function
    return () => {
      if (frameIdRef.current !== null) {
        cancelAnimationFrame(frameIdRef.current);
        frameIdRef.current = null;
      }
      
      optimizer.setEnabled(false);
    };
  }, [camera, enabled]);
  
  // Start the update loop
  useEffect(() => {
    if (!enabled || !camera) return;
    
    const updateLoop = () => {
      optimizer.update();
      frameIdRef.current = requestAnimationFrame(updateLoop);
    };
    
    // Start the update loop
    frameIdRef.current = requestAnimationFrame(updateLoop);
    
    // Clean up on unmount
    return () => {
      if (frameIdRef.current !== null) {
        cancelAnimationFrame(frameIdRef.current);
        frameIdRef.current = null;
      }
    };
  }, [enabled, camera]);
  
  // Return functions to register and unregister object groups
  return {
    registerObjectGroup: (name: string, group: THREE.Group) => {
      optimizer.registerObjectGroup(name, group);
    },
    unregisterObjectGroup: (name: string) => {
      optimizer.unregisterObjectGroup(name);
    },
    invalidateBoundingSpheres: () => {
      optimizer.invalidateBoundingSpheres();
    }
  };
};
