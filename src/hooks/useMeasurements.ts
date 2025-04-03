
import { useCallback, useContext } from 'react';
import { MeasurementContext } from '@/contexts/MeasurementContext';
import { Point, Measurement, MeasurementMode, Segment } from '@/types/measurements';
import { findAndLinkSharedSegments } from '@/utils/measurementCalculations';

// This hook provides access to the measurement context functionality
export const useMeasurements = () => {
  const context = useContext(MeasurementContext);
  
  if (!context) {
    throw new Error('useMeasurements must be used within a MeasurementProvider');
  }
  
  // Add the finalizeWithSharedSegments function - must return a boolean
  const finalizeWithSharedSegments = useCallback(() => {
    // First, call the original finalize
    const newMeasurement = context.finalizeMeasurement();
    
    if (newMeasurement) {
      // After creating a new measurement, check for shared segments
      const measurementsWithSharedSegments = findAndLinkSharedSegments([...context.measurements, newMeasurement]);
      
      // Update the measurements with linked segments
      context.setMeasurements(measurementsWithSharedSegments);
      if (context.updateVisualState) {
        context.updateVisualState(measurementsWithSharedSegments, context.allLabelsVisible);
      }
      
      return true;
    }
    
    return false;
  }, [context]);

  // Add the calculatePVMaterialsForMeasurement function
  const calculatePVMaterialsForMeasurement = useCallback((measurementId: string, inverterDistance: number = 10) => {
    const measurement = context.measurements.find(m => m.id === measurementId);
    
    if (!measurement || !measurement.pvModuleInfo || !measurement.pvModuleInfo.pvModuleSpec) {
      console.error('Cannot calculate materials: measurement or PV module info missing');
      return;
    }
    
    // Simulate calculation in progress
    context.setCalculatingMaterials(true);
    
    // Simulate async calculation
    setTimeout(() => {
      if (!measurement.pvModuleInfo || !measurement.pvModuleInfo.pvModuleSpec) return;
      
      const moduleSpec = measurement.pvModuleInfo.pvModuleSpec;
      const moduleCount = measurement.pvModuleInfo.moduleCount;
      
      // Calculate the materials needed
      const pvMaterials = {
        totalModuleCount: moduleCount,
        totalPower: (moduleCount * moduleSpec.power) / 1000, // kWp
        moduleSpec,
        mountingSystem: {
          railLength: Math.ceil(moduleCount * 4), // 4m of rail per module
          roofHookCount: Math.ceil(moduleCount * 1.5), // 1.5 hooks per module
          middleClampCount: Math.max(0, (moduleCount - 2) * 2), // 2 middle clamps per module except first and last
          endClampCount: 4, // 4 end clamps (2 per side)
          railConnectorCount: Math.floor(moduleCount / 3) // One connector per 3 modules
        },
        electricalSystem: {
          stringCableLength: moduleCount * 2, // 2m of string cable per module
          mainCableLength: 20, // 20m of main cable
          acCableLength: inverterDistance, // User-defined
          connectorPairCount: moduleCount + 2, // module count + 2 for connections
          inverterCount: Math.ceil(moduleCount / 15), // One inverter per 15 modules
          inverterPower: Math.ceil(((moduleCount * moduleSpec.power) / 1000) * 1.1), // 10% oversized
          stringCount: Math.ceil(moduleCount / 15), // One string per 15 modules
          modulesPerString: Math.min(15, moduleCount) // Max 15 modules per string
        },
        includesSurgeProtection: true,
        includesMonitoringSystem: true,
        notes: [
          'Materialliste basiert auf Standardwerten und sollte von einem Fachmann überprüft werden.',
          'Die tatsächliche Anzahl der benötigten Materialien kann je nach Dachbeschaffenheit variieren.'
        ]
      };
      
      // Update the measurement with the new materials
      const updatedMeasurement = {
        ...measurement,
        pvModuleInfo: {
          ...measurement.pvModuleInfo,
          pvMaterials
        }
      };
      
      // Update the measurement in the measurements array
      const updatedMeasurements = context.measurements.map(m => 
        m.id === measurementId ? updatedMeasurement : m
      );
      
      // Update state
      context.setMeasurements(updatedMeasurements);
      context.setCalculatingMaterials(false);
      
      // Update visuals
      if (context.updateVisualState) {
        context.updateVisualState(updatedMeasurements, context.allLabelsVisible);
      }
    }, 1500); // Simulate 1.5s calculation time
    
  }, [context]);

  return {
    ...context,
    finalizeWithSharedSegments,
    calculatePVMaterialsForMeasurement,
    calculatingMaterials: context.calculatingMaterials || false
  };
};

// Create and export a hook for using the measurement context
export const useMeasurementContext = () => {
  const context = useContext(MeasurementContext);
  if (!context) {
    throw new Error("useMeasurementContext must be used within a MeasurementProvider");
  }
  return context;
};

// Re-export the types from the types folder for backward compatibility
export type { Point, Measurement, MeasurementMode, Segment } from '@/types/measurements';
