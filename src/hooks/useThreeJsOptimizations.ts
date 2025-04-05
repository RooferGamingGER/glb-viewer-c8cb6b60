
import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { useThreeJs } from '@/contexts/ThreeJsContext';

/**
 * Hook for applying Three.js optimizations:
 * - Enhanced frustum culling
 * - LOD (Level of Detail)
 * - Shader and material optimization
 */
export const useThreeJsOptimizations = (
  scene: THREE.Scene | null,
  camera: THREE.Camera | null,
  renderer: THREE.WebGLRenderer | null,
  enabled: boolean = true
) => {
  // Use reference to track if optimizations are applied
  const optimizationsApplied = useRef(false);
  const frustumRef = useRef(new THREE.Frustum());
  const frustumMatrixRef = useRef(new THREE.Matrix4());
  
  // Get Three.js groups from context
  const { 
    pointsRef, 
    linesRef, 
    measurementsRef, 
    labelsRef,
    segmentLabelsRef, 
    editPointsRef 
  } = useThreeJs();

  // Apply all optimizations
  const applyOptimizations = useCallback(() => {
    if (!scene || !camera || !renderer || !enabled) return;
    
    // Apply material optimizations
    optimizeMaterials(scene);
    
    // Configure renderer for better performance
    configureRenderer(renderer);
    
    optimizationsApplied.current = true;
    
    // Debug info
    console.log('Three.js optimizations applied');
  }, [scene, camera, renderer, enabled]);
  
  // Material optimization
  const optimizeMaterials = useCallback((targetScene: THREE.Scene) => {
    targetScene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        // Optimize mesh
        object.frustumCulled = true; // Enable frustum culling
        
        // Optimize materials
        if (object.material) {
          const material = object.material as THREE.Material;
          
          // For transparent materials, optimize depth testing
          if (material.transparent) {
            material.depthWrite = false;
          }
          
          // For large meshes or backgrounds, disable shadows
          if (object.userData.isBackground || object.userData.isLargeMesh) {
            object.castShadow = false;
            object.receiveShadow = false;
          }
        }
      }
    });
  }, []);
  
  // Configure renderer for performance
  const configureRenderer = useCallback((targetRenderer: THREE.WebGLRenderer) => {
    // Use lower precision for better performance
    targetRenderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    
    // Set reasonable pixel ratio to balance quality and performance
    targetRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // Enable physical lights for better performance
    // Note: useLegacyLights is deprecated in newer Three.js versions
    // Using more contemporary settings instead
    
    // Disable shadow auto-update (we'll handle it manually)
    targetRenderer.shadowMap.autoUpdate = false;
    targetRenderer.shadowMap.needsUpdate = true;
  }, []);

  // Enhanced frustum culling
  const updateFrustumCulling = useCallback(() => {
    if (!camera || !enabled) return;
    
    // Update frustum
    frustumMatrixRef.current.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse
    );
    frustumRef.current.setFromProjectionMatrix(frustumMatrixRef.current);
    
    // Arrays of groups to check
    const groups = [
      pointsRef.current,
      linesRef.current,
      measurementsRef.current, 
      labelsRef.current,
      segmentLabelsRef.current,
      editPointsRef.current
    ].filter(Boolean) as THREE.Group[];
    
    // Check each group
    groups.forEach(group => {
      // Set overall group visibility based on bounding sphere
      if (!group.userData.boundingSphere) {
        group.userData.boundingSphere = new THREE.Sphere();
        group.userData.boundingBox = new THREE.Box3();
      }
      
      // Update bounding data
      group.userData.boundingBox.setFromObject(group, true);
      group.userData.boundingBox.getBoundingSphere(group.userData.boundingSphere);
      
      // Check if entire group is outside frustum
      const isGroupVisible = frustumRef.current.intersectsSphere(group.userData.boundingSphere);
      
      // Only process children if group is potentially visible
      if (isGroupVisible) {
        // Now check individual objects for more precise culling
        group.children.forEach(child => {
          // Only update child visibility if it has position
          if ('position' in child) {
            // Use object's world position to determine if in frustum
            const position = new THREE.Vector3();
            child.getWorldPosition(position);
            
            // Create a small sphere around the object
            const sphere = new THREE.Sphere(position, child.userData.radius || 0.5);
            
            // Update visibility based on frustum intersection
            child.visible = child.visible && frustumRef.current.intersectsSphere(sphere);
          }
        });
      } else {
        // If group is completely outside frustum, hide all children
        group.visible = false;
      }
    });
  }, [camera, enabled, pointsRef, linesRef, measurementsRef, labelsRef, segmentLabelsRef, editPointsRef]);

  // Initialize optimizations
  useEffect(() => {
    if (enabled && scene && camera && renderer && !optimizationsApplied.current) {
      applyOptimizations();
    }
    
    return () => {
      optimizationsApplied.current = false;
    };
  }, [enabled, scene, camera, renderer, applyOptimizations]);

  return {
    updateFrustumCulling,
    applyOptimizations,
    optimizeMaterials,
    configureRenderer
  };
};
