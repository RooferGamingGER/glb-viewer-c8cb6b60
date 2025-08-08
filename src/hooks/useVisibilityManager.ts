import { useCallback } from 'react';
import * as THREE from 'three';
import { Measurement } from '@/types/measurements';
import { useThreeJs } from '@/contexts/ThreeJsContext';
import { toast } from '@/components/ui/use-toast';

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
      // Use toast as a simple function call with the message string
      toast(`The PV module area is now ${newState}`);
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
    const defaultModuleVisuals = {
      frameBorder: 0.02,          // 2cm frame border
      frameColor: 0x444444,       // Dark grey frame
      panelColor: 0x0a4b8f,       // Dark blue panel
      cellRows: 6,                // 6 rows of cells
      cellColumns: 10,            // 10 columns of cells
      cellSpacing: 0.005,         // 5mm spacing between cells
      cellColor: 0x225289,        // Slightly brighter blue for cells
      busbarCount: 3              // 3 busbars per cell
    };
    
    // Update mesh visibilities for PV areas and other measurements
    measurementsRef.current.children.forEach(mesh => {
      if (!mesh.userData || !mesh.userData.measurementId) return;
      
      const measurement = measurements.find(m => m.id === mesh.userData.measurementId);
      if (measurement) {
        mesh.visible = measurement.visible !== false;
        
        // PV modules: manage visibility only, visuals handled by measurementVisuals
        if ((measurement.type === 'pvmodule' || measurement.type === 'solar') && mesh instanceof THREE.Mesh) {
          pvModuleCount++;
          if (mesh.visible) pvModulesVisible++;
          // Ensure children follow visibility
          mesh.children.forEach(child => {
            child.visible = measurement.visible !== false;
          });
        }
        
        // Standalone PV module meshes: visibility only
        if (mesh.userData.isPVModule && mesh instanceof THREE.Mesh) {
          pvModuleCount++;
          if (mesh.visible) pvModulesVisible++;
          mesh.visible = measurement.visible !== false;
        }
        
        // Handle module label visibility
        if (mesh.userData.isModuleLabel) {
          mesh.visible = measurement.visible !== false && measurement.labelVisible !== false;
        }
      }
    });
    
    console.log(`PV Module visibility summary from useVisibilityManager: ${pvModulesVisible}/${pvModuleCount} modules visible`);
  }, [measurements, measurementsRef, extractRoofEdgeSegments]);

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
