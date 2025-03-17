
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Sidebar, 
  SidebarContent, 
  SidebarHeader, 
  SidebarFooter 
} from "@/components/ui/sidebar";
import { Ruler, FileText } from 'lucide-react';
import MeasurementToolbar from './MeasurementToolbar';
import MeasurementList from './MeasurementList';
import ActiveMeasurement from './ActiveMeasurement';
import { MeasurementMode, Measurement, Point } from '@/hooks/useMeasurements';
import EditingAlert from './EditingAlert';

interface MeasurementSidebarProps {
  enabled: boolean;
  measurements: Measurement[];
  currentPoints: Point[];
  activeMode: MeasurementMode;
  toggleMeasurementTool: (mode: MeasurementMode) => void;
  toggleMeasurementVisibility: (id: string) => void;
  handleStartPointEdit: (id: string) => void;
  handleDeleteMeasurement: (id: string) => void;
  updateMeasurement: (id: string, data: Partial<Measurement>) => void;
  editMeasurementId: string | null;
  editingSegmentId: string | null;
  handleCancelEditing: () => void;
  segmentsOpen: Record<string, boolean>;
  toggleSegments: (id: string) => void;
  setEditingSegmentId: (id: string | null) => void;
  movingPointInfo: { measurementId: string; pointIndex: number } | null;
  handleFinalizeMeasurement: () => void;
  handleUndoLastPoint: () => void;
  clearCurrentPoints: () => void;
  handleClearMeasurements: () => void;
}

const MeasurementSidebar: React.FC<MeasurementSidebarProps> = ({
  enabled,
  measurements,
  currentPoints,
  activeMode,
  toggleMeasurementTool,
  toggleMeasurementVisibility,
  handleStartPointEdit,
  handleDeleteMeasurement,
  updateMeasurement,
  editMeasurementId,
  editingSegmentId,
  handleCancelEditing,
  segmentsOpen,
  toggleSegments,
  setEditingSegmentId,
  movingPointInfo,
  handleFinalizeMeasurement,
  handleUndoLastPoint,
  clearCurrentPoints,
  handleClearMeasurements
}) => {
  if (!enabled) return null;

  const hasActiveMeasurement = activeMode !== 'none' && currentPoints.length > 0;
  const hasMeasurements = measurements.length > 0;
  const hasAlerts = editMeasurementId !== null || editingSegmentId !== null || movingPointInfo !== null;

  return (
    <div className="relative z-20">
      <Sidebar 
        side="right" 
        variant="floating" 
        collapsible="none"
        className="mt-0 h-full"
        data-sidebar="true"
      >
        <SidebarHeader className="pt-4">
          <div className="flex justify-between items-center px-4 py-2">
            <h3 className="text-lg font-semibold">Messwerkzeuge</h3>
          </div>
        </SidebarHeader>
        
        <SidebarContent className="flex flex-col h-[calc(100vh-200px)]">
          {hasAlerts && (
            <EditingAlert 
              editMeasurementId={editMeasurementId}
              editingSegmentId={editingSegmentId}
              movingPointInfo={movingPointInfo}
              handleCancelEditing={handleCancelEditing}
            />
          )}
          
          <Tabs defaultValue="tools" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="tools" className="flex items-center gap-2">
                <Ruler className="h-4 w-4" />
                <span>Werkzeuge</span>
              </TabsTrigger>
              <TabsTrigger value="measurements" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span>Messungen</span>
              </TabsTrigger>
            </TabsList>
            
            {/* Tools Tab */}
            <TabsContent value="tools" className="space-y-4 mt-4">
              <MeasurementToolbar 
                activeMode={activeMode}
                toggleMeasurementTool={toggleMeasurementTool}
                visible={true}
                setVisible={() => {}}
                handleClearMeasurements={handleClearMeasurements}
                measurements={measurements}
              />
              
              {hasActiveMeasurement && (
                <ActiveMeasurement 
                  activeMode={activeMode}
                  currentPoints={currentPoints}
                  handleFinalizeMeasurement={handleFinalizeMeasurement}
                  handleUndoLastPoint={handleUndoLastPoint}
                  clearCurrentPoints={clearCurrentPoints}
                />
              )}
            </TabsContent>
            
            {/* Measurements Tab */}
            <TabsContent value="measurements" className="mt-4">
              {hasMeasurements ? (
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
              ) : (
                <div className="p-4 text-center text-muted-foreground">
                  Keine Messungen vorhanden
                </div>
              )}
            </TabsContent>
          </Tabs>
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

export default MeasurementSidebar;
