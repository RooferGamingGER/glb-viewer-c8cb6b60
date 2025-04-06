
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Ruler, ListOrdered } from "lucide-react";
import { Measurement } from '@/types/measurements';
import MeasurementToolControls from './MeasurementToolControls';
import EditingAlert from './EditingAlert';
import { MeasurementMode } from '@/types/measurements';

interface TabbedMeasurementSidebarProps {
  activeMode: MeasurementMode;
  toggleMeasurementTool: (mode: MeasurementMode) => void;
  editMeasurementId: string | null;
  editingSegmentId: string | null;
  movingPointInfo: { measurementId: string; pointIndex: number } | null;
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
  editingAreaMeasurement: boolean;
}

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
  editingAreaMeasurement
}) => {
  return (
    <div className="flex flex-col h-full">
      {/* Tabs for navigation between tools and measurements */}
      <Tabs defaultValue="tools" className="w-full">
        <div className="border-b border-border/30">
          <TabsList className="w-full rounded-none bg-transparent p-0 h-12">
            <TabsTrigger value="tools" className="flex-1 rounded-none data-[state=active]:bg-background data-[state=active]:shadow-none">
              <Ruler className="h-4 w-4 mr-2" />
              Werkzeuge
            </TabsTrigger>
            <TabsTrigger value="measurements" className="flex-1 rounded-none data-[state=active]:bg-background data-[state=active]:shadow-none">
              <ListOrdered className="h-4 w-4 mr-2" />
              Messungen
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tools tab content */}
        <TabsContent value="tools" className="flex-1 min-h-0 overflow-hidden flex flex-col mt-0">
          <ScrollArea className="h-full flex-grow overflow-y-auto">
            <div className="p-3">
              <MeasurementToolControls
                activeMode={activeMode}
                toggleMeasurementTool={toggleMeasurementTool}
                editMeasurementId={editMeasurementId}
                measurements={[]} // Don't need to display measurements in this tab
                showTable={showTable}
                setShowTable={setShowTable}
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
                handleMoveMeasurementUp={handleMoveMeasurementUp}
                handleMoveMeasurementDown={handleMoveMeasurementDown}
                showMeasurementList={false}
              />
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Measurements tab content */}
        <TabsContent value="measurements" className="flex-1 min-h-0 overflow-hidden flex flex-col mt-0">
          <ScrollArea className="h-full flex-grow overflow-y-auto">
            <div className="p-3">
              <MeasurementToolControls
                activeMode={activeMode}
                toggleMeasurementTool={toggleMeasurementTool}
                editMeasurementId={editMeasurementId}
                measurements={measurements}
                showTable={showTable}
                setShowTable={setShowTable}
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
                handleMoveMeasurementUp={handleMoveMeasurementUp}
                handleMoveMeasurementDown={handleMoveMeasurementDown}
                showMeasurementList={true}
              />
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Notification area for editing state */}
      {isEditing && (
        <div className="border-t border-border/30">
          <ScrollArea className="max-h-[240px]" autoMaxHeight>
            <div className="p-3">
              <EditingAlert
                editMeasurementId={editMeasurementId}
                editingSegmentId={editingSegmentId}
                movingPointInfo={movingPointInfo}
                handleCancelEditing={handleCancelEditing}
                editingAreaMeasurement={editingAreaMeasurement}
              />
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
};

export default TabbedMeasurementSidebar;
