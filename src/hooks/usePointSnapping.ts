
import { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { useLocalStorage } from './useLocalStorage';

export const usePointSnapping = (scene: THREE.Scene | null) => {
  // Use localStorage to persist snap settings across page reloads
  const [snapEnabled, setSnapEnabled] = useLocalStorage('snapEnabled', true);
  const [snapMode, setSnapMode] = useLocalStorage<'all' | 'points' | 'midpoints'>('snapMode', 'all');
  const [isSnapping, setIsSnapping] = useState(false);
  const [snapTarget, setSnapTarget] = useState<{ x: number, y: number, z: number } | null>(null);
  
  const snapIndicatorRef = useRef<THREE.Mesh | null>(null);
  const snapDistanceThreshold = 0.5; // Units in the 3D space

  // Create a snap indicator for visualization
  useEffect(() => {
    if (!scene) return;
    
    // Remove any existing indicator to prevent duplicates
    if (snapIndicatorRef.current && snapIndicatorRef.current.parent) {
      snapIndicatorRef.current.parent.remove(snapIndicatorRef.current);
      snapIndicatorRef.current = null;
    }
    
    // Create new indicator
    const geometry = new THREE.SphereGeometry(0.1, 16, 16);
    const material = new THREE.MeshBasicMaterial({ 
      color: 0x00ff00,
      transparent: true,
      opacity: 0.8,
      depthTest: false
    });
    
    const indicator = new THREE.Mesh(geometry, material);
    indicator.visible = false;
    indicator.renderOrder = 1000; // Ensure it renders on top
    indicator.name = 'snapIndicator';
    
    scene.add(indicator);
    snapIndicatorRef.current = indicator;
    
    return () => {
      if (snapIndicatorRef.current && snapIndicatorRef.current.parent) {
        snapIndicatorRef.current.parent.remove(snapIndicatorRef.current);
        snapIndicatorRef.current = null;
      }
    };
  }, [scene]);

  // Function to find the nearest snap point based on point and threshold
  const findSnapPoint = useCallback((point: THREE.Vector3, objects: THREE.Object3D[]): THREE.Vector3 | null => {
    if (!snapEnabled) return null;
    
    let closestPoint = null;
    let closestDistance = snapDistanceThreshold;
    
    objects.forEach(object => {
      // Skip non-mesh objects and objects named 'snapIndicator'
      if (!object.visible || object.name === 'snapIndicator') return;
      
      if (object instanceof THREE.Points) {
        const positions = (object.geometry.getAttribute('position') as THREE.BufferAttribute).array;
        
        for (let i = 0; i < positions.length; i += 3) {
          const vertexPos = new THREE.Vector3(positions[i], positions[i + 1], positions[i + 2]);
          vertexPos.applyMatrix4(object.matrixWorld);
          
          const distance = point.distanceTo(vertexPos);
          
          if (distance < closestDistance) {
            closestDistance = distance;
            closestPoint = vertexPos;
          }
        }
      } else if (object instanceof THREE.Line || object instanceof THREE.LineSegments) {
        // Skip midpoint snapping if mode is set to 'points' only
        if (snapMode === 'points') return;
        
        const positions = (object.geometry.getAttribute('position') as THREE.BufferAttribute).array;
        
        for (let i = 0; i < positions.length - 3; i += 3) {
          const p1 = new THREE.Vector3(positions[i], positions[i + 1], positions[i + 2]);
          const p2 = new THREE.Vector3(positions[i + 3], positions[i + 4], positions[i + 5]);
          
          p1.applyMatrix4(object.matrixWorld);
          p2.applyMatrix4(object.matrixWorld);
          
          // Calculate midpoint
          const midPoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
          const distance = point.distanceTo(midPoint);
          
          if (distance < closestDistance) {
            closestDistance = distance;
            closestPoint = midPoint;
          }
        }
      } else if (object instanceof THREE.Mesh) {
        // Skip point snapping if mode is set to 'midpoints' only
        if (snapMode === 'midpoints') return;
        
        if (object.geometry instanceof THREE.BufferGeometry) {
          const positions = (object.geometry.getAttribute('position') as THREE.BufferAttribute).array;
          
          for (let i = 0; i < positions.length; i += 3) {
            const vertexPos = new THREE.Vector3(positions[i], positions[i + 1], positions[i + 2]);
            vertexPos.applyMatrix4(object.matrixWorld);
            
            const distance = point.distanceTo(vertexPos);
            
            if (distance < closestDistance) {
              closestDistance = distance;
              closestPoint = vertexPos;
            }
          }
        }
      }
      
      // Recursively check children
      if (object.children && object.children.length > 0) {
        const childSnapPoint = findSnapPoint(point, object.children);
        if (childSnapPoint) {
          const distance = point.distanceTo(childSnapPoint);
          if (distance < closestDistance) {
            closestDistance = distance;
            closestPoint = childSnapPoint;
          }
        }
      }
    });
    
    return closestPoint;
  }, [snapEnabled, snapDistanceThreshold, snapMode]);

  // Function to update snap indicator position and visibility
  const updateSnapIndicator = useCallback((target: { x: number, y: number, z: number } | null) => {
    if (!snapIndicatorRef.current) return;
    
    if (target) {
      snapIndicatorRef.current.position.set(target.x, target.y, target.z);
      snapIndicatorRef.current.visible = true;
      
      // Pulse animation for better visibility
      const scale = 1 + 0.2 * Math.sin(Date.now() * 0.01);
      snapIndicatorRef.current.scale.set(scale, scale, scale);
    } else {
      snapIndicatorRef.current.visible = false;
    }
  }, []);

  // Check for snapping to measurement points
  const checkForSnapping = useCallback((point: THREE.Vector3, objects: THREE.Object3D[]): THREE.Vector3 => {
    if (!snapEnabled || !objects) return point;
    
    const snapPoint = findSnapPoint(point, objects);
    
    if (snapPoint) {
      setIsSnapping(true);
      setSnapTarget({
        x: snapPoint.x,
        y: snapPoint.y,
        z: snapPoint.z
      });
      updateSnapIndicator({
        x: snapPoint.x,
        y: snapPoint.y,
        z: snapPoint.z
      });
      return snapPoint;
    } else {
      setIsSnapping(false);
      setSnapTarget(null);
      updateSnapIndicator(null);
      return point;
    }
  }, [snapEnabled, findSnapPoint, updateSnapIndicator]);

  // Clear the snap indicator when not needed
  const clearSnapIndicator = useCallback(() => {
    if (snapIndicatorRef.current) {
      snapIndicatorRef.current.visible = false;
    }
    setIsSnapping(false);
    setSnapTarget(null);
  }, []);

  return {
    snapEnabled,
    setSnapEnabled,
    snapMode,
    setSnapMode,
    isSnapping,
    snapTarget,
    checkForSnapping,
    clearSnapIndicator
  };
};

// Adding a custom hook for localStorage access
function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error("Error reading from localStorage:", error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error("Error writing to localStorage:", error);
    }
  };

  return [storedValue, setValue] as [T, typeof setValue];
}
