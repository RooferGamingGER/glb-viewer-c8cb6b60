
import { useCallback } from 'react';
import { Measurement, PVModuleInfo } from '@/types/measurements';
import { DEFAULT_MODULE_VISUALS } from '@/utils/pvModuleRenderer';

interface PVVisualizationOptions {
  showModules?: boolean;
  moduleOpacity?: number;
  showLabels?: boolean;
}

/**
 * Custom hook for handling PV module visualization options
 */
export const usePVModuleVisualization = (
  measurements: Measurement[],
  options: PVVisualizationOptions = { showModules: true, moduleOpacity: 0.9, showLabels: true }
) => {
  // Get all PV related measurements (solar and pvmodule types)
  const pvMeasurements = measurements.filter(
    m => (m.type === 'solar' || m.type === 'pvmodule') && m.pvModuleInfo
  );
  
  // Get total module count across all PV areas
  const getTotalModuleCount = useCallback(() => {
    return pvMeasurements.reduce((total, m) => {
      return total + (m.pvModuleInfo?.moduleCount || 0);
    }, 0);
  }, [pvMeasurements]);
  
  // Get total power in kWp
  const getTotalPowerOutput = useCallback(() => {
    return pvMeasurements.reduce((total, m) => {
      return total + (m.pvModuleInfo?.pvMaterials?.totalPower || 0);
    }, 0);
  }, [pvMeasurements]);
  
  // Get module information for a specific measurement
  const getModuleInfoForMeasurement = useCallback((measurementId: string): PVModuleInfo | null => {
    const measurement = measurements.find(m => m.id === measurementId);
    return measurement?.pvModuleInfo || null;
  }, [measurements]);
  
  // Generate module summary text
  const getPVModuleSummary = useCallback(() => {
    const moduleCount = getTotalModuleCount();
    const powerOutput = getTotalPowerOutput();
    
    if (moduleCount === 0) return 'Keine PV-Module vorhanden';
    
    return `${moduleCount} PV-Module mit ${powerOutput.toFixed(2)} kWp Leistung`;
  }, [getTotalModuleCount, getTotalPowerOutput]);
  
  // Set default visual properties for modules
  const getModuleVisuals = useCallback((measurement: Measurement) => {
    return measurement.pvModuleInfo?.moduleVisuals || DEFAULT_MODULE_VISUALS;
  }, []);
  
  return {
    pvMeasurements,
    hasPVModules: pvMeasurements.length > 0,
    totalModuleCount: getTotalModuleCount(),
    totalPowerOutput: getTotalPowerOutput(),
    getModuleInfoForMeasurement,
    getPVModuleSummary,
    getModuleVisuals
  };
};
