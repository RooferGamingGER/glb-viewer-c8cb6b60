
import { useState, useCallback, useRef, useEffect } from 'react';
import { nanoid } from 'nanoid';
import { toast } from 'sonner';
import { 
  MeasurementMode, 
  Point, 
  Measurement,
  Segment
} from '@/types/measurements';
import { 
  calculateDistance, 
  calculateHeight, 
  calculateArea,
  generateSegments,
  calculateInclination,
  validatePolygon,
  calculateAverageInclination,
  calculateQuadrilateralDimensions,
  calculateBoundingBox,
  calculateCentroid
} from '@/utils/measurementCalculations';
import { formatMeasurement, MIN_INCLINATION_THRESHOLD, getMeasurementTypeDisplayName } from '@/constants/measurements';
import * as THREE from 'three';

/**
 * Core measurement functionality hook
 */
export const useMeasurementCore = () => {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [activeMode, setActiveMode] = useState<MeasurementMode>('none');
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [allMeasurementsVisible, setAllMeasurementsVisible] = useState<boolean>(true);
  const [allLabelsVisible, setAllLabelsVisible] = useState<boolean>(true);
  const [editMeasurementId, setEditMeasurementId] = useState<string | null>(null);
  const [editingPointIndex, setEditingPointIndex] = useState<number | null>(null);
  
  const currentPointsRef = useRef<Point[]>([]);

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
        } else if (m.type === 'area') {
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

  useEffect(() => {
    currentPointsRef.current = currentPoints;
  }, [currentPoints]);

  useEffect(() => {
    const handleAreaPointAdded = (event: CustomEvent) => {
      const { measurementId, updatedMeasurement } = event.detail;
      
      setMeasurements(prev => prev.map(m => {
        if (m.id === measurementId) {
          const newValue = calculateArea(updatedMeasurement.points);
          const segments = generateSegments(updatedMeasurement.points);
          
          return {
            ...updatedMeasurement,
            value: newValue,
            label: formatMeasurement(newValue, 'area'),
            segments
          };
        }
        return m;
      }));
    };
    
    document.addEventListener('areaPointAdded', handleAreaPointAdded as EventListener);
    
    return () => {
      document.removeEventListener('areaPointAdded', handleAreaPointAdded as EventListener);
    };
  }, []);

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
    
    setMeasurements(prev => [
      ...prev,
      {
        id: nanoid(),
        type: 'length',
        points: [p1, p2],
        value: distance,
        label,
        visible: true,
        labelVisible: true,
        unit: 'm',
        description: '',
        inclination
      }
    ]);
    
    setCurrentPoints([]);
    currentPointsRef.current = [];
    
    setActiveMode('none');
  }, []);

  const createHeightMeasurement = useCallback((points: Point[]) => {
    if (points.length < 2) return;
    
    const p1 = points[0];
    const p2 = points[1];
    
    const height = calculateHeight(p1, p2);
    const label = formatMeasurement(height, 'height');
    
    setMeasurements(prev => [
      ...prev,
      {
        id: nanoid(),
        type: 'height',
        points: [p1, p2],
        value: height,
        label,
        visible: true,
        labelVisible: true,
        unit: 'm',
        description: ''
      }
    ]);
    
    setCurrentPoints([]);
    currentPointsRef.current = [];
    
    setActiveMode('none');
  }, []);

  const createChimneyOrSkylightMeasurement = (points: Point[], type: 'chimney' | 'skylight'): {
    value: number;
    width: number;
    length: number;
    area: number;
    perimeter: number;
  } => {
    if (points.length >= 4) {
      const dimensions = calculateQuadrilateralDimensions(points);
      
      return {
        value: dimensions.area,
        width: dimensions.width,
        length: dimensions.length,
        area: dimensions.area,
        perimeter: dimensions.perimeter
      };
    }
    
    return {
      value: 0,
      width: 0,
      length: 0,
      area: 0,
      perimeter: 0
    };
  };

  const createPointMeasurement = (point: Point, type: 'vent' | 'hook' | 'other'): {
    value: number;
    position: Point;
    penetrationType: 'vent' | 'hook' | 'other';
  } => {
    return {
      value: 1, // Changed from 0 to 1 to properly count penetrations
      position: point,
      penetrationType: type
    };
  };

  const createRoofElementMeasurement = useCallback((type: MeasurementMode, points: Point[]) => {
    if (points.length === 0) return;
    
    let measurementData: any = {
      value: 0,
      label: '0 m',
      description: '',
      dimensions: {},
      labelVisible: true
    };
    
    switch (type) {
      case 'chimney':
        if (points.length >= 4) {
          const area = calculateArea(points);
          const dimensions = calculateQuadrilateralDimensions(points);
          
          measurementData = {
            value: area,
            label: `${dimensions.width.toFixed(2)} × ${dimensions.length.toFixed(2)} m`,
            subType: 'Kaminausschnitt',
            dimensions: {
              width: dimensions.width,
              length: dimensions.length,
              area: area,
              perimeter: dimensions.perimeter
            }
          };
        }
        break;
        
      case 'skylight':
        if (points.length >= 4) {
          const area = calculateArea(points);
          const dimensions = calculateQuadrilateralDimensions(points);
          
          measurementData = {
            value: area,
            label: `${dimensions.width.toFixed(2)} × ${dimensions.length.toFixed(2)} m`,
            dimensions: {
              width: dimensions.width,
              length: dimensions.length,
              area: area,
              perimeter: dimensions.perimeter
            }
          };
        }
        break;
        
      case 'solar':
        const area = calculateArea(points);
        const segments = generateSegments(points);
        
        measurementData = {
          value: area,
          label: formatMeasurement(area, 'area'),
          segments,
          dimensions: {
            area
          }
        };
        break;
        
      case 'vent':
      case 'hook':
      case 'other':
        const pointData = createPointMeasurement(points[0], type as 'vent' | 'hook' | 'other');
        const labels = {
          'vent': 'Lüfter',
          'hook': 'Dachhaken',
          'other': 'Sonstige Einbauten'
        };
        measurementData = {
          value: 1, // Changed from 0 to 1 to properly count penetrations
          label: labels[type as 'vent' | 'hook' | 'other'],
          position: pointData.position,
          count: 1,
          penetrationType: pointData.penetrationType
        };
        break;
    }
    
    setMeasurements(prev => [
      ...prev,
      {
        id: nanoid(),
        type,
        points: [...points],
        visible: true,
        labelVisible: true,
        unit: type === 'solar' ? 'm²' : 
              type === 'vent' || type === 'hook' || type === 'other' ? 'Stk' : 'm',
        ...measurementData
      }
    ]);
    
    setCurrentPoints([]);
    currentPointsRef.current = [];
    
    if (type === 'vent' || type === 'hook' || type === 'other') {
      setActiveMode(type);
    } else {
      setActiveMode('none');
    }
  }, [setMeasurements, setActiveMode, setCurrentPoints]);

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
  }, [activeMode, editMeasurementId, editingPointIndex, createLengthMeasurement, createHeightMeasurement, createRoofElementMeasurement, updateMeasurementPoint, setEditingPointIndex]);

  const finalizeMeasurement = useCallback(() => {
    const points = [...currentPointsRef.current];
    
    if (points.length === 0) return;
    
    if (activeMode === 'length' && points.length >= 2) {
      createLengthMeasurement([points[0], points[1]]);
    } 
    else if (activeMode === 'height' && points.length >= 2) {
      createHeightMeasurement([points[0], points[1]]);
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
      
      const value = calculateArea(points);
      const label = formatMeasurement(value, 'area');
      const segments = generateSegments(points);
      
      toast.success(
        `3D-Fläche berechnet: ${label} (Potree-Methode)`
      );
      
      setMeasurements(prev => [
        ...prev,
        {
          id: nanoid(),
          type: 'area',
          points: [...points],
          value,
          label,
          visible: true,
          labelVisible: true,
          unit: 'm²',
          description: '',
          segments
        }
      ]);
      setCurrentPoints([]);
      currentPointsRef.current = [];
      setActiveMode('none');
    }
    else if (activeMode === 'solar' && points.length >= 3) {
      const validation = validatePolygon(points);
      if (!validation.valid) {
        toast.error(validation.message || 'Ungültiges Polygon');
        return;
      }
      
      createRoofElementMeasurement(activeMode, points);
      toast.success(`Solaranlage-Messung abgeschlossen`);
    }
    else if (!['length', 'height', 'area', 'solar', 'none'].includes(activeMode)) {
      const requiredPoints: Record<MeasurementMode, number> = {
        'chimney': 4,
        'skylight': 4,
        'solar': 3,
        'vent': 1,
        'hook': 1,
        'other': 1,
        'length': 2,
        'height': 2,
        'area': 3,
        'none': 0
      };
      
      if (points.length >= (requiredPoints[activeMode] || 0)) {
        createRoofElementMeasurement(activeMode, points);
        
        const typeName = {
          'chimney': 'Kamin',
          'skylight': 'Dachfenster',
          'solar': 'Solaranlage',
          'vent': 'Lüfter',
          'hook': 'Dachhaken',
          'other': 'Sonstige Einbauten'
        }[activeMode] || activeMode.charAt(0).toUpperCase() + activeMode.slice(1);
        
        toast.success(`${typeName}-Messung abgeschlossen`);
      } else {
        toast.error(`Mindestens ${requiredPoints[activeMode]} Punkte werden benötigt.`);
        
        if (activeMode === 'skylight' || activeMode === 'chimney') {
          toast.error(`Für ${activeMode === 'skylight' ? 'Dachfenster' : 'Kamin'} werden genau 4 Punkte benötigt.`);
        }
      }
    }
  }, [activeMode, createLengthMeasurement, createHeightMeasurement, createRoofElementMeasurement]);

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
  
  const clearCurrentPoints = useCallback(() => {
    setCurrentPoints([]);
    currentPointsRef.current = [];
  }, []);

  const clearMeasurements = useCallback(() => {
    setMeasurements([]);
    setCurrentPoints([]);
    currentPointsRef.current = [];
    setEditMeasurementId(null);
    setEditingPointIndex(null);
  }, []);

  return {
    measurements,
    setMeasurements,
    currentPoints,
    setCurrentPoints,
    currentPointsRef,
    activeMode,
    setActiveMode,
    allMeasurementsVisible,
    setAllMeasurementsVisible,
    allLabelsVisible,
    setAllLabelsVisible,
    editMeasurementId, 
    setEditMeasurementId,
    editingPointIndex,
    setEditingPointIndex,
    addPoint,
    finalizeMeasurement,
    clearCurrentPoints,
    clearMeasurements,
    updateMeasurementPoint,
    undoLastPoint,
    createLengthMeasurement,
    createHeightMeasurement,
    createRoofElementMeasurement
  };
};
