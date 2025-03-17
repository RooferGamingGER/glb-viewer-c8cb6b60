import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { MeasurementMode } from '@/hooks/useMeasurements';
import * as THREE from 'three';

// Import custom hooks
import { useThreeObjects } from '@/hooks/useThreeObjects';
import { useLabelScaling } from '@/hooks/useLabelScaling';
import { useMeasurementInteraction } from '@/hooks/useMeasurementInteraction';
import { useMeasurements } from '@/hooks/useMeasurements';

// Import visualization utilities
import { 
  renderCurrentPoints, 
  renderEditPoints, 
  renderMeasurements,
  clearAllVisuals,
  clearMeasurementLabels
} from '@/utils/measurementVisuals';

// Import the sidebar component
import MeasurementSidebar from './measurement/MeasurementSidebar';

interface MeasurementToolsProps {
  enabled: boolean;
  scene: THREE.Scene;
  camera: THREE.Camera;
  autoOpenSidebar?: boolean;
}

const MeasurementTools: React.FC<MeasurementToolsProps> = ({ 
  enabled,
  scene,
  camera,
  autoOpenSidebar = false
}) => {
  const [segmentsOpen, setSegmentsOpen] = useState<Record<string, boolean>>({});
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);

  const { 
    measurements,
    currentPoints,
    addPoint,
    activeMode,
    toggleMeasurementTool,
    clearMeasurements,
    clearCurrentPoints,
    finalizeMeasurement,
    toggleMeasurementVisibility,
    toggleEditMode,
    updateMeasurement,
    deleteMeasurement,
    deletePoint,
    undoLastPoint,
    editMeasurementId,
    editingPointIndex,
    startPointEdit,
    cancelEditing,
    updateMeasurementPoint
  } = useMeasurements();

  const {
    pointsRef,
    linesRef,
    measurementsRef,
    editPointsRef,
    labelsRef,
    segmentLabelsRef
  } = useThreeObjects(scene, enabled);

  const interactionHandlers = {
    addPoint,
    startPointEdit,
    updateMeasurementPoint
  };

  const { 
    movingPointInfo, 
    setMovingPointInfo, 
    clearPreviewGroup,
    clearAddPointIndicators 
  } = useMeasurementInteraction(
    enabled,
    scene,
    camera,
    true, // Always open
    {
      pointsRef,
      linesRef,
      measurementsRef,
      editPointsRef,
      labelsRef,
      segmentLabelsRef
    },
    measurements,
    currentPoints,
    activeMode,
    interactionHandlers,
    editMeasurementId,
    editingPointIndex
  );

  useLabelScaling(camera, labelsRef, segmentLabelsRef);

  // Improved effect to manage label visibility on edit mode and measurement visibility toggling
  useEffect(() => {
    if (!labelsRef.current || !segmentLabelsRef.current) return;
    
    // Determine if we're in any edit mode (measurement edit, segment edit, or point moving)
    const isEditing = editMeasurementId !== null || movingPointInfo !== null || editingSegmentId !== null;
    
    // Process all labels in both groups
    const processLabel = (label: THREE.Object3D, isSegmentLabel = false) => {
      if (!label.userData) return;
      
      // Preview labels are always visible
      if (label.userData.isPreview) {
        label.visible = true;
        return;
      }
      
      // During editing, hide all non-preview labels
      if (isEditing) {
        label.visible = false;
        return;
      }
      
      // When not editing, set visibility based on the measurement's visibility state
      const measurementId = label.userData.measurementId;
      if (measurementId) {
        const measurement = measurements.find(m => m.id === measurementId);
        // Only show label if measurement exists and is visible
        label.visible = measurement?.visible !== false;
      } else {
        // If no measurement ID, default to visible
        label.visible = true;
      }
    };
    
    // Process main labels
    labelsRef.current.children.forEach(label => {
      processLabel(label);
    });
    
    // Process segment labels
    segmentLabelsRef.current.children.forEach(label => {
      processLabel(label, true);
    });
    
  }, [editMeasurementId, movingPointInfo, editingSegmentId, measurements]);

  // Clean up labels when editing starts and re-render when editing is complete
  useEffect(() => {
    if ((editMeasurementId === null && !movingPointInfo) || !enabled) {
      // When editing is complete, re-render all measurements to ensure labels are updated
      renderMeasurements(
        measurementsRef.current, 
        labelsRef.current, 
        segmentLabelsRef.current, 
        measurements, 
        true
      );
    }
  }, [editMeasurementId, movingPointInfo, measurements, enabled, measurementsRef, labelsRef, segmentLabelsRef]);

  // Re-render measurements when they change
  useEffect(() => {
    renderMeasurements(
      measurementsRef.current, 
      labelsRef.current, 
      segmentLabelsRef.current, 
      measurements, 
      true
    );
  }, [measurements]);

  // Re-render current points when they change
  useEffect(() => {
    renderCurrentPoints(
      pointsRef.current, 
      linesRef.current, 
      labelsRef.current, 
      currentPoints, 
      activeMode
    );
  }, [currentPoints, activeMode]);

  // Re-render edit points when edit state changes
  useEffect(() => {
    renderEditPoints(
      editPointsRef.current, 
      measurements, 
      editMeasurementId, 
      editingPointIndex, 
      true
    );
  }, [measurements, editMeasurementId, editingPointIndex]);

  // Clean up when enabled state changes
  useEffect(() => {
    if (!enabled) {
      clearAllVisuals(
        pointsRef.current,
        linesRef.current,
        measurementsRef.current,
        editPointsRef.current,
        labelsRef.current,
        segmentLabelsRef.current
      );
      
      // Also clear any preview visuals
      if (clearPreviewGroup) {
        clearPreviewGroup();
      }
      
      if (clearAddPointIndicators) {
        clearAddPointIndicators();
      }
    } else {
      renderMeasurements(
        measurementsRef.current, 
        labelsRef.current, 
        segmentLabelsRef.current, 
        measurements, 
        true
      );
      
      renderEditPoints(
        editPointsRef.current, 
        measurements, 
        editMeasurementId, 
        editingPointIndex, 
        true
      );
    }
  }, [enabled, measurements, editMeasurementId, editingPointIndex, clearPreviewGroup, clearAddPointIndicators]);

  // Enhanced functionality to properly handle label visibility during measurement visibility toggle
  const handleToggleMeasurementVisibility = (id: string) => {
    toggleMeasurementVisibility(id);
    
    // Find the measurement to get its new visibility state
    setTimeout(() => {
      const measurement = measurements.find(m => m.id === id);
      if (!measurement) return;
      
      // Update all visual elements for this measurement
      const isVisible = measurement.visible !== false;
      
      // Update measurement geometries visibility
      if (measurementsRef.current) {
        measurementsRef.current.children.forEach(obj => {
          if (obj.userData && obj.userData.measurementId === id) {
            obj.visible = isVisible;
          }
        });
      }
      
      // Update main label visibility
      if (labelsRef.current) {
        labelsRef.current.children.forEach(label => {
          if (label.userData && label.userData.measurementId === id) {
            // Only update if not in edit mode
            if (!editMeasurementId && !movingPointInfo && !editingSegmentId) {
              label.visible = isVisible;
            }
          }
        });
      }
      
      // Update segment label visibility
      if (segmentLabelsRef.current) {
        segmentLabelsRef.current.children.forEach(label => {
          if (label.userData && label.userData.measurementId === id) {
            // Only update if not in edit mode
            if (!editMeasurementId && !movingPointInfo && !editingSegmentId) {
              label.visible = isVisible;
            }
          }
        });
      }
      
      // Update points visibility
      if (pointsRef.current) {
        pointsRef.current.children.forEach(point => {
          if (point.userData && point.userData.measurementId === id) {
            point.visible = isVisible;
          }
        });
      }
      
      // Update lines visibility
      if (linesRef.current) {
        linesRef.current.children.forEach(line => {
          if (line.userData && line.userData.measurementId === id) {
            line.visible = isVisible;
          }
        });
      }
    }, 0);
  };

  // ... keep existing code (handleDeleteMeasurement)
  const handleDeleteMeasurement = (id: string) => {
    const measurementToDelete = measurements.find(m => m.id === id);
    if (measurementToDelete) {
      clearMeasurementVisuals(
        id,
        measurementsRef.current,
        labelsRef.current,
        segmentLabelsRef.current
      );
    }
    
    deleteMeasurement(id);
    toast.info('Messung gelöscht');
  };

  // ... keep existing code (handleDeletePoint)
  const handleDeletePoint = (measurementId: string, pointIndex: number) => {
    // Find the measurement
    const measurement = measurements.find(m => m.id === measurementId);
    
    if (!measurement) return;
    
    // Area measurements need at least 3 points
    if (measurement.type === 'area' && measurement.points.length <= 3) {
      toast.error('Flächenmessungen benötigen mindestens 3 Punkte');
      return;
    }
    
    // Call the delete point function
    deletePoint(measurementId, pointIndex);
    
    // Clear visuals to avoid stale references
    clearMeasurementVisuals(
      measurementId,
      measurementsRef.current,
      labelsRef.current,
      segmentLabelsRef.current
    );
    
    // Re-render measurements to update the visuals
    setTimeout(() => {
      renderMeasurements(
        measurementsRef.current, 
        labelsRef.current, 
        segmentLabelsRef.current, 
        measurements, 
        true
      );
      
      renderEditPoints(
        editPointsRef.current, 
        measurements, 
        editMeasurementId, 
        editingPointIndex, 
        true
      );
    }, 0);
    
    toast.info(`Punkt ${pointIndex + 1} wurde entfernt`);
  };
  
  // ... keep existing code (clearMeasurementVisuals)
  const clearMeasurementVisuals = (
    measurementId: string,
    measurementsGroup: THREE.Group | null,
    labelsGroup: THREE.Group | null,
    segmentLabelsGroup: THREE.Group | null
  ) => {
    if (!measurementsGroup || !labelsGroup || !segmentLabelsGroup) return;
    
    const measurementObjects = measurementsGroup.children.filter(obj => 
      obj.userData && obj.userData.measurementId === measurementId
    );
    measurementObjects.forEach(obj => {
      if ('geometry' in obj && (obj as THREE.Mesh).geometry) {
        ((obj as THREE.Mesh).geometry as THREE.BufferGeometry).dispose();
      }
      
      if ('material' in obj && (obj as THREE.Mesh).material) {
        if (Array.isArray((obj as THREE.Mesh).material)) {
          ((obj as THREE.Mesh).material as THREE.Material[]).forEach(mat => mat.dispose());
        } else {
          ((obj as THREE.Mesh).material as THREE.Material).dispose();
        }
      }
      
      measurementsGroup.remove(obj);
    });
    
    // Remove labels
    clearMeasurementLabels(measurementId, labelsGroup, segmentLabelsGroup);
  };

  // Improved handling of point edit start/end
  const handleStartPointEdit = (id: string) => {
    // If we're already editing this measurement, toggle off
    if (editMeasurementId === id) {
      cancelEditing();
      toast.info('Punktbearbeitung beendet');
    } else {
      // If we're starting to edit a new measurement, clear any existing editing state
      if (editMeasurementId) {
        cancelEditing();
      }
      
      toggleEditMode(id);
      
      // Different messages based on measurement type
      const measurement = measurements.find(m => m.id === id);
      if (measurement && measurement.type === 'area') {
        toast.info('Klicken Sie auf einen Punkt zum Verschieben oder auf ein "+" Symbol zum Hinzufügen eines Punktes');
      } else {
        toast.info('Klicken Sie auf einen Punkt, um ihn zu verschieben');
      }
      
      // Hide ALL measurement labels during editing - both main and segment labels
      if (labelsRef.current) {
        labelsRef.current.children.forEach(label => {
          if (!label.userData.isPreview) {
            label.visible = false;
          }
        });
      }
      
      if (segmentLabelsRef.current) {
        segmentLabelsRef.current.children.forEach(label => {
          label.visible = false;
        });
      }
    }
  };

  // ... keep existing code (handleCancelEditing)
  const handleCancelEditing = () => {
    cancelEditing();
    setEditingSegmentId(null);
    setMovingPointInfo(null);
    
    // Clear any preview visuals
    if (clearPreviewGroup) {
      clearPreviewGroup();
    }
    
    if (clearAddPointIndicators) {
      clearAddPointIndicators();
    }
    
    // Re-render measurements to ensure labels are properly displayed
    setTimeout(() => {
      renderMeasurements(
        measurementsRef.current, 
        labelsRef.current, 
        segmentLabelsRef.current, 
        measurements, 
        true
      );
    }, 10);
    
    toast.info('Bearbeitung abgebrochen');
  };

  // ... keep existing code (handleFinalizeMeasurement and handleUndoLastPoint)
  const handleFinalizeMeasurement = () => {
    if (currentPoints.length >= 3) {
      finalizeMeasurement();
      
      if (activeMode === 'area') {
        toggleMeasurementTool('none');
        toast.success('Flächenmessung abgeschlossen - Messwerkzeug deaktiviert');
      } else {
        toast.success('Flächenmessung abgeschlossen');
      }
    } else {
      toast.error('Mindestens 3 Punkte für eine Flächenmessung erforderlich');
    }
  };

  const handleUndoLastPoint = () => {
    if (undoLastPoint()) {
      toast.info('Letzter Messpunkt entfernt');
    } else {
      toast.error('Keine Messpunkte zum Entfernen vorhanden');
    }
  };

  // Enhanced clear measurements to ensure all labels are removed
  const handleClearMeasurements = () => {
    clearMeasurements();
    
    // Thoroughly clear all visuals
    clearAllVisuals(
      pointsRef.current,
      linesRef.current,
      measurementsRef.current,
      editPointsRef.current,
      labelsRef.current,
      segmentLabelsRef.current
    );
    
    // Also clear any preview visuals
    if (clearPreviewGroup) {
      clearPreviewGroup();
    }
    
    if (clearAddPointIndicators) {
      clearAddPointIndicators();
    }
    
    toast.info('Alle Messungen gelöscht');
  };

  const toggleSegments = (id: string) => {
    setSegmentsOpen(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      <div className="w-full h-full">
        <MeasurementSidebar
          enabled={enabled}
          measurements={measurements}
          currentPoints={currentPoints}
          activeMode={activeMode}
          toggleMeasurementTool={toggleMeasurementTool}
          toggleMeasurementVisibility={handleToggleMeasurementVisibility}
          handleStartPointEdit={handleStartPointEdit}
          handleDeleteMeasurement={handleDeleteMeasurement}
          handleDeletePoint={handleDeletePoint}
          updateMeasurement={updateMeasurement}
          editMeasurementId={editMeasurementId}
          editingSegmentId={editingSegmentId}
          handleCancelEditing={handleCancelEditing}
          segmentsOpen={segmentsOpen}
          toggleSegments={toggleSegments}
          setEditingSegmentId={setEditingSegmentId}
          movingPointInfo={movingPointInfo}
          handleFinalizeMeasurement={handleFinalizeMeasurement}
          handleUndoLastPoint={handleUndoLastPoint}
          clearCurrentPoints={clearCurrentPoints}
          handleClearMeasurements={handleClearMeasurements}
        />
      </div>
    </div>
  );
};

export default MeasurementTools;
