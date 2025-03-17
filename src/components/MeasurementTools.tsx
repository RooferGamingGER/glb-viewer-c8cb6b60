
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

  // Verbesserte Behandlung der Label-Sichtbarkeit
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

  // Verbesserte Funktion für Sichtbarkeits-Toggle 
  const handleToggleMeasurementVisibility = (id: string) => {
    // Zuerst den Zustand aktualisieren
    toggleMeasurementVisibility(id);
    
    // Finde die Messung, um ihren neuen Sichtbarkeits-Zustand zu erhalten
    const measurement = measurements.find(m => m.id === id);
    if (!measurement) return;
    
    // Bestimme den neuen Sichtbarkeits-Zustand
    const isVisible = measurement.visible !== false;
    
    // Aktualisiere die Sichtbarkeit aller visuellen Elemente dieser Messung
    
    // Aktualisiere die Geometrie-Sichtbarkeit
    if (measurementsRef.current) {
      measurementsRef.current.children.forEach(obj => {
        if (obj.userData && obj.userData.measurementId === id) {
          obj.visible = isVisible;
        }
      });
    }
    
    // Aktualisiere die Haupt-Label-Sichtbarkeit
    if (labelsRef.current) {
      labelsRef.current.children.forEach(label => {
        if (label.userData && label.userData.measurementId === id && !label.userData.isPreview) {
          // Nur aktualisieren, wenn nicht im Bearbeitungsmodus
          if (!editMeasurementId && !movingPointInfo && !editingSegmentId) {
            label.visible = isVisible;
          }
        }
      });
    }
    
    // Aktualisiere die Segment-Label-Sichtbarkeit
    if (segmentLabelsRef.current) {
      segmentLabelsRef.current.children.forEach(label => {
        if (label.userData && label.userData.measurementId === id) {
          // Nur aktualisieren, wenn nicht im Bearbeitungsmodus
          if (!editMeasurementId && !movingPointInfo && !editingSegmentId) {
            label.visible = isVisible;
          }
        }
      });
    }
    
    // Aktualisiere die Punkte-Sichtbarkeit
    if (pointsRef.current) {
      pointsRef.current.children.forEach(point => {
        if (point.userData && point.userData.measurementId === id) {
          point.visible = isVisible;
        }
      });
    }
    
    // Aktualisiere die Linien-Sichtbarkeit
    if (linesRef.current) {
      linesRef.current.children.forEach(line => {
        if (line.userData && line.userData.measurementId === id) {
          line.visible = isVisible;
        }
      });
    }
  };

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

  // Verbesserte handleDeletePoint-Funktion für korrekte visuelle Aktualisierung
  const handleDeletePoint = (measurementId: string, pointIndex: number) => {
    // Finde die Messung
    const measurement = measurements.find(m => m.id === measurementId);
    
    if (!measurement) return;
    
    // Flächenmessungen benötigen mindestens 3 Punkte
    if (measurement.type === 'area' && measurement.points.length <= 3) {
      toast.error('Flächenmessungen benötigen mindestens 3 Punkte');
      return;
    }
    
    // Rufe die Punkt-Löschfunktion auf
    deletePoint(measurementId, pointIndex);
    
    // Lösche visuelle Elemente nur für die spezifische Messung
    clearMeasurementVisuals(
      measurementId,
      measurementsRef.current,
      labelsRef.current,
      segmentLabelsRef.current
    );
    
    // Jetzt sofort die aktualisierte Messung neu rendern
    renderMeasurements(
      measurementsRef.current, 
      labelsRef.current, 
      segmentLabelsRef.current, 
      measurements, 
      true
    );
    
    // Wenn im Bearbeitungsmodus, auch die Bearbeitungspunkte aktualisieren
    if (editMeasurementId === measurementId) {
      renderEditPoints(
        editPointsRef.current, 
        measurements, 
        editMeasurementId, 
        null, // Punktauswahl zurücksetzen nach Löschung
        true
      );
    }
    
    toast.info(`Punkt ${pointIndex + 1} wurde entfernt`);
  };
  
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

  // Verbesserte Behandlung von Punktbearbeitung Start/Ende
  const handleStartPointEdit = (id: string) => {
    // Wenn wir bereits diese Messung bearbeiten, umschalten
    if (editMeasurementId === id) {
      cancelEditing();
      toast.info('Punktbearbeitung beendet');
    } else {
      // Wenn wir beginnen, eine neue Messung zu bearbeiten, bereinige vorherigen Bearbeitungszustand
      if (editMeasurementId) {
        cancelEditing();
      }
      
      toggleEditMode(id);
      
      // Unterschiedliche Meldungen basierend auf dem Messungstyp
      const measurement = measurements.find(m => m.id === id);
      if (measurement && measurement.type === 'area') {
        toast.info('Klicken Sie auf einen Punkt zum Verschieben oder auf ein "+" Symbol zum Hinzufügen eines Punktes');
      } else {
        toast.info('Klicken Sie auf einen Punkt, um ihn zu verschieben');
      }
      
      // Verstecke ALLE Messungslabels während der Bearbeitung - sowohl Haupt- als auch Segment-Labels
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

  const handleCancelEditing = () => {
    cancelEditing();
    setEditingSegmentId(null);
    setMovingPointInfo(null);
    
    // Lösche Vorschau-Darstellungen
    if (clearPreviewGroup) {
      clearPreviewGroup();
    }
    
    if (clearAddPointIndicators) {
      clearAddPointIndicators();
    }
    
    // Messungen neu rendern, um sicherzustellen, dass Labels korrekt angezeigt werden
    renderMeasurements(
      measurementsRef.current, 
      labelsRef.current, 
      segmentLabelsRef.current, 
      measurements, 
      true
    );
    
    toast.info('Bearbeitung abgebrochen');
  };

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

  // Verbesserte clearMeasurements-Funktion zur sichergestellten Entfernung aller Labels
  const handleClearMeasurements = () => {
    clearMeasurements();
    
    // Gründliches Löschen aller visuellen Elemente
    clearAllVisuals(
      pointsRef.current,
      linesRef.current,
      measurementsRef.current,
      editPointsRef.current,
      labelsRef.current,
      segmentLabelsRef.current
    );
    
    // Lösche auch Vorschau-Darstellungen
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
