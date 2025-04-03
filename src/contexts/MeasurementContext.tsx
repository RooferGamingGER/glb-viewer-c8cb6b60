import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { nanoid } from 'nanoid';
import { toast } from 'sonner';
import { 
  MeasurementMode, 
  Point, 
  Measurement,
  Segment,
  PVModuleSpec,
  PVModuleInfo,
  PVMaterials
} from '@/types/measurements';
import { 
  calculateDistance, 
  calculateHeight, 
  calculateArea,
  generateSegments,
  calculateInclination,
  validatePolygon,
  calculatePolygonArea,
  calculateQuadrilateralDimensions
} from '@/utils/measurementCalculations';
import {
  PV_MODULE_TEMPLATES,
  calculatePVModulePlacement,
  DEFAULT_EDGE_DISTANCE,
  DEFAULT_MODULE_SPACING,
  extractRoofEdgeMeasurements
} from '@/utils/pvCalculations';
import { formatMeasurement, MIN_INCLINATION_THRESHOLD } from '@/constants/measurements';
import * as THREE from 'three';

interface MeasurementContextValue {
  // State
  measurements: Measurement[];
  currentPoints: Point[];
  activeMode: MeasurementMode;
  editMeasurementId: string | null;
  editingPointIndex: number | null;
  allMeasurementsVisible: boolean;
  allLabelsVisible: boolean;
  calculatingMaterials: boolean;
  
  // Actions
  addPoint: (point: Point) => void;
  clearCurrentPoints: () => void;
  finalizeMeasurement: () => Measurement | undefined;
  clearMeasurements: () => void;
  undoLastPoint: () => boolean;
  updateMeasurementPoint: (measurementId: string, pointIndex: number, newPoint: Point) => void;
  startPointEdit: (id: string, index: number) => void;
  cancelEditing: () => void;
  toggleEditMode: (id: string) => void;
  updateMeasurement: (id: string, data: Partial<Measurement>) => Measurement[];
  updateSegment: (measurementId: string, segmentId: string, segmentData: Partial<Segment>) => void;
  deleteMeasurement: (id: string) => void;
  deletePoint: (measurementId: string, pointIndex: number) => void;
  toggleMeasurementTool: (mode: MeasurementMode) => void;
  toggleMeasurementVisibility: (id: string) => void;
  toggleLabelVisibility: (id: string) => void;
  toggleAllMeasurementsVisibility: () => void;
  toggleAllLabelsVisibility: () => void;
  moveMeasurementUp: (id: string) => void;
  moveMeasurementDown: (id: string) => void;
  calculatePVMaterialsForMeasurement: (measurementId: string, inverterDistance?: number) => PVMaterials | undefined;
  findAndLinkSharedSegments: (measurements: Measurement[]) => Measurement[];
  setUpdateVisualState: (fn: (updatedMeasurements: Measurement[], labelVisibility: boolean) => void) => void;
}

export const MeasurementContext = createContext<MeasurementContextValue | undefined>(undefined);

export const MeasurementProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [activeMode, setActiveMode] = useState<MeasurementMode>('none');
  const [allMeasurementsVisible, setAllMeasurementsVisible] = useState<boolean>(true);
  const [allLabelsVisible, setAllLabelsVisible] = useState<boolean>(true);
  const [editMeasurementId, setEditMeasurementId] = useState<string | null>(null);
  const [editingPointIndex, setEditingPointIndex] = useState<number | null>(null);
  const [calculatingMaterials, setCalculatingMaterials] = useState<boolean>(false);
  
  const currentPointsRef = useRef<Point[]>([]);

  // Use a ref to store the visual update function so it can be replaced
  const visualStateUpdaterRef = useRef<(updatedMeasurements: Measurement[], labelVisibility: boolean) => void>(
    (updatedMeasurements, labelVisibility) => {
      // Default implementation is a no-op
      // This will be replaced by the actual implementation in MeasurementTools
    }
  );
  
  useEffect(() => {
    currentPointsRef.current = currentPoints;
  }, [currentPoints]);

  const updateMeasurementPoint = useCallback((measurementId: string, pointIndex: number, newPoint: Point) => {
    setMeasurements(prev => {
      return prev.map(m => {
        if (m.id !== measurementId) return m;
        
        const newPoints = [...m.points];
        newPoints[pointIndex] = newPoint;
        
        let newValue: number;
        let newInclination: number | undefined;
        
        if (m.type === 'length') {
          newValue = calculateDistance(newPoints[0], newPoints[1]);
          
          const p1 = new THREE.Vector3(newPoints[0].x, newPoints[0].y, newPoints[0].z);
          const p2 = new THREE.Vector3(newPoints[1].x, newPoints[1].y, newPoints[1].z);
          const calculatedInclination = calculateInclination(p1, p2);
          
          newInclination = Math.abs(calculatedInclination) >= MIN_INCLINATION_THRESHOLD ? calculatedInclination : undefined;
          
        } else if (m.type === 'height') {
          newValue = calculateHeight(newPoints[0], newPoints[1]);
        } else if (m.type === 'area' || m.type === 'solar') {
          const validation = validatePolygon(newPoints);
          if (!validation.valid) {
            toast.error(validation.message || 'Ungültiges Polygon');
            return m;
          }
          
          const label = formatMeasurement(calculateArea(newPoints), m.type);
          const newSegments = generateSegments(newPoints);
          
          return {
            ...m,
            points: newPoints,
            value: calculateArea(newPoints),
            label,
            segments: newSegments
          };
        } else if (m.type === 'pvmodule') {
          const area = calculateArea(newPoints);
          const moduleInfo = calculatePVModulePlacement(newPoints);
          const moduleSpec = PV_MODULE_TEMPLATES[0];
          
          const powerInKWp = (moduleInfo.moduleCount * moduleSpec.power) / 1000;
          const label = `${moduleInfo.moduleCount} Module (${powerInKWp.toFixed(2)} kWp)`;
          
          return {
            ...m,
            points: newPoints,
            value: area,
            label,
            pvModuleInfo: moduleInfo,
            pvModuleSpec: moduleSpec,
            powerOutput: moduleInfo.moduleCount * moduleSpec.power
          };
        } else {
          newValue = m.value;
        }
        
        return {
          ...m,
          points: newPoints,
          value: newValue,
          label: formatMeasurement(newValue, m.type as 'length' | 'height' | 'area'),
          inclination: newInclination
        };
      });
    });
  }, []);

  // Function to create a length measurement
  const createLengthMeasurement = useCallback((points: Point[]) => {
    if (points.length < 2) return;
    
    const p1 = points[0];
    const p2 = points[1];
    
    const distance = calculateDistance(p1, p2);
    const label = formatMeasurement(distance, 'length');
    
    const v1 = new THREE.Vector3(p1.x, p1.y, p1.z);
    const v2 = new THREE.Vector3(p2.x, p2.y, p2.z);
    const calculatedInclination = calculateInclination(v1, v2);
    
    const inclination = Math.abs(calculatedInclination) >= MIN_INCLINATION_THRESHOLD 
      ? calculatedInclination 
      : undefined;
    
    const newMeasurement: Measurement = {
      id: nanoid(),
      type: 'length',
      points: [p1, p2],
      value: distance,
      label,
      visible: true,
      labelVisible: allLabelsVisible,
      unit: 'm',
      description: '',
      inclination
    };
    
    setMeasurements(prev => [...prev, newMeasurement]);
    setCurrentPoints([]);
    currentPointsRef.current = [];
    setActiveMode('none');
    
    return newMeasurement;
  }, [allLabelsVisible]);

  // Function to create a height measurement
  const createHeightMeasurement = useCallback((points: Point[]) => {
    if (points.length < 2) return;
    
    const p1 = points[0];
    const p2 = points[1];
    
    const height = calculateHeight(p1, p2);
    const label = formatMeasurement(height, 'height');
    
    const newMeasurement: Measurement = {
      id: nanoid(),
      type: 'height',
      points: [p1, p2],
      value: height,
      label,
      visible: true,
      labelVisible: allLabelsVisible,
      unit: 'm',
      description: ''
    };
    
    setMeasurements(prev => [...prev, newMeasurement]);
    setCurrentPoints([]);
    currentPointsRef.current = [];
    setActiveMode('none');
    
    return newMeasurement;
  }, [allLabelsVisible]);

  // Function to create a PV module measurement
  const createPVModuleMeasurement = useCallback((points: Point[]) => {
    if (points.length !== 4) {
      if (points.length < 4) {
        toast.error("Für PV-Module werden genau 4 Punkte benötigt.");
        return;
      } else {
        points = points.slice(0, 4);
        toast.warning("Nur die ersten 4 Punkte werden für die PV-Modul-Berechnung verwendet.");
      }
    }
    
    const roofEdgeInfo = extractRoofEdgeMeasurements(measurements);
    
    const polygonArea = calculateArea(points);
    const moduleInfo = calculatePVModulePlacement(
      points,
      undefined,
      undefined,
      DEFAULT_EDGE_DISTANCE,
      DEFAULT_MODULE_SPACING,
      undefined,
      roofEdgeInfo
    );
    const moduleSpec = PV_MODULE_TEMPLATES[0];
    
    const powerInKWp = (moduleInfo.moduleCount * moduleSpec.power) / 1000;
    const label = `${moduleInfo.moduleCount} Module (${powerInKWp.toFixed(2)} kWp)`;
    
    const newMeasurement: Measurement = {
      id: nanoid(),
      type: 'pvmodule',
      points: [...points],
      value: polygonArea,
      label,
      visible: true,
      labelVisible: allLabelsVisible,
      unit: 'kWp',
      description: '',
      pvModuleInfo: moduleInfo,
      pvModuleSpec: moduleSpec,
      powerOutput: moduleInfo.moduleCount * moduleSpec.power
    };
    
    setMeasurements(prev => [...prev, newMeasurement]);
    setCurrentPoints([]);
    currentPointsRef.current = [];
    setActiveMode('none');
    
    toast.success(`PV-Modulfläche berechnet: ${moduleInfo.moduleCount} Module (${powerInKWp.toFixed(2)} kWp), ${moduleInfo.coveragePercent.toFixed(1)}% Dachflächennutzung`);
    
    if (roofEdgeInfo.hasAllEdges) {
      if (roofEdgeInfo.isValid === false && roofEdgeInfo.validationMessage) {
        toast.warning(`Hinweis zu Dachkanten: ${roofEdgeInfo.validationMessage}`);
      } else {
        toast.success("Dachkanten (First, Traufe, Ortgang) wurden für präzisere Berechnung verwendet.");
      }
    }
    
    return newMeasurement;
  }, [allLabelsVisible, measurements]);

  // Function to create a roof element measurement (chimney, skylight, etc)
  const createRoofElementMeasurement = useCallback((type: MeasurementMode, points: Point[]) => {
    if (points.length === 0) return;
    
    let measurementData: any = {
      value: 0,
      label: '0 m',
      description: '',
      dimensions: {},
      labelVisible: allLabelsVisible
    };
    
    switch (type) {
      case 'chimney':
        if (points.length >= 4) {
          const elementArea = calculateArea(points);
          const dimensions = calculateQuadrilateralDimensions(points);
          
          measurementData = {
            value: elementArea,
            label: `${dimensions.width.toFixed(2)} × ${dimensions.length.toFixed(2)} m`,
            subType: 'Kaminausschnitt',
            dimensions: {
              width: dimensions.width,
              length: dimensions.length,
              area: elementArea,
              perimeter: dimensions.perimeter
            },
            labelVisible: allLabelsVisible
          };
        }
        break;
        
      case 'skylight':
        if (points.length >= 4) {
          const elementArea = calculateArea(points);
          const dimensions = calculateQuadrilateralDimensions(points);
          
          measurementData = {
            value: elementArea,
            label: `${dimensions.width.toFixed(2)} × ${dimensions.length.toFixed(2)} m`,
            dimensions: {
              width: dimensions.width,
              length: dimensions.length,
              area: elementArea,
              perimeter: dimensions.perimeter
            },
            labelVisible: allLabelsVisible
          };
        }
        break;
        
      case 'solar':
        const solarArea = calculateArea(points);
        const segments = generateSegments(points);
        
        measurementData = {
          value: solarArea,
          label: formatMeasurement(solarArea, 'area'),
          segments,
          dimensions: {
            area: solarArea
          },
          labelVisible: allLabelsVisible
        };
        break;
        
      case 'pvmodule':
        // For PV modules, redirect to the dedicated function
        return createPVModuleMeasurement(points);
        
      case 'vent':
      case 'hook':
      case 'other':
        const labels = {
          'vent': 'Lüfter',
          'hook': 'Dachhaken',
          'other': 'Sonstige Einbauten'
        };
        measurementData = {
          value: 1,
          label: labels[type as 'vent' | 'hook' | 'other'],
          position: points[0],
          count: 1,
          penetrationType: type,
          labelVisible: allLabelsVisible
        };
        break;
    }
    
    const newMeasurement: Measurement = {
      id: nanoid(),
      type,
      points: [...points],
      visible: true,
      labelVisible: allLabelsVisible,
      unit: type === 'solar' ? 'm²' : 
            type === 'pvmodule' ? 'kWp' :
            type === 'vent' || type === 'hook' || type === 'other' ? 'Stk' : 'm',
      ...measurementData
    };
    
    setMeasurements(prev => [...prev, newMeasurement]);
    setCurrentPoints([]);
    currentPointsRef.current = [];
    
    if (type === 'vent' || type === 'hook' || type === 'other') {
      // For point-based measurements, stay in the same mode
    } else {
      setActiveMode('none');
    }
    
    return newMeasurement;
  }, [allLabelsVisible, createPVModuleMeasurement]);

  // Add a point to the current measurement or update an existing point
  const addPoint = useCallback((point: Point) => {
    if (editMeasurementId && editingPointIndex !== null) {
      updateMeasurementPoint(editMeasurementId, editingPointIndex, point);
      setEditingPointIndex(null);
      return;
    }
    
    const updatedPoints = [...currentPointsRef.current, point];
    currentPointsRef.current = updatedPoints;
    
    setCurrentPoints(updatedPoints);
    
    const currentMode = activeMode;
    
    if ((currentMode === 'length' || currentMode === 'height') && updatedPoints.length === 2) {
      if (currentMode === 'length') {
        createLengthMeasurement(updatedPoints);
        toast.success('Längenmessung abgeschlossen - Messwerkzeug deaktiviert');
      } else if (currentMode === 'height') {
        createHeightMeasurement(updatedPoints);
        toast.success('Höhenmessung abgeschlossen - Messwerkzeug deaktiviert');
      }
    }
    
    if ((currentMode === 'vent' || currentMode === 'hook' || currentMode === 'other') && updatedPoints.length === 1) {
      createRoofElementMeasurement(currentMode, updatedPoints);
      const labels = {
        'vent': 'Lüfter/Durchdringung',
        'hook': 'Dachhaken',
        'other': 'Sonstige Einbauten'
      };
      toast.success(`${labels[currentMode]} markiert - Messwerkzeug bleibt aktiviert`);
      return;
    }
    
    if (currentMode === 'skylight' && updatedPoints.length === 4) {
      createRoofElementMeasurement(currentMode, updatedPoints);
      toast.success(`Dachfenster-Messung abgeschlossen - Messwerkzeug deaktiviert`);
    } else if (currentMode === 'skylight' && updatedPoints.length > 0 && updatedPoints.length < 4) {
      toast.info(`Punkt ${updatedPoints.length} von 4 für Dachfenster platziert`);
    }
    
    if (currentMode === 'chimney' && updatedPoints.length === 4) {
      createRoofElementMeasurement(currentMode, updatedPoints);
      toast.success(`Kamin-Messung abgeschlossen - Messwerkzeug deaktiviert`);
    } else if (currentMode === 'chimney' && updatedPoints.length > 0 && updatedPoints.length < 4) {
      toast.info(`Punkt ${updatedPoints.length} von 4 für Kamin platziert`);
    }
    
    if (currentMode === 'pvmodule' && updatedPoints.length === 4) {
      createPVModuleMeasurement(updatedPoints);
      toast.success(`PV-Modul-Zeichnung abgeschlossen - Messwerkzeug deaktiviert`);
    } else if (currentMode === 'pvmodule' && updatedPoints.length > 0 && updatedPoints.length < 4) {
      toast.info(`Punkt ${updatedPoints.length} von 4 für PV-Modul platziert`);
    } else if (currentMode === 'pvmodule') {
      if (updatedPoints.length > 4) {
        createPVModuleMeasurement(updatedPoints.slice(0, 4));
        toast.warning(`Mehr als 4 Punkte platziert. Nur die ersten 4 wurden verwendet.`);
      }
    }
  }, [
    activeMode, 
    editMeasurementId, 
    editingPointIndex, 
    createLengthMeasurement, 
    createHeightMeasurement, 
    createRoofElementMeasurement, 
    createPVModuleMeasurement, 
    updateMeasurementPoint
  ]);

  // Finalize the current measurement
  const finalizeMeasurement = useCallback(() => {
    const points = [...currentPointsRef.current];
    let newMeasurement: Measurement | undefined;
    
    if (points.length === 0) return;
    
    if (activeMode === 'length' && points.length >= 2) {
      newMeasurement = createLengthMeasurement([points[0], points[1]]);
    } 
    else if (activeMode === 'height' && points.length >= 2) {
      newMeasurement = createHeightMeasurement([points[0], points[1]]);
    }
    else if (activeMode === 'area' && points.length >= 3) {
      const validation = validatePolygon(points);
      if (!validation.valid) {
        toast.error(validation.message || 'Ungültiges Polygon');
        return;
      }
      
      if (validation.message) {
        toast.warning(validation.message);
      }
      
      try {
        const value = calculateArea(points);
        const label = formatMeasurement(value, 'area');
        const segments = generateSegments(points);
        
        toast.success(
          `3D-Fläche berechnet: ${label}`
        );
        
        newMeasurement = {
          id: nanoid(),
          type: 'area',
          points: [...points],
          value,
          label,
          visible: true,
          labelVisible: allLabelsVisible,
          unit: 'm²',
          description: '',
          segments
        };
        
        setMeasurements(prev => [...prev, newMeasurement!]);
        setCurrentPoints([]);
        currentPointsRef.current = [];
        setActiveMode('none');
      } catch (error) {
        console.error("Error finalizing area measurement:", error);
        toast.error("Fehler bei der Flächenberechnung. Bitte versuchen Sie es mit anderen Punkten.");
      }
    }
    else if (activeMode === 'solar' && points.length >= 3) {
      const validation = validatePolygon(points);
      if (!validation.valid) {
        toast.error(validation.message || 'Ungültiges Polygon');
        return;
      }
      
      newMeasurement = createRoofElementMeasurement(activeMode, points);
      toast.success(`Solaranlage-Messung abgeschlossen`);
    }
    else if (activeMode === 'pvmodule' && points.length >= 4) {
      newMeasurement = createPVModuleMeasurement(points);
    }
    else if (!['length', 'height', 'area', 'solar', 'pvmodule', 'none'].includes(activeMode)) {
      const requiredPoints: Record<MeasurementMode, number> = {
        'chimney': 4,
        'skylight': 4,
        'solar': 3,
        'pvmodule': 4,
        'vent': 1,
        'hook': 1,
        'other': 1,
        'ridge': 2,
        'eave': 2,
        'verge': 2,
        'valley': 2,
        'hip': 2,
        'length': 2,
        'height': 2,
        'area': 3,
        'none': 0
      };
      
      if (points.length >= (requiredPoints[activeMode] || 0)) {
        newMeasurement = createRoofElementMeasurement(activeMode, points);
        
        const typeName = {
          'chimney': 'Kamin',
          'skylight': 'Dachfenster',
          'solar': 'Solaranlage',
          'pvmodule': 'PV-Modul',
          'vent': 'Lüfter',
          'hook': 'Dachhaken',
          'other': 'Sonstige Einbauten',
          'ridge': 'First',
          'eave': 'Traufe',
          'verge': 'Ortgang',
          'valley': 'Kehle',
          'hip': 'Grat'
        }[activeMode] || activeMode.charAt(0).toUpperCase() + activeMode.slice(1);
        
        toast.success(`${typeName}-Messung abgeschlossen`);
      } else {
        toast.error(`Mindestens ${requiredPoints[activeMode]} Punkte werden benötigt.`);
        
        if (['skylight', 'chimney', 'pvmodule'].includes(activeMode)) {
          const elementName = activeMode === 'skylight' ? 'Dachfenster' : 
                              activeMode === 'chimney' ? 'Kamin' : 'PV-Modul';
          toast.error(`Für ${elementName} werden genau 4 Punkte benötigt.`);
        }
      }
    }
    
    // After creating a new measurement, find shared segments
    if (newMeasurement) {
      const updatedMeasurements = findAndLinkSharedSegments([...measurements, newMeasurement]);
      setMeasurements(updatedMeasurements);
      
      // Update visual state if the updater is defined
      const updateVisualState = visualStateUpdaterRef.current;
      if (updateVisualState) {
        updateVisualState(updatedMeasurements, allLabelsVisible);
      }
    }
    
    return newMeasurement;
  }, [
    activeMode,
    allLabelsVisible,
    createLengthMeasurement,
    createHeightMeasurement,
    createRoofElementMeasurement,
    createPVModuleMeasurement,
    measurements
  ]);

  // Function to undo the last point added
  const undoLastPoint = useCallback((): boolean => {
    if (currentPoints.length === 0) {
      return false;
    }
    
    const newPoints = [...currentPoints];
    newPoints.pop();
    setCurrentPoints(newPoints);
    currentPointsRef.current = newPoints;
    return true;
  }, [currentPoints]);
  
  // Function to clear current points
  const clearCurrentPoints = useCallback(() => {
    setCurrentPoints([]);
    currentPointsRef.current = [];
    
    if (['vent', 'hook', 'other'].includes(activeMode)) {
      setActiveMode('none');
    }
  }, [activeMode]);

  // Function to clear all measurements
  const clearMeasurements = useCallback(() => {
    setMeasurements([]);
    setCurrentPoints([]);
    currentPointsRef.current = [];
    setEditMeasurementId(null);
    setEditingPointIndex(null);
  }, []);

  // Toggle edit mode for a measurement
  const toggleEditMode = useCallback((id: string) => {
    setMeasurements(prev => {
      const updatedMeasurements = prev.map(m => {
        // Turn off edit mode for all other measurements
        if (m.id !== id) {
          return { ...m, editMode: false };
        }
        // Toggle for the selected measurement
        return { ...m, editMode: !m.editMode };
      });
      
      // If we're turning off edit mode for the current measurement
      const measurement = prev.find(m => m.id === id);
      if (measurement?.editMode) {
        setEditMeasurementId(null);
        setEditingPointIndex(null);
      } else {
        setEditMeasurementId(id);
        setEditingPointIndex(null); // Reset point index when entering edit mode
      }
      
      return updatedMeasurements;
    });
  }, []);

  // Start editing a specific point
  const startPointEdit = useCallback((measurementId: string, pointIndex: number) => {
    setEditMeasurementId(measurementId);
    setEditingPointIndex(pointIndex);
  }, []);

  // Cancel editing
  const cancelEditing = useCallback(() => {
    setEditMeasurementId(null);
    setEditingPointIndex(null);
    setMeasurements(prev => prev.map(m => ({ ...m, editMode: false })));
  }, []);

  // Update measurement metadata
  const updateMeasurement = useCallback((id: string, data: Partial<Measurement>) => {
    const updatedMeasurements = measurements.map(m => 
      m.id === id ? { ...m, ...data } : m
    );
    
    // Find and link shared segments
    const measurementsWithLinkedSegments = findAndLinkSharedSegments(updatedMeasurements);
    
    // Update the state with the new measurements
    setMeasurements(measurementsWithLinkedSegments);
    
    // Trigger visual update
    const updateVisualState = visualStateUpdaterRef.current;
    if (updateVisualState) {
      updateVisualState(measurementsWithLinkedSegments, allLabelsVisible);
    }
    
    return measurementsWithLinkedSegments;
  }, [measurements, allLabelsVisible]);

  // Update a specific segment in a measurement
  const updateSegment = useCallback((measurementId: string, segmentId: string, segmentData: Partial<Segment>) => {
    const measurementIndex = measurements.findIndex(m => m.id === measurementId);
    if (measurementIndex === -1) return;
    
    const measurement = measurements[measurementIndex];
    if (!measurement.segments) return;
    
    const segmentIndex = measurement.segments.findIndex(s => s.id === segmentId);
    if (segmentIndex === -1) return;
    
    const segment = measurement.segments[segmentIndex];
    
    // Create a copy of measurements array
    const updatedMeasurements = [...measurements];
    
    // Create a copy of the segments array
    const updatedSegments = [...measurement.segments];
    
    // Update the specific segment
    updatedSegments[segmentIndex] = {
      ...segment,
      ...segmentData
    };
    
    // Update the measurement with the new segments
    updatedMeasurements[measurementIndex] = {
      ...measurement,
      segments: updatedSegments
    };
    
    // Check if this segment is shared with another segment
    if (segment.shared && segment.sharedWithSegmentId) {
      // Find the other segment
      for (let i = 0; i < updatedMeasurements.length; i++) {
        if (!updatedMeasurements[i].segments) continue;
        
        const otherSegmentIndex = updatedMeasurements[i].segments.findIndex(
          s => s.id === segment.sharedWithSegmentId
        );
        
        if (otherSegmentIndex !== -1) {
          // Update the other segment with the same changes
          updatedMeasurements[i].segments[otherSegmentIndex] = {
            ...updatedMeasurements[i].segments[otherSegmentIndex],
            ...segmentData
          };
          
          // Show a notification about the shared update
          toast.info('Änderung wurde auf geteilte Kante übertragen');
          break;
        }
      }
    }
    
    // Update measurements with shared segment links
    const finalMeasurements = findAndLinkSharedSegments(updatedMeasurements);
    
    // Save the updated measurements and trigger a visual update
    setMeasurements(finalMeasurements);
    
    const updateVisualState = visualStateUpdaterRef.current;
    if (updateVisualState) {
      updateVisualState(finalMeasurements, allLabelsVisible);
    }
  }, [measurements, allLabelsVisible]);

  // Delete a measurement
  const deleteMeasurement = useCallback((id: string) => {
    setMeasurements(prev => prev.filter(m => m.id !== id));
    // Cancel edit mode if the deleted measurement was being edited
    if (editMeasurementId === id) {
      setEditMeasurementId(null);
      setEditingPointIndex(null);
    }
  }, [editMeasurementId]);

  // Delete a point from a measurement
  const deletePoint = useCallback((measurementId: string, pointIndex: number) => {
    setMeasurements(prev => {
      const measurements = [...prev];
      const measurementIndex = measurements.findIndex(m => m.id === measurementId);
      
      if (measurementIndex === -1) return prev;
      
      const measurement = measurements[measurementIndex];
      
      // For area measurements, ensure we maintain at least 3 points
      if (measurement.type === 'area' && measurement.points.length <= 3) {
        toast.error('Eine Flächenmessung benötigt mindestens 3 Punkte.');
        return prev;
      }
      
      // Create a new array of points without the deleted point
      const newPoints = [...measurement.points];
      newPoints.splice(pointIndex, 1);
      
      // Create updated measurement with new points
      const updatedMeasurement = { ...measurement, points: newPoints };
      
      // Recalculate the measurement based on type
      if (measurement.type === 'area') {
        // Recalculate area
        const newValue = calculateArea(newPoints);
        
        // Regenerate segments
        const newSegments = generateSegments(newPoints);
        
        // Set no inclination for area measurements
        updatedMeasurement.value = newValue;
        updatedMeasurement.label = formatMeasurement(newValue, 'area');
        updatedMeasurement.segments = newSegments;
        updatedMeasurement.inclination = undefined;
      }
      // We don't need to handle length and height here as they must have exactly 2 points
      
      // Update the measurements array
      measurements[measurementIndex] = updatedMeasurement;
      
      return measurements;
    });
  }, []);

  // Toggle the measurement tool mode
  const toggleMeasurementTool = useCallback((mode: MeasurementMode) => {
    // If the same mode is selected, turn it off
    if (activeMode === mode && mode !== 'none') {
      setActiveMode('none');
      clearCurrentPoints();
    } else {
      // Otherwise, switch to the selected mode
      setActiveMode(mode);
      clearCurrentPoints();
    }
    
    // Cancel any active editing
    setEditMeasurementId(null);
    setEditingPointIndex(null);
  }, [activeMode, clearCurrentPoints]);

  // Toggle visibility for a single measurement
  const toggleMeasurementVisibility = useCallback((id: string) => {
    setMeasurements(prev => {
      const updatedMeasurements = prev.map(m => 
        m.id === id ? { ...m, visible: m.visible === false ? true : false } : m
      );
      
      // Update visual state if the callback is provided
      const updateVisualState = visualStateUpdaterRef.current;
      if (updateVisualState) {
        updateVisualState(updatedMeasurements, allLabelsVisible);
      }
      
      return updatedMeasurements;
    });
  }, [allLabelsVisible]);

  // Toggle label visibility for a single measurement
  const toggleLabelVisibility = useCallback((id: string) => {
    console.log('Label visibility toggle is now handled through updateMeasurement');
  }, []);

  // Toggle visibility for all measurements
  const toggleAllMeasurementsVisibility = useCallback(() => {
    const newVisibility = !allMeasurementsVisible;
    setAllMeasurementsVisible(newVisibility);
    
    setMeasurements(prev => {
      const updatedMeasurements = prev.map(m => ({ ...m, visible: newVisibility }));
      
      // Update visual state if the callback is provided
      const updateVisualState = visualStateUpdaterRef.current;
      if (updateVisualState) {
        updateVisualState(updatedMeasurements, allLabelsVisible);
      }
      
      return updatedMeasurements;
    });
  }, [allMeasurementsVisible, allLabelsVisible]);

  // Toggle visibility for all labels
  const toggleAllLabelsVisibility = useCallback(() => {
    const newLabelVisibility = !allLabelsVisible;
    setAllLabelsVisible(newLabelVisibility);
    
    setMeasurements(prev => {
      const updatedMeasurements = prev.map(m => ({ ...m, labelVisible: newLabelVisibility }));
      
      // Update visual state if the callback is provided
      const updateVisualState = visualStateUpdaterRef.current;
      if (updateVisualState) {
        updateVisualState(updatedMeasurements, newLabelVisibility);
      }
      
      return updatedMeasurements;
    });
  }, [allLabelsVisible]);

  // Move a measurement up in the list within its type category
  const moveMeasurementUp = useCallback((id: string) => {
    setMeasurements(prev => {
      // Find the current measurement and its index
      const index = prev.findIndex(m => m.id === id);
      if (index <= 0) return prev; // Already at the top or not found
      
      // Get the measurement to move and the one above it
      const currentMeasurement = prev[index];
      
      // Find the previous measurement of the same type
      let prevIndex = index - 1;
      while (prevIndex >= 0) {
        if (prev[prevIndex].type === currentMeasurement.type) {
          break;
        }
        prevIndex--;
      }
      
      // If we couldn't find a previous measurement of the same type, don't move
      if (prevIndex < 0) return prev;
      
      // Create a new array with the items swapped
      const newMeasurements = [...prev];
      newMeasurements[index] = prev[prevIndex];
      newMeasurements[prevIndex] = currentMeasurement;
      
      return newMeasurements;
    });
  }, []);

  // Move a measurement down in the list within its type category
  const moveMeasurementDown = useCallback((id: string) => {
    setMeasurements(prev => {
      // Find the current measurement and its index
      const index = prev.findIndex(m => m.id === id);
      if (index === -1 || index >= prev.length - 1) return prev; // Not found or already at the bottom
      
      // Get the measurement to move
      const currentMeasurement = prev[index];
      
      // Find the next measurement of the same type
      let nextIndex = index + 1;
      while (nextIndex < prev.length) {
        if (prev[nextIndex].type === currentMeasurement.type) {
          break;
        }
        nextIndex++;
      }
      
      // If we couldn't find a next measurement of the same type, don't move
      if (nextIndex >= prev.length) return prev;
      
      // Create a new array with the items swapped
      const newMeasurements = [...prev];
      newMeasurements[index] = prev[nextIndex];
      newMeasurements[nextIndex] = currentMeasurement;
      
      return newMeasurements;
    });
  }, []);

  // Helper function to check if segments share the same points
  const areSegmentsShared = useCallback((segment1: Segment, segment2: Segment): boolean => {
    // Check points in both directions
    const matchForward = 
      arePointsEqual(segment1.points[0], segment2.points[0]) && 
      arePointsEqual(segment1.points[1], segment2.points[1]);
    
    const matchReverse = 
      arePointsEqual(segment1.points[0], segment2.points[1]) && 
      arePointsEqual(segment1.points[1], segment2.points[0]);
    
    return matchForward || matchReverse;
  }, []);
  
  // Helper function to compare points with a small tolerance
  const arePointsEqual = useCallback((p1: Point, p2: Point, tolerance: number = 0.01): boolean => {
    const distanceSquared = 
      Math.pow(p1.x - p2.x, 2) + 
      Math.pow(p1.y - p2.y, 2) + 
      Math.pow(p1.z - p2.z, 2);
    
    return distanceSquared < tolerance * tolerance;
  }, []);

  // Function to find and link shared segments
  const findAndLinkSharedSegments = useCallback((updatedMeasurements: Measurement[]) => {
    // Create a deep copy to avoid mutation issues
    const measurementsCopy = JSON.parse(JSON.stringify(updatedMeasurements)) as Measurement[];
    
    // Collect segments from area measurements only
    const areaMeasurements = measurementsCopy.filter(m => m.type === 'area' || m.type === 'solar');
    
    // Process each area measurement
    for (let i = 0; i < areaMeasurements.length; i++) {
      const measurement1 = areaMeasurements[i];
      if (!measurement1.segments) continue;
      
      // Compare with all other area measurements
      for (let j = i + 1; j < areaMeasurements.length; j++) {
        const measurement2 = areaMeasurements[j];
        if (!measurement2.segments) continue;
        
        // Compare segments between the two measurements
        for (let si = 0; si < measurement1.segments.length; si++) {
          const segment1 = measurement1.segments[si];
          
          for (let sj = 0; sj < measurement2.segments.length; sj++) {
            const segment2 = measurement2.segments[sj];
            
            // Check if the segments share the same points (in any order)
            const isShared = areSegmentsShared(segment1, segment2);
            
            if (isShared) {
              // Mark both segments as shared
              segment1.shared = true;
              segment2.shared = true;
              
              // Set one as original, the other as reference
              segment1.isOriginal = true;
              segment2.isOriginal = false;
              
              // Link them to each other
              segment1.sharedWithSegmentId = segment2.id;
              segment2.sharedWithSegmentId = segment1.id;
              
              // If one has a type and the other doesn't, or if they have different types,
              // the one with the type becomes the original, or the first one by default
              if ((segment1.type && !segment2.type) || 
                  (segment1.type !== segment2.type && segment1.type)) {
                segment1.isOriginal = true;
                segment2.isOriginal = false;
                
                // Transfer the type if needed
                if (segment1.type && !segment2.type) {
                  segment2.type = segment1.type;
                }
              } else if ((!segment1.type && segment2.type) || 
                         (segment1.type !== segment2.type && segment2.type)) {
                segment1.isOriginal = false;
                segment2.isOriginal = true;
                
                // Transfer the type if needed
                if (!segment1.type && segment2.type) {
                  segment1.type = segment2.type;
                }
              }
            }
          }
        }
      }
    }
    
    return measurementsCopy;
  }, [areSegmentsShared]);

  // Calculate PV materials for a measurement
  const calculatePVMaterialsForMeasurement = useCallback((measurementId: string, inverterDistance: number = 10): PVMaterials | undefined => {
    console.log('Starting PV materials calculation for measurement:', measurementId);
    setCalculatingMaterials(true);
    
    try {
      // Find the measurement
      const measurement = measurements.find(m => m.id === measurementId);
      if (!measurement) {
        console.error('Cannot calculate PV materials: measurement not found', { measurementId });
        toast.error('Fehler: Messung nicht gefunden');
        setCalculatingMaterials(false);
        return undefined;
      }
      
      // Check if pvModuleInfo exists
      if (!measurement.pvModuleInfo) {
        console.error('Cannot calculate PV materials: pvModuleInfo not found', { measurementId });
        toast.error('Fehler: PV-Modul-Informationen fehlen');
        setCalculatingMaterials(false);
        return undefined;
      }
      
      // Check if pvModuleSpec exists
      if (!measurement.pvModuleInfo.pvModuleSpec) {
        console.error('Cannot calculate PV materials: pvModuleSpec is missing', { measurementId, pvInfo: measurement.pvModuleInfo });
        toast.error('Fehler: PV-Modul-Spezifikation fehlt');
        setCalculatingMaterials(false);
        return undefined;
      }
      
      // Import the calculation function dynamically
      import('@/utils/pvCalculations').then(({ calculatePVMaterials }) => {
        try {
          if (!measurement.pvModuleInfo) return undefined;
          
          // Calculate materials
          const materials = calculatePVMaterials(measurement.pvModuleInfo, inverterDistance);
          if (!materials) {
            console.error('PV materials calculation returned undefined');
            toast.error('Materialberechnung fehlgeschlagen');
            setCalculatingMaterials(false);
            return undefined;
          }
          
          console.log('Successfully calculated PV materials:', materials);
          
          // Update the measurement with the calculated materials
          const updatedMeasurement = {
            ...measurement,
            pvModuleInfo: {
              ...measurement.pvModuleInfo,
              pvMaterials: materials
            }
          };
          
          // Update the measurement in the measurements array
          const updatedMeasurements = measurements.map(m => 
            m.id === measurementId ? updatedMeasurement : m
          );
          
          // Update state and trigger visual update
          setMeasurements(updatedMeasurements);
          
          const updateVisualState = visualStateUpdaterRef.current;
          if (updateVisualState) {
            updateVisualState(updatedMeasurements, allLabelsVisible);
          }
          
          // Show success toast
          toast.success('Materialliste erfolgreich berechnet');
          
          setCalculatingMaterials(false);
          return materials;
        } catch (calcError) {
          console.error('Error in calculatePVMaterials function:', calcError);
          toast.error('Fehler bei der Materialberechnung');
          setCalculatingMaterials(false);
          return undefined;
        }
      }).catch(error => {
        console.error('Failed to load pvCalculations module:', error);
        toast.error('Fehler beim Laden des Berechnungsmoduls');
        setCalculatingMaterials(false);
        return undefined;
      });
    } catch (error) {
      console.error('Unexpected error in calculatePVMaterialsForMeasurement:', error);
      toast.error('Unerwarteter Fehler bei der Berechnung');
      setCalculatingMaterials(false);
      return undefined;
    }
    
    return undefined;
  }, [measurements, allLabelsVisible]);

  // Allow external components to set the visual state update function
  const setUpdateVisualState = useCallback((fn: (updatedMeasurements: Measurement[], labelVisibility: boolean) => void) => {
    visualStateUpdaterRef.current = fn;
  }, []);
  
  const value: MeasurementContextValue = {
    // State
    measurements,
    currentPoints,
    activeMode,
    editMeasurementId,
    editingPointIndex,
    allMeasurementsVisible,
    allLabelsVisible,
    calculatingMaterials,
    
    // Actions
    addPoint,
    clearCurrentPoints,
    finalizeMeasurement,
    clearMeasurements,
    undoLastPoint,
    updateMeasurementPoint,
    startPointEdit,
    cancelEditing,
    toggleEditMode,
    updateMeasurement,
    updateSegment,
    deleteMeasurement,
    deletePoint,
    toggleMeasurementTool,
    toggleMeasurementVisibility,
    toggleLabelVisibility,
    toggleAllMeasurementsVisibility,
    toggleAllLabelsVisibility,
    moveMeasurementUp,
    moveMeasurementDown,
    calculatePVMaterialsForMeasurement,
    findAndLinkSharedSegments,
    setUpdateVisualState
  };

  return (
    <MeasurementContext.Provider value={value}>
      {children}
    </MeasurementContext.Provider>
  );
};

export const useMeasurementContext = () => {
  const context = useContext(MeasurementContext);
  if (context === undefined) {
    throw new Error('useMeasurementContext must be used within a MeasurementProvider');
  }
  return context;
};
