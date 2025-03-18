import { useState, useCallback, useEffect } from 'react';
import { Measurement, Point } from '@/types/measurements';
import { calculateQuadrilateralDimensions } from '@/utils/measurementCalculations';

export const useRectangleEditor = (
  measurements: Measurement[],
  setMeasurements: React.Dispatch<React.SetStateAction<Measurement[]>>
) => {
  // Track the measurement being edited as a rectangle
  const [editingRectangleId, setEditingRectangleId] = useState<string | null>(null);
  // Store original points in case we cancel editing
  const [originalPoints, setOriginalPoints] = useState<Point[] | null>(null);

  // Start editing a rectangle
  const startRectangleEdit = useCallback((measurementId: string) => {
    const measurement = measurements.find(m => m.id === measurementId);
    if (!measurement || !measurement.isRectangleMode) return;
    
    // Store original points for potential cancel
    setOriginalPoints([...measurement.points]);
    
    // Update measurement state to editing mode
    setMeasurements(prev => prev.map(m => {
      if (m.id === measurementId) {
        return {
          ...m,
          isEditing: true,
          editMode: true // This will trigger the edit mode UI
        };
      }
      // Ensure no other measurements are in edit mode
      return {
        ...m,
        isEditing: false,
        editMode: false
      };
    }));
    
    setEditingRectangleId(measurementId);
  }, [measurements, setMeasurements]);

  // Update rectangle points
  const updateRectanglePoints = useCallback((
    measurementId: string,
    cornerIndex: number,
    newPoint: Point
  ) => {
    setMeasurements(prev => {
      const measurement = prev.find(m => m.id === measurementId);
      if (!measurement || !measurement.isRectangleMode) return prev;
      
      // Make a copy of points
      const newPoints = [...measurement.points];
      newPoints[cornerIndex] = newPoint;
      
      // Recalculate dimensions
      const dimensions = calculateQuadrilateralDimensions(newPoints);
      
      // Create an updated label based on the type
      let label = '';
      if (measurement.type === 'chimney') {
        label = `${dimensions.width.toFixed(2)} × ${dimensions.length.toFixed(2)} m (Kaminausschnitt)`;
      } else {
        label = `${dimensions.width.toFixed(2)} × ${dimensions.length.toFixed(2)} m`;
      }
      
      // Return updated measurements
      return prev.map(m => {
        if (m.id === measurementId) {
          return {
            ...m,
            points: newPoints,
            rectanglePoints: newPoints,
            value: dimensions.area,
            dimensions: {
              ...m.dimensions,
              width: dimensions.width,
              length: dimensions.length,
              area: dimensions.area,
              perimeter: dimensions.perimeter
            },
            label,
            activeCorner: cornerIndex
          };
        }
        return m;
      });
    });
  }, [setMeasurements]);

  // Finish rectangle editing
  const finishRectangleEdit = useCallback((measurementId: string) => {
    setMeasurements(prev => prev.map(m => {
      if (m.id === measurementId) {
        // We're done editing but keep the updated points
        return {
          ...m,
          isEditing: false,
          editMode: false,
          activeCorner: undefined
        };
      }
      return m;
    }));
    
    setEditingRectangleId(null);
    setOriginalPoints(null);
  }, [setMeasurements]);

  // Cancel rectangle editing (revert to original points)
  const cancelRectangleEdit = useCallback((measurementId: string) => {
    setMeasurements(prev => prev.map(m => {
      if (m.id === measurementId && originalPoints) {
        // Restore original points
        const dimensions = calculateQuadrilateralDimensions(originalPoints);
        
        // Create an updated label based on the type
        let label = '';
        if (m.type === 'chimney') {
          label = `${dimensions.width.toFixed(2)} × ${dimensions.length.toFixed(2)} m (Kaminausschnitt)`;
        } else {
          label = `${dimensions.width.toFixed(2)} × ${dimensions.length.toFixed(2)} m`;
        }
        
        return {
          ...m,
          points: originalPoints,
          rectanglePoints: originalPoints,
          value: dimensions.area,
          dimensions: {
            ...m.dimensions,
            width: dimensions.width,
            length: dimensions.length,
            area: dimensions.area,
            perimeter: dimensions.perimeter
          },
          label,
          isEditing: false,
          editMode: false,
          activeCorner: undefined
        };
      }
      return m;
    }));
    
    setEditingRectangleId(null);
    setOriginalPoints(null);
  }, [setMeasurements, originalPoints]);

  // Make sure we handle the case where the component unmounts during editing
  useEffect(() => {
    return () => {
      // If component unmounts while editing, ensure we clean up
      if (editingRectangleId) {
        setEditingRectangleId(null);
        setOriginalPoints(null);
      }
    };
  }, [editingRectangleId]);

  return {
    editingRectangleId,
    startRectangleEdit,
    updateRectanglePoints,
    finishRectangleEdit,
    cancelRectangleEdit
  };
};
