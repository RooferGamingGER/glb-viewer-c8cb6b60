import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useIsMobile } from '@/hooks/use-mobile';
import { useDeviceCapabilities } from '@/hooks/useDeviceCapabilities';
import { useNetworkQuality } from '@/hooks/useNetworkQuality';

/**
 * Performance optimization hook that provides LOD, frustum culling, and adaptive quality
 */
export const usePerformanceOptimization = (
  scene: THREE.Scene | null,
  camera: THREE.Camera | null,
  renderer: THREE.WebGLRenderer | null
) => {
  const isMobile = useIsMobile();
  const { renderSettings, capabilities, prefersReducedMotion } = useDeviceCapabilities();
  const { quality: networkQuality, isOnline } = useNetworkQuality();
  const [fps, setFps] = useState(60);
  const [isLowPerformance, setIsLowPerformance] = useState(false);
  const fpsHistory = useRef<number[]>([]);
  const lastTime = useRef(performance.now());
  const frameCount = useRef(0);
  const isTabVisible = useRef(true);
  
  // Track tab visibility for render-on-demand
  useEffect(() => {
    const handleVisibilityChange = () => {
      isTabVisible.current = document.visibilityState === 'visible';
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);
  
  // Quality settings based on performance, device capabilities, and network
  const qualitySettings = useMemo(() => {
    const isLowNetwork = networkQuality === 'low' || networkQuality === 'offline';
    const isLowDevice = capabilities?.tier === 'low';
    const shouldOptimize = isLowPerformance || isMobile || isLowDevice || isLowNetwork;

    if (shouldOptimize) {
      return {
        pixelRatio: renderSettings.pixelRatio,
        shadowMapSize: renderSettings.shadowMapSize,
        antialias: renderSettings.antialias,
        renderDistance: 50,
        lodLevels: 3,
        maxLights: renderSettings.maxLights,
        useEnvironmentMap: renderSettings.useEnvironmentMap,
        enableAnimations: !prefersReducedMotion,
      };
    } else {
      return {
        pixelRatio: Math.min(window.devicePixelRatio, 2),
        shadowMapSize: 1024,
        antialias: true,
        renderDistance: 100,
        lodLevels: 5,
        maxLights: 4,
        useEnvironmentMap: true,
        enableAnimations: !prefersReducedMotion,
      };
    }
  }, [isLowPerformance, isMobile, renderSettings, capabilities, networkQuality, prefersReducedMotion]);

  // FPS monitoring
  useFrame(() => {
    frameCount.current++;
    const now = performance.now();
    
    if (now - lastTime.current >= 1000) {
      const currentFps = Math.round((frameCount.current * 1000) / (now - lastTime.current));
      setFps(currentFps);
      
      // Track FPS history
      fpsHistory.current.push(currentFps);
      if (fpsHistory.current.length > 10) {
        fpsHistory.current.shift();
      }
      
      // Check if performance is consistently low
      const avgFps = fpsHistory.current.reduce((a, b) => a + b, 0) / fpsHistory.current.length;
      setIsLowPerformance(avgFps < 45);
      
      frameCount.current = 0;
      lastTime.current = now;
    }
  });

  // Frustum culling
  const frustum = useMemo(() => new THREE.Frustum(), []);
  const cameraMatrix = useMemo(() => new THREE.Matrix4(), []);
  
  const updateFrustumCulling = useCallback(() => {
    if (!camera || !scene) return;
    
    cameraMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(cameraMatrix);
    
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        const boundingSphere = object.geometry.boundingSphere;
        if (boundingSphere) {
          object.visible = frustum.intersectsSphere(boundingSphere);
        }
      }
    });
  }, [camera, scene, frustum, cameraMatrix]);

  // Level of Detail (LOD) system
  const createLOD = useCallback((
    highDetailGeometry: THREE.BufferGeometry,
    mediumDetailGeometry: THREE.BufferGeometry,
    lowDetailGeometry: THREE.BufferGeometry,
    material: THREE.Material
  ) => {
    const lod = new THREE.LOD();
    
    lod.addLevel(new THREE.Mesh(highDetailGeometry, material), 0);
    lod.addLevel(new THREE.Mesh(mediumDetailGeometry, material), 25);
    lod.addLevel(new THREE.Mesh(lowDetailGeometry, material), 100);
    
    return lod;
  }, []);

  // Adaptive quality adjustment
  const adjustQuality = useCallback(() => {
    if (!renderer) return;
    
    // Adjust pixel ratio based on performance
    renderer.setPixelRatio(qualitySettings.pixelRatio);
    
    // Adjust shadow map size
    if (renderer.shadowMap.enabled) {
      renderer.shadowMap.type = isLowPerformance ? THREE.BasicShadowMap : THREE.PCFSoftShadowMap;
    }
    
    // Adjust antialias
    const context = renderer.getContext();
    if (context) {
      const samples = isLowPerformance ? 0 : 4;
      // Note: Antialias can't be changed after context creation, this is for reference
    }
  }, [renderer, qualitySettings, isLowPerformance]);

  // Optimize scene for performance
  const optimizeScene = useCallback(() => {
    if (!scene) return;
    
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        // Merge geometries where possible
        if (object.geometry instanceof THREE.BufferGeometry) {
          object.geometry.computeBoundingSphere();
          object.geometry.computeBoundingBox();
        }
        
        // Optimize materials
        if (object.material instanceof THREE.MeshStandardMaterial) {
          if (isLowPerformance) {
            // Switch to basic material for better performance
            const basicMaterial = new THREE.MeshBasicMaterial({
              color: object.material.color,
              map: object.material.map,
              transparent: object.material.transparent,
              opacity: object.material.opacity
            });
            object.material = basicMaterial;
          }
        }
      }
      
      // Optimize lights
      if (object instanceof THREE.Light) {
        if (isLowPerformance) {
          object.intensity *= 0.8; // Reduce light intensity
        }
      }
    });
  }, [scene, isLowPerformance]);

  // Batch geometry updates
  const batchGeometryUpdates = useCallback((geometries: THREE.BufferGeometry[]) => {
    geometries.forEach(geometry => {
      if (geometry.attributes.position) {
        geometry.attributes.position.needsUpdate = true;
      }
      if (geometry.attributes.normal) {
        geometry.attributes.normal.needsUpdate = true;
      }
      if (geometry.attributes.uv) {
        geometry.attributes.uv.needsUpdate = true;
      }
    });
  }, []);

  // Debounced render function
  const debouncedRender = useCallback(
    debounce(() => {
      if (renderer && scene && camera) {
        renderer.render(scene, camera);
      }
    }, 16), // ~60fps
    [renderer, scene, camera]
  );

  // Apply optimizations
  useEffect(() => {
    adjustQuality();
    optimizeScene();
  }, [adjustQuality, optimizeScene]);

  // Update frustum culling on camera changes
  useEffect(() => {
    if (camera && scene) {
      const interval = setInterval(updateFrustumCulling, 100);
      return () => clearInterval(interval);
    }
  }, [camera, scene, updateFrustumCulling]);

  return {
    fps,
    isLowPerformance,
    qualitySettings,
    createLOD,
    updateFrustumCulling,
    optimizeScene,
    batchGeometryUpdates,
    debouncedRender,
    isTabVisible: isTabVisible.current,
    prefersReducedMotion,
    networkQuality,
    isOnline,
  };
};

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}