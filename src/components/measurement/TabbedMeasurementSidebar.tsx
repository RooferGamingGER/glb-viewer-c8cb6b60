
import React from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { MeasurementMode, Measurement } from '@/types/measurements';
import MeasurementToolControls from './MeasurementToolControls';
import EditingAlert from './EditingAlert';
import LayerControls, { LayerVisibility } from './LayerControls';

interface TabbedMeasurementSidebarProps {
  activeMode: MeasurementMode;
  toggleMeasurementTool: (mode: MeasurementMode) => void;
  editMeasurementId: string | null;
  editingSegmentId?: string | null;
  movingPointInfo?: {
    measurementId: string;
    pointIndex: number;
  } | null;
  measurements: Measurement[];
  showTable: boolean;
  setShowTable: (show: boolean) => void;
  toggleMeasurementVisibility: (id: string) => void;
  toggleLabelVisibility: (id: string) => void;
  handleStartPointEdit: (id: string) => void;
  handleDeleteMeasurement: (id: string) => void;
  handleDeletePoint?: (measurementId: string, pointIndex: number) => void;
  updateMeasurement: (id: string, data: Partial<Measurement>) => void;
  segmentsOpen: Record<string, boolean>;
  toggleSegments: (id: string) => void;
  onEditSegment: (id: string | null) => void;
  handleCancelEditing: () => void;
  handleMoveMeasurementUp?: (id: string) => void;
  handleMoveMeasurementDown?: (id: string) => void;
  isEditing: boolean;
  editingAreaMeasurement?: boolean;
  handleClearMeasurements: () => void;
  layerVisibility?: LayerVisibility;
  onLayerChange?: (layer: keyof LayerVisibility, value: boolean) => void;
}

/**
 * Sidebar showing only measurements list (Massen).
 * Solar planning and roof elements are now in the overlay.
 */
const TabbedMeasurementSidebar: React.FC<TabbedMeasurementSidebarProps> = ({
  activeMode,
  toggleMeasurementTool,
  editMeasurementId,
  editingSegmentId,
  movingPointInfo,
  measurements,
  showTable,
  setShowTable,
  toggleMeasurementVisibility,
  toggleLabelVisibility,
  handleStartPointEdit,
  handleDeleteMeasurement,
  handleDeletePoint,
  updateMeasurement,
  segmentsOpen,
  toggleSegments,
  onEditSegment,
  handleCancelEditing,
  handleMoveMeasurementUp,
  handleMoveMeasurementDown,
  isEditing,
  editingAreaMeasurement,
  handleClearMeasurements,
  layerVisibility,
  onLayerChange
}) => {
  return (
    <div className="flex flex-col h-full max-h-screen overflow-hidden w-[320px] min-w-[320px]">
      {/* Header */}
      <div className="p-3 border-b border-border/50 flex-shrink-0">
        <span className="text-sm font-medium">
          Messungen{' '}
          {measurements.length > 0 && (
            <span className="text-xs text-muted-foreground">({measurements.length})</span>
          )}
        </span>
      </div>
      
      {/* Layer visibility controls */}
      {layerVisibility && onLayerChange && (
        <div className="flex-shrink-0">
          <LayerControls 
            layerVisibility={layerVisibility}
            onLayerChange={onLayerChange}
          />
        </div>
      )}
      
      {/* Show editing alerts */}
      {isEditing && (
        <div className="px-3 pt-3 flex-shrink-0 border-b border-border/50 pb-3 bg-background sticky top-0 z-10">
          <EditingAlert 
            editMeasurementId={editMeasurementId}
            editingSegmentId={editingSegmentId}
            movingPointInfo={movingPointInfo}
            handleCancelEditing={handleCancelEditing}
            editingAreaMeasurement={editingAreaMeasurement}
          />
        </div>
      )}
      
      {/* Measurements list */}
      <div className="flex-1 overflow-hidden min-h-0">
        <ScrollArea className="h-full">
          <div className="p-3">
            <MeasurementToolControls
              activeMode={activeMode}
              toggleMeasurementTool={toggleMeasurementTool}
              editMeasurementId={editMeasurementId}
              measurements={measurements}
              toggleMeasurementVisibility={toggleMeasurementVisibility}
              toggleLabelVisibility={toggleLabelVisibility}
              handleStartPointEdit={handleStartPointEdit}
              handleDeleteMeasurement={handleDeleteMeasurement}
              handleDeletePoint={handleDeletePoint}
              updateMeasurement={updateMeasurement}
              segmentsOpen={segmentsOpen}
              toggleSegments={toggleSegments}
              onEditSegment={onEditSegment}
              movingPointInfo={movingPointInfo}
              showTable={showTable}
              setShowTable={setShowTable}
              handleMoveMeasurementUp={handleMoveMeasurementUp}
              handleMoveMeasurementDown={handleMoveMeasurementDown}
              showMeasurementList={true}
              handleClearMeasurements={handleClearMeasurements}
            />
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default TabbedMeasurementSidebar;
