
import { useCallback } from 'react';
import * as THREE from 'three';
import { Measurement, Point } from '@/types/measurements';
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

  // Declare functions first to avoid reference errors
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
    
    // Extract roof edge segments for PV module alignment
    const roofEdgeSegments = extractRoofEdgeSegments();
    
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
            
            // Raise slightly to avoid z-fighting - increase offset
            mesh.position.y += 0.1; // Increased from 0.05 to 0.1 for better visibility
            
            console.log(`Updated PV Module ${mesh.name || "unnamed"} in useVisibilityManager:`, {
              visible: mesh.visible,
              opacity: material.opacity,
              color: material.color.getHexString(),
              position: mesh.position.y,
              hasRoofEdgeData: roofEdgeSegments.length > 0
            });
          }
        }
        
        // Special handling for PV module grid elements, now with roof edge alignment
        if (mesh.userData.isPVModule || mesh.userData.isModuleLabel) {
          pvModuleCount++;
          if (mesh.visible) pvModulesVisible++;
          
          if (mesh instanceof THREE.Mesh && mesh.material instanceof THREE.MeshBasicMaterial) {
            mesh.material.opacity = 0.95;
            mesh.material.color.set(0x1E88E5);
            mesh.material.transparent = true;
            mesh.material.side = THREE.DoubleSide;
            mesh.material.needsUpdate = true;
            
            // Raise slightly to avoid z-fighting - increase offset
            mesh.position.y += 0.1; // Increased from 0.05 to 0.1 for better visibility
            
            console.log(`PV Module grid element updated in useVisibilityManager:`, {
              visible: mesh.visible,
              opacity: mesh.material.opacity,
              color: mesh.material.color.getHexString(),
              position: mesh.position.y,
              hasRoofEdgeData: roofEdgeSegments.length > 0
            });
          }
        }
      }
    });
    
    console.log(`PV Module visibility summary from useVisibilityManager: ${pvModulesVisible}/${pvModuleCount} modules visible`);
  }, [measurements, measurementsRef, extractRoofEdgeSegments]);

  // Handle toggling measurement visibility
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
  }, [toggleMeasurementVisibility, measurements, updateMeasurementMarkers]);

  // Toggle label visibility
  const handleToggleLabelVisibility = useCallback((id: string) => {
    toggleLabelVisibility(id);
    
    // Update label visibility in Three.js
    updateLabelVisibility(id);
  }, [toggleLabelVisibility, updateLabelVisibility]);

  // Improved function to extract roof edge segments, particularly the eave (Traufe)
  // for PV module alignment
  const extractRoofEdgeSegments = useCallback(() => {
    // Function to calculate average Y value of a measurement's points
    const calculateAverageY = (points?: { y: number }[]) => {
      if (!points || points.length === 0) return 0;
      return points.reduce((sum, p) => sum + p.y, 0) / points.length;
    };
    
    // Find all edge measurements (ridge, eave, verge)
    const ridgeMeasurements = measurements.filter(m => m.type === 'ridge');
    const eaveMeasurements = measurements.filter(m => m.type === 'eave');
    const vergeMeasurements = measurements.filter(m => m.type === 'verge');
    const edgeMeasurements = [...ridgeMeasurements, ...eaveMeasurements, ...vergeMeasurements];
    
    // Debug output to help diagnose issues
    console.log(`Found ${ridgeMeasurements.length} ridge, ${eaveMeasurements.length} eave, and ${vergeMeasurements.length} verge measurements`);
    
    // Start with more specific identification logic: find the eave (Traufe) - it should be the lowest horizontal edge
    let eaveEdges = [];
    
    if (eaveMeasurements.length > 0) {
      // If user has specifically marked eaves, use those first
      eaveEdges = eaveMeasurements.map(m => ({
        from: new THREE.Vector3(m.points[0].x, m.points[0].y, m.points[0].z),
        to: new THREE.Vector3(m.points[1].x, m.points[1].y, m.points[1].z),
        type: 'eave',
        yValue: calculateAverageY(m.points)
      }));
      console.log("Using user-marked eave measurements for alignment");
    } else {
      // If no eaves marked, try to identify the lowest horizontal edge as the eave
      // (Ridge is typically highest, eave is lowest)
      const horizontalEdges = edgeMeasurements.filter(m => {
        if (!m.points || m.points.length < 2) return false;
        
        // Check if this is a roughly horizontal edge (minimal Y difference)
        const yDiff = Math.abs(m.points[0].y - m.points[1].y);
        const length = new THREE.Vector3()
          .subVectors(
            new THREE.Vector3(m.points[0].x, m.points[0].y, m.points[0].z),
            new THREE.Vector3(m.points[1].x, m.points[1].y, m.points[1].z)
          ).length();
        
        // Consider it horizontal if Y difference is small relative to length
        return yDiff / length < 0.2; // 20% threshold
      });
      
      if (horizontalEdges.length > 0) {
        // Sort by Y value, lowest first (eave is usually the lowest horizontal edge)
        const sortedEdges = horizontalEdges
          .map(m => ({
            measurement: m,
            yValue: calculateAverageY(m.points)
          }))
          .sort((a, b) => a.yValue - b.yValue);
        
        console.log("Sorted horizontal edges by height:", sortedEdges.map(e => ({
          type: e.measurement.type,
          y: e.yValue
        })));
        
        // Use the lowest edge as eave
        const lowestEdge = sortedEdges[0].measurement;
        eaveEdges = [{
          from: new THREE.Vector3(lowestEdge.points[0].x, lowestEdge.points[0].y, lowestEdge.points[0].z),
          to: new THREE.Vector3(lowestEdge.points[1].x, lowestEdge.points[1].y, lowestEdge.points[1].z),
          type: 'identified-eave',
          yValue: sortedEdges[0].yValue
        }];
        console.log("Using lowest horizontal edge as eave:", eaveEdges[0]);
      }
    }
    
    // If still no eave found, fall back to any horizontal edge
    if (eaveEdges.length === 0 && edgeMeasurements.length > 0) {
      // Use the longest edge measurement as a fallback
      let longestEdge = edgeMeasurements[0];
      let maxLength = 0;
      
      edgeMeasurements.forEach(m => {
        if (m.points && m.points.length >= 2) {
          const v1 = new THREE.Vector3(m.points[0].x, m.points[0].y, m.points[0].z);
          const v2 = new THREE.Vector3(m.points[1].x, m.points[1].y, m.points[1].z);
          const length = new THREE.Vector3().subVectors(v2, v1).length();
          
          if (length > maxLength) {
            maxLength = length;
            longestEdge = m;
          }
        }
      });
      
      eaveEdges = [{
        from: new THREE.Vector3(longestEdge.points[0].x, longestEdge.points[0].y, longestEdge.points[0].z),
        to: new THREE.Vector3(longestEdge.points[1].x, longestEdge.points[1].y, longestEdge.points[1].z),
        type: 'fallback',
        yValue: calculateAverageY(longestEdge.points)
      }];
      console.log("Fallback to longest edge for alignment:", eaveEdges[0]);
    }
    
    // Return the segments (prioritizing eave edges)
    return eaveEdges;
  }, [measurements]);

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
