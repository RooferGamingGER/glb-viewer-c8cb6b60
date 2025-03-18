
import { useState, useCallback } from 'react';
import { MeasurementMode, Measurement, Point } from '@/hooks/useMeasurements';
import { toast } from 'sonner';

/**
 * Hook for managing measurement UI state
 */
export const useMeasurementState = (
  measurements: Measurement[],
  currentPoints: Point[],
  activeMode: MeasurementMode,
  editMeasurementId: string | null,
  handlers: {
    toggleMeasurementVisibility: (id: string) => void;
    toggleEditMode: (id: string) => void;
    deleteMeasurement: (id: string) => void;
    deletePoint: (measurementId: string, pointIndex: number) => void;
    updateMeasurement: (id: string, data: Partial<Measurement>) => void;
    finalizeMeasurement: () => void;
    undoLastPoint: () => void;
    clearCurrentPoints: () => void;
    clearMeasurements: () => void;
    cancelEditing: () => void;
    toggleMeasurementTool: (mode: MeasurementMode) => void;
  }
) => {
  const [showTable, setShowTable] = useState<boolean>(false);
  const [segmentsOpen, setSegmentsOpen] = useState<Record<string, boolean>>({});
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);

  // Handler for toggling segment visibility
  const toggleSegments = useCallback((id: string) => {
    setSegmentsOpen(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  }, []);

  // Handler for clearing all measurements with confirmation
  const handleClearMeasurements = useCallback(() => {
    handlers.clearMeasurements();
    toast.info('Alle Messungen gelöscht');
  }, [handlers]);

  // Handler for finalizing a measurement
  const handleFinalizeMeasurement = useCallback(() => {
    if (currentPoints.length >= 3) {
      handlers.finalizeMeasurement();
      
      if (activeMode === 'area') {
        handlers.toggleMeasurementTool('none');
        toast.success('Flächenmessung abgeschlossen - Messwerkzeug deaktiviert');
      } else {
        toast.success('Flächenmessung abgeschlossen');
      }
    } else {
      toast.error('Mindestens 3 Punkte für eine Flächenmessung erforderlich');
    }
  }, [currentPoints.length, handlers, activeMode]);

  // Handler for undoing last point
  const handleUndoLastPoint = useCallback(() => {
    if (handlers.undoLastPoint()) {
      toast.info('Letzter Messpunkt entfernt');
    } else {
      toast.error('Keine Messpunkte zum Entfernen vorhanden');
    }
  }, [handlers]);

  // Handler for canceling editing
  const handleCancelEditing = useCallback(() => {
    handlers.cancelEditing();
    setEditingSegmentId(null);
    toast.info('Bearbeitung abgebrochen');
  }, [handlers]);

  // Handler for starting point edit
  const handleStartPointEdit = useCallback((id: string) => {
    // If we're already editing this measurement, toggle it off
    if (editMeasurementId === id) {
      handlers.cancelEditing();
      toast.info('Punktbearbeitung beendet');
    } else {
      // If we're beginning to edit a new measurement, clean up previous edit state
      if (editMeasurementId) {
        handlers.cancelEditing();
      }
      
      handlers.toggleEditMode(id);
      
      // Different messages based on measurement type
      const measurement = measurements.find(m => m.id === id);
      if (measurement && measurement.type === 'area') {
        toast.info('Klicken Sie auf einen Punkt zum Verschieben oder auf ein "+" Symbol zum Hinzufügen eines Punktes');
      } else {
        toast.info('Klicken Sie auf einen Punkt, um ihn zu verschieben');
      }
    }
  }, [editMeasurementId, handlers, measurements]);

  // Handler for deleting a measurement
  const handleDeleteMeasurement = useCallback((id: string) => {
    handlers.deleteMeasurement(id);
    toast.info('Messung gelöscht');
  }, [handlers]);

  // Handler for deleting a point from an area measurement
  const handleDeletePoint = useCallback((measurementId: string, pointIndex: number) => {
    // Find the measurement
    const measurement = measurements.find(m => m.id === measurementId);
    
    if (!measurement) return;
    
    // Area measurements require at least 3 points
    if (measurement.type === 'area' && measurement.points.length <= 3) {
      toast.error('Flächenmessungen benötigen mindestens 3 Punkte');
      return;
    }
    
    // Delete the point
    handlers.deletePoint(measurementId, pointIndex);
    toast.info(`Punkt ${pointIndex + 1} wurde entfernt`);
  }, [measurements, handlers]);

  return {
    showTable,
    setShowTable,
    segmentsOpen,
    editingSegmentId,
    setEditingSegmentId,
    toggleSegments,
    handleClearMeasurements,
    handleFinalizeMeasurement,
    handleUndoLastPoint,
    handleCancelEditing,
    handleStartPointEdit,
    handleDeleteMeasurement,
    handleDeletePoint
  };
};
