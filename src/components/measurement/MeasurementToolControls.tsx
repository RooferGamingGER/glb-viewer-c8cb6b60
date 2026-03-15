import React, { useState, useRef } from 'react';
import { Measurement } from '@/hooks/useMeasurements';
import { ScrollArea } from '@/components/ui/scroll-area';
import MeasurementList from './MeasurementList';
import MeasurementTable from './MeasurementTable';
import { Button } from '@/components/ui/button';
import { MeasurementMode } from '@/types/measurements';
import { useToast } from "@/components/ui/use-toast";
import SolarToolbar from './SolarToolbar';
import RoofElementsToolbar from './RoofElementsToolbar';
import { useScreenOrientation } from '@/hooks/useScreenOrientation';
import CollapsibleSection from '@/components/ui/collapsible-section';

interface MeasurementToolControlsProps {
  measurements: Measurement[];
  toggleMeasurementVisibility: (id: string) => void;
  toggleLabelVisibility: (id: string) => void;
  handleStartPointEdit: (id: string) => void;
  handleDeleteMeasurement: (id: string) => void;
  handleDeletePoint?: (measurementId: string, pointIndex: number) => void;
  updateMeasurement: (id: string, data: Partial<Measurement>) => void;
  editMeasurementId: string | null;
  segmentsOpen: Record<string, boolean>;
  toggleSegments: (id: string) => void;
  onEditSegment: (id: string | null) => void;
  activeMode: MeasurementMode;
  toggleMeasurementTool?: (mode: MeasurementMode) => void;
  movingPointInfo?: {
    measurementId: string;
    pointIndex: number;
  } | null;
  handleClearMeasurements: () => void;
  toggleAllMeasurementsVisibility?: () => void;
  toggleAllLabelsVisibility?: () => void;
  allMeasurementsVisible?: boolean;
  allLabelsVisible?: boolean;
  showTable: boolean;
  setShowTable: (show: boolean) => void;
  handleMoveMeasurementUp?: (id: string) => void;
  handleMoveMeasurementDown?: (id: string) => void;
  showMeasurementList?: boolean;
}

const MeasurementToolControls: React.FC<MeasurementToolControlsProps> = ({
  measurements, toggleMeasurementVisibility, toggleLabelVisibility,
  handleStartPointEdit, handleDeleteMeasurement, handleDeletePoint,
  updateMeasurement, editMeasurementId, segmentsOpen, toggleSegments,
  onEditSegment, activeMode, toggleMeasurementTool, movingPointInfo,
  handleClearMeasurements, toggleAllMeasurementsVisibility,
  toggleAllLabelsVisibility, allMeasurementsVisible, allLabelsVisible,
  showTable, setShowTable, handleMoveMeasurementUp, handleMoveMeasurementDown,
  showMeasurementList = true
}) => {
  const { toast } = useToast();
  const { isPortrait, isTablet, isPhone } = useScreenOrientation();
  const isMobilePortrait = isPortrait && (isPhone || isTablet);
  
  const tableContainerStyle = showTable ? { 
    maxWidth: '100%', overflowX: 'auto' as const
  } : {};
  
  return (
    <ScrollArea className="flex-1 h-full">
      <div className="p-3 flex flex-col h-full gap-3">
        {/* Solar planning */}
        <SolarToolbar 
          activeMode={activeMode}
          toggleMeasurementTool={toggleMeasurementTool || ((mode) => {})}
          editMeasurementId={editMeasurementId}
        />
        
        {/* Roof elements */}
        <RoofElementsToolbar 
          activeMode={activeMode}
          toggleMeasurementTool={toggleMeasurementTool || ((mode) => {})}
          editMeasurementId={editMeasurementId}
        />

        {/* Massen (measurements) - collapsible detail list */}
        {measurements.length > 0 && (
          <CollapsibleSection title={`Massen (${measurements.length})`} defaultOpen={false}>
            <div className="flex mb-2 items-center justify-end">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowTable(!showTable)}
                title={showTable ? "Als Liste anzeigen" : "Als Tabelle anzeigen"}
                className="h-7 text-xs"
              >
                {showTable ? "Liste" : "Tabelle"}
              </Button>
            </div>
            
            {showMeasurementList && (
              <div style={tableContainerStyle}>
                {showTable ? (
                  <MeasurementTable 
                    measurements={measurements}
                    toggleMeasurementVisibility={toggleMeasurementVisibility}
                    handleDeleteMeasurement={handleDeleteMeasurement}
                  />
                ) : (
                  <MeasurementList 
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
                    handleMoveMeasurementUp={handleMoveMeasurementUp}
                    handleMoveMeasurementDown={handleMoveMeasurementDown}
                    showTable={showTable}
                  />
                )}
              </div>
            )}
          </CollapsibleSection>
        )}
      </div>
    </ScrollArea>
  );
};

export default MeasurementToolControls;
