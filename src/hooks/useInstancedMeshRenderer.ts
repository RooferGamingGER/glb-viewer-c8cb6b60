
import { useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { getInstancedMeshRenderer } from '@/utils/instancedMeshRenderer';
import { PVModuleInfo, Point, Measurement } from '@/types/measurements';

/**
 * Hook to use the instanced mesh renderer for efficient rendering
 */
export const useInstancedMeshRenderer = (
  scene: THREE.Scene | null,
  enabled: boolean
) => {
  // Get the singleton renderer instance
  const renderer = getInstancedMeshRenderer();
  
  // Initialize the renderer when scene is available
  useEffect(() => {
    if (scene && enabled) {
      renderer.initialize(scene);
    }
    
    return () => {
      if (!enabled) {
        renderer.dispose();
      }
    };
  }, [scene, enabled]);
  
  // Create PV modules with instanced meshes
  const createPVModules = useCallback((
    moduleInfo: PVModuleInfo,
    positions: Point[],
    parentMeasurementId: string
  ) => {
    if (!scene || !enabled) return null;
    
    return renderer.createPVModuleInstances(
      moduleInfo,
      positions,
      parentMeasurementId
    );
  }, [scene, enabled]);
  
  // Update all PV module instances for measurements
  const updatePVModuleInstances = useCallback((measurements: Measurement[]) => {
    if (!scene || !enabled) return;
    
    // Clear existing PV module instances
    // This is a simple approach - a more optimized one would update existing instances
    measurements.forEach(m => {
      if (m.type === 'pvmodule' || m.type === 'pvplanning' || m.type === 'solar') {
        const frameId = `pvModuleFrame_${m.id}`;
        const panelId = `pvModulePanel_${m.id}`;
        
        renderer.clearInstances(frameId);
        renderer.clearInstances(panelId);
      }
    });
    
    // Create new instances for each PV measurement
    measurements.forEach(m => {
      if ((m.type === 'pvmodule' || m.type === 'pvplanning' || m.type === 'solar') && m.pvModuleInfo) {
        // This would be where module positions are calculated
        // For simplicity, we'll just use measurement points directly
        const positions = m.pvPositions || m.points;
        
        if (positions && positions.length > 0) {
          createPVModules(
            m.pvModuleInfo,
            positions,
            m.id
          );
        }
      }
    });
  }, [scene, enabled, createPVModules]);
  
  // Clean up an individual measurement's instances
  const cleanupMeasurementInstances = useCallback((measurementId: string) => {
    const frameId = `pvModuleFrame_${measurementId}`;
    const panelId = `pvModulePanel_${measurementId}`;
    
    renderer.removeInstancedMesh(frameId);
    renderer.removeInstancedMesh(panelId);
  }, []);

  return {
    createPVModules,
    updatePVModuleInstances,
    cleanupMeasurementInstances
  };
};
