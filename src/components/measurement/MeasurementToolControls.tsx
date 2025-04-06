
import React from 'react';
import { Measurement, MeasurementMode } from '@/hooks/useMeasurements';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { SidebarGroup, SidebarGroupLabel } from "@/components/ui/sidebar";
import MeasurementList from './MeasurementList';
import MeasurementTable from './MeasurementTable';
import RoofElementsToolbar from './RoofElementsToolbar';
import SolarToolbar from './SolarToolbar';

interface MeasurementToolControlsProps {
  activeMode: MeasurementMode;
  toggleMeasurementTool: (mode: MeasurementMode) => void;
  editMeasurementId: string | null;
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
  movingPointInfo?: { measurementId: string; pointIndex: number } | null;
  handleMoveMeasurementUp?: (id: string) => void;
  handleMoveMeasurementDown?: (id: string) => void;
  showMeasurementList?: boolean;
}

const MeasurementToolControls: React.FC<MeasurementToolControlsProps> = ({
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
  showMeasurementList = false
}) => {
  return (
    <div className="space-y-4">
      {/* Punktfang section */}
      <SidebarGroup>
        <SidebarGroupLabel>Punktfang</SidebarGroupLabel>
        {/* Punktfang controls would go here */}
      </SidebarGroup>
      
      {/* Messwerkzeuge section */}
      <SidebarGroup>
        <SidebarGroupLabel>Messwerkzeuge</SidebarGroupLabel>
        {/* Measurement tools would go here */}
      </SidebarGroup>
      
      {/* Solar section */}
      <SolarToolbar
        activeMode={activeMode}
        toggleMeasurementTool={toggleMeasurementTool}
        editMeasurementId={editMeasurementId}
      />
      
      {/* Roof elements section */}
      <RoofElementsToolbar
        activeMode={activeMode}
        toggleMeasurementTool={toggleMeasurementTool}
        editMeasurementId={editMeasurementId}
      />
      
      {/* Show measurement list if requested */}
      {showMeasurementList && measurements.length > 0 && (
        <Accordion type="single" collapsible defaultValue="measurements">
          <AccordionItem value="measurements" className="border-0">
            <AccordionTrigger className="py-2 px-1">
              <SidebarGroupLabel className="!m-0">Messungen</SidebarGroupLabel>
            </AccordionTrigger>
            <AccordionContent>
              {showTable ? (
                <MeasurementTable 
                  measurements={measurements}
                  toggleVisibility={toggleMeasurementVisibility}
                  toggleLabelVisibility={toggleLabelVisibility}
                  onEdit={handleStartPointEdit} 
                  onDelete={handleDeleteMeasurement}
                  setShowTable={setShowTable}
                />
              ) : (
                <MeasurementList 
                  measurements={measurements}
                  toggleVisibility={toggleMeasurementVisibility}
                  toggleLabelVisibility={toggleLabelVisibility}
                  onEdit={handleStartPointEdit}
                  onDelete={handleDeleteMeasurement}
                  onDeletePoint={handleDeletePoint}
                  updateMeasurement={updateMeasurement}
                  segmentsOpen={segmentsOpen}
                  toggleSegments={toggleSegments}
                  onEditSegment={onEditSegment}
                  movingPointInfo={movingPointInfo}
                  handleMoveMeasurementUp={handleMoveMeasurementUp}
                  handleMoveMeasurementDown={handleMoveMeasurementDown}
                  setShowTable={setShowTable}
                />
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  );
};

export default MeasurementToolControls;
