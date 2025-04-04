import { useState, useCallback, useRef, useEffect } from 'react';
import { nanoid } from 'nanoid';
import { toast } from 'sonner';
import { 
  MeasurementMode, 
  Point, 
  Measurement,
  Segment,
  PVModuleSpec
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
  calculateCentroid,
  calculatePolygonArea
} from '@/utils/measurementCalculations';
import {
  PV_MODULE_TEMPLATES,
  calculatePVModulePlacement,
  DEFAULT_EDGE_DISTANCE,
  DEFAULT_MODULE_SPACING,
  extractRoofEdgeMeasurements
} from '@/utils/pvCalculations';
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
        labelVisible: allLabelsVisible,
        unit: 'm',
        description: '',
        inclination
      }
    ]);
    
    setCurrentPoints([]);
    currentPointsRef.current = [];
    
    setActiveMode('none');
  }, [allLabelsVisible]);

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
        labelVisible: allLabelsVisible,
        unit: 'm',
        description: ''
      }
    ]);
    
    setCurrentPoints([]);
    currentPointsRef.current = [];
    
    setActiveMode('none');
  }, [allLabelsVisible]);

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
    
    setMeasurements(prev => [
      ...prev,
      {
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
      }
    ]);
    
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
  }, [allLabelsVisible, measurements, setMeasurements, setCurrentPoints, setActiveMode]);

  const createPVPlanningMeasurement = useCallback((points: Point[]) => {
    if (points.length < 4) {
      toast.error("Für die Solarplanung werden mindestens 4 Punkte benötigt.");
      return;
    }
    
    const validation = validatePolygon(points);
    if (!validation.valid) {
      toast.error(validation.message || 'Ungültiges Polygon');
      return;
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
    
    setMeasurements(prev => [
      ...prev,
      {
        id: nanoid(),
        type: 'pvplanning',
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
      }
    ]);
    
    setCurrentPoints([]);
    currentPointsRef.current = [];
    
    setActiveMode('none');
    
    toast.success(`PV-Anlage berechnet: ${moduleInfo.moduleCount} Module (${powerInKWp.toFixed(2)} kWp), ${moduleInfo.coveragePercent.toFixed(1)}% Dachflächennutzung`);
    
    if (roofEdgeInfo.hasAllEdges) {
      if (roofEdgeInfo.isValid === false && roofEdgeInfo.validationMessage) {
        toast.warning(`Hinweis zu Dachkanten: ${roofEdgeInfo.validationMessage}`);
      } else {
        toast.success("Dachkanten (First, Traufe, Ortgang) wurden für präzisere Berechnung verwendet.");
      }
    }
  }, [allLabelsVisible, measurements, setMeasurements, setCurrentPoints, setActiveMode]);

  const handleCalculatePV = (areaPoints: Point[], userDimensions?: {width: number, length: number}) => {
    if (areaPoints.length !== 4) {
      if (areaPoints.length > 4) {
        areaPoints = areaPoints.slice(0, 4);
      }
    }
    
    const roofEdgeInfo = extractRoofEdgeMeasurements(measurements);
    
    const moduleInfo = calculatePVModulePlacement(
      areaPoints,
      undefined,
      undefined,
      DEFAULT_EDGE_DISTANCE,
      DEFAULT_MODULE_SPACING,
      userDimensions,
      roofEdgeInfo
    );
    
    const moduleSpec = PV_MODULE_TEMPLATES[0];
    const powerInKWp = (moduleInfo.moduleCount * moduleSpec.power) / 1000;
    
    return {
      moduleInfo,
      moduleSpec,
      powerOutput: moduleInfo.moduleCount * moduleSpec.power,
      label: `${moduleInfo.moduleCount} Module (${powerInKWp.toFixed(2)} kWp)`
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

  const createPointMeasurement = (point: Point, type: 'vent' | 'hook' | 'other'): {
    value: number;
    position: Point;
    penetrationType: 'vent' | 'hook' | 'other';
  } => {
    return {
      value: 1,
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
        if (points.length !== 4) {
          if (points.length < 4) {
            toast.error("Für PV-Module werden genau 4 Punkte benötigt.");
            return;
          } else {
            points = points.slice(0, 4);
            toast.warning("Nur die ersten 4 Punkte werden für die PV-Modul-Berechnung verwendet.");
          }
        }
        
        const moduleSpec = PV_MODULE_TEMPLATES[0];
        const moduleArea = calculatePolygonArea(points);
        const powerOutput = moduleSpec.power;
        
        measurementData = {
          value: moduleArea,
          label: `${moduleSpec.power}W (${moduleSpec.width.toFixed(2)}m × ${moduleSpec.height.toFixed(2)}m)`,
          pvModuleSpec: moduleSpec,
          powerOutput,
          labelVisible: allLabelsVisible,
          unit: 'W'
        };
        break;
        
      case 'pvplanning':
        createPVPlanningMeasurement(points);
        return; // Early return as we handle this in createPVPlanningMeasurement
        
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
          value: 1,
          label: labels[type as 'vent' | 'hook' | 'other'],
          position: pointData.position,
          count: 1,
          penetrationType: pointData.penetrationType,
          labelVisible: allLabelsVisible
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
        labelVisible: allLabelsVisible,
        unit: type === 'solar' ? 'm²' : 
              type === 'pvmodule' || type === 'pvplanning' ? 'kWp' :
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
  }, [allLabelsVisible, createPVPlanningMeasurement]);

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
  }, [activeMode, editMeasurementId, editingPointIndex, createLengthMeasurement, createHeightMeasurement, createRoofElementMeasurement, createPVModuleMeasurement, updateMeasurementPoint, setEditingPointIndex]);

  const finalizeMeasurement = useCallback((): Measurement | undefined => {
    const points = [...currentPointsRef.current];
    
    if (points.length === 0) return undefined;
    
    let measurement: Measurement | undefined;
    
    if (activeMode === 'length' && points.length >= 2) {
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
      
      measurement = {
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
      
      setMeasurements(prev => [...prev, measurement as Measurement]);
      setCurrentPoints([]);
      currentPointsRef.current = [];
      setActiveMode('none');
      createLengthMeasurement([p1, p2]);
    } 
    else if (activeMode === 'height' && points.length >= 2) {
      const p1 = points[0];
      const p2 = points[1];
      
      const height = calculateHeight(p1, p2);
      const label = formatMeasurement(height, 'height');
      
      measurement = {
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
      
      setMeasurements(prev => [...prev, measurement as Measurement]);
      setCurrentPoints([]);
      currentPointsRef.current = [];
      setActiveMode('none');
      createHeightMeasurement([p1, p2]);
    }
    else if (activeMode === 'area' && points.length >= 3) {
      const validation = validatePolygon(points);
      if (!validation.valid) {
        toast.error(validation.message || 'Ungültiges Polygon');
        return undefined;
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
        
        measurement = {
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
        
        setMeasurements(prev => [...prev, measurement]);
        setCurrentPoints([]);
        currentPointsRef.current = [];
        setActiveMode('none');
      } catch (error) {
        console.error("Error finalizing area measurement:", error);
        toast.error("Fehler bei der Flächenberechnung. Bitte versuchen Sie es mit anderen Punkten.");
        return undefined;
      }
    }
    else if (activeMode === 'solar' && points.length >= 3) {
      const validation = validatePolygon(points);
      if (!validation.valid) {
        toast.error(validation.message || 'Ungültiges Polygon');
        return undefined;
      }
      
      const solarArea = calculateArea(points);
      const segments = generateSegments(points);
      
      measurement = {
        id: nanoid(),
        type: 'solar',
        points: [...points],
        value: solarArea,
        label: formatMeasurement(solarArea, 'area'),
        visible: true,
        labelVisible: allLabelsVisible,
        unit: 'm²',
        description: '',
        segments,
        dimensions: {
          area: solarArea
        }
      };
      
      setMeasurements(prev => [...prev, measurement]);
      setCurrentPoints([]);
      currentPointsRef.current = [];
      setActiveMode('none');
      toast.success(`Solaranlage-Messung abgeschlossen`);
    }
    else if (activeMode === 'pvmodule' && points.length >= 4) {
      const polygonArea = calculateArea(points);
      const moduleInfo = calculatePVModulePlacement(
        points,
        undefined,
        undefined,
        DEFAULT_EDGE_DISTANCE,
        DEFAULT_MODULE_SPACING,
        undefined,
        extractRoofEdgeMeasurements(measurements)
      );
      const moduleSpec = PV_MODULE_TEMPLATES[0];
      
      const powerInKWp = (moduleInfo.moduleCount * moduleSpec.power) / 1000;
      
      measurement = {
        id: nanoid(),
        type: 'pvmodule',
        points: [...points.slice(0, 4)],
        value: polygonArea,
        label: `${moduleInfo.moduleCount} Module (${powerInKWp.toFixed(2)} kWp)`,
        visible: true,
        labelVisible: allLabelsVisible,
        unit: 'kWp',
        description: '',
        pvModuleInfo: moduleInfo,
        pvModuleSpec: moduleSpec,
        powerOutput: moduleInfo.moduleCount * moduleSpec.power
      };
      
      setMeasurements(prev => [...prev, measurement]);
      setCurrentPoints([]);
      currentPointsRef.current = [];
      setActiveMode('none');
    }
    else if (activeMode === 'pvplanning' && points.length >= 4) {
      createPVPlanningMeasurement(points);
      return undefined; // We return undefined here as createPVPlanningMeasurement handles the measurement creation
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
        let measurementData: any = {
          value: 0,
          label: '0 m',
          description: '',
          dimensions: {},
          labelVisible: allLabelsVisible
        };
        
        switch (activeMode) {
          case 'chimney':
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
              
              if (activeMode === 'chimney') {
                measurementData.subType = 'Kaminausschnitt';
              }
            }
            break;
            
          case 'vent':
          case 'hook':
          case 'other':
            const pointData = createPointMeasurement(points[0], activeMode);
            const labels = {
              'vent': 'Lüfter',
              'hook': 'Dachhaken',
              'other': 'Sonstige Einbauten'
            };
            measurementData = {
              value: 1,
              label: labels[activeMode],
              position: pointData.position,
              count: 1,
              penetrationType: pointData.penetrationType,
              labelVisible: allLabelsVisible
            };
            break;
            
          case 'ridge':
          case 'eave':
          case 'verge':
          case 'valley':
          case 'hip':
            const length = calculateDistance(points[0], points[1]);
            measurementData = {
              value: length,
              label: formatMeasurement(length, 'length'),
              labelVisible: allLabelsVisible
            };
            break;
        }
        
        measurement = {
          id: nanoid(),
          type: activeMode,
          points: [...points],
          visible: true,
          labelVisible: allLabelsVisible,
          unit: activeMode === 'vent' || activeMode === 'hook' || activeMode === 'other' ? 'Stk' : 'm',
          ...measurementData
        };
        
        setMeasurements(prev => [...prev, measurement]);
        setCurrentPoints([]);
        currentPointsRef.current = [];
        
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
        
        if (!['vent', 'hook', 'other'].includes(activeMode)) {
          setActiveMode('none');
        }
      } else {
        toast.error(`Mindestens ${requiredPoints[activeMode]} Punkte werden benötigt.`);
        
        if (['skylight', 'chimney', 'pvmodule'].includes(activeMode)) {
          const elementName = activeMode === 'skylight' ? 'Dachfenster' : 
                              activeMode === 'chimney' ? 'Kamin' : 'PV-Modul';
          toast.error(`Für ${elementName} werden genau 4 Punkte benötigt.`);
        }
        return undefined;
      }
    }
    
    return measurement;
  }, [activeMode, allLabelsVisible, createLengthMeasurement, createHeightMeasurement, currentPointsRef, measurements, setActiveMode, setCurrentPoints, setMeasurements]);

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
    
    if (['vent', 'hook', 'other'].includes(activeMode)) {
      setActiveMode('none');
    }
  }, [activeMode]);

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
    createRoofElementMeasurement,
    createPVModuleMeasurement,
    createPVPlanningMeasurement,
    handleCalculatePV
  };
};
