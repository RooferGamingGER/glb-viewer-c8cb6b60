
import { useCallback } from 'react';
import { toast } from 'sonner';
import { Measurement, Point, Segment } from '@/types/measurements';
import { calculateArea, generateSegments } from '@/utils/measurementCalculations';
import { formatMeasurement } from '@/constants/measurements';

/**
 * Hook for managing measurement edit operations
 */
export const useMeasurementEditing = (
  measurements: Measurement[],
  setMeasurements: React.Dispatch<React.SetStateAction<Measurement[]>>,
  editMeasurementId: string | null,
  setEditMeasurementId: React.Dispatch<React.SetStateAction<string | null>>,
  setEditingPointIndex: React.Dispatch<React.SetStateAction<number | null>>
) => {
  // Toggle edit mode for a measurement
  const toggleEditMode = useCallback((id: string) => {
    setMeasurements(prev => {
      const updatedMeasurements = prev.map(m => {
        // Turn off edit mode for all other measurements
        if (m.id !== id) {
          return { ...m, editMode: false };
        }
        // Toggle for the selected measurement
        return { ...m, editMode: !m.editMode };
      });
      
      // If we're turning off edit mode for the current measurement
      const measurement = prev.find(m => m.id === id);
      if (measurement?.editMode) {
        setEditMeasurementId(null);
        setEditingPointIndex(null);
      } else {
        setEditMeasurementId(id);
        setEditingPointIndex(null); // Reset point index when entering edit mode
      }
      
      return updatedMeasurements;
    });
  }, [setMeasurements, setEditMeasurementId, setEditingPointIndex]);

  // Start editing a specific point
  const startPointEdit = useCallback((measurementId: string, pointIndex: number) => {
    setEditMeasurementId(measurementId);
    setEditingPointIndex(pointIndex);
  }, [setEditMeasurementId, setEditingPointIndex]);

  // Update measurement metadata
  const updateMeasurement = useCallback((id: string, data: Partial<Measurement>) => {
    setMeasurements(prev => prev.map(m => {
      if (m.id !== id) return m;
      const updated = { ...m, ...data };
      // Remove keys explicitly set to undefined (e.g. when clearing PV data)
      for (const key of Object.keys(data) as (keyof Measurement)[]) {
        if (data[key] === undefined) {
          delete (updated as any)[key];
        }
      }
      return updated;
    }));
  }, [setMeasurements]);

  // Update a specific segment in a measurement
  const updateSegment = useCallback((measurementId: string, segmentId: string, data: Partial<Segment>) => {
    setMeasurements(prev => prev.map(m => {
      if (m.id !== measurementId || !m.segments) return m;
      
      const updatedSegments = m.segments.map(segment =>
        segment.id === segmentId ? { ...segment, ...data } : segment
      );
      
      return { ...m, segments: updatedSegments };
    }));
  }, [setMeasurements]);

  // Delete a measurement
  const deleteMeasurement = useCallback((id: string) => {
    setMeasurements(prev => prev.filter(m => m.id !== id));
    // Cancel edit mode if the deleted measurement was being edited
    if (editMeasurementId === id) {
      setEditMeasurementId(null);
      setEditingPointIndex(null);
    }
  }, [editMeasurementId, setMeasurements, setEditMeasurementId, setEditingPointIndex]);

  // Delete a point from a measurement
  const deletePoint = useCallback((measurementId: string, pointIndex: number) => {
    setMeasurements(prev => {
      const measurements = [...prev];
      const measurementIndex = measurements.findIndex(m => m.id === measurementId);
      
      if (measurementIndex === -1) return prev;
      
      const measurement = measurements[measurementIndex];
      
      // For area measurements, ensure we maintain at least 3 points
      if (measurement.type === 'area' && measurement.points.length <= 3) {
        toast.error('Eine Flächenmessung benötigt mindestens 3 Punkte.');
        return prev;
      }
      
      // Create a new array of points without the deleted point
      const newPoints = [...measurement.points];
      newPoints.splice(pointIndex, 1);
      
      // Create updated measurement with new points
      const updatedMeasurement = { ...measurement, points: newPoints };
      
      // Recalculate the measurement based on type
      if (measurement.type === 'area') {
        // Recalculate area
        const newValue = calculateArea(newPoints);
        
        // Regenerate segments
        const newSegments = generateSegments(newPoints);
        
        // Setze keine Neigung für Flächenmessungen
        updatedMeasurement.value = newValue;
        updatedMeasurement.label = formatMeasurement(newValue, 'area');
        updatedMeasurement.segments = newSegments;
        updatedMeasurement.inclination = undefined; // Entferne die Neigung explizit
      }
      // We don't need to handle length and height here as they must have exactly 2 points
      
      // Update the measurements array
      measurements[measurementIndex] = updatedMeasurement;
      
      return measurements;
    });
  }, [setMeasurements]);

  // Cancel editing
  const cancelEditing = useCallback(() => {
    setEditMeasurementId(null);
    setEditingPointIndex(null);
    setMeasurements(prev => prev.map(m => ({ ...m, editMode: false })));
  }, [setMeasurements, setEditMeasurementId, setEditingPointIndex]);

  return {
    toggleEditMode,
    startPointEdit,
    updateMeasurement,
    updateSegment,
    deleteMeasurement,
    deletePoint,
    cancelEditing
  };
};
