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
  createChimneyMeasurement,
  calculateBoundingBox,
  calculateCentroid,
  createRectangleFromDiagonalPoints
} from '@/utils/measurementCalculations';
import { formatMeasurement, MIN_INCLINATION_THRESHOLD } from '@/constants/measurements';
import * as THREE from 'three';

/**
 * Core measurement functionality hook
 */
export const useMeasurementCore = () => {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [activeMode, setActiveMode] = useState<MeasurementMode>('none');
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [allMeasurementsVisible, setAllMeasurementsVisible] = useState<boolean>(true);
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
        unit: 'm',
        description: ''
      }
    ]);
    
    setCurrentPoints([]);
    currentPointsRef.current = [];
    
    setActiveMode('none');
  }, []);

  const createDormerMeasurement = (points: Point[]): {
    value: number;
    area: number;
    width?: number;
    length?: number;
    height?: number;
  } => {
    const area = calculateArea(points.slice(0, points.length > 3 ? points.length - 1 : 3));
    
    const boundingBox = calculateBoundingBox(points.slice(0, points.length > 3 ? points.length - 1 : 3));
    const width = boundingBox.max.x - boundingBox.min.x;
    const length = boundingBox.max.z - boundingBox.min.z;
    
    let height: number | undefined;
    if (points.length > 3) {
      const baseCenter = calculateCentroid(points.slice(0, 3));
      height = calculateHeight(baseCenter, points[3]);
    }
    
    return {
      value: area,
      area,
      width,
      length,
      height
    };
  };

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

  const createVentMeasurement = (point: Point): {
    value: number;
    position: Point;
  } => {
    return {
      value: 0,
      position: point
    };
  };

  const createRoofElementMeasurement = useCallback((type: MeasurementMode, points: Point[]) => {
    if (points.length === 0) return;
    
    let value = 0;
    let label = '';
    let unit = 'm';
    let segments: Segment[] | undefined;
    let dimensions: any = {};
    let inclination: number | undefined;
    let subType: string | undefined;
    let count: number | undefined;
    let penetrationType: 'vent' | 'other' | undefined;
    let isRectangleMode: boolean = false;
    
    switch(type) {
      case 'dormer': {
        const result = createDormerMeasurement(points);
        value = result.area;
        label = `${result.area.toFixed(2)} m²`;
        unit = 'm²';
        segments = generateSegments(points.slice(0, points.length > 3 ? points.length - 1 : 3));
        dimensions = {
          area: result.area,
          width: result.width,
          length: result.length,
          height: result.height
        };
        break;
      }
      
      case 'chimney': {
        const result = createChimneyOrSkylightMeasurement(points, 'chimney');
        value = result.area;
        label = `${result.width.toFixed(2)} × ${result.length.toFixed(2)} m (Kaminausschnitt)`;
        unit = 'm²';
        dimensions = {
          width: result.width,
          length: result.length,
          area: result.area,
          perimeter: result.perimeter
        };
        segments = generateSegments(points);
        subType = 'Kaminausschnitt';
        isRectangleMode = true;
        break;
      }
      
      case 'skylight': {
        const result = createChimneyOrSkylightMeasurement(points, 'skylight');
        value = result.area;
        label = `${result.width.toFixed(2)} × ${result.length.toFixed(2)} m`;
        unit = 'm²';
        dimensions = {
          width: result.width,
          length: result.length,
          area: result.area,
          perimeter: result.perimeter
        };
        segments = generateSegments(points);
        isRectangleMode = true;
        break;
      }
      
      case 'solar': {
        value = calculateArea(points);
        label = `${value.toFixed(2)} m²`;
        unit = 'm²';
        segments = generateSegments(points);
        
        if (segments.length > 0) {
          inclination = calculateAverageInclination(segments);
        }
        
        dimensions = {
          area: value
        };
        
        break;
      }
      
      case 'gutter': {
        if (points.length >= 2) {
          let totalLength = 0;
          for (let i = 0; i < points.length - 1; i++) {
            totalLength += calculateDistance(points[i], points[i + 1]);
          }
          
          value = totalLength;
          label = `${value.toFixed(2)} m`;
        }
        break;
      }
      
      case 'verge': 
      case 'valley':
      case 'ridge': {
        if (points.length >= 2) {
          value = calculateDistance(points[0], points[1]);
          label = `${value.toFixed(2)} m`;
          
          const p1 = new THREE.Vector3(points[0].x, points[0].y, points[0].z);
          const p2 = new THREE.Vector3(points[1].x, points[1].y, points[1].z);
          const calculatedInclination = calculateInclination(p1, p2);
          
          if (Math.abs(calculatedInclination) >= MIN_INCLINATION_THRESHOLD) {
            inclination = calculatedInclination;
          }
          
          if (type === 'verge') {
            if (Math.abs(inclination || 0) <= 5) {
              subType = 'Traufe';
            } else {
              subType = 'Ortgang';
            }
          } else if (type === 'valley') {
            subType = 'Kehle';
          } else if (type === 'ridge') {
            subType = 'Grat';
          }
        }
        break;
      }
      
      case 'vent': {
        const result = createVentMeasurement(points[0]);
        label = 'Lüfter/Durchdringung';
        value = 0;
        
        const existingVents = measurements.filter(m => m.type === 'vent').length + 1;
        count = 1;
        
        penetrationType = 'vent';
        break;
      }
      
      default:
        break;
    }
    
    setMeasurements(prev => [
      ...prev,
      {
        id: nanoid(),
        type,
        points: [...points],
        value,
        label,
        visible: true,
        unit,
        description: '',
        segments,
        inclination,
        subType,
        dimensions,
        count,
        penetrationType,
        isRectangleMode,
        rectanglePoints: isRectangleMode ? [...points] : undefined,
        isEditing: false,
        activeCorner: undefined
      }
    ]);
    
    setCurrentPoints([]);
    currentPointsRef.current = [];
    
    setActiveMode('none');
  }, [measurements]);

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
          unit: 'm²',
          description: '',
          segments
        }
      ]);
      setCurrentPoints([]);
      currentPointsRef.current = [];
    }
    else if (!['length', 'height', 'area', 'none'].includes(activeMode)) {
      const requiredPoints: Record<MeasurementMode, number> = {
        'dormer': 3,
        'chimney': 2,
        'skylight': 2,
        'solar': 3,
        'gutter': 2,
        'verge': 2,
        'valley': 2,
        'ridge': 2,
        'vent': 1,
        'length': 2,
        'height': 2,
        'area': 3,
        'none': 0
      };
      
      if (points.length >= (requiredPoints[activeMode] || 0)) {
        if ((activeMode === 'chimney' || activeMode === 'skylight') && points.length === 2) {
          const rectanglePoints = createRectangleFromDiagonalPoints(points[0], points[1]);
          createRoofElementMeasurement(activeMode, rectanglePoints);
        } else {
          createRoofElementMeasurement(activeMode, points);
        }
        toast.success(`${activeMode.charAt(0).toUpperCase() + activeMode.slice(1)}-Messung abgeschlossen`);
      } else {
        toast.error(`Mindestens ${requiredPoints[activeMode]} Punkte werden benötigt.`);
      }
    }
  }, [activeMode, createLengthMeasurement, createHeightMeasurement, createRoofElementMeasurement]);

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
    
    if (currentMode === 'vent' && updatedPoints.length === 1) {
      createRoofElementMeasurement('vent', updatedPoints);
      toast.success('Lüfter/Durchdringung markiert - Messwerkzeug bleibt aktiviert');
      setActiveMode('vent');
      return;
    }
    
    if ((currentMode === 'skylight' || currentMode === 'chimney') && updatedPoints.length === 2) {
      const rectanglePoints = createRectangleFromDiagonalPoints(updatedPoints[0], updatedPoints[1]);
      createRoofElementMeasurement(currentMode, rectanglePoints);
      toast.success(`${currentMode.charAt(0).toUpperCase() + currentMode.slice(1)}-Messung abgeschlossen - Messwerkzeug deaktiviert`);
    }
    
    if (['verge', 'valley', 'ridge'].includes(currentMode) && updatedPoints.length === 2) {
      createRoofElementMeasurement(currentMode as MeasurementMode, updatedPoints);
      toast.success(`${currentMode.charAt(0).toUpperCase() + currentMode.slice(1)}-Messung abgeschlossen - Messwerkzeug deaktiviert`);
    }
  }, [activeMode, editMeasurementId, editingPointIndex, createLengthMeasurement, createHeightMeasurement, createRoofElementMeasurement, updateMeasurementPoint, setEditingPointIndex]);

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
