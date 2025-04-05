
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useVisibilityOptimizer } from './useVisibilityOptimizer';
import { useInstancedMeshRenderer } from './useInstancedMeshRenderer';
import { useThreeJs } from '@/contexts/ThreeJsContext';
import { Measurement } from '@/types/measurements';

/**
 * Hook that applies Three.js performance optimizations
 */
export const useThreeJsOptimizations = (
  scene: THREE.Scene | null,
  camera: THREE.Camera | null,
  enabled: boolean,
  measurements: Measurement[]
) => {
  // Get all object groups from ThreeJs context
  const { getAllGroups } = useThreeJs();
  
  // Set up visibility optimizer
  const { registerObjectGroup, unregisterObjectGroup } = useVisibilityOptimizer(camera, enabled);
  
  // Set up instanced mesh renderer
  const { updatePVModuleInstances } = useInstancedMeshRenderer(scene, enabled);
  
  // Group names for registration
  const groupNames = useMemo(() => [
    'pointsGroup',
    'linesGroup',
    'measurementsGroup',
    'editPointsGroup',
    'labelsGroup',
    'segmentLabelsGroup'
  ], []);

  // Register object groups for visibility optimization
  useEffect(() => {
    if (!enabled || !camera) return;
    
    const groups = getAllGroups();
    
    groups.forEach((group, index) => {
      if (group) {
        registerObjectGroup(groupNames[index] || `group_${index}`, group);
      }
    });
    
    return () => {
      groupNames.forEach(name => {
        unregisterObjectGroup(name);
      });
    };
  }, [enabled, camera, getAllGroups, groupNames, registerObjectGroup, unregisterObjectGroup]);
  
  // Update PV module instances when measurements change
  useEffect(() => {
    if (!enabled || !scene) return;
    
    // Filter only visible PV-related measurements
    const pvMeasurements = measurements.filter(m => 
      (m.type === 'pvmodule' || m.type === 'pvplanning' || m.type === 'solar') && 
      m.visible !== false
    );
    
    if (pvMeasurements.length > 0) {
      updatePVModuleInstances(pvMeasurements);
    }
  }, [enabled, scene, measurements, updatePVModuleInstances]);
  
  return {
    // Export any useful functions or state
  };
};
