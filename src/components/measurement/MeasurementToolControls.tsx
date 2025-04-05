
import React, { useState, memo } from 'react';
import { Button } from "@/components/ui/button";
import { 
  Ruler, Maximize2, Square, SunDim, Grid3X3, 
  Home, Minimize2, Layers, Grid, Move, X, ChevronRight,
  Eye, EyeOff, PanelLeft, PanelRight
} from 'lucide-react';
import { MeasurementMode, Measurement } from '@/types/measurements';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Toggle } from '@/components/ui/toggle';
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from '@/lib/utils';
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  useSidebar
} from "@/components/ui/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import MeasurementSidebar from './MeasurementSidebar';

// Define prop types for better type safety
interface MeasurementToolControlsProps {
  activeMode: MeasurementMode;
  toggleMeasurementTool: (mode: MeasurementMode) => void;
  editMeasurementId: string | null;
  measurements: Measurement[];
  showTable: boolean;
  setShowTable: (show: boolean) => void;
  toggleMeasurementVisibility: (id: string) => void;
  toggleLabelVisibility: (id: string) => void;
  handleStartPointEdit: (id: string, pointIndex?: number) => void;
  handleDeleteMeasurement: (id: string) => void;
  handleDeletePoint: (measurementId: string, pointIndex: number) => void;
  updateMeasurement: (id: string, data: Partial<Measurement>) => void;
  segmentsOpen: Record<string, boolean>;
  toggleSegments: (id: string) => void;
  onEditSegment: (id: string | null) => void;
  movingPointInfo: { measurementId: string; pointIndex: number } | null;
  handleMoveMeasurementUp?: (id: string) => void;
  handleMoveMeasurementDown?: (id: string) => void;
  allLabelsVisible?: boolean;
  toggleAllLabelsVisibility?: () => void;
  handleClearMeasurements?: () => void;
}

const MeasurementToolControls: React.FC<MeasurementToolControlsProps> = memo(({
  activeMode,
  toggleMeasurementTool,
  editMeasurementId,
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
  movingPointInfo,
  handleMoveMeasurementUp,
  handleMoveMeasurementDown,
  allLabelsVisible,
  toggleAllLabelsVisibility,
  handleClearMeasurements
}) => {
  // Determine if we are in any mode other than 'none'
  const isActive = activeMode !== 'none';
  
  // Determine if we are in edit mode
  const isInEditMode = editMeasurementId !== null || movingPointInfo !== null;
  
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-full">
        <Sidebar variant="floating">
          <MeasurementSidebar
            measurements={measurements}
            toggleMeasurementVisibility={toggleMeasurementVisibility}
            toggleLabelVisibility={toggleLabelVisibility}
            handleStartPointEdit={handleStartPointEdit}
            handleDeleteMeasurement={handleDeleteMeasurement}
            handleDeletePoint={handleDeletePoint}
            updateMeasurement={updateMeasurement}
            editMeasurementId={editMeasurementId}
            segmentsOpen={segmentsOpen}
            toggleSegments={toggleSegments}
            onEditSegment={onEditSegment}
            movingPointInfo={movingPointInfo}
            showTable={showTable}
            setShowTable={setShowTable}
            handleClearMeasurements={handleClearMeasurements}
            toggleAllLabelsVisibility={toggleAllLabelsVisibility}
            allLabelsVisible={allLabelsVisible}
            activeMode={activeMode}
            handleMoveMeasurementUp={handleMoveMeasurementUp}
            handleMoveMeasurementDown={handleMoveMeasurementDown}
          />
        </Sidebar>
        
        <div className="p-3 flex-1">
          <div className="bg-card rounded-lg shadow-sm p-3 border">
            <h3 className="text-sm font-medium mb-2">Messwerkzeuge</h3>
            
            <div className="flex flex-wrap gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant={activeMode === 'length' ? 'default' : 'outline'}
                      className={cn(
                        activeMode === 'length' ? 'bg-primary text-primary-foreground' : ''
                      )}
                      onClick={() => toggleMeasurementTool('length')}
                      disabled={isInEditMode}
                    >
                      <Ruler className="h-4 w-4 mr-1" /> Linie
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Linien messen</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant={activeMode === 'height' ? 'default' : 'outline'}
                      className={cn(
                        activeMode === 'height' ? 'bg-primary text-primary-foreground' : ''
                      )}
                      onClick={() => toggleMeasurementTool('height')}
                      disabled={isInEditMode}
                    >
                      <Maximize2 className="h-4 w-4 mr-1" /> Höhe
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Höhen messen</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant={activeMode === 'area' ? 'default' : 'outline'}
                      className={cn(
                        activeMode === 'area' ? 'bg-primary text-primary-foreground' : ''
                      )}
                      onClick={() => toggleMeasurementTool('area')}
                      disabled={isInEditMode}
                    >
                      <Layers className="h-4 w-4 mr-1" /> Fläche
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Flächen messen</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant={activeMode === 'solar' ? 'default' : 'outline'}
                      className={cn(
                        activeMode === 'solar' ? 'bg-primary text-primary-foreground' : ''
                      )}
                      onClick={() => toggleMeasurementTool('solar')}
                      disabled={isInEditMode}
                    >
                      <SunDim className="h-4 w-4 mr-1" /> Solar
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">PV-Flächen planen</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant={activeMode === 'pvplanning' ? 'default' : 'outline'}
                      className={cn(
                        activeMode === 'pvplanning' ? 'bg-primary text-primary-foreground' : ''
                      )}
                      onClick={() => toggleMeasurementTool('pvplanning')}
                      disabled={isInEditMode}
                    >
                      <Grid3X3 className="h-4 w-4 mr-1" /> PV-Module
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">PV-Module platzieren</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            {isActive && (
              <>
                <Separator className="my-2" />
                <div className="text-sm text-muted-foreground">
                  {activeMode === 'length' && "Klicken Sie nacheinander Punkte an, um eine Linie zu erstellen."}
                  {activeMode === 'height' && "Klicken Sie nacheinander Punkte an, um eine Höhe zu messen."}
                  {activeMode === 'area' && "Klicken Sie nacheinander Punkte an, um eine Fläche zu erstellen."}
                  {activeMode === 'solar' && "Klicken Sie nacheinander Punkte an, um eine Solarfläche zu erstellen."}
                  {activeMode === 'pvplanning' && "Klicken Sie auf eine Fläche, um PV-Module zu platzieren."}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
});

MeasurementToolControls.displayName = 'MeasurementToolControls';

export default MeasurementToolControls;
