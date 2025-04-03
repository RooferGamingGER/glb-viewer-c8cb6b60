
import { useCallback, useState } from 'react';
import { nanoid } from 'nanoid';
import * as THREE from 'three';
import { 
  Point, 
  Measurement, 
  Segment, 
  MeasurementMode,
  PVModuleInfo,
  PVModuleSpec
} from '@/types/measurements';
import { 
  calculateDistance, 
  calculateHeight, 
  calculateArea,
  calculatePolygonArea,
  generateSegments,
  calculateQuadrilateralDimensions,
  calculateInclination,
  validatePolygon,
  calculateAverageInclination
} from '@/utils/measurementCalculations';
import {
  calculatePVPower,
  calculateAnnualYield,
  PV_MODULE_TEMPLATES,
  calculatePVModulePlacement,
  DEFAULT_EDGE_DISTANCE,
  DEFAULT_MODULE_SPACING,
  extractRoofEdgeMeasurements
} from '@/utils/pvCalculations';

export const useMeasurementCore = () => {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [activeMode, setActiveMode] = useState<MeasurementMode>('none');
  const [editMeasurementId, setEditMeasurementId] = useState<string | null>(null);
  const [editingPointIndex, setEditingPointIndex] = useState<number | null>(null);
  const [allLabelsVisible, setAllLabelsVisible] = useState<boolean>(true);
  const [calculatingMaterials, setCalculatingMaterials] = useState<boolean>(false);

  // Toggle which measurement tool is active
  const toggleMeasurementTool = useCallback((mode: MeasurementMode) => {
    // If the same mode is selected again, turn it off
    if (mode === activeMode) {
      setActiveMode('none');
    } else {
      setActiveMode(mode);
    }
    
    // Clear any current points or editing state
    setCurrentPoints([]);
    setEditMeasurementId(null);
    setEditingPointIndex(null);
  }, [activeMode]);

  // Add a point to the current measurement
  const addPoint = useCallback((point: Point) => {
    setCurrentPoints(prev => [...prev, point]);
  }, []);

  // Undo the last point
  const undoLastPoint = useCallback((): boolean => {
    setCurrentPoints(prev => {
      if (prev.length > 0) {
        return prev.slice(0, -1);
      }
      return prev;
    });
    return true;
  }, []);

  // Clear all current points
  const clearCurrentPoints = useCallback(() => {
    setCurrentPoints([]);
  }, []);

  // Finalize the current measurement
  const finalizeMeasurement = useCallback((): Measurement | undefined => {
    // Need at least 2 points for a measurement
    if (currentPoints.length < 2) {
      return undefined;
    }
    
    // Check if we have enough points based on the measurement type
    if (activeMode === 'area' && currentPoints.length < 3) {
      return undefined;
    }
    
    let value = 0;
    let label = '';
    let name = '';
    
    // Calculate the measurement value based on the type
    if (activeMode === 'length') {
      // For length, calculate distance between first and last point
      value = calculateDistance(currentPoints[0], currentPoints[currentPoints.length - 1]);
      label = `${value.toFixed(2)}m`;
      name = `Länge ${measurements.filter(m => m.type === 'length').length + 1}`;
    } else if (activeMode === 'height') {
      // For height, calculate vertical distance
      value = calculateHeight(currentPoints[0], currentPoints[currentPoints.length - 1]);
      label = `${value.toFixed(2)}m`;
      name = `Höhe ${measurements.filter(m => m.type === 'height').length + 1}`;
    } else if (activeMode === 'area') {
      // For area, calculate the polygon area
      value = calculateArea(currentPoints);
      label = `${value.toFixed(2)}m²`;
      name = `Fläche ${measurements.filter(m => m.type === 'area').length + 1}`;
    } else if (activeMode === 'solar') {
      // For solar, calculate the polygon area
      value = calculateArea(currentPoints);
      label = `${value.toFixed(2)}m²`;
      name = `PV-Anlage ${measurements.filter(m => m.type === 'solar').length + 1}`;
      
      // For solar measurements, also add PV module info
      const dimensions = currentPoints.length === 4 
        ? calculateQuadrilateralDimensions(currentPoints) 
        : { width: 0, length: 0, area: value, perimeter: 0 };
        
      // Initialize PV module info
      const moduleWidth = PV_MODULE_TEMPLATES[0].width;
      const moduleHeight = PV_MODULE_TEMPLATES[0].height;
      
      // Calculate available area
      let availableWidth = dimensions.width - (2 * DEFAULT_EDGE_DISTANCE);
      let availableLength = dimensions.length - (2 * DEFAULT_EDGE_DISTANCE);
      
      if (availableWidth <= 0 || availableLength <= 0) {
        // If dimensions are invalid, use area to estimate
        const estimatedSide = Math.sqrt(dimensions.area);
        availableWidth = estimatedSide - (2 * DEFAULT_EDGE_DISTANCE);
        availableLength = estimatedSide - (2 * DEFAULT_EDGE_DISTANCE);
      }
      
      // Try both orientations
      const portraitColumns = Math.floor((availableWidth + DEFAULT_MODULE_SPACING) / (moduleWidth + DEFAULT_MODULE_SPACING));
      const portraitRows = Math.floor((availableLength + DEFAULT_MODULE_SPACING) / (moduleHeight + DEFAULT_MODULE_SPACING));
      const portraitCount = portraitColumns * portraitRows;
      
      const landscapeColumns = Math.floor((availableWidth + DEFAULT_MODULE_SPACING) / (moduleHeight + DEFAULT_MODULE_SPACING));
      const landscapeRows = Math.floor((availableLength + DEFAULT_MODULE_SPACING) / (moduleWidth + DEFAULT_MODULE_SPACING));
      const landscapeCount = landscapeColumns * landscapeRows;
      
      // Choose better orientation
      const usePortrait = portraitCount >= landscapeCount;
      const moduleCount = usePortrait ? portraitCount : landscapeCount;
      const columns = usePortrait ? portraitColumns : landscapeColumns;
      const rows = usePortrait ? portraitRows : landscapeRows;
      
      // Calculate coverage
      const moduleArea = moduleWidth * moduleHeight * moduleCount;
      const coveragePercent = Math.min((moduleArea / dimensions.area) * 100, 100);
      
      // Create PV module info
      const pvModuleInfo: PVModuleInfo = {
        moduleWidth: usePortrait ? moduleWidth : moduleHeight,
        moduleHeight: usePortrait ? moduleHeight : moduleWidth,
        moduleCount,
        coveragePercent,
        orientation: usePortrait ? 'portrait' : 'landscape',
        columns,
        rows,
        boundingWidth: dimensions.width,
        boundingLength: dimensions.length,
        availableWidth,
        availableLength,
        edgeDistance: DEFAULT_EDGE_DISTANCE,
        moduleSpacing: DEFAULT_MODULE_SPACING,
        actualArea: dimensions.area,
        pvModuleSpec: PV_MODULE_TEMPLATES[0]
      };
      
      // Create the new measurement with PV info
      const newMeasurement: Measurement = {
        id: nanoid(),
        type: activeMode,
        name,
        points: [...currentPoints],
        segments: generateSegments(currentPoints),
        value,
        label,
        visible: true,
        labelVisible: true,
        pvModuleInfo
      };
      
      // Add to measurements list
      setMeasurements(prev => [...prev, newMeasurement]);
      
      // Clear current points
      setCurrentPoints([]);
      
      return newMeasurement;
    } else if (activeMode === 'ridge' || activeMode === 'eave' || activeMode === 'verge' || activeMode === 'valley' || activeMode === 'hip') {
      // For roof elements, calculate the length
      value = calculateDistance(currentPoints[0], currentPoints[currentPoints.length - 1]);
      label = `${value.toFixed(2)}m`;
      
      // Set name based on type
      if (activeMode === 'ridge') {
        name = `First ${measurements.filter(m => m.type === 'ridge').length + 1}`;
      } else if (activeMode === 'eave') {
        name = `Traufe ${measurements.filter(m => m.type === 'eave').length + 1}`;
      } else if (activeMode === 'verge') {
        name = `Ortgang ${measurements.filter(m => m.type === 'verge').length + 1}`;
      } else if (activeMode === 'valley') {
        name = `Kehle ${measurements.filter(m => m.type === 'valley').length + 1}`;
      } else {
        name = `Grat ${measurements.filter(m => m.type === 'hip').length + 1}`;
      }
    }
    
    // Generate segments between consecutive points
    const segments = generateSegments(currentPoints);
    
    // Create the new measurement
    const newMeasurement: Measurement = {
      id: nanoid(),
      type: activeMode,
      name,
      points: [...currentPoints],
      segments,
      value,
      label,
      visible: true,
      labelVisible: true
    };
    
    // Add to measurements list
    setMeasurements(prev => [...prev, newMeasurement]);
    
    // Clear current points
    setCurrentPoints([]);
    
    return newMeasurement;
  }, [activeMode, currentPoints, measurements]);

  return {
    measurements,
    setMeasurements,
    currentPoints,
    setCurrentPoints,
    activeMode,
    setActiveMode,
    editMeasurementId,
    setEditMeasurementId,
    editingPointIndex,
    setEditingPointIndex,
    allLabelsVisible,
    setAllLabelsVisible,
    calculatingMaterials,
    setCalculatingMaterials,
    toggleMeasurementTool,
    addPoint,
    undoLastPoint,
    clearCurrentPoints,
    finalizeMeasurement
  };
};
