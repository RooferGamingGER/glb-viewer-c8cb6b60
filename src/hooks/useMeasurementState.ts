
import { useState, useCallback } from 'react';
import { MeasurementMode, Measurement, Point } from '@/types/measurements';
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
    undoLastPoint: () => boolean;
    clearCurrentPoints: () => void;
    clearMeasurements: () => void;
    cancelEditing: () => void;
    toggleMeasurementTool: (mode: MeasurementMode) => void;
    moveMeasurementUp?: (id: string) => void;
    moveMeasurementDown?: (id: string) => void;
  }
) => {
  const [showTable, setShowTable] = useState<boolean>(false);
  const [segmentsOpen, setSegmentsOpen] = useState<Record<string, boolean>>({});
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [moduleVisualsDetailLevel, setModuleVisualsDetailLevel] = useState<'simple' | 'detailed'>('detailed');
  const [selectedModuleIndex, setSelectedModuleIndex] = useState<number | null>(null);
  const [selectedMeasurementId, setSelectedMeasurementId] = useState<string | null>(null);

  // Handler for toggling segment visibility
  const toggleSegments = useCallback((id: string) => {
    setSegmentsOpen(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  }, []);

  // Handler for toggling PV module visual detail level
  const toggleModuleVisualsDetailLevel = useCallback(() => {
    setModuleVisualsDetailLevel(prev => prev === 'simple' ? 'detailed' : 'simple');
    toast.info(`PV-Modul Darstellung: ${moduleVisualsDetailLevel === 'simple' ? 'Detailliert' : 'Einfach'}`);
  }, [moduleVisualsDetailLevel]);

  // Handler for selecting a PV module
  const handleSelectModule = useCallback((measurementId: string, moduleIndex: number) => {
    if (selectedMeasurementId === measurementId && selectedModuleIndex === moduleIndex) {
      // Deselect if clicking on the same module
      setSelectedModuleIndex(null);
      setSelectedMeasurementId(null);
      toast.info('Modul-Auswahl aufgehoben');
    } else {
      // Select the new module
      setSelectedModuleIndex(moduleIndex);
      setSelectedMeasurementId(measurementId);
      
      const measurement = measurements.find(m => m.id === measurementId);
      if (measurement?.pvModuleInfo) {
        toast.info(`Modul ${moduleIndex + 1} ausgewählt`);
      }
    }
  }, [selectedModuleIndex, selectedMeasurementId, measurements]);

  // Handler for deleting a selected PV module
  const handleDeleteModule = useCallback(() => {
    if (!selectedMeasurementId || selectedModuleIndex === null) {
      toast.error('Kein Modul zum Löschen ausgewählt');
      return;
    }

    const measurement = measurements.find(m => m.id === selectedMeasurementId);
    if (!measurement || !measurement.pvModuleInfo) {
      toast.error('Modul konnte nicht gefunden werden');
      return;
    }

    // Get current module positions
    const modulePositions = measurement.pvModuleInfo.modulePositions || [];
    if (!modulePositions.length || selectedModuleIndex >= modulePositions.length) {
      toast.error('Ungültiger Modulindex');
      return;
    }

    // Remove the module from positions
    const updatedModulePositions = modulePositions.filter((_, index) => index !== selectedModuleIndex);
    
    // Remove the module corners if they exist
    const moduleCorners = measurement.pvModuleInfo.moduleCorners || [];
    const updatedModuleCorners = moduleCorners.filter((_, index) => index !== selectedModuleIndex);

    // Update the module count and other related values
    const updatedPvModuleInfo = {
      ...measurement.pvModuleInfo,
      modulePositions: updatedModulePositions,
      moduleCorners: updatedModuleCorners,
      moduleCount: updatedModulePositions.length,
      // Recalculate coverage percentage based on new module count
      coveragePercent: updatedModulePositions.length > 0 
        ? (updatedModulePositions.length * measurement.pvModuleInfo.moduleWidth * measurement.pvModuleInfo.moduleHeight) / 
          (measurement.pvModuleInfo.actualArea || 1) * 100 
        : 0
    };

    // Update the measurement
    handlers.updateMeasurement(selectedMeasurementId, {
      pvModuleInfo: updatedPvModuleInfo
    });

    // Reset selection
    setSelectedModuleIndex(null);
    setSelectedMeasurementId(null);
    toast.success(`Modul erfolgreich entfernt. Neue Anzahl: ${updatedModulePositions.length}`);
  }, [selectedMeasurementId, selectedModuleIndex, measurements, handlers]);

  // Handler for clearing all measurements with confirmation
  const handleClearMeasurements = useCallback(() => {
    handlers.clearMeasurements();
    toast.info('Alle Messungen gelöscht');
  }, [handlers]);

  // Handler for finalizing a measurement
  const handleFinalizeMeasurement = useCallback(() => {
    if (activeMode === 'area') {
      if (currentPoints.length < 3) {
        toast.error('Mindestens 3 Punkte für eine Flächenmessung erforderlich');
        return;
      }
      
      handlers.finalizeMeasurement();
      handlers.toggleMeasurementTool('none');
    } 
    else if (activeMode === 'solar') {
      if (currentPoints.length < 3) {
        toast.error('Mindestens 3 Punkte für eine Solaranlage erforderlich');
        return;
      }
      
      handlers.finalizeMeasurement();
      handlers.toggleMeasurementTool('none');
    }
    else {
      handlers.finalizeMeasurement();
    }
  }, [currentPoints.length, handlers, activeMode]);

  // Handler for undoing last point
  const handleUndoLastPoint = useCallback(() => {
    const pointRemoved = handlers.undoLastPoint();
    if (pointRemoved) {
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

  // Handler for moving a measurement up in the list
  const handleMoveMeasurementUp = useCallback((id: string) => {
    if (handlers.moveMeasurementUp) {
      handlers.moveMeasurementUp(id);
    }
  }, [handlers]);

  // Handler for moving a measurement down in the list
  const handleMoveMeasurementDown = useCallback((id: string) => {
    if (handlers.moveMeasurementDown) {
      handlers.moveMeasurementDown(id);
    }
  }, [handlers]);

  // Handler for updating PV module visuals
  const handleUpdateModuleVisuals = useCallback((id: string, visuals: any) => {
    const measurement = measurements.find(m => m.id === id);
    if (!measurement || !measurement.pvModuleInfo) return;
    
    handlers.updateMeasurement(id, {
      pvModuleInfo: {
        ...measurement.pvModuleInfo,
        moduleVisuals: {
          ...measurement.pvModuleInfo.moduleVisuals,
          ...visuals
        }
      }
    });
    
    toast.info('PV-Modul Darstellung aktualisiert');
  }, [measurements, handlers]);

  return {
    showTable,
    setShowTable,
    segmentsOpen,
    editingSegmentId,
    setEditingSegmentId,
    moduleVisualsDetailLevel,
    toggleModuleVisualsDetailLevel,
    toggleSegments,
    handleClearMeasurements,
    handleFinalizeMeasurement,
    handleUndoLastPoint,
    handleCancelEditing,
    handleStartPointEdit,
    handleDeleteMeasurement,
    handleDeletePoint,
    handleMoveMeasurementUp,
    handleMoveMeasurementDown,
    handleUpdateModuleVisuals,
    // New module selection and deletion handlers
    selectedModuleIndex,
    selectedMeasurementId,
    handleSelectModule,
    handleDeleteModule,
    setSelectedModuleIndex,
    setSelectedMeasurementId
  };
};
