import React, { useState, useRef } from 'react';
import { Measurement } from '@/hooks/useMeasurements';
import { ScrollArea } from '@/components/ui/scroll-area';
import MeasurementList from './MeasurementList';
import MeasurementTable from './MeasurementTable';
import { Button } from '@/components/ui/button';
import { Ruler, ArrowUpDown, Square, MinusSquare, Trash2 } from 'lucide-react';
import { MeasurementMode } from '@/types/measurements';
import { useToast } from "@/components/ui/use-toast";
import MeasurementControls from './MeasurementControls';
import { smartToast } from '@/utils/smartToast';
import CollapsibleSection from '@/components/ui/collapsible-section';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { Point } from '@/types/measurements';

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
  // New props for inline measurement controls
  currentPoints?: Point[];
  handleFinalizeMeasurement?: () => void;
  handleUndoLastPoint?: () => void;
  clearCurrentPoints?: () => void;
}

const MeasurementToolControls: React.FC<MeasurementToolControlsProps> = ({
  measurements, toggleMeasurementVisibility, toggleLabelVisibility,
  handleStartPointEdit, handleDeleteMeasurement, handleDeletePoint,
  updateMeasurement, editMeasurementId, segmentsOpen, toggleSegments,
  onEditSegment, activeMode, toggleMeasurementTool, movingPointInfo,
  handleClearMeasurements, toggleAllMeasurementsVisibility,
  toggleAllLabelsVisibility, allMeasurementsVisible, allLabelsVisible,
  showTable, setShowTable, handleMoveMeasurementUp, handleMoveMeasurementDown,
  showMeasurementList = true,
  currentPoints, handleFinalizeMeasurement, handleUndoLastPoint, clearCurrentPoints
}) => {
  const { toast } = useToast();
  
  const selectTool = (mode: MeasurementMode) => {
    if (!toggleMeasurementTool) return;
    toggleMeasurementTool(mode);
    const messages: Record<string, string> = {
      length: 'Längenmessung – 2 Punkte setzen',
      height: 'Höhenmessung – 2 Punkte setzen',
      area: 'Flächenmessung – mind. 3 Punkte',
      deductionarea: 'Abzugsfläche – mind. 3 Punkte',
    };
    if (activeMode === mode) {
      smartToast.guidance('Werkzeug deaktiviert');
    } else if (messages[mode]) {
      smartToast.guidance(messages[mode]);
    }
  };

  const toolBtnClass = (mode: MeasurementMode) =>
    `flex-1 h-9 text-xs gap-1.5 ${activeMode === mode ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-background hover:bg-accent border border-border/50'}`;

  const tableContainerStyle = showTable ? { 
    maxWidth: '100%', overflowX: 'auto' as const
  } : {};
  
  return (
    <ScrollArea className="flex-1 h-full">
      <div className="p-3 flex flex-col h-full gap-3">
        {/* Measurement tools */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-medium text-muted-foreground">Messwerkzeuge</h3>
            {measurements.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" title="Alle löschen">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Alle Messungen löschen?</AlertDialogTitle>
                    <AlertDialogDescription>Diese Aktion kann nicht rückgängig gemacht werden.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearMeasurements}>Löschen</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
          <div className="grid grid-cols-2 gap-1">
            <Button variant="ghost" size="sm" className={toolBtnClass('length')} onClick={() => selectTool('length')} disabled={!!editMeasurementId}>
              <Ruler className="h-3.5 w-3.5" /> Länge
            </Button>
            <Button variant="ghost" size="sm" className={toolBtnClass('height')} onClick={() => selectTool('height')} disabled={!!editMeasurementId}>
              <ArrowUpDown className="h-3.5 w-3.5" /> Höhe
            </Button>
            <Button variant="ghost" size="sm" className={toolBtnClass('area')} onClick={() => selectTool('area')} disabled={!!editMeasurementId}>
              <Square className="h-3.5 w-3.5" /> Fläche
            </Button>
            <Button variant="ghost" size="sm" className={toolBtnClass('deductionarea')} onClick={() => selectTool('deductionarea')} disabled={!!editMeasurementId}>
              <MinusSquare className="h-3.5 w-3.5" /> Abzug
            </Button>
          </div>
        </div>

        {/* Inline measurement controls (finalize/undo/cancel) */}
        {currentPoints && currentPoints.length > 0 && handleFinalizeMeasurement && handleUndoLastPoint && clearCurrentPoints && (
          <MeasurementControls
            activeMode={activeMode}
            currentPoints={currentPoints}
            handleFinalizeMeasurement={handleFinalizeMeasurement}
            handleUndoLastPoint={handleUndoLastPoint}
            clearCurrentPoints={clearCurrentPoints}
          />
        )}

        {/* Measurements list - collapsible */}
        {measurements.length > 0 && (
          <CollapsibleSection title={`Messungen (${measurements.length})`} defaultOpen={true}>
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
