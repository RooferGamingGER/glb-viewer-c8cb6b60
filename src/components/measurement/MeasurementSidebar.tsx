
import React, { useState } from 'react';
import { Sidebar, SidebarHeader, SidebarHeaderTitle, SidebarBody } from '@/components/ui/sidebar';
import { MeasurementMode, Measurement } from '@/hooks/useMeasurements';
import { ChevronLeft, ChevronRight, CircleCheck, Focus, CircleDashed, Layers, EyeOff, Eye, Trash2, PencilRuler, GripVertical, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { ScrollArea } from "@/components/ui/scroll-area";
import MeasurementToolbar from './MeasurementToolbar';
import MeasurementItem from './MeasurementItem';
import MeasurementTable from './MeasurementTable';
import { getMeasurementTypeDisplayName } from '@/contexts/MeasurementContext';

interface MeasurementSidebarProps {
  measurements: Measurement[];
  activeMode: MeasurementMode;
  toggleMeasurementTool: (mode: MeasurementMode) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  handleClearMeasurements: () => void;
  toggleMeasurementVisibility: (id: string) => void;
  toggleLabelVisibility: (id: string) => void;
  toggleAllMeasurementsVisibility: () => void;
  toggleAllLabelsVisibility: () => void;
  allMeasurementsVisible: boolean;
  allLabelsVisible: boolean;
  editMeasurementId: string | null;
  handleStartPointEdit: (id: string) => void;
  handleCancelEditing: () => void;
  handleDeleteMeasurement: (id: string) => void;
  showTable: boolean;
  setShowTable: (show: boolean) => void;
  handleMoveMeasurementUp: (id: string) => void;
  handleMoveMeasurementDown: (id: string) => void;
  updateMeasurement: (id: string, data: Partial<Measurement>) => void;
  selectedModuleIndex: number | null;
  selectedMeasurementId: string | null;
  handleSelectModule: (measurementId: string, moduleIndex: number) => void;
  handleDeleteModule: () => void;
}

const MeasurementSidebar: React.FC<MeasurementSidebarProps> = ({
  measurements,
  activeMode,
  toggleMeasurementTool,
  open,
  setOpen,
  handleClearMeasurements,
  toggleMeasurementVisibility,
  toggleLabelVisibility,
  toggleAllMeasurementsVisibility,
  toggleAllLabelsVisibility,
  allMeasurementsVisible,
  allLabelsVisible,
  editMeasurementId,
  handleStartPointEdit,
  handleCancelEditing,
  handleDeleteMeasurement,
  showTable,
  setShowTable,
  handleMoveMeasurementUp,
  handleMoveMeasurementDown,
  updateMeasurement,
  selectedModuleIndex,
  selectedMeasurementId,
  handleSelectModule,
  handleDeleteModule
}) => {
  const [showEmptyState] = useState(false);
  
  const toggleOpen = () => {
    setOpen(!open);
  };

  const activeCount = measurements.filter(m => m.visible !== false).length;
  const totalCount = measurements.length;
  
  return (
    <Sidebar open={open} className="h-full">
      <div className="absolute top-0 left-4 transform -translate-x-full z-10">
        <button
          onClick={toggleOpen}
          className="bg-card border rounded-l p-1 h-8 focus:outline-none"
          aria-label={open ? "Messungen schließen" : "Messungen öffnen"}
        >
          {open ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
      </div>
      
      <SidebarHeader className="h-14 flex-none">
        <SidebarHeaderTitle className="flex items-center">
          <PencilRuler className="h-5 w-5 mr-2" />
          <span>Messungen</span>
          <span className="text-xs text-muted-foreground ml-2">
            ({totalCount > 0 ? `${activeCount}/${totalCount}` : "0"})
          </span>
          
          <div className="ml-auto flex items-center gap-2">
            {measurements.length > 0 && (
              <>
                <Toggle 
                  variant="outline"
                  size="sm"
                  aria-label="Tabelle anzeigen"
                  pressed={showTable}
                  onPressedChange={setShowTable}
                >
                  <Layers className="h-4 w-4" />
                </Toggle>
                
                <Toggle 
                  variant="outline"
                  size="sm" 
                  aria-label={allMeasurementsVisible ? "Alle ausblenden" : "Alle einblenden"}
                  pressed={allMeasurementsVisible}
                  onPressedChange={toggleAllMeasurementsVisibility}
                >
                  {allMeasurementsVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </Toggle>
                
                <Toggle 
                  variant="outline"
                  size="sm" 
                  aria-label="Beschriftungen ein/aus"
                  pressed={allLabelsVisible}
                  onPressedChange={toggleAllLabelsVisibility}
                >
                  <CircleCheck className="h-4 w-4" />
                </Toggle>
              </>
            )}
          </div>
        </SidebarHeaderTitle>
      </SidebarHeader>
      
      <SidebarBody className="flex flex-col h-[calc(100%-3.5rem)] p-0">
        <MeasurementToolbar 
          activeMode={activeMode}
          toggleMeasurementTool={toggleMeasurementTool}
          visible={open} 
          setVisible={setOpen}
          handleClearMeasurements={handleClearMeasurements}
          measurements={measurements}
        />
        
        {/* Table view */}
        {measurements.length > 0 && showTable && (
          <div className="flex-1 p-3">
            <MeasurementTable measurements={measurements} />
          </div>
        )}
        
        {/* List view */}
        {measurements.length > 0 && !showTable && (
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-2">
              {measurements.map((measurement, index) => (
                <MeasurementItem
                  key={measurement.id}
                  measurement={measurement}
                  toggleMeasurementVisibility={toggleMeasurementVisibility}
                  toggleLabelVisibility={toggleLabelVisibility}
                  handleDeleteMeasurement={handleDeleteMeasurement}
                  handleStartPointEdit={handleStartPointEdit}
                  editMeasurementId={editMeasurementId}
                  handleCancelEditing={handleCancelEditing}
                  isFirst={index === 0}
                  isLast={index === measurements.length - 1}
                  handleMoveMeasurementUp={handleMoveMeasurementUp}
                  handleMoveMeasurementDown={handleMoveMeasurementDown}
                  updateMeasurement={updateMeasurement}
                  selectedModuleIndex={selectedMeasurementId === measurement.id ? selectedModuleIndex : null}
                  selectedMeasurementId={selectedMeasurementId}
                  handleSelectModule={handleSelectModule}
                  handleDeleteModule={handleDeleteModule}
                />
              ))}
            </div>
          </ScrollArea>
        )}
        
        {/* Empty state */}
        {(measurements.length === 0 || showEmptyState) && (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center">
              <CircleDashed className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">Keine Messungen</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Nutzen Sie die Messwerkzeuge, um Messungen auf dem Modell vorzunehmen.
              </p>
              <Button
                variant="outline" 
                size="sm"
                onClick={() => toggleMeasurementTool(activeMode === 'length' ? 'none' : 'length')}
              >
                <Focus className="h-4 w-4 mr-2" />
                Messung starten
              </Button>
            </div>
          </div>
        )}
      </SidebarBody>
    </Sidebar>
  );
};

export default MeasurementSidebar;
