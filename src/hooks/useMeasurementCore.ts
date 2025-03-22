
import { useState, useCallback } from 'react';
import { nanoid } from 'nanoid';
import { MeasurementMode, Point, Measurement, PVModuleInfo } from '@/types/measurements';
import { calculatePolygonArea, calculateSegmentLength } from '@/utils/measurementCalculations';
import { calculatePVModulePlacement, PV_MODULE_TEMPLATES, DEFAULT_EDGE_DISTANCE, DEFAULT_MODULE_SPACING } from '@/utils/pvCalculations';
import { createRoofEdgeMeasurements } from '@/utils/roofEdgeDetection';

/**
 * Core hook for measurement state management
 */
export const useMeasurementCore = () => {
  // State for measurements and current drawing operation
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [activeMode, setActiveMode] = useState<MeasurementMode>('none');
  
  // Visibility states
  const [allMeasurementsVisible, setAllMeasurementsVisible] = useState(true);
  const [allLabelsVisible, setAllLabelsVisible] = useState(true);
  
  // Editing states
  const [editMeasurementId, setEditMeasurementId] = useState<string | null>(null);
  const [editingPointIndex, setEditingPointIndex] = useState<number | null>(null);

  // Add a point to the current measurement
  const addPoint = useCallback((point: Point) => {
    setCurrentPoints(prevPoints => [...prevPoints, point]);
  }, []);

  // Undo the last added point
  const undoLastPoint = useCallback(() => {
    setCurrentPoints(prevPoints => {
      if (prevPoints.length === 0) return prevPoints;
      return prevPoints.slice(0, -1);
    });
  }, []);

  // Update a point in an existing measurement
  const updateMeasurementPoint = useCallback((measurementId: string, pointIndex: number, newPoint: Point) => {
    setMeasurements(prevMeasurements => {
      return prevMeasurements.map(measurement => {
        if (measurement.id === measurementId) {
          // Create a new array of points with the updated point
          const updatedPoints = [...measurement.points];
          updatedPoints[pointIndex] = newPoint;
          
          // Calculate new value based on measurement type
          let newValue = measurement.value;
          if (measurement.type === 'length' || measurement.type === 'height') {
            // For length measurements, update the distance
            if (updatedPoints.length === 2) {
              newValue = calculateSegmentLength(updatedPoints[0], updatedPoints[1]);
            }
          } else if (measurement.type === 'area' || measurement.type === 'solar') {
            // For area measurements, update the area
            if (updatedPoints.length >= 3) {
              newValue = calculatePolygonArea(updatedPoints);
            }
          }
          
          // Create updated segments if needed
          let updatedSegments = measurement.segments;
          if (measurement.segments) {
            // Recalculate segments if they exist
            // This is a simplified placeholder - would need real segment recalculation logic
          }
          
          // Update label text
          let label = measurement.label || '';
          if (measurement.type === 'length' || measurement.type === 'height') {
            label = `${measurement.type === 'length' ? 'Length' : 'Height'}: ${newValue.toFixed(2)} m`;
          } else if (measurement.type === 'area' || measurement.type === 'solar') {
            label = `${measurement.type === 'area' ? 'Area' : 'Solar Area'}: ${newValue.toFixed(2)} m²`;
          }
          
          return {
            ...measurement,
            points: updatedPoints,
            value: newValue,
            label,
            segments: updatedSegments
          };
        }
        return measurement;
      });
    });
  }, []);

  // Create a measurement from current points
  const finalizeMeasurement = useCallback(() => {
    if (currentPoints.length === 0) return;
    
    // Create different measurement types based on active mode
    if (activeMode === 'length' || activeMode === 'height') {
      // Need at least 2 points for length/height
      if (currentPoints.length < 2) return;
      
      const distance = calculateSegmentLength(currentPoints[0], currentPoints[1]);
      const newMeasurement: Measurement = {
        id: nanoid(),
        type: activeMode,
        points: [...currentPoints],
        value: distance,
        label: `${activeMode === 'length' ? 'Length' : 'Height'}: ${distance.toFixed(2)} m`,
        visible: true,
        labelVisible: true,
        unit: 'm'
      };
      
      setMeasurements(prev => [...prev, newMeasurement]);
    } 
    else if (activeMode === 'area' || activeMode === 'solar') {
      // Need at least 3 points for an area
      if (currentPoints.length < 3) return;
      
      const polygonArea = calculatePolygonArea(currentPoints);
      const newMeasurement: Measurement = {
        id: nanoid(),
        type: activeMode,
        points: [...currentPoints],
        value: polygonArea,
        label: `${activeMode === 'area' ? 'Area' : 'Solar Area'}: ${polygonArea.toFixed(2)} m²`,
        visible: true,
        labelVisible: true,
        unit: 'm²'
      };
      
      // Create and add the new area measurement
      const newMeasurements = [newMeasurement];
      
      // Detect and create roof edge measurements (ridge, eave, verge)
      // These will be invisible by default
      const edgeMeasurements = createRoofEdgeMeasurements(currentPoints, newMeasurement.id);
      
      // Add the edge measurements to our list of new measurements
      newMeasurements.push(...edgeMeasurements);
      
      // Add all the new measurements
      setMeasurements(prev => [...prev, ...newMeasurements]);
    }
    else if (activeMode === 'chimney' || activeMode === 'skylight' || 
            activeMode === 'vent' || activeMode === 'hook' || 
            activeMode === 'other') {
      // Roof element measurements
      if (currentPoints.length < 3) return;
      
      const elementArea = calculatePolygonArea(currentPoints);
      const newMeasurement: Measurement = {
        id: nanoid(),
        type: activeMode,
        points: [...currentPoints],
        value: elementArea,
        label: `${activeMode}: ${elementArea.toFixed(2)} m²`,
        visible: true,
        labelVisible: true,
        unit: 'm²',
        dimensions: {
          area: elementArea,
          // Additional dimensions could be calculated here
        }
      };
      
      setMeasurements(prev => [...prev, newMeasurement]);
    }
    else if (activeMode === 'pvmodule') {
      // Individual PV Module drawing
      if (currentPoints.length < 3) return;
      
      const moduleArea = calculatePolygonArea(currentPoints);
      const moduleSpec = PV_MODULE_TEMPLATES[0]; // Default to first module template
      const powerOutput = moduleSpec.power; // Default power output
      
      const newMeasurement: Measurement = {
        id: nanoid(),
        type: activeMode,
        points: [...currentPoints],
        value: moduleArea,
        label: `PV Module: ${powerOutput}W`,
        visible: true,
        labelVisible: true,
        unit: 'W',
        pvModuleSpec: moduleSpec,
        powerOutput
      };
      
      setMeasurements(prev => [...prev, newMeasurement]);
    }
    
    // Clear current points after creating measurement
    setCurrentPoints([]);
  }, [activeMode, currentPoints]);

  // Clear all points in the current drawing
  const clearCurrentPoints = useCallback(() => {
    setCurrentPoints([]);
  }, []);

  // Clear all measurements
  const clearMeasurements = useCallback(() => {
    setMeasurements([]);
  }, []);

  // Update handleCalculatePV function to accept measurements and areaId
  const handleCalculatePV = useCallback((
    areaPoints: Point[], 
    userDimensions?: {width: number, length: number},
    allMeasurements?: Measurement[],
    areaId?: string
  ) => {
    if (areaPoints.length !== 4) {
      if (areaPoints.length > 4) {
        areaPoints = areaPoints.slice(0, 4);
      }
    }
    
    const moduleInfo = calculatePVModulePlacement(
      areaPoints,
      undefined,
      undefined,
      DEFAULT_EDGE_DISTANCE,
      DEFAULT_MODULE_SPACING,
      userDimensions,
      allMeasurements,
      areaId
    );
    
    const moduleSpec = PV_MODULE_TEMPLATES[0];
    const powerInKWp = (moduleInfo.moduleCount * moduleSpec.power) / 1000;
    
    return {
      moduleInfo,
      moduleSpec,
      powerOutput: moduleInfo.moduleCount * moduleSpec.power,
      label: `${moduleInfo.moduleCount} Module (${powerInKWp.toFixed(2)} kWp)`
    };
  }, []);

  return {
    measurements,
    setMeasurements,
    currentPoints,
    setCurrentPoints,
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
    handleCalculatePV
  };
};
