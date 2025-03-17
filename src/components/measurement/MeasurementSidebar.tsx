
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Ruler, 
  Square, 
  ArrowUpDown, 
  X, 
  Check, 
  Undo2, 
  Table, 
  Trash2, 
  FileDown, 
  Copy,
  Download
} from 'lucide-react';

import { MeasurementMode, Point, Measurement } from '@/hooks/useMeasurements';
import MeasurementList from './MeasurementList';
import MeasurementTable from './MeasurementTable';
import EditingAlert from './EditingAlert';
import { exportMeasurementsToCSV } from '@/utils/exportUtils';

interface MeasurementSidebarProps {
  enabled: boolean;
  measurements: Measurement[];
  currentPoints: Point[];
  activeMode: MeasurementMode;
  toggleMeasurementTool: (mode: MeasurementMode) => void;
  toggleMeasurementVisibility: (id: string) => void;
  handleStartPointEdit: (id: string) => void;
  handleDeleteMeasurement: (id: string) => void;
  handleDeletePoint?: (measurementId: string, pointIndex: number) => void;
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
  handleDeletePoint,
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
  const [showTable, setShowTable] = useState<boolean>(false);
  
  const editingAreaMeasurement = React.useMemo(() => {
    if (!editMeasurementId) return false;
    const measurement = measurements.find(m => m.id === editMeasurementId);
    return measurement?.type === 'area';
  }, [editMeasurementId, measurements]);

  const handleDownload = () => {
    if (measurements.length === 0) return;
    exportMeasurementsToCSV(measurements);
  };

  return (
    <div 
      className={`absolute top-0 right-0 h-full w-80 glass-panel border-l border-border/50 transition-transform duration-300 pointer-events-auto flex flex-col ${!enabled ? 'translate-x-full' : ''}`}
    >
      <div className="flex flex-col h-full">
        <div className="p-3 border-b border-border/50 flex-shrink-0">
          <div className="text-lg font-medium mb-2">Messwerkzeuge</div>
          
          <div className="flex space-x-2">
            <Button
              variant={activeMode === 'length' ? "default" : "outline"} 
              size="sm"
              className="flex-1"
              onClick={() => toggleMeasurementTool('length')}
              disabled={!!editMeasurementId}
              title="Längenmessung"
            >
              <Ruler className="h-4 w-4 mr-1" />
              Länge
            </Button>
            
            <Button
              variant={activeMode === 'height' ? "default" : "outline"} 
              size="sm"
              className="flex-1"
              onClick={() => toggleMeasurementTool('height')}
              disabled={!!editMeasurementId}
              title="Höhenmessung"
            >
              <ArrowUpDown className="h-4 w-4 mr-1" />
              Höhe
            </Button>
            
            <Button
              variant={activeMode === 'area' ? "default" : "outline"} 
              size="sm"
              className="flex-1"
              onClick={() => toggleMeasurementTool('area')}
              disabled={!!editMeasurementId}
              title="Flächenmessung"
            >
              <Square className="h-4 w-4 mr-1" />
              Fläche
            </Button>
          </div>
          
          {measurements.length > 0 && (
            <div className="flex space-x-2 mt-2">
              <Button
                variant="outline" 
                size="sm"
                className="flex-1"
                onClick={() => setShowTable(!showTable)}
              >
                <Table className="h-4 w-4 mr-1" />
                {showTable ? "Liste anzeigen" : "Tabelle anzeigen"}
              </Button>
              
              <Button
                variant="outline" 
                size="sm"
                className="flex-1"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4 mr-1" />
                CSV Export
              </Button>
            </div>
          )}
          
          {measurements.length > 0 && (
            <Button
              variant="outline" 
              size="sm"
              className="w-full mt-2"
              onClick={() => {
                const exportButton = document.querySelector('[data-export-pdf-button]');
                if (exportButton instanceof HTMLElement) {
                  exportButton.click();
                }
              }}
            >
              <FileDown className="h-4 w-4 mr-1" />
              PDF Export
            </Button>
          )}
          
          {activeMode !== 'none' && (
            <div className="mt-3 p-2 border border-primary/30 rounded-md bg-primary/5">
              <div className="text-sm font-medium mb-2">
                {activeMode === 'length' && "Längenmessung aktiv"}
                {activeMode === 'height' && "Höhenmessung aktiv"}
                {activeMode === 'area' && "Flächenmessung aktiv"}
                <span className="text-xs text-muted-foreground ml-2">
                  ({currentPoints.length} Punkte)
                </span>
              </div>
              
              <div className="flex space-x-1 mb-1">
                {activeMode === 'area' && (
                  <>
                    <Button
                      variant="default" 
                      size="sm"
                      className="flex-1"
                      onClick={handleFinalizeMeasurement}
                      disabled={currentPoints.length < 3}
                      title="Messung abschließen"
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Abschließen
                    </Button>
                    
                    <Button
                      variant="outline" 
                      size="sm"
                      className="flex-1"
                      onClick={handleUndoLastPoint}
                      disabled={currentPoints.length === 0}
                      title="Letzten Punkt rückgängig machen"
                    >
                      <Undo2 className="h-3 w-3 mr-1" />
                      Rückgängig
                    </Button>
                  </>
                )}
                
                <Button
                  variant="outline" 
                  size="sm"
                  className={activeMode === 'area' ? "w-9" : "flex-1"}
                  onClick={() => {
                    clearCurrentPoints();
                    if (activeMode !== 'area') {
                      toggleMeasurementTool('none');
                    }
                  }}
                  title="Abbrechen"
                >
                  <X className="h-3 w-3" />
                  {activeMode !== 'area' && <span className="ml-1">Abbrechen</span>}
                </Button>
              </div>
              
              {activeMode === 'area' && (
                <div className="text-xs text-muted-foreground mt-1">
                  Klicken Sie auf die Punkte, um eine Fläche zu definieren. 
                  Mindestens 3 Punkte werden benötigt.
                </div>
              )}
            </div>
          )}
          
          {
            (editMeasurementId || editingSegmentId || movingPointInfo) && (
            <EditingAlert 
              editMeasurementId={editMeasurementId}
              editingSegmentId={editingSegmentId}
              movingPointInfo={movingPointInfo}
              handleCancelEditing={handleCancelEditing}
              editingAreaMeasurement={editingAreaMeasurement}
            />
          )}
        </div>
        
        <ScrollArea className="flex-1 overflow-auto">
          <div className="p-3">
            <div className="mb-3 flex justify-between items-center">
              <div className="text-base font-medium">
                {showTable ? "Messungen (Tabelle)" : "Messungen"}
              </div>
              
              {measurements.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2"
                  onClick={handleClearMeasurements}
                  disabled={!!editMeasurementId}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Alle löschen
                </Button>
              )}
            </div>
            
            {showTable ? (
              <MeasurementTable measurements={measurements} />
            ) : (
              <MeasurementList 
                measurements={measurements}
                toggleMeasurementVisibility={toggleMeasurementVisibility}
                handleStartPointEdit={handleStartPointEdit}
                handleDeleteMeasurement={handleDeleteMeasurement}
                handleDeletePoint={handleDeletePoint}
                updateMeasurement={updateMeasurement}
                editMeasurementId={editMeasurementId}
                segmentsOpen={segmentsOpen}
                toggleSegments={toggleSegments}
                onEditSegment={setEditingSegmentId}
                movingPointInfo={movingPointInfo}
              />
            )}
            
            {measurements.length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                Keine Messungen vorhanden
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default MeasurementSidebar;
