
import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { 
  createPVModuleInstancedMeshes, 
  generatePVModulePositions, 
  updatePVModuleInstances 
} from '@/utils/instancedMeshRenderer';
import { Measurement } from '@/types/measurements';

/**
 * Hook for managing instanced mesh rendering of PV modules
 */
export const useInstancedMeshRenderer = (
  scene: THREE.Scene | null,
  enabled: boolean,
  measurements: Measurement[]
) => {
  // Store meshes by measurement ID
  const instancedMeshesRef = useRef<Map<string, any>>(new Map());
  
  // Track which measurements have instanced meshes
  const [instancedMeasurements, setInstancedMeasurements] = useState<Set<string>>(new Set());
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Dispose all instanced meshes
      instancedMeshesRef.current.forEach((meshes, id) => {
        disposePVModuleInstances(meshes);
      });
      instancedMeshesRef.current.clear();
    };
  }, []);

  // Create or update instanced meshes for PV modules
  const createOrUpdateInstancedPVModules = useCallback((
    measurement: Measurement
  ) => {
    if (!scene || !enabled || measurement.type !== 'pvmodule' && measurement.type !== 'solar') {
      return false;
    }

    if (!measurement.pvModuleInfo) {
      console.warn(`Measurement ${measurement.id} has no PV module info`);
      return false;
    }

    const moduleInfo = measurement.pvModuleInfo;
    
    // Check if we need to generate module positions
    if ((!moduleInfo.modulePositions || moduleInfo.modulePositions.length === 0) && 
        measurement.points && measurement.points.length >= 3) {
      // Generate module positions if they don't exist
      const positions = generatePVModulePositions(measurement, moduleInfo);
      
      // Store positions in measurement for later use
      if (positions.length > 0) {
        measurement.pvPositions = positions;
      } else {
        console.warn(`Failed to generate module positions for ${measurement.id}`);
        return false;
      }
    }

    const positions = measurement.pvPositions || moduleInfo.modulePositions;
    
    if (!positions || positions.length === 0) {
      console.warn(`No PV module positions for measurement ${measurement.id}`);
      return false;
    }

    const moduleCount = positions.length;
    const moduleWidth = moduleInfo.width || moduleInfo.moduleWidth;
    const moduleHeight = moduleInfo.height || moduleInfo.moduleHeight;

    if (!moduleWidth || !moduleHeight) {
      console.warn(`Invalid module dimensions for measurement ${measurement.id}`);
      return false;
    }

    // Check if instanced meshes already exist for this measurement
    let instancedMeshes = instancedMeshesRef.current.get(measurement.id);
    
    if (!instancedMeshes || instancedMeshes.moduleCount !== moduleCount) {
      // Dispose old instances if they exist
      if (instancedMeshes) {
        disposePVModuleInstances(instancedMeshes);
      }
      
      // Create new instanced meshes
      instancedMeshes = {
        ...createPVModuleInstancedMeshes(moduleCount, moduleWidth, moduleHeight),
        moduleCount
      };
      
      // Add to scene
      scene.add(instancedMeshes.frames);
      scene.add(instancedMeshes.panels);
      
      // Store reference
      instancedMeshesRef.current.set(measurement.id, instancedMeshes);
      
      // Track that this measurement has instanced meshes
      setInstancedMeasurements(prev => new Set([...prev, measurement.id]));
    }
    
    // Update instance positions
    updatePVModuleInstances(instancedMeshes, measurement, moduleInfo);
    
    return true;
  }, [scene, enabled]);

  // Create instanced meshes for all PV measurements
  const createAllInstancedPVModules = useCallback(() => {
    if (!scene || !enabled) return;
    
    const pvMeasurements = measurements.filter(
      m => (m.type === 'pvmodule' || m.type === 'solar') && 
           m.pvModuleInfo &&
           m.visible !== false
    );
    
    pvMeasurements.forEach(measurement => {
      createOrUpdateInstancedPVModules(measurement);
    });
  }, [scene, enabled, measurements, createOrUpdateInstancedPVModules]);

  // Update visibility based on measurement visibility
  const updateInstancedMeshVisibility = useCallback(() => {
    if (!scene || !enabled) return;
    
    instancedMeshesRef.current.forEach((meshes, id) => {
      const measurement = measurements.find(m => m.id === id);
      if (measurement) {
        const visible = measurement.visible !== false;
        meshes.frames.visible = visible;
        meshes.panels.visible = visible;
      }
    });
  }, [scene, enabled, measurements]);

  // Dispose instanced meshes for a specific measurement
  const disposeInstancedMeshes = useCallback((measurementId: string) => {
    const meshes = instancedMeshesRef.current.get(measurementId);
    if (meshes) {
      disposePVModuleInstances(meshes);
      instancedMeshesRef.current.delete(measurementId);
      
      // Update tracked measurements
      setInstancedMeasurements(prev => {
        const next = new Set(prev);
        next.delete(measurementId);
        return next;
      });
    }
  }, []);

  // Helper to dispose meshes
  const disposePVModuleInstances = useCallback((meshes: any) => {
    if (meshes.frames) {
      if (meshes.frames.parent) {
        meshes.frames.parent.remove(meshes.frames);
      }
      meshes.frames.geometry.dispose();
      meshes.frames.material.dispose();
    }
    
    if (meshes.panels) {
      if (meshes.panels.parent) {
        meshes.panels.parent.remove(meshes.panels);
      }
      meshes.panels.geometry.dispose();
      meshes.panels.material.dispose();
    }
  }, []);

  return {
    createOrUpdateInstancedPVModules,
    createAllInstancedPVModules,
    updateInstancedMeshVisibility,
    disposeInstancedMeshes,
    instancedMeasurements
  };
};
