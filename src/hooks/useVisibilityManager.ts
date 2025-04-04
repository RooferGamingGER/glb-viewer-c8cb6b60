
import { useCallback } from 'react';
import * as THREE from 'three';
import { Measurement } from '@/types/measurements';
import { useThreeJs } from '@/contexts/ThreeJsContext';

export const useVisibilityManager = (
  measurements: Measurement[],
  toggleMeasurementVisibility: (id: string) => void,
  toggleLabelVisibility: (id: string) => void,
  allLabelsVisible: boolean
) => {
  // Get Three.js object references from context
  const { 
    pointsRef, 
    linesRef, 
    measurementsRef, 
    labelsRef, 
    segmentLabelsRef,
    getAllGroups
  } = useThreeJs();

  // Toggle visibility of a measurement on screen
  const handleToggleMeasurementVisibility = useCallback((id: string) => {
    toggleMeasurementVisibility(id);

    // Update visibility in Three.js objects
    updateMeasurementMarkers();
  }, [toggleMeasurementVisibility]);

  // Toggle label visibility
  const handleToggleLabelVisibility = useCallback((id: string) => {
    toggleLabelVisibility(id);

    // Update label visibility in Three.js
    updateLabelVisibility(id);
  }, [toggleLabelVisibility]);

  // Update all labels visibility
  const updateAllLabelsVisibility = useCallback((visible: boolean) => {
    if (!labelsRef.current || !segmentLabelsRef.current) return;
    
    // Update all main labels
    labelsRef.current.children.forEach(label => {
      if (!label.userData || !label.userData.measurementId) return;
      
      const measurement = measurements.find(m => m.id === label.userData.measurementId);
      if (measurement) {
        label.visible = visible && measurement.visible !== false;
      }
    });

    // Update all segment labels
    segmentLabelsRef.current.children.forEach(label => {
      if (!label.userData || !label.userData.measurementId) return;
      
      const measurement = measurements.find(m => m.id === label.userData.measurementId);
      if (measurement) {
        label.visible = visible && measurement.visible !== false;
      }
    });
  }, [measurements, labelsRef, segmentLabelsRef]);

  // Update label visibility for a specific measurement
  const updateLabelVisibility = useCallback((id: string) => {
    if (!labelsRef.current || !segmentLabelsRef.current) return;
    
    const measurement = measurements.find(m => m.id === id);
    
    if (!measurement) return;

    // Update main labels
    labelsRef.current.children.forEach(label => {
      if (label.userData && label.userData.measurementId === id) {
        label.visible = measurement.visible !== false && measurement.labelVisible !== false;
      }
    });

    // Update segment labels
    segmentLabelsRef.current.children.forEach(label => {
      if (label.userData && label.userData.measurementId === id) {
        label.visible = measurement.visible !== false && measurement.labelVisible !== false;
      }
    });
  }, [measurements, labelsRef, segmentLabelsRef]);

  // Update measurement markers visibility
  const updateMeasurementMarkers = useCallback(() => {
    if (!measurementsRef.current) return;
    
    // Debug message to track PV modules
    console.log("Updating measurement markers visibility in useVisibilityManager");
    
    let pvModuleCount = 0;
    let pvModulesVisible = 0;
    
    // Update mesh visibilities for PV areas and other measurements
    measurementsRef.current.children.forEach(mesh => {
      if (!mesh.userData || !mesh.userData.measurementId) return;
      
      const measurement = measurements.find(m => m.id === mesh.userData.measurementId);
      if (measurement) {
        mesh.visible = measurement.visible !== false;
        
        // For PV areas, set a more visible color and properties
        if ((measurement.type === 'pvmodule' || measurement.type === 'solar') && mesh instanceof THREE.Mesh) {
          pvModuleCount++;
          if (mesh.visible) pvModulesVisible++;
          
          const material = mesh.material as THREE.MeshBasicMaterial;
          if (material) {
            // Set to a bright blue with increased opacity for better visibility
            material.color.set(0x0EA5E9); 
            material.opacity = 0.95;  
            material.transparent = true;
            material.side = THREE.DoubleSide; // Show both sides
            material.needsUpdate = true;
            
            // Raise slightly to avoid z-fighting
            mesh.position.y += 0.01;
            
            console.log(`Updated PV Module ${mesh.name || "unnamed"} in useVisibilityManager:`, {
              visible: mesh.visible,
              opacity: material.opacity,
              color: material.color.getHexString(),
              position: mesh.position.y
            });
          }
        }
        
        // Special handling for standalone PV modules
        if (mesh.userData.isPVModule) {
          pvModuleCount++;
          if (mesh.visible) pvModulesVisible++;
          
          if (mesh instanceof THREE.Mesh && mesh.material instanceof THREE.MeshBasicMaterial) {
            mesh.material.opacity = 0.95;
            mesh.material.color.set(0x1E88E5);
            mesh.material.transparent = true;
            mesh.material.side = THREE.DoubleSide;
            mesh.material.needsUpdate = true;
            
            // Raise slightly to avoid z-fighting
            mesh.position.y += 0.01;
            
            console.log(`Standalone PV Module updated in useVisibilityManager:`, {
              visible: mesh.visible,
              opacity: mesh.material.opacity,
              color: mesh.material.color.getHexString()
            });
          }
        }
      }
    });
    
    console.log(`PV Module visibility summary from useVisibilityManager: ${pvModulesVisible}/${pvModuleCount} modules visible`);
  }, [measurements, measurementsRef]);

  // Get all measurement groups for temporary hiding during screenshots
  const getMeasurementGroups = useCallback(() => {
    return getAllGroups();
  }, [getAllGroups]);

  return {
    handleToggleMeasurementVisibility,
    handleToggleLabelVisibility,
    updateAllLabelsVisibility,
    updateMeasurementMarkers,
    updateLabelVisibility,
    getMeasurementGroups
  };
};
