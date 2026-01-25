
import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MeasurementMode, Measurement } from '@/types/measurements';
import MeasurementToolControls from './MeasurementToolControls';
import EditingAlert from './EditingAlert';
import LayerControls, { LayerVisibility } from './LayerControls';
import { useIsMobile } from '@/hooks/use-mobile';

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
  // Layer visibility props
  layerVisibility?: LayerVisibility;
  onLayerChange?: (layer: keyof LayerVisibility, value: boolean) => void;
}

/**
 * A tabbed sidebar component for the measurement tools that switches between tools and measurements
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
  const [activeTab, setActiveTab] = useState(isEditing ? "measurements" : "tools");
  const isMobile = useIsMobile();
  
  // When editing mode changes, switch tabs appropriately
  React.useEffect(() => {
    if (isEditing) {
      setActiveTab("measurements");
    }
  }, [isEditing]);
  
  return (
    <div className="flex flex-col h-full">
      {/* Tabs for navigation between tools and measurements */}
      <div className="p-3 border-b border-border/50">
        <Tabs 
          defaultValue="tools" 
          value={activeTab} 
          onValueChange={setActiveTab} 
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="tools">Werkzeuge</TabsTrigger>
            <TabsTrigger value="measurements">
              Messungen{" "}
              {measurements.length > 0 && <span className="ml-1 text-xs text-muted-foreground">({measurements.length})</span>}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      {/* Layer visibility controls */}
      {layerVisibility && onLayerChange && (
        <LayerControls 
          layerVisibility={layerVisibility}
          onLayerChange={onLayerChange}
        />
      )}
      
      {/* Show editing alerts at the top when in editing mode */}
      {isEditing && (
        <div className="px-3 pt-3">
          <EditingAlert 
            editMeasurementId={editMeasurementId}
            editingSegmentId={editingSegmentId}
            movingPointInfo={movingPointInfo}
            handleCancelEditing={handleCancelEditing}
            editingAreaMeasurement={editingAreaMeasurement}
          />
        </div>
      )}
      
      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "tools" && (
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
                showMeasurementList={false}
                handleClearMeasurements={handleClearMeasurements}
              />
            </div>
          </ScrollArea>
        )}
        
        {activeTab === "measurements" && (
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
        )}
      </div>
    </div>
  );
};

export default TabbedMeasurementSidebar;
