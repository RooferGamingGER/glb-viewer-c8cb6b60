
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Info, Settings } from 'lucide-react';
import MeasurementList from './MeasurementList';
import MeasurementToolControls from './MeasurementToolControls';
import MeasurementInfo from './MeasurementInfo';
import { Measurement, MeasurementMode } from '@/types/measurements';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sidebar, SidebarTrigger, SidebarContent, SidebarHeader } from '@/components/ui/sidebar';

interface EnhancedMeasurementSidebarProps {
  measurements: Measurement[];
  activeMode: MeasurementMode;
  hasCurrentPoints: boolean;
  toggleMeasurementTool: (mode: MeasurementMode) => void;
  isModeActive: (mode: MeasurementMode) => boolean;
  isLineMode: () => boolean;
  isAreaMode: () => boolean;
  isPointMode: () => boolean;
  toggleMeasurementVisibility: (id: string, data: Partial<Measurement>) => void;
  toggleEditMode: (id: string) => void;
  deleteMeasurement: (id: string) => void;
  deletePoint: (measurementId: string, pointIndex: number) => void;
  updateMeasurement: (id: string, data: Partial<Measurement>) => void; // Add this prop
  handleStartPointEdit: (id: string) => void;
  finalizeMeasurement: () => void;
  undoLastPoint: () => void;
  clearCurrentPoints: () => void;
  clearMeasurements: () => void;
  cancelEditing: () => void;
  toggleRuler: (enabled: boolean) => void;
  rulerEnabled: boolean;
  displayName?: string;
  open?: boolean;
  onClose?: () => void;
}

const EnhancedMeasurementSidebar: React.FC<EnhancedMeasurementSidebarProps> = ({
  measurements,
  activeMode,
  hasCurrentPoints,
  toggleMeasurementTool,
  isModeActive,
  isLineMode,
  isAreaMode,
  isPointMode,
  toggleMeasurementVisibility,
  toggleEditMode,
  deleteMeasurement,
  deletePoint,
  updateMeasurement,
  handleStartPointEdit,
  finalizeMeasurement,
  undoLastPoint,
  clearCurrentPoints,
  clearMeasurements,
  cancelEditing,
  toggleRuler,
  rulerEnabled,
  displayName,
  open = true,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<string>('tools');
  const [showInfo, setShowInfo] = useState<boolean>(false);
  
  return (
    <Sidebar defaultOpen={open} open={open} side="left" className="glass-panel z-10 w-[350px] border-r">
      <SidebarHeader className="px-4 py-4 border-b">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">
            {displayName ? `${displayName}` : 'Messwerkzeuge'}
          </h2>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowInfo(!showInfo)}
            >
              <Info className="h-4 w-4" />
            </Button>
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="px-4 pt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="tools">Werkzeuge</TabsTrigger>
              <TabsTrigger value="measurements">Messungen</TabsTrigger>
            </TabsList>
          </div>
          
          <ScrollArea className="h-[calc(100vh-10rem)] pb-12">
            <TabsContent value="tools" className="m-0 p-4">
              <MeasurementToolControls
                activeMode={activeMode}
                hasCurrentPoints={hasCurrentPoints}
                toggleMeasurementTool={toggleMeasurementTool}
                isModeActive={isModeActive}
                clearCurrentPoints={clearCurrentPoints}
                finalizeMeasurement={finalizeMeasurement}
                undoLastPoint={undoLastPoint}
              />
            </TabsContent>
            
            <TabsContent value="measurements" className="m-0 p-4">
              <MeasurementList
                measurements={measurements}
                toggleMeasurementVisibility={toggleMeasurementVisibility}
                toggleEditMode={toggleEditMode}
                deleteMeasurement={deleteMeasurement}
                deletePoint={deletePoint}
                updateMeasurement={updateMeasurement}
                handleStartPointEdit={handleStartPointEdit}
              />
            </TabsContent>
          </ScrollArea>
        </Tabs>
        
        {showInfo && (
          <div className="absolute inset-0 bg-background/95 z-10 p-4 overflow-auto">
            <div className="flex justify-end mb-4">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setShowInfo(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <MeasurementInfo />
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
};

export default EnhancedMeasurementSidebar;
