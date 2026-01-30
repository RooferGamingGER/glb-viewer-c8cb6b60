import { useState, useCallback, useRef } from 'react';
import * as THREE from 'three';

export interface LayerVisibility {
  showMesh: boolean;      // Wireframe mode
  showTexture: boolean;   // Show textures
  showMeasurements: boolean; // Show measurements
}

// Default state: textured model with measurements visible
const DEFAULT_LAYER_VISIBILITY: LayerVisibility = {
  showMesh: false,        // Wireframe OFF by default
  showTexture: true,      // Texture ON by default (guaranteed!)
  showMeasurements: true  // Measurements ON by default
};

export function useLayerVisibility() {
  const [layerVisibility, setLayerVisibility] = useState<LayerVisibility>(DEFAULT_LAYER_VISIBILITY);
  
  // Track if original materials have been cached
  const materialsCached = useRef(false);
  
  const updateLayerVisibility = useCallback((layer: keyof LayerVisibility, value: boolean) => {
    setLayerVisibility(prev => ({
      ...prev,
      [layer]: value
    }));
  }, []);
  
  // Apply layer visibility to the model scene
  const applyLayerVisibility = useCallback((
    modelScene: THREE.Object3D | null,
    layers: LayerVisibility
  ) => {
    if (!modelScene) return;
    
    modelScene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        // Skip measurement-related objects
        if (object.userData?.isMeasurement || 
            object.userData?.measurementId || 
            object.name?.includes('measurement')) {
          return;
        }
        
        const material = object.material as THREE.Material;
        if (!material) return;
        
        // Cache original material if not already cached
        if (!object.userData.originalMaterial) {
          if (material instanceof THREE.MeshStandardMaterial || 
              material instanceof THREE.MeshBasicMaterial ||
              material instanceof THREE.MeshPhongMaterial) {
            object.userData.originalMaterial = material.clone();
            object.userData.hasTexture = !!(material as any).map;
          }
        }
        
        const originalMat = object.userData.originalMaterial;
        if (!originalMat) return;
        
        // Determine material based on layer state
        if (layers.showMesh && !layers.showTexture) {
          // Wireframe only - gray wireframe
          if (!(object.material instanceof THREE.MeshBasicMaterial) || 
              !(object.material as THREE.MeshBasicMaterial).wireframe) {
            object.material = new THREE.MeshBasicMaterial({
              wireframe: true,
              color: 0x888888,
              transparent: true,
              opacity: 0.8
            });
          }
        } else if (layers.showTexture && !layers.showMesh) {
          // Texture only - restore original (default state)
          if (object.material !== originalMat) {
            object.material = originalMat.clone();
          }
        } else if (layers.showTexture && layers.showMesh) {
          // Both: texture with wireframe overlay effect
          // We show the textured model with a slight wireframe tint
          if (originalMat instanceof THREE.MeshStandardMaterial) {
            const hybridMat = originalMat.clone();
            hybridMat.wireframe = true;
            object.material = hybridMat;
          } else {
            object.material = originalMat.clone();
            (object.material as any).wireframe = true;
          }
        } else {
          // Neither: solid gray geometry
          if (!(object.material instanceof THREE.MeshBasicMaterial) || 
              (object.material as THREE.MeshBasicMaterial).wireframe) {
            object.material = new THREE.MeshBasicMaterial({
              color: 0xcccccc,
              wireframe: false
            });
          }
        }
      }
    });
    
    materialsCached.current = true;
  }, []);
  
  // Reset materials to original state
  const resetMaterials = useCallback((modelScene: THREE.Object3D | null) => {
    if (!modelScene) return;
    
    modelScene.traverse((object) => {
      if (object instanceof THREE.Mesh && object.userData.originalMaterial) {
        object.material = object.userData.originalMaterial.clone();
      }
    });
  }, []);
  
  return {
    layerVisibility,
    setLayerVisibility,
    updateLayerVisibility,
    applyLayerVisibility,
    resetMaterials,
    DEFAULT_LAYER_VISIBILITY
  };
}
