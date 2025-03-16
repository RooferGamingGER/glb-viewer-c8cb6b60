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
import { ChevronLeft, X } from 'lucide-react';

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
  autoOpenSidebar?: boolean;
}

const MeasurementTools: React.FC<MeasurementToolsProps> = ({ 
  enabled,
  scene,
  camera,
  autoOpenSidebar = false
}) => {
  const { open, setOpen, toggleSidebar } = useSidebar();
  const [visible, setVisible] = useState(true);
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

  useLabelScaling(camera, labelsRef, segmentLabelsRef);

  useEffect(() => {
    if (enabled && autoOpenSidebar && !open) {
      setOpen(true);
    }
  }, [enabled, autoOpenSidebar, open, setOpen]);

  useEffect(() => {
    renderCurrentPoints(
      pointsRef.current, 
      linesRef.current, 
      labelsRef.current, 
      currentPoints, 
      activeMode
    );
  }, [currentPoints, activeMode]);

  useEffect(() => {
    renderMeasurements(
      measurementsRef.current, 
      labelsRef.current, 
      segmentLabelsRef.current, 
      measurements, 
      true
    );
  }, [measurements]);

  useEffect(() => {
    renderEditPoints(
      editPointsRef.current, 
      measurements, 
      editMeasurementId, 
      editingPointIndex, 
      true
    );
  }, [measurements, editMeasurementId, editingPointIndex]);

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
    }
  }, [enabled]);

  useEffect(() => {
    if (labelsRef.current && segmentLabelsRef.current) {
      measurements.forEach(measurement => {
        const labels = labelsRef.current?.children.filter(
          obj => obj.userData && obj.userData.measurementId === measurement.id
        );
        
        labels?.forEach(label => {
          label.visible = measurement.visible !== false;
        });
        
        if (measurement.type === 'area') {
          const segmentLabels = segmentLabelsRef.current?.children.filter(
            obj => obj.userData && obj.userData.measurementId === measurement.id
          );
          
          segmentLabels?.forEach(label => {
            label.visible = measurement.visible !== false;
          });
        }
      });
    }
  }, [measurements]);

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

  const handleClearMeasurements = () => {
    clearMeasurements();
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
    
    const labels = labelsGroup.children.filter(obj => 
      obj.userData && obj.userData.measurementId === measurementId
    );
    labels.forEach(obj => labelsGroup.remove(obj));
    
    const segmentLabels = segmentLabelsGroup.children.filter(obj => 
      obj.userData && obj.userData.measurementId === measurementId
    );
    segmentLabels.forEach(obj => segmentLabelsGroup.remove(obj));
  };

  const handleStartPointEdit = (id: string) => {
    toggleEditMode(id);
    
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

  const toggleSegments = (id: string) => {
    setSegmentsOpen(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleSidebarToggle = () => {
    toggleSidebar();
  };

  const closeSidebar = () => {
    setOpen(false);
  };

  if (!enabled) return null;

  return (
    <div className="relative z-20">
      {!open && (
        <button 
          onClick={handleSidebarToggle}
          className="fixed right-0 top-1/2 transform -translate-y-1/2 bg-secondary border border-border border-r-0 rounded-l-md p-2 z-30 transition-opacity duration-200 ease-in-out"
          aria-label="Öffne Messwerkzeuge"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      
      <Sidebar 
        side="right" 
        variant="floating" 
        collapsible="offcanvas"
        className="mt-24 transition-transform duration-200 ease-in-out"
        data-sidebar="true"
      >
        <SidebarRail />
        <SidebarHeader>
          <div className="flex justify-between items-center px-4 py-2">
            <h3 className="text-lg font-semibold">Messwerkzeuge</h3>
            <button
              onClick={closeSidebar}
              className="h-7 w-7 rounded-md hover:bg-sidebar-accent/50 flex items-center justify-center"
              aria-label="Messwerkzeuge schließen"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </SidebarHeader>
        
        <SidebarContent className="flex flex-col h-[calc(100vh-220px)]">
          <EditingAlert 
            editMeasurementId={editMeasurementId}
            editingSegmentId={editingSegmentId}
            movingPointInfo={movingPointInfo}
            handleCancelEditing={handleCancelEditing}
          />
          
          <MeasurementToolbar 
            activeMode={activeMode}
            toggleMeasurementTool={toggleMeasurementTool}
            visible={visible}
            setVisible={setVisible}
            handleClearMeasurements={handleClearMeasurements}
            measurements={measurements}
          />
          
          <ActiveMeasurement 
            activeMode={activeMode}
            currentPoints={currentPoints}
            handleFinalizeMeasurement={handleFinalizeMeasurement}
            handleUndoLastPoint={handleUndoLastPoint}
            clearCurrentPoints={clearCurrentPoints}
          />
          
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
    </div>
  );
};

export default MeasurementTools;
