
import React, { createContext, useContext, useState, useCallback } from 'react';
import * as THREE from 'three';
import { Point } from '@/types/measurements';

interface PointSnappingContextType {
  snapEnabled: boolean;
  toggleSnapEnabled: () => void;
  isSnapping: boolean;
  snapTarget: Point | null;
  registerScene: (scene: THREE.Scene | null) => void;
  clearSnapIndicator: () => void;
  getSnapPoint: (point: THREE.Vector3) => Point | null;
}

const defaultContext: PointSnappingContextType = {
  snapEnabled: true,
  toggleSnapEnabled: () => {},
  isSnapping: false,
  snapTarget: null,
  registerScene: () => {},
  clearSnapIndicator: () => {},
  getSnapPoint: () => null,
};

const PointSnappingContext = createContext<PointSnappingContextType>(defaultContext);

export const PointSnappingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [isSnapping, setIsSnapping] = useState(false);
  const [snapTarget, setSnapTarget] = useState<Point | null>(null);
  const [scene, setScene] = useState<THREE.Scene | null>(null);
  const [snapIndicator, setSnapIndicator] = useState<THREE.Mesh | null>(null);

  const toggleSnapEnabled = useCallback(() => {
    setSnapEnabled(prev => !prev);
  }, []);

  const registerScene = useCallback((newScene: THREE.Scene | null) => {
    setScene(newScene);
    
    // Clean up any existing snap indicator
    clearSnapIndicator();
  }, []);

  const clearSnapIndicator = useCallback(() => {
    if (snapIndicator && scene) {
      scene.remove(snapIndicator);
      if (snapIndicator.geometry) snapIndicator.geometry.dispose();
      if (snapIndicator.material) {
        if (Array.isArray(snapIndicator.material)) {
          snapIndicator.material.forEach(m => m.dispose());
        } else {
          snapIndicator.material.dispose();
        }
      }
      setSnapIndicator(null);
    }
    setIsSnapping(false);
    setSnapTarget(null);
  }, [scene, snapIndicator]);

  const getSnapPoint = useCallback((point: THREE.Vector3): Point | null => {
    if (!snapEnabled || !scene) return null;

    // Implementation would find nearest snap point in the scene
    // For now, we're just returning null which means no snap point found
    
    // When a snap point is found, this function would:
    // 1. Create or update the snap indicator
    // 2. Set isSnapping to true
    // 3. Update snapTarget
    // 4. Return the snap point
    
    return null;
  }, [snapEnabled, scene]);

  const value = {
    snapEnabled,
    toggleSnapEnabled,
    isSnapping,
    snapTarget,
    registerScene,
    clearSnapIndicator,
    getSnapPoint,
  };

  return (
    <PointSnappingContext.Provider value={value}>
      {children}
    </PointSnappingContext.Provider>
  );
};

export const usePointSnapping = () => useContext(PointSnappingContext);
