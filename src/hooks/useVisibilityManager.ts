import { useCallback } from 'react';
import * as THREE from 'three';
import { Measurement } from '@/types/measurements';
import { useThreeJs } from '@/contexts/ThreeJsContext';
import { toast } from '@/components/ui/use-toast';
import { DEFAULT_MODULE_VISUALS, SELECTED_MODULE_VISUALS } from '@/utils/pvModuleRenderer';

export const useVisibilityManager = (
  measurements: Measurement[],
  toggleMeasurementVisibility: (id: string) => void,
  toggleLabelVisibility: (id: string) => void,
  allLabelsVisible: boolean,
  selectedModuleIndex: number | null = null,
  selectedMeasurementId: string | null = null
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

  // Extrahiere Dachkanten (insbesondere die Traufe) für die Ausrichtung der PV-Module
  const extractRoofEdgeSegments = useCallback(() => {
    // Prioritäre Suche nach Messungen vom Typ "eave" (Traufe)
    let eaveEdgeMeasurements = measurements.filter(m => m.type === 'eave');
    
    // Falls keine Traufe gefunden wurde, versuche andere Dachkanten
    let edgeMeasurements = eaveEdgeMeasurements.length > 0 ? 
      eaveEdgeMeasurements : 
      measurements.filter(m => m.type === 'ridge' || m.type === 'verge');
    
    const segments: {from: THREE.Vector3, to: THREE.Vector3}[] = [];
    
    // Debug-Ausgabe zur Fehlerfindung
    console.log(`Gefundene Dachkanten für Ausrichtung: ${edgeMeasurements.length}`, 
      edgeMeasurements.map(m => ({type: m.type, id: m.id, points: m.points?.length})));
    
    // Extrahiere Segmente aus Messungen
    edgeMeasurements.forEach(measurement => {
      if (measurement.points && measurement.points.length >= 2) {
        // Convert Point to THREE.Vector3
        const fromPoint = new THREE.Vector3(
          measurement.points[0].x,
          measurement.points[0].y,
          measurement.points[0].z
        );
        
        const toPoint = new THREE.Vector3(
          measurement.points[1].x,
          measurement.points[1].y,
          measurement.points[1].z
        );
        
        segments.push({
          from: fromPoint,
          to: toPoint
        });
        
        console.log(`Dachkante vom Typ ${measurement.type} für Ausrichtung verwendet:`, {
          from: [fromPoint.x, fromPoint.y, fromPoint.z],
          to: [toPoint.x, toPoint.y, toPoint.z],
          length: new THREE.Vector3().subVectors(toPoint, fromPoint).length()
        });
      }
    });
    
    return segments;
  }, [measurements]);

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

  // Update measurement markers visibility with enhanced PV module visuals
  const updateMeasurementMarkers = useCallback(() => {
    if (!measurementsRef.current) return;
    
    // Debug message to track PV modules
    console.log("Updating measurement markers visibility in useVisibilityManager");
    
    let pvModuleCount = 0;
    let pvModulesVisible = 0;
    
    // Extrahiere Dachkantensegmente für die Ausrichtung von PV-Modulen
    const roofEdgeSegments = extractRoofEdgeSegments();
    
    // Default visual properties for PV modules
    const defaultModuleVisuals = DEFAULT_MODULE_VISUALS;
    
    // Update mesh visibilities for PV areas and other measurements
    measurementsRef.current.children.forEach(mesh => {
      if (!mesh.userData || !mesh.userData.measurementId) return;
      
      const measurement = measurements.find(m => m.id === mesh.userData.measurementId);
      if (measurement) {
        mesh.visible = measurement.visible !== false;
        
        // Enhanced PV module visualization
        if ((measurement.type === 'pvmodule' || measurement.type === 'solar') && mesh instanceof THREE.Mesh) {
          pvModuleCount++;
          if (mesh.visible) pvModulesVisible++;
          
          // Set enhanced visual properties for PV modules
          const material = mesh.material as THREE.MeshBasicMaterial;
          if (material) {
            // Set base area to transparent blue with higher opacity
            material.color.set(0x0EA5E9); 
            material.opacity = 0.85;  
            material.transparent = true;
            material.side = THREE.DoubleSide;
            material.needsUpdate = true;
            
            // Raise slightly to avoid z-fighting
            mesh.position.y += 0.01;
            
            // Apply module visuals if defined, otherwise use defaults
            const visuals = measurement.pvModuleInfo?.moduleVisuals || defaultModuleVisuals;
            
            console.log(`Updated PV Module area ${mesh.name || "unnamed"} in useVisibilityManager:`, {
              visible: mesh.visible,
              opacity: material.opacity,
              color: material.color.getHexString(),
              position: mesh.position.y,
              hasRoofEdgeData: roofEdgeSegments.length > 0,
              moduleVisuals: visuals
            });
          }
        }
        
        // Special handling for individual PV module elements with enhanced visuals
        if (mesh.userData.isPVModule && mesh instanceof THREE.Mesh) {
          pvModuleCount++;
          if (mesh.visible) pvModulesVisible++;
          
          const isSelected = 
            selectedMeasurementId === mesh.userData.measurementId && 
            selectedModuleIndex === mesh.userData.moduleIndex;
          
          // Apply enhanced visuals to individual module meshes
          if (mesh.material instanceof THREE.MeshBasicMaterial) {
            // Get visuals settings from parent measurement or use defaults
            const parentMeasurement = measurements.find(m => m.id === mesh.userData.measurementId);
            let visuals = parentMeasurement?.pvModuleInfo?.moduleVisuals || defaultModuleVisuals;
            
            // Apply selected visuals if this module is selected
            if (isSelected) {
              visuals = { ...visuals, ...SELECTED_MODULE_VISUALS };
            }
            
            // Update module visuals with more realistic appearance
            mesh.material.color.set(visuals.frameColor || 0x444444); // Frame color
            mesh.material.opacity = 0.95;
            mesh.material.transparent = true;
            mesh.material.needsUpdate = true;
            
            // Raise slightly to avoid z-fighting with background area
            mesh.position.y += isSelected ? 0.025 : 0.02;
            
            console.log(`Enhanced PV Module element updated:`, {
              visible: mesh.visible,
              type: mesh.userData.moduleElementType || 'module',
              color: mesh.material.color.getHexString(),
              selected: isSelected
            });
          }
        }
        
        // Special handling for module cell elements
        if (mesh.userData.isPVModuleCell && mesh instanceof THREE.Mesh) {
          const parentMeasurement = measurements.find(m => m.id === mesh.userData.measurementId);
          let visuals = parentMeasurement?.pvModuleInfo?.moduleVisuals || defaultModuleVisuals;
          
          const isSelected = 
            selectedMeasurementId === mesh.userData.measurementId && 
            selectedModuleIndex === mesh.userData.moduleIndex;
          
          // Apply selected visuals if this module is selected
          if (isSelected) {
            visuals = { ...visuals, ...SELECTED_MODULE_VISUALS };
          }
          
          if (mesh.material instanceof THREE.MeshBasicMaterial) {
            mesh.material.color.set(visuals.cellColor || 0x225289); // Cell color
            mesh.material.opacity = 1.0;
            mesh.material.transparent = false;
            mesh.material.needsUpdate = true;
            
            // Position just above the module frame
            mesh.position.y += isSelected ? 0.027 : 0.022;
          }
        }
        
        // Special handling for module panel (background)
        if (mesh.userData.isPVModulePanel && mesh instanceof THREE.Mesh) {
          const parentMeasurement = measurements.find(m => m.id === mesh.userData.measurementId);
          let visuals = parentMeasurement?.pvModuleInfo?.moduleVisuals || defaultModuleVisuals;
          
          const isSelected = 
            selectedMeasurementId === mesh.userData.measurementId && 
            selectedModuleIndex === mesh.userData.moduleIndex;
          
          // Apply selected visuals if this module is selected
          if (isSelected) {
            visuals = { ...visuals, ...SELECTED_MODULE_VISUALS };
          }
          
          if (mesh.material instanceof THREE.MeshBasicMaterial) {
            mesh.material.color.set(visuals.panelColor || 0x0a4b8f); // Panel color
            mesh.material.opacity = 0.9;
            mesh.material.transparent = true;
            mesh.material.needsUpdate = true;
            
            // Position just above the module frame but below cells
            mesh.position.y += isSelected ? 0.026 : 0.021;
          }
        }
        
        // Handle module label visibility and highlighting for selected modules
        if (mesh.userData.isModuleLabel) {
          const isSelected = 
            selectedMeasurementId === mesh.userData.measurementId && 
            selectedModuleIndex === mesh.userData.moduleIndex;
          
          mesh.visible = measurement.visible !== false && measurement.labelVisible !== false;
          
          // Highlight the label for selected modules
          if (mesh instanceof THREE.Mesh && mesh.material instanceof THREE.MeshBasicMaterial && mesh.material.map) {
            // Update label texture for selected state
            if (isSelected) {
              const labelCanvas = document.createElement('canvas');
              labelCanvas.width = 64;
              labelCanvas.height = 64;
              const ctx = labelCanvas.getContext('2d');
              if (ctx) {
                ctx.fillStyle = '#ffa500'; // Orange for selected
                ctx.font = 'bold 40px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(`${mesh.userData.moduleIndex + 1}`, 32, 32);
                
                // Update texture
                const labelTexture = new THREE.CanvasTexture(labelCanvas);
                mesh.material.map.dispose();
                mesh.material.map = labelTexture;
                mesh.material.needsUpdate = true;
                
                // Raise selected label slightly higher
                mesh.position.z = 0.004;
              }
            }
          }
        }
      }
    });
    
    console.log(`PV Module visibility summary from useVisibilityManager: ${pvModulesVisible}/${pvModuleCount} modules visible`);
  }, [measurements, measurementsRef, extractRoofEdgeSegments, selectedMeasurementId, selectedModuleIndex]);

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
    getMeasurementGroups,
    extractRoofEdgeSegments
  };
};
