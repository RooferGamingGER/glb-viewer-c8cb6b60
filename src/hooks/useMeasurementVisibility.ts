
import { useCallback } from 'react';
import * as THREE from 'three';
import { Measurement } from '@/types/measurements';
import { toast } from '@/components/ui/use-toast';

interface ThreeObjects {
  pointsRef: React.MutableRefObject<THREE.Group | null>;
  linesRef: React.MutableRefObject<THREE.Group | null>;
  measurementsRef: React.MutableRefObject<THREE.Group | null>;
  labelsRef: React.MutableRefObject<THREE.Group | null>;
  segmentLabelsRef: React.MutableRefObject<THREE.Group | null>;
  getAllGroups?: () => THREE.Group[];
}

export const useMeasurementVisibility = (
  measurements: Measurement[],
  toggleMeasurementVisibility: (id: string) => void,
  toggleLabelVisibility: (id: string) => void,
  threeObjects: ThreeObjects
) => {
  // Toggle visibility of a measurement on screen
  const handleToggleMeasurementVisibility = useCallback((id: string) => {
    toggleMeasurementVisibility(id);

    // Update visibility in Three.js objects
    updateMeasurementMarkers();
    
    // Show toast notification for important PV visibility changes
    const measurement = measurements.find(m => m.id === id);
    if (measurement && (measurement.type === 'pvmodule' || measurement.type === 'solar')) {
      const newState = measurement.visible === false ? 'visible' : 'hidden';
      toast({
        title: `PV Module ${newState}`,
        description: `The PV module area is now ${newState}`,
        duration: 2000,
      });
    }
  }, [toggleMeasurementVisibility, measurements]);

  // Toggle label visibility
  const handleToggleLabelVisibility = useCallback((id: string) => {
    toggleLabelVisibility(id);

    // Update label visibility in Three.js
    updateLabelVisibility(id);
  }, [toggleLabelVisibility]);

  // Update all labels visibility
  const updateAllLabelsVisibility = useCallback((visible: boolean) => {
    if (!threeObjects.labelsRef.current || !threeObjects.segmentLabelsRef.current) return;
    
    const { labelsRef, segmentLabelsRef } = threeObjects;

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
  }, [measurements, threeObjects]);

  // Update label visibility for a specific measurement
  const updateLabelVisibility = useCallback((id: string) => {
    if (!threeObjects.labelsRef.current || !threeObjects.segmentLabelsRef.current) return;
    
    const { labelsRef, segmentLabelsRef } = threeObjects;
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
  }, [measurements, threeObjects]);

  // Update measurement markers visibility
  const updateMeasurementMarkers = useCallback(() => {
    if (!threeObjects.measurementsRef.current) return;
    
    const { measurementsRef } = threeObjects;

    // Debug message to track PV modules
    console.log("Updating measurement markers visibility. Total objects:", measurementsRef.current.children.length);
    
    let pvModuleCount = 0;
    let pvModulesVisible = 0;
    
    // Update mesh visibilities for PV areas and other measurements
    measurementsRef.current.children.forEach(mesh => {
      if (!mesh.userData || !mesh.userData.measurementId) return;
      
      const measurement = measurements.find(m => m.id === mesh.userData.measurementId);
      if (measurement) {
        mesh.visible = measurement.visible !== false;
        
        // Special handling for PV modules and solar areas
        if ((measurement.type === 'pvmodule' || measurement.type === 'solar') && mesh instanceof THREE.Mesh) {
          pvModuleCount++;
          if (mesh.visible) pvModulesVisible++;
          
          const material = mesh.material as THREE.MeshBasicMaterial;
          if (material) {
            // Set to a bright blue with increased opacity for better visibility
            material.color.set(0x0EA5E9); // using bright blue color
            material.opacity = 0.95;  // increasing opacity from 0.8 to 0.95 for better visibility
            material.transparent = true;
            material.side = THREE.DoubleSide;
            material.needsUpdate = true;
            
            // Raise position slightly to avoid z-fighting - increase offset
            mesh.position.y += 0.05;
            
            // Log material properties for debugging
            console.log(`PV Module ${mesh.name || "unnamed"} visibility:`, mesh.visible, "Material:", {
              color: material.color.getHexString(),
              opacity: material.opacity,
              transparent: material.transparent,
              side: material.side === THREE.DoubleSide ? "DoubleSide" : "SingleSide",
              position: mesh.position.y
            });
          }
          
          // Also update any children (individual PV modules)
          mesh.children.forEach(child => {
            child.visible = measurement.visible !== false;
            if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
              child.material.opacity = 0.95;
              child.material.color.set(0x1E88E5); // Slightly different blue
              child.material.transparent = true;
              child.material.side = THREE.DoubleSide;
              child.material.needsUpdate = true;
              
              // Raise position slightly to avoid z-fighting - increase offset
              child.position.y += 0.05;
            }
          });
        }
        
        // Handle standalone PV modules (not part of an area)
        if (mesh.userData.isPVModule) {
          pvModuleCount++;
          if (mesh.visible) pvModulesVisible++;
          
          mesh.visible = measurement.visible !== false;
          if (mesh instanceof THREE.Mesh && mesh.material instanceof THREE.MeshBasicMaterial) {
            mesh.material.opacity = 0.95;
            mesh.material.color.set(0x1E88E5); // Slightly different blue
            mesh.material.transparent = true;
            mesh.material.side = THREE.DoubleSide;
            mesh.material.needsUpdate = true;
            
            // Raise position slightly to avoid z-fighting - increase offset
            mesh.position.y += 0.05;
            
            // Log material properties for debugging
            console.log(`Standalone PV Module visibility:`, mesh.visible, "Material:", {
              color: mesh.material.color.getHexString(),
              opacity: mesh.material.opacity,
              transparent: mesh.material.transparent,
              side: mesh.material.side === THREE.DoubleSide ? "DoubleSide" : "SingleSide",
              position: mesh.position
            });
          }
        }
      }
    });
    
    console.log(`PV Module visibility summary: ${pvModulesVisible}/${pvModuleCount} modules visible`);
    
  }, [measurements, threeObjects]);

  // Get all measurement groups for temporary hiding during screenshots
  const getMeasurementGroups = useCallback(() => {
    if (threeObjects.getAllGroups) {
      return threeObjects.getAllGroups();
    }
    
    return [
      threeObjects.pointsRef.current,
      threeObjects.linesRef.current,
      threeObjects.measurementsRef.current,
      threeObjects.labelsRef.current,
      threeObjects.segmentLabelsRef.current
    ].filter(Boolean) as THREE.Group[];
  }, [threeObjects]);

  return {
    handleToggleMeasurementVisibility,
    handleToggleLabelVisibility,
    updateAllLabelsVisibility,
    updateMeasurementMarkers,
    updateLabelVisibility,
    getMeasurementGroups
  };
};
