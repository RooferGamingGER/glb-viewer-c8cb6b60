
import { useCallback, useContext } from 'react';
import { MeasurementContext } from '@/contexts/MeasurementContext';
import { Point, Measurement, MeasurementMode, Segment } from '@/types/measurements';

// This hook provides access to the measurement context functionality
export const useMeasurements = () => {
  const context = useContext(MeasurementContext);
  
  if (!context) {
    throw new Error('useMeasurements must be used within a MeasurementProvider');
  }
  
  // Add the finalizeWithSharedSegments function
  const finalizeWithSharedSegments = useCallback(() => {
    // First, call the original finalize
    const newMeasurement = context.finalizeMeasurement();
    
    if (newMeasurement) {
      // After creating a new measurement, check for shared segments
      const measurementsWithSharedSegments = context.findAndLinkSharedSegments([...context.measurements, newMeasurement]);
      
      // Update the measurements with linked segments
      context.setMeasurements(measurementsWithSharedSegments);
      if (context.updateVisualState) {
        context.updateVisualState(measurementsWithSharedSegments, context.allLabelsVisible);
      }
      
      return newMeasurement;
    }
    
    return undefined;
  }, [context]);

  return {
    ...context,
    finalizeWithSharedSegments
  };
};

// Re-export the types from the types folder for backward compatibility
export type { Point, Measurement, MeasurementMode, Segment } from '@/types/measurements';
