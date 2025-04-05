
import { useState, useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { toast } from 'sonner';
import { Point, PVModuleInfo, PVModuleSpec, Measurement } from '@/types/measurements';
import { useThreeJs } from '@/contexts/ThreeJsContext';
import { calculatePVModulePlacement } from '@/utils/pvCalculations';

/**
 * Hook for managing the PV planning mode
 */
export const usePVPlanningMode = (
  scene: THREE.Scene | null,
  camera: THREE.Camera | null,
  measurements: Measurement[],
  updateMeasurement: (id: string, data: Partial<Measurement>) => void
) => {
  const [activePlanningId, setActivePlanningId] = useState<string | null>(null);
  const [selectedModuleIndex, setSelectedModuleIndex] = useState<number | null>(null);
  const [hoveredModuleIndex, setHoveredModuleIndex] = useState<number | null>(null);
  const [moduleOrientation, setModuleOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [edgeDistance, setEdgeDistance] = useState<number>(0.5);
  const [moduleSpacing, setModuleSpacing] = useState<number>(0.1);
  const [isMovingModule, setIsMovingModule] = useState<boolean>(false);
  const [isRotatingModule, setIsRotatingModule] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  
  // Module visualization group
  const moduleGroupRef = useRef<THREE.Group | null>(null);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mousePosRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const planeMeshRef = useRef<THREE.Mesh | null>(null);
  
  // Get ThreeJs utilities
  const { clearGroup } = useThreeJs();
  
  // Initialize planning mode
  const initPlanningMode = useCallback((measurementId: string | null) => {
    if (!scene || !measurementId) return false;
    
    const measurement = measurements.find(m => m.id === measurementId);
    if (!measurement || !measurement.pvModuleInfo || measurement.type !== 'solar') {
      toast.error('Keine gültige Solarfläche ausgewählt');
      return false;
    }
    
    // Create module group if it doesn't exist
    if (!moduleGroupRef.current) {
      moduleGroupRef.current = new THREE.Group();
      moduleGroupRef.current.name = `pvPlanningGroup-${measurementId}`;
      scene.add(moduleGroupRef.current);
    } else {
      clearGroup(moduleGroupRef.current);
    }
    
    // Create invisible plane for raycasting
    if (measurement.points.length >= 3) {
      const planeGeometry = new THREE.PlaneGeometry(100, 100);
      const planeMaterial = new THREE.MeshBasicMaterial({ 
        visible: false,
        side: THREE.DoubleSide
      });
      
      planeMeshRef.current = new THREE.Mesh(planeGeometry, planeMaterial);
      
      // Calculate the average normal of the measurement points
      const normal = new THREE.Vector3(0, 1, 0); // Default to Y-up
      
      // Position the plane at the centroid of points
      const centroid = new THREE.Vector3();
      for (const point of measurement.points) {
        centroid.add(new THREE.Vector3(point.x, point.y, point.z));
      }
      centroid.divideScalar(measurement.points.length);
      
      planeMeshRef.current.position.copy(centroid);
      
      // Try to align with the 3 first points
      if (measurement.points.length >= 3) {
        const p1 = new THREE.Vector3(
          measurement.points[0].x,
          measurement.points[0].y,
          measurement.points[0].z
        );
        const p2 = new THREE.Vector3(
          measurement.points[1].x,
          measurement.points[1].y,
          measurement.points[1].z
        );
        const p3 = new THREE.Vector3(
          measurement.points[2].x,
          measurement.points[2].y,
          measurement.points[2].z
        );
        
        const v1 = new THREE.Vector3().subVectors(p2, p1);
        const v2 = new THREE.Vector3().subVectors(p3, p1);
        normal.crossVectors(v1, v2).normalize();
      }
      
      // Orient the plane according to the normal
      planeMeshRef.current.lookAt(
        new THREE.Vector3().addVectors(centroid, normal)
      );
      
      scene.add(planeMeshRef.current);
    }
    
    setActivePlanningId(measurementId);
    
    // Initialize with current module layout if available or default
    if (measurement.pvModuleInfo) {
      setModuleOrientation(measurement.pvModuleInfo.orientation || 'portrait');
      setEdgeDistance(measurement.pvModuleInfo.edgeDistance || 0.5);
      setModuleSpacing(measurement.pvModuleInfo.moduleSpacing || 0.1);
    }
    
    return true;
  }, [scene, measurements, clearGroup]);
  
  // Exit planning mode
  const exitPlanningMode = useCallback(() => {
    if (!scene) return;
    
    // Clean up module group
    if (moduleGroupRef.current) {
      scene.remove(moduleGroupRef.current);
      moduleGroupRef.current = null;
    }
    
    // Remove the raycasting plane
    if (planeMeshRef.current) {
      scene.remove(planeMeshRef.current);
      planeMeshRef.current = null;
    }
    
    setActivePlanningId(null);
    setSelectedModuleIndex(null);
    setHoveredModuleIndex(null);
  }, [scene]);
  
  // Update module layout with new parameters
  const updateModuleLayout = useCallback(() => {
    if (!activePlanningId) return;
    
    const measurement = measurements.find(m => m.id === activePlanningId);
    if (!measurement || !measurement.points || measurement.points.length < 3) return;
    
    // Recalculate module placement with current settings
    const moduleInfo = calculatePVModulePlacement(
      measurement.points,
      undefined,
      moduleOrientation,
      edgeDistance,
      moduleSpacing
    );
    
    // Update the measurement with new module info
    updateMeasurement(activePlanningId, {
      pvModuleInfo: {
        ...moduleInfo,
        edgeDistance,
        moduleSpacing,
        orientation: moduleOrientation
      }
    });
    
    // Update visualization
    // The PVModuleVisualizer component will handle the visual update
    
    return moduleInfo;
  }, [
    activePlanningId,
    measurements,
    moduleOrientation,
    edgeDistance,
    moduleSpacing,
    updateMeasurement
  ]);
  
  // Rotate a single module
  const rotateModule = useCallback((moduleIndex: number) => {
    if (!activePlanningId) return;
    
    const measurement = measurements.find(m => m.id === activePlanningId);
    if (!measurement || !measurement.pvModuleInfo || !measurement.pvModuleInfo.modulePositions) return;
    
    // Create a copy of the current positions array
    const positions = [...measurement.pvModuleInfo.modulePositions];
    
    // Toggle orientation for this specific module
    // In a more advanced implementation, we'd handle arbitrary rotations
    const newOrientation = moduleOrientation === 'portrait' ? 'landscape' : 'portrait';
    setModuleOrientation(newOrientation);
    
    // Update the measurement
    updateModuleLayout();
    
    // Display success message
    toast.success(`Modul ${moduleIndex + 1} wurde gedreht`);
  }, [activePlanningId, measurements, moduleOrientation, updateModuleLayout]);
  
  // Move a single module
  const moveModule = useCallback((moduleIndex: number, newPosition: Point) => {
    if (!activePlanningId) return;
    
    const measurement = measurements.find(m => m.id === activePlanningId);
    if (!measurement || !measurement.pvModuleInfo || !measurement.pvModuleInfo.modulePositions) return;
    
    // Create a copy of the current positions array
    const positions = [...measurement.pvModuleInfo.modulePositions];
    
    if (moduleIndex >= 0 && moduleIndex < positions.length) {
      // Update the position
      positions[moduleIndex] = newPosition;
      
      // Update the measurement with modified positions
      updateMeasurement(activePlanningId, {
        pvModuleInfo: {
          ...measurement.pvModuleInfo,
          modulePositions: positions
        }
      });
    }
  }, [activePlanningId, measurements, updateMeasurement]);
  
  // Generate optimal layout
  const generateOptimalLayout = useCallback(() => {
    if (!activePlanningId) return;
    
    updateModuleLayout();
    toast.success('Optimale Modulanordnung berechnet');
  }, [activePlanningId, updateModuleLayout]);
  
  // Update edge distance
  const setModuleEdgeDistance = useCallback((distance: number) => {
    setEdgeDistance(distance);
    
    // Debounce the update to not recalculate for every small change
    const debounceTimer = setTimeout(() => {
      updateModuleLayout();
    }, 300);
    
    return () => clearTimeout(debounceTimer);
  }, [updateModuleLayout]);
  
  // Update module spacing
  const setModuleGapSpacing = useCallback((spacing: number) => {
    setModuleSpacing(spacing);
    
    // Debounce the update to not recalculate for every small change
    const debounceTimer = setTimeout(() => {
      updateModuleLayout();
    }, 300);
    
    return () => clearTimeout(debounceTimer);
  }, [updateModuleLayout]);
  
  // Toggle the orientation of all modules
  const toggleOrientation = useCallback(() => {
    const newOrientation = moduleOrientation === 'portrait' ? 'landscape' : 'portrait';
    setModuleOrientation(newOrientation);
    
    // Update layout with new orientation
    setTimeout(() => {
      const updatedInfo = updateModuleLayout();
      if (updatedInfo) {
        toast.success(`Orientierung geändert: ${newOrientation === 'portrait' ? 'Hochformat' : 'Querformat'}`);
      }
    }, 10);
  }, [moduleOrientation, updateModuleLayout]);
  
  // Provide the exported functions and state
  return {
    activePlanningId,
    moduleOrientation,
    edgeDistance,
    moduleSpacing,
    selectedModuleIndex,
    hoveredModuleIndex,
    isMovingModule,
    isRotatingModule,
    
    initPlanningMode,
    exitPlanningMode,
    updateModuleLayout,
    rotateModule,
    moveModule,
    generateOptimalLayout,
    setModuleEdgeDistance,
    setModuleGapSpacing,
    toggleOrientation,
    setSelectedModuleIndex,
    setHoveredModuleIndex,
    setIsMovingModule,
    setIsRotatingModule,
    setIsDragging
  };
};
