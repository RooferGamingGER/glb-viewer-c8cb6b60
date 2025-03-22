
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';

// Types
export interface Point {
  x: number;
  y: number;
  z: number;
}

export interface MeasurementPoint {
  position: THREE.Vector3;
  worldPosition: THREE.Vector3;
}

export interface PVModuleInfo {
  moduleWidth: number;      // Module width in meters
  moduleHeight: number;     // Module height in meters
  moduleCount: number;      // Number of modules that can fit
  coveragePercent: number;  // Coverage percentage of the roof area
  orientation: 'portrait' | 'landscape'; // Module orientation
  edgeDistance?: number;    // Distance from roof edge in meters
  moduleSpacing?: number;   // Spacing between modules in meters
  columns?: number;         // Number of columns (modules across width)
  rows?: number;            // Number of rows (modules across length)
  boundingWidth?: number;   // Width of the bounding box for the area
  boundingLength?: number;  // Length of the bounding box for the area
  boundingHeight?: number;  // Height of the bounding box (for 3D)
  availableWidth?: number;  // Available width after edge distance
  availableLength?: number; // Available length after edge distance
  startX?: number;          // Starting X position for grid
  startZ?: number;          // Starting Z position for grid
  minX?: number;            // Minimum X of the bounding box
  maxX?: number;            // Maximum X of the bounding box
  minZ?: number;            // Minimum Z of the bounding box
  maxZ?: number;            // Maximum Z of the bounding box
  actualArea?: number;      // The actual area (not just bounding box)
  pvModuleSpec?: PVModuleSpec; // Reference to the module specification used
  isTrapezoid?: boolean;      // Whether the roof is trapezoid-shaped
  roofPitch?: number;         // Roof pitch/inclination in degrees
  ridgeLength?: number;       // Length of the ridge (short side of trapezoid)
  eaveLength?: number;        // Length of the eave (long side of trapezoid)
  modulePositions?: any[];    // Array of module positions for rendering
  modulesVisible?: boolean;   // Whether to display the modules visually
}

export interface PVModuleSpec {
  name: string;             // Module name/model
  width: number;            // Width in meters
  height: number;           // Height in meters
  power: number;            // Power in watts
  efficiency: number;       // Efficiency percentage
}

export interface Segment {
  id: string;
  points: [Point, Point];
  length: number;
  label?: string;
  inclination?: number;
}

export interface Measurement {
  id: string;
  type: 'length' | 'height' | 'area' | 'solar' | 'chimney' | 'skylight' | 'vent' | 'hook' | 'other' | 'pvmodule' | 'ridge' | 'eave' | 'verge' | 'valley' | 'hip';
  points: Point[];
  value: number;
  label?: string;
  segments?: Segment[];
  visible?: boolean;
  labelVisible?: boolean;
  editMode?: boolean;
  unit?: string;
  description?: string;
  inclination?: number;
  pvModuleInfo?: PVModuleInfo;
}

// Helper functions
export const calculateDistance = (p1: Point, p2: Point): number => {
  return Math.sqrt(
    Math.pow(p2.x - p1.x, 2) +
    Math.pow(p2.y - p1.y, 2) +
    Math.pow(p2.z - p1.z, 2)
  );
};

export const calculateArea = (points: Point[]): number => {
  if (points.length < 3) return 0;

  // Projection to XZ plane for area calculation
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].z;
    area -= points[j].x * points[i].z;
  }
  return Math.abs(area) / 2;
};

// Calculate angle to horizontal plane
export const calculateInclination = (points: Point[]): number | undefined => {
  if (points.length < 3) return undefined;

  // Use the first three points to define a plane
  const v1 = new THREE.Vector3(
    points[1].x - points[0].x,
    points[1].y - points[0].y,
    points[1].z - points[0].z
  );
  
  const v2 = new THREE.Vector3(
    points[2].x - points[0].x,
    points[2].y - points[0].y,
    points[2].z - points[0].z
  );
  
  // Get the normal vector to the plane
  const normal = new THREE.Vector3().crossVectors(v1, v2).normalize();
  
  // Angle between normal and Y axis (90° - angle for the plane)
  const angleInRadians = Math.acos(normal.dot(new THREE.Vector3(0, 1, 0)));
  const angleInDegrees = THREE.MathUtils.radToDeg(angleInRadians);
  
  // Get inclination from horizontal (0° is flat, 90° is vertical)
  return 90 - angleInDegrees;
};

// Calculate segments for an area/perimeter
export const calculateSegments = (points: Point[]): Segment[] => {
  if (points.length < 3) return [];
  
  const segments: Segment[] = [];
  
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length]; // Connect back to first point
    
    const length = calculateDistance(p1, p2);
    
    // Create segment
    segments.push({
      id: uuidv4(),
      points: [p1, p2],
      length: length,
      label: `${length.toFixed(2)} m`
    });
  }
  
  return segments;
};

export interface MeasurementsHookResult {
  measurements: Measurement[];
  currentPoints: Point[];
  addPoint: (point: Point) => void;
  activeMode: 'length' | 'height' | 'area' | 'solar' | 'chimney' | 'skylight' | 'vent' | 'hook' | 'other' | 'pvmodule' | 'ridge' | 'eave' | 'verge' | 'valley' | 'hip' | 'none';
  toggleMeasurementTool: (mode: 'length' | 'height' | 'area' | 'solar' | 'chimney' | 'skylight' | 'vent' | 'hook' | 'other' | 'pvmodule' | 'ridge' | 'eave' | 'verge' | 'valley' | 'hip' | 'none') => void;
  clearMeasurements: () => void;
  clearCurrentPoints: () => void;
  finalizeMeasurement: (customLabel?: string) => void;
  toggleMeasurementVisibility: (id: string) => void;
  toggleLabelVisibility: (id: string) => void;
  toggleAllMeasurementsVisibility: () => void;
  toggleAllLabelsVisibility: () => void;
  toggleEditMode: (id: string, mode: boolean) => void;
  updateMeasurement: (id: string, updates: Partial<Measurement>) => void;
  deleteMeasurement: (id: string) => void;
  deletePoint: (measurementId: string, pointIndex: number) => void;
  undoLastPoint: () => void;
  editMeasurementId: string | null;
  editingPointIndex: number | null;
  startPointEdit: (measurementId: string, pointIndex: number) => void;
  cancelEditing: () => void;
  updateMeasurementPoint: (measurementId: string, pointIndex: number, newPosition: Point) => void;
  allLabelsVisible: boolean;
  moveMeasurementUp: (id: string) => void;
  moveMeasurementDown: (id: string) => void;
  togglePVModulesVisibility: (id: string) => void;
  setUpdateVisualState: (fn: (measurements: Measurement[], allLabelsVisible: boolean) => void) => void;
}

export const useMeasurements = (): MeasurementsHookResult => {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [activeMode, setActiveMode] = useState<'length' | 'height' | 'area' | 'solar' | 'chimney' | 'skylight' | 'vent' | 'hook' | 'other' | 'pvmodule' | 'ridge' | 'eave' | 'verge' | 'valley' | 'hip' | 'none'>('none');
  const [editMeasurementId, setEditMeasurementId] = useState<string | null>(null);
  const [editingPointIndex, setEditingPointIndex] = useState<number | null>(null);
  const [allLabelsVisible, setAllLabelsVisible] = useState<boolean>(true);
  
  // Ref for visual state update function
  const updateVisualStateRef = useRef<
    (measurements: Measurement[], allLabelsVisible: boolean) => void
  >(() => {});
  
  // Set the update function
  const setUpdateVisualState = useCallback((fn) => {
    updateVisualStateRef.current = fn;
  }, []);
  
  // Add a point to the current measurement
  const addPoint = useCallback((point: Point) => {
    setCurrentPoints(prevPoints => [...prevPoints, point]);
  }, []);

  // Toggle the active measurement tool
  const toggleMeasurementTool = useCallback((mode) => {
    setActiveMode(prevMode => {
      // If the mode is clicked again, turn it off
      if (prevMode === mode) {
        return 'none';
      }
      return mode;
    });
    setCurrentPoints([]);
  }, []);

  // Clear all measurements
  const clearMeasurements = useCallback(() => {
    setMeasurements([]);
    setCurrentPoints([]);
    setEditMeasurementId(null);
    setEditingPointIndex(null);
    toast.success('Alle Messungen gelöscht');
  }, []);

  // Clear current points without finalizing
  const clearCurrentPoints = useCallback(() => {
    setCurrentPoints([]);
  }, []);

  // Finalize the current measurement
  const finalizeMeasurement = useCallback((customLabel?: string) => {
    if (currentPoints.length < 2 && activeMode !== 'vent' && activeMode !== 'hook' && activeMode !== 'other') {
      toast.error('Mindestens 2 Punkte für eine Messung erforderlich');
      return;
    }

    // Create a new measurement based on type
    let newMeasurement: Measurement;

    if (activeMode === 'length') {
      const value = calculateDistance(currentPoints[0], currentPoints[1]);
      newMeasurement = {
        id: uuidv4(),
        type: activeMode,
        points: currentPoints,
        value,
        label: customLabel || `Länge: ${value.toFixed(2)} m`
      };
    } 
    else if (activeMode === 'height') {
      // Height is specifically the Y-axis difference
      const value = Math.abs(currentPoints[1].y - currentPoints[0].y);
      newMeasurement = {
        id: uuidv4(),
        type: activeMode,
        points: currentPoints,
        value,
        label: customLabel || `Höhe: ${value.toFixed(2)} m`
      };
    } 
    else if (activeMode === 'area' || activeMode === 'solar') {
      // Calculate the area
      const area = calculateArea(currentPoints);
      
      // Calculate the perimeter segments
      const segments = calculateSegments(currentPoints);
      
      // Calculate roof inclination if enough points
      const inclination = currentPoints.length >= 3 ? calculateInclination(currentPoints) : undefined;
      
      newMeasurement = {
        id: uuidv4(),
        type: activeMode,
        points: currentPoints,
        value: area,
        segments,
        inclination,
        label: customLabel || `${activeMode === 'solar' ? 'Solarfläche' : 'Fläche'}: ${area.toFixed(2)} m²`
      };
      
      // For solar measurements, initialize PV module info
      if (activeMode === 'solar') {
        newMeasurement.pvModuleInfo = {
          moduleWidth: 1.7,
          moduleHeight: 1.0,
          moduleCount: 0,
          coveragePercent: 0,
          orientation: 'landscape',
          modulesVisible: true
        };
      }
    } 
    else if (activeMode === 'skylight' || activeMode === 'chimney') {
      // Calculate the area
      const area = calculateArea(currentPoints);
      
      // Get dimensions (approximate width and length)
      const xs = currentPoints.map(p => p.x);
      const zs = currentPoints.map(p => p.z);
      const width = Math.max(...xs) - Math.min(...xs);
      const length = Math.max(...zs) - Math.min(...zs);

      // Calculate the perimeter segments
      const segments = calculateSegments(currentPoints);
      
      const elementType = activeMode === 'skylight' ? 'Dachfenster' : 'Kamin';
      
      newMeasurement = {
        id: uuidv4(),
        type: activeMode,
        points: currentPoints,
        value: area,
        segments,
        label: customLabel || `${elementType}: ${area.toFixed(2)} m²`,
        dimensions: {
          width,
          length,
          area
        }
      };
    }
    else if (activeMode === 'vent' || activeMode === 'hook' || activeMode === 'other') {
      // Point-based roof elements
      const elementNames = {
        'vent': 'Lüfter',
        'hook': 'Dachhaken',
        'other': 'Einbauteil'
      };
      
      newMeasurement = {
        id: uuidv4(),
        type: activeMode,
        points: currentPoints,
        value: 1, // Count or quantity
        label: customLabel || `${elementNames[activeMode]}`
      };
    }
    else {
      // Default case (should never happen with current UI)
      newMeasurement = {
        id: uuidv4(),
        type: activeMode,
        points: currentPoints,
        value: 0,
        label: customLabel || 'Messung'
      };
    }

    setMeasurements(prevMeasurements => [...prevMeasurements, newMeasurement]);
    setCurrentPoints([]);
    toast.success('Messung hinzugefügt');
  }, [activeMode, currentPoints]);

  // Toggle measurement visibility
  const toggleMeasurementVisibility = useCallback((id: string) => {
    setMeasurements(prevMeasurements => 
      prevMeasurements.map(m => 
        m.id === id ? { ...m, visible: m.visible === false ? true : false } : m
      )
    );
    
    // Apply visual update
    setTimeout(() => {
      updateVisualStateRef.current(
        measurements.map(m => m.id === id ? { ...m, visible: m.visible === false ? true : false } : m),
        allLabelsVisible
      );
    }, 0);
  }, [measurements, allLabelsVisible]);

  // Toggle label visibility
  const toggleLabelVisibility = useCallback((id: string) => {
    setMeasurements(prevMeasurements => 
      prevMeasurements.map(m => 
        m.id === id ? { ...m, labelVisible: m.labelVisible === false ? true : false } : m
      )
    );
    
    // Apply visual update
    setTimeout(() => {
      updateVisualStateRef.current(
        measurements.map(m => m.id === id ? { ...m, labelVisible: m.labelVisible === false ? true : false } : m),
        allLabelsVisible
      );
    }, 0);
  }, [measurements, allLabelsVisible]);

  // Toggle visibility of all measurements
  const toggleAllMeasurementsVisibility = useCallback(() => {
    const anyVisible = measurements.some(m => m.visible !== false);
    setMeasurements(prevMeasurements => 
      prevMeasurements.map(m => ({ ...m, visible: !anyVisible }))
    );
    
    // Apply visual update
    setTimeout(() => {
      updateVisualStateRef.current(
        measurements.map(m => ({ ...m, visible: !anyVisible })),
        allLabelsVisible
      );
    }, 0);
  }, [measurements, allLabelsVisible]);

  // Toggle visibility of all labels
  const toggleAllLabelsVisibility = useCallback(() => {
    setAllLabelsVisible(prev => !prev);
    
    // Apply visual update
    setTimeout(() => {
      updateVisualStateRef.current(measurements, !allLabelsVisible);
    }, 0);
  }, [measurements, allLabelsVisible]);

  // Toggle edit mode for a measurement
  const toggleEditMode = useCallback((id: string, mode: boolean) => {
    setMeasurements(prevMeasurements => 
      prevMeasurements.map(m => 
        m.id === id ? { ...m, editMode: mode } : m
      )
    );
    
    if (!mode) {
      setEditMeasurementId(null);
      setEditingPointIndex(null);
    } else {
      setEditMeasurementId(id);
    }
  }, []);

  // Update a measurement
  const updateMeasurement = useCallback((id: string, updates: Partial<Measurement>) => {
    setMeasurements(prevMeasurements => 
      prevMeasurements.map(m => 
        m.id === id ? { ...m, ...updates } : m
      )
    );
    
    // Apply visual update for certain updates
    const visualUpdateNeeded = ['visible', 'labelVisible', 'points', 'pvModuleInfo'].some(key => key in updates);
    
    if (visualUpdateNeeded) {
      setTimeout(() => {
        updateVisualStateRef.current(
          measurements.map(m => m.id === id ? { ...m, ...updates } : m),
          allLabelsVisible
        );
      }, 0);
    }
  }, [measurements, allLabelsVisible]);

  // Delete a measurement
  const deleteMeasurement = useCallback((id: string) => {
    setMeasurements(prevMeasurements => prevMeasurements.filter(m => m.id !== id));
    if (editMeasurementId === id) {
      setEditMeasurementId(null);
      setEditingPointIndex(null);
    }
  }, [editMeasurementId]);

  // Delete a point from a measurement
  const deletePoint = useCallback((measurementId: string, pointIndex: number) => {
    setMeasurements(prevMeasurements => {
      return prevMeasurements.map(m => {
        if (m.id === measurementId) {
          // Make a copy of the points
          const newPoints = [...m.points];
          
          // Cannot delete point if it would make the measurement invalid
          if (m.type === 'length' || m.type === 'height') {
            if (newPoints.length <= 2) {
              toast.error('Mindestpunkte für diese Messung erreicht');
              return m;
            }
          } else if ((m.type === 'area' || m.type === 'solar') && newPoints.length <= 3) {
            toast.error('Mindestens 3 Punkte für eine Flächenmessung erforderlich');
            return m;
          }
          
          // Remove the point
          newPoints.splice(pointIndex, 1);
          
          // Recalculate value and segments if needed
          let updatedMeasurement: Measurement = { ...m, points: newPoints };
          
          if (m.type === 'length') {
            updatedMeasurement.value = calculateDistance(newPoints[0], newPoints[1]);
          } else if (m.type === 'height') {
            updatedMeasurement.value = Math.abs(newPoints[1].y - newPoints[0].y);
          } else if (m.type === 'area' || m.type === 'solar' || m.type === 'skylight' || m.type === 'chimney') {
            updatedMeasurement.value = calculateArea(newPoints);
            updatedMeasurement.segments = calculateSegments(newPoints);
          }
          
          return updatedMeasurement;
        }
        return m;
      });
    });
    
    setEditingPointIndex(null);
  }, []);

  // Undo the last point added to current measurement
  const undoLastPoint = useCallback(() => {
    setCurrentPoints(prevPoints => prevPoints.slice(0, -1));
  }, []);

  // Start editing a point
  const startPointEdit = useCallback((measurementId: string, pointIndex: number) => {
    setEditMeasurementId(measurementId);
    setEditingPointIndex(pointIndex);
    
    // Also set the measurement to edit mode
    setMeasurements(prevMeasurements => 
      prevMeasurements.map(m => 
        m.id === measurementId ? { ...m, editMode: true } : m
      )
    );
  }, []);

  // Cancel editing
  const cancelEditing = useCallback(() => {
    setEditMeasurementId(null);
    setEditingPointIndex(null);
    
    // Reset edit mode for all measurements
    setMeasurements(prevMeasurements => 
      prevMeasurements.map(m => 
        m.editMode ? { ...m, editMode: false } : m
      )
    );
  }, []);

  // Update a point in a measurement
  const updateMeasurementPoint = useCallback((measurementId: string, pointIndex: number, newPosition: Point) => {
    setMeasurements(prevMeasurements => {
      return prevMeasurements.map(m => {
        if (m.id === measurementId) {
          // Make a copy of the points
          const newPoints = [...m.points];
          
          // Update the specific point
          newPoints[pointIndex] = newPosition;
          
          // Recalculate value and segments if needed
          let updatedMeasurement: Measurement = { ...m, points: newPoints };
          
          if (m.type === 'length') {
            updatedMeasurement.value = calculateDistance(newPoints[0], newPoints[1]);
          } else if (m.type === 'height') {
            updatedMeasurement.value = Math.abs(newPoints[1].y - newPoints[0].y);
          } else if (m.type === 'area' || m.type === 'solar' || m.type === 'skylight' || m.type === 'chimney') {
            updatedMeasurement.value = calculateArea(newPoints);
            updatedMeasurement.segments = calculateSegments(newPoints);
          }
          
          return updatedMeasurement;
        }
        return m;
      });
    });
  }, []);

  // Move a measurement up in the list (for display ordering)
  const moveMeasurementUp = useCallback((id: string) => {
    setMeasurements(prevMeasurements => {
      const index = prevMeasurements.findIndex(m => m.id === id);
      if (index <= 0) return prevMeasurements;
      
      const newMeasurements = [...prevMeasurements];
      const temp = newMeasurements[index];
      newMeasurements[index] = newMeasurements[index - 1];
      newMeasurements[index - 1] = temp;
      
      return newMeasurements;
    });
  }, []);

  // Move a measurement down in the list (for display ordering)
  const moveMeasurementDown = useCallback((id: string) => {
    setMeasurements(prevMeasurements => {
      const index = prevMeasurements.findIndex(m => m.id === id);
      if (index < 0 || index >= prevMeasurements.length - 1) return prevMeasurements;
      
      const newMeasurements = [...prevMeasurements];
      const temp = newMeasurements[index];
      newMeasurements[index] = newMeasurements[index + 1];
      newMeasurements[index + 1] = temp;
      
      return newMeasurements;
    });
  }, []);
  
  // Toggle visibility of PV modules for a specific solar measurement
  const togglePVModulesVisibility = useCallback((id: string) => {
    setMeasurements(prevMeasurements => {
      return prevMeasurements.map(m => {
        if (m.id === id && m.type === 'solar' && m.pvModuleInfo) {
          const currentVisibility = m.pvModuleInfo.modulesVisible !== false;
          return {
            ...m,
            pvModuleInfo: {
              ...m.pvModuleInfo,
              modulesVisible: !currentVisibility
            }
          };
        }
        return m;
      });
    });
    
    // Apply visual update
    setTimeout(() => {
      updateVisualStateRef.current(
        measurements.map(m => {
          if (m.id === id && m.type === 'solar' && m.pvModuleInfo) {
            const currentVisibility = m.pvModuleInfo.modulesVisible !== false;
            return {
              ...m,
              pvModuleInfo: {
                ...m.pvModuleInfo,
                modulesVisible: !currentVisibility
              }
            };
          }
          return m;
        }),
        allLabelsVisible
      );
    }, 0);
  }, [measurements, allLabelsVisible]);
  
  return {
    measurements,
    currentPoints,
    addPoint,
    activeMode,
    toggleMeasurementTool,
    clearMeasurements,
    clearCurrentPoints,
    finalizeMeasurement,
    toggleMeasurementVisibility,
    toggleLabelVisibility,
    toggleAllMeasurementsVisibility,
    toggleAllLabelsVisibility,
    toggleEditMode,
    updateMeasurement,
    deleteMeasurement,
    deletePoint,
    undoLastPoint,
    editMeasurementId,
    editingPointIndex,
    startPointEdit,
    cancelEditing,
    updateMeasurementPoint,
    allLabelsVisible,
    moveMeasurementUp,
    moveMeasurementDown,
    togglePVModulesVisibility,
    setUpdateVisualState
  };
};
