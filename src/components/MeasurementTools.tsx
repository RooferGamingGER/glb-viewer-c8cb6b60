
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { MeasurementMode } from '@/hooks/useMeasurements';
import { 
  Sidebar, 
  SidebarContent, 
  SidebarHeader, 
  SidebarFooter,
  SidebarTrigger,
  SidebarRail,
  useSidebar
} from "@/components/ui/sidebar";
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
  clearAllVisuals
} from '@/utils/measurementVisuals';

// Import smaller components
import MeasurementToolbar from './measurement/MeasurementToolbar';
import ActiveMeasurement from './measurement/ActiveMeasurement';
import MeasurementList from './measurement/MeasurementList';
import EditingAlert from './measurement/EditingAlert';

interface MeasurementToolsProps {
  enabled: boolean;
  scene: THREE.Scene;
  camera: THREE.Camera;
}

const MeasurementTools: React.FC<MeasurementToolsProps> = ({ 
  enabled,
  scene,
  camera
}) => {
  const { open, setOpen } = useSidebar();
  const [visible, setVisible] = useState(true);
  const [segmentsOpen, setSegmentsOpen] = useState<Record<string, boolean>>({});
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);

  // Initialize measurement hooks
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
    undoLastPoint,
    editMeasurementId,
    editingPointIndex,
    startPointEdit,
    cancelEditing,
    updateMeasurementPoint
  } = useMeasurements();

  // Initialize Three.js object references
  const {
    pointsRef,
    linesRef,
    measurementsRef,
    editPointsRef,
    labelsRef,
    segmentLabelsRef
  } = useThreeObjects(scene, enabled);

  // Set up interaction handlers
  const interactionHandlers = {
    addPoint,
    startPointEdit,
    updateMeasurementPoint
  };

  // Initialize user interaction handling
  const { movingPointInfo, setMovingPointInfo } = useMeasurementInteraction(
    enabled,
    scene,
    camera,
    open,
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

  // Set up label scaling
  useLabelScaling(camera, labelsRef, segmentLabelsRef);

  // Auto-open sidebar when measurements are enabled
  useEffect(() => {
    if (enabled && !open) {
      setOpen(true);
    }
  }, [enabled, open, setOpen]);

  // Update visual representation of points when currentPoints changes
  useEffect(() => {
    renderCurrentPoints(
      pointsRef.current, 
      linesRef.current, 
      labelsRef.current, 
      currentPoints, 
      activeMode
    );
  }, [currentPoints, visible, activeMode]);

  // Update visual representation of completed measurements
  useEffect(() => {
    renderMeasurements(
      measurementsRef.current, 
      labelsRef.current, 
      segmentLabelsRef.current, 
      measurements, 
      visible
    );
  }, [measurements, visible]);

  // Update the editable points visualizations
  useEffect(() => {
    renderEditPoints(
      editPointsRef.current, 
      measurements, 
      editMeasurementId, 
      editingPointIndex, 
      visible
    );
  }, [measurements, editMeasurementId, editingPointIndex, visible]);

  // Cleanup effect - clear all measurements when measurement tools are disabled
  useEffect(() => {
    if (!enabled) {
      // Clear all visualizations when disabling measurement tools
      clearAllVisuals(
        pointsRef.current,
        linesRef.current,
        measurementsRef.current,
        editPointsRef.current,
        labelsRef.current,
        segmentLabelsRef.current
      );
    }
  }, [enabled]);

  // Handlers
  const handleFinalizeMeasurement = () => {
    if (currentPoints.length >= 3) {
      finalizeMeasurement();
      
      // Deactivate measurement tool after finalizing an area measurement
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

  const handleClearMeasurements = () => {
    clearMeasurements();
    // Explicitly clear all visual elements too
    clearAllVisuals(
      pointsRef.current,
      linesRef.current,
      measurementsRef.current,
      editPointsRef.current,
      labelsRef.current,
      segmentLabelsRef.current
    );
    toast.info('Alle Messungen gelöscht');
  };

  const handleDeleteMeasurement = (id: string) => {
    // Before deleting, ensure all associated visual elements are removed
    const measurementToDelete = measurements.find(m => m.id === id);
    if (measurementToDelete) {
      // Remove specific visual elements for this measurement ID
      clearMeasurementVisuals(
        id,
        measurementsRef.current,
        labelsRef.current,
        segmentLabelsRef.current
      );
    }
    
    // Delete the measurement from state
    deleteMeasurement(id);
    toast.info('Messung gelöscht');
  };

  // Helper function to clear visuals for a specific measurement
  const clearMeasurementVisuals = (
    measurementId: string,
    measurementsGroup: THREE.Group | null,
    labelsGroup: THREE.Group | null,
    segmentLabelsGroup: THREE.Group | null
  ) => {
    if (!measurementsGroup || !labelsGroup || !segmentLabelsGroup) return;
    
    // Remove measurement objects (points and lines)
    const measurementObjects = measurementsGroup.children.filter(obj => 
      obj.userData && obj.userData.measurementId === measurementId
    );
    measurementObjects.forEach(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach(mat => mat.dispose());
        } else {
          obj.material.dispose();
        }
      }
      measurementsGroup.remove(obj);
    });
    
    // Remove labels
    const labels = labelsGroup.children.filter(obj => 
      obj.userData && obj.userData.measurementId === measurementId
    );
    labels.forEach(obj => labelsGroup.remove(obj));
    
    // Remove segment labels
    const segmentLabels = segmentLabelsGroup.children.filter(obj => 
      obj.userData && obj.userData.measurementId === measurementId
    );
    segmentLabels.forEach(obj => segmentLabelsGroup.remove(obj));
  };

  const handleStartPointEdit = (id: string) => {
    // Toggle the edit mode for this measurement
    toggleEditMode(id);
    
    // If it was already in edit mode, it's now turned off
    if (editMeasurementId === id) {
      toast.info('Punktbearbeitung beendet');
    } else {
      toast.info('Klicken Sie auf einen Punkt, um ihn zu bearbeiten');
    }
  };

  const handleCancelEditing = () => {
    cancelEditing();
    setEditingSegmentId(null);
    setMovingPointInfo(null);
    toast.info('Bearbeitung abgebrochen');
  };

  // Toggle segment list for a measurement
  const toggleSegments = (id: string) => {
    setSegmentsOpen(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // If measurements are not enabled, don't render anything
  if (!enabled) return null;

  return (
    <Sidebar side="right" variant="floating" className="z-20">
      <SidebarRail />
      <SidebarHeader>
        <div className="flex justify-between items-center px-4 py-2">
          <h3 className="text-lg font-semibold">Messwerkzeuge</h3>
          <SidebarTrigger className="h-7 w-7" />
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        {/* Editing Alert */}
        <EditingAlert 
          editMeasurementId={editMeasurementId}
          editingSegmentId={editingSegmentId}
          movingPointInfo={movingPointInfo}
          handleCancelEditing={handleCancelEditing}
        />
        
        {/* Measurement Tools */}
        <MeasurementToolbar 
          activeMode={activeMode}
          toggleMeasurementTool={toggleMeasurementTool}
          visible={visible}
          setVisible={setVisible}
          handleClearMeasurements={handleClearMeasurements}
          measurements={measurements}
        />
        
        {/* Active Measurement */}
        <ActiveMeasurement 
          activeMode={activeMode}
          currentPoints={currentPoints}
          handleFinalizeMeasurement={handleFinalizeMeasurement}
          handleUndoLastPoint={handleUndoLastPoint}
          clearCurrentPoints={clearCurrentPoints}
        />
        
        {/* Measurements List */}
        <MeasurementList 
          measurements={measurements}
          toggleMeasurementVisibility={toggleMeasurementVisibility}
          handleStartPointEdit={handleStartPointEdit}
          handleDeleteMeasurement={handleDeleteMeasurement}
          updateMeasurement={updateMeasurement}
          editMeasurementId={editMeasurementId}
          editingSegmentId={editingSegmentId}
          handleCancelEditing={handleCancelEditing}
          segmentsOpen={segmentsOpen}
          toggleSegments={toggleSegments}
          setEditingSegmentId={setEditingSegmentId}
          movingPointInfo={movingPointInfo}
        />
      </SidebarContent>
      
      <SidebarFooter>
        <div className="p-4 text-xs text-muted-foreground">
          <p>Messungswerkzeuge v1.0</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};

export default MeasurementTools;
