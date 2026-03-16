
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
  // Get all PV related measurements (legacy solar, pvmodule and area overlays with pvModuleInfo)
  const pvMeasurements = measurements.filter(
    m => (m.type === 'solar' || m.type === 'pvmodule' || m.type === 'area') && !!m.pvModuleInfo
  );
  
  // Get total module count across all PV areas
  const getTotalModuleCount = useCallback(() => {
    return pvMeasurements.reduce((total, m) => {
      return total + (m.pvModuleInfo?.moduleCount || 0);
    }, 0);
  }, [pvMeasurements]);
  
  // Get total power in kWp with proper formatting
  const getTotalPowerOutput = useCallback(() => {
    const totalPower = pvMeasurements.reduce((total, m) => {
      return total + (m.pvModuleInfo?.pvMaterials?.totalPower || 0);
    }, 0);
    
    // Return with 2 decimal places
    return Number(totalPower.toFixed(2));
  }, [pvMeasurements]);
  
  // Get module information for a specific measurement
  const getModuleInfoForMeasurement = useCallback((measurementId: string): PVModuleInfo | null => {
    const measurement = measurements.find(m => m.id === measurementId);
    return measurement?.pvModuleInfo || null;
  }, [measurements]);
  
  // Generate module summary text with proper kWp formatting
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
  
  // Check if all PV modules have generated positions
  const allModulesHavePositions = useCallback(() => {
    return pvMeasurements.every(m => 
      m.pvModuleInfo?.modulePositions && 
      m.pvModuleInfo.modulePositions.length > 0 &&
      m.pvModuleInfo.moduleCorners &&
      m.pvModuleInfo.moduleCorners.length > 0
    );
  }, [pvMeasurements]);
  
  return {
    pvMeasurements,
    hasPVModules: pvMeasurements.length > 0,
    totalModuleCount: getTotalModuleCount(),
    totalPowerOutput: getTotalPowerOutput(),
    getModuleInfoForMeasurement,
    getPVModuleSummary,
    getModuleVisuals,
    allModulesHavePositions
  };
};
