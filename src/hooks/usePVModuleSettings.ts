
import { useState, useCallback } from 'react';
import { Measurement, PVModuleInfo } from '@/types/measurements';
import { calculatePVModulePlacement, DEFAULT_MODULE_WIDTH, DEFAULT_MODULE_HEIGHT, DEFAULT_EDGE_DISTANCE, DEFAULT_MODULE_SPACING } from '@/utils/pvCalculations';

interface UsePVModuleSettingsReturn {
  // Current settings
  moduleWidth: number;
  moduleHeight: number;
  edgeDistance: number;
  moduleSpacing: number;
  
  // Settings panel state
  isPVSettingsOpen: boolean;
  togglePVSettings: () => void;
  
  // Update functions
  setModuleWidth: (width: number) => void;
  setModuleHeight: (height: number) => void;
  setEdgeDistance: (distance: number) => void;
  setModuleSpacing: (spacing: number) => void;
  
  // Calculate with default or custom settings
  calculatePVWithDefaults: (measurement: Measurement) => PVModuleInfo;
  calculatePVWithCustomSettings: (measurement: Measurement) => PVModuleInfo;
  
  // Reset to defaults
  resetToDefaults: () => void;
}

/**
 * Hook to manage PV module settings
 * @param initialMeasurement Optional measurement to initialize settings from
 */
export const usePVModuleSettings = (initialMeasurement?: Measurement): UsePVModuleSettingsReturn => {
  // Initialize settings from measurement or defaults
  const [moduleWidth, setModuleWidth] = useState<number>(
    initialMeasurement?.pvModuleInfo?.moduleWidth || DEFAULT_MODULE_WIDTH
  );
  
  const [moduleHeight, setModuleHeight] = useState<number>(
    initialMeasurement?.pvModuleInfo?.moduleHeight || DEFAULT_MODULE_HEIGHT
  );
  
  const [edgeDistance, setEdgeDistance] = useState<number>(
    initialMeasurement?.pvModuleInfo?.edgeDistance || DEFAULT_EDGE_DISTANCE
  );
  
  const [moduleSpacing, setModuleSpacing] = useState<number>(
    initialMeasurement?.pvModuleInfo?.moduleSpacing || DEFAULT_MODULE_SPACING
  );
  
  // Settings panel state
  const [isPVSettingsOpen, setIsPVSettingsOpen] = useState<boolean>(false);
  
  const togglePVSettings = useCallback(() => {
    setIsPVSettingsOpen(prev => !prev);
  }, []);
  
  // Calculate PV with default settings
  const calculatePVWithDefaults = useCallback((measurement: Measurement): PVModuleInfo => {
    if (measurement.type !== 'area' || !measurement.points || measurement.points.length < 3) {
      return {
        moduleWidth: DEFAULT_MODULE_WIDTH,
        moduleHeight: DEFAULT_MODULE_HEIGHT,
        moduleCount: 0,
        coveragePercent: 0,
        orientation: 'portrait',
        edgeDistance: DEFAULT_EDGE_DISTANCE,
        moduleSpacing: DEFAULT_MODULE_SPACING
      };
    }
    
    return calculatePVModulePlacement(measurement.points);
  }, []);
  
  // Calculate PV with custom settings
  const calculatePVWithCustomSettings = useCallback((measurement: Measurement): PVModuleInfo => {
    if (measurement.type !== 'area' || !measurement.points || measurement.points.length < 3) {
      return {
        moduleWidth,
        moduleHeight,
        moduleCount: 0,
        coveragePercent: 0,
        orientation: 'portrait',
        edgeDistance,
        moduleSpacing
      };
    }
    
    return calculatePVModulePlacement(
      measurement.points,
      moduleWidth,
      moduleHeight,
      edgeDistance,
      moduleSpacing
    );
  }, [moduleWidth, moduleHeight, edgeDistance, moduleSpacing]);
  
  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    setModuleWidth(DEFAULT_MODULE_WIDTH);
    setModuleHeight(DEFAULT_MODULE_HEIGHT);
    setEdgeDistance(DEFAULT_EDGE_DISTANCE);
    setModuleSpacing(DEFAULT_MODULE_SPACING);
  }, []);
  
  return {
    moduleWidth,
    moduleHeight,
    edgeDistance,
    moduleSpacing,
    isPVSettingsOpen,
    togglePVSettings,
    setModuleWidth,
    setModuleHeight,
    setEdgeDistance,
    setModuleSpacing,
    calculatePVWithDefaults,
    calculatePVWithCustomSettings,
    resetToDefaults
  };
};
