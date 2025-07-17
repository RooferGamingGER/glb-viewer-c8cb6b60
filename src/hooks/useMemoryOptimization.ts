import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { toast } from 'sonner';

/**
 * Memory optimization hook that provides memory monitoring and cleanup utilities
 */
export const useMemoryOptimization = () => {
  const [memoryUsage, setMemoryUsage] = useState<{
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  } | null>(null);
  
  const [isLowMemory, setIsLowMemory] = useState(false);
  const memoryCheckInterval = useRef<NodeJS.Timeout | null>(null);
  const disposedObjects = useRef<Set<THREE.Object3D>>(new Set());

  // Monitor memory usage
  const checkMemoryUsage = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usage = {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit
      };
      
      setMemoryUsage(usage);
      
      // Check if memory usage is above 80%
      const memoryRatio = usage.usedJSHeapSize / usage.jsHeapSizeLimit;
      const newIsLowMemory = memoryRatio > 0.8;
      
      if (newIsLowMemory && !isLowMemory) {
        toast.warning('Hoher Speicherverbrauch erkannt. Optimierungen werden angewendet.');
      }
      
      setIsLowMemory(newIsLowMemory);
    }
  }, [isLowMemory]);

  // Start memory monitoring
  useEffect(() => {
    checkMemoryUsage();
    memoryCheckInterval.current = setInterval(checkMemoryUsage, 2000);
    
    return () => {
      if (memoryCheckInterval.current) {
        clearInterval(memoryCheckInterval.current);
      }
    };
  }, [checkMemoryUsage]);

  // Comprehensive dispose function for Three.js objects
  const disposeObject = useCallback((obj: THREE.Object3D) => {
    if (disposedObjects.current.has(obj)) return;
    
    obj.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) {
          child.geometry.dispose();
        }
        
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(material => {
              disposeMaterial(material);
            });
          } else {
            disposeMaterial(child.material);
          }
        }
      }
      
      if (child instanceof THREE.Line) {
        if (child.geometry) {
          child.geometry.dispose();
        }
        if (child.material) {
          disposeMaterial(child.material as THREE.Material);
        }
      }
      
      if (child instanceof THREE.Points) {
        if (child.geometry) {
          child.geometry.dispose();
        }
        if (child.material) {
          disposeMaterial(child.material as THREE.Material);
        }
      }
    });
    
    disposedObjects.current.add(obj);
  }, []);

  // Dispose material and its textures
  const disposeMaterial = useCallback((material: THREE.Material) => {
    if ((material as any).map) (material as any).map.dispose();
    if ((material as any).lightMap) (material as any).lightMap.dispose();
    if ((material as any).bumpMap) (material as any).bumpMap.dispose();
    if ((material as any).normalMap) (material as any).normalMap.dispose();
    if ((material as any).specularMap) (material as any).specularMap.dispose();
    if ((material as any).envMap) (material as any).envMap.dispose();
    if ((material as any).alphaMap) (material as any).alphaMap.dispose();
    if ((material as any).aoMap) (material as any).aoMap.dispose();
    if ((material as any).displacementMap) (material as any).displacementMap.dispose();
    if ((material as any).emissiveMap) (material as any).emissiveMap.dispose();
    if ((material as any).gradientMap) (material as any).gradientMap.dispose();
    if ((material as any).metalnessMap) (material as any).metalnessMap.dispose();
    if ((material as any).roughnessMap) (material as any).roughnessMap.dispose();
    
    material.dispose();
  }, []);

  // Clear GLTF cache
  const clearGLTFCache = useCallback((url?: string) => {
    if (url) {
      useGLTF.clear(url);
    }
    // Note: useGLTF.clear() without arguments is not supported in current version
  }, []);

  // Force garbage collection (if available)
  const forceGarbageCollection = useCallback(() => {
    if (window.gc) {
      window.gc();
    }
  }, []);

  // Optimize renderer settings for low memory
  const optimizeRenderer = useCallback((renderer: THREE.WebGLRenderer, isLowMemory: boolean) => {
    if (isLowMemory) {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
      renderer.shadowMap.enabled = false;
      renderer.antialias = false;
    } else {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.antialias = true;
    }
  }, []);

  // Get memory formatted for display
  const getFormattedMemoryUsage = useCallback(() => {
    if (!memoryUsage) return null;
    
    return {
      used: formatBytes(memoryUsage.usedJSHeapSize),
      total: formatBytes(memoryUsage.totalJSHeapSize),
      limit: formatBytes(memoryUsage.jsHeapSizeLimit),
      percentage: Math.round((memoryUsage.usedJSHeapSize / memoryUsage.jsHeapSizeLimit) * 100)
    };
  }, [memoryUsage]);

  return {
    memoryUsage,
    isLowMemory,
    disposeObject,
    disposeMaterial,
    clearGLTFCache,
    forceGarbageCollection,
    optimizeRenderer,
    getFormattedMemoryUsage
  };
};

// Helper function to format bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Extend global window type for garbage collection
declare global {
  interface Window {
    gc?: () => void;
  }
}