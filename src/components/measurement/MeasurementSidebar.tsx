
import React from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Trash2 } from 'lucide-react';
import { Measurement, Point } from '@/hooks/useMeasurements';
import MeasurementList from './MeasurementList';
import MeasurementTable from './MeasurementTable';

interface MeasurementSidebarProps {
  measurements: Measurement[];
  toggleMeasurementVisibility: (id: string) => void;
  handleStartPointEdit: (id: string) => void;
  handleDeleteMeasurement: (id: string) => void;
  handleDeletePoint?: (measurementId: string, pointIndex: number) => void;
  updateMeasurement: (id: string, data: Partial<Measurement>) => void;
  editMeasurementId: string | null;
  segmentsOpen: Record<string, boolean>;
  toggleSegments: (id: string) => void;
  onEditSegment: (id: string | null) => void;
  movingPointInfo: { measurementId: string; pointIndex: number } | null;
  showTable: boolean;
  handleClearMeasurements: () => void;
}

/**
 * Component for displaying measurements in a sidebar
 */
const MeasurementSidebar: React.FC<MeasurementSidebarProps> = ({
  measurements,
  toggleMeasurementVisibility,
  handleStartPointEdit,
  handleDeleteMeasurement,
  handleDeletePoint,
  updateMeasurement,
  editMeasurementId,
  segmentsOpen,
  toggleSegments,
  onEditSegment,
  movingPointInfo,
  showTable,
  handleClearMeasurements
}) => {
  return (
    <>
      {/* Fixed title bar for measurements */}
      <div className="flex-shrink-0 p-3 border-t border-b border-border/50 flex justify-between items-center">
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
      
      {/* Scrollable content area */}
      <ScrollArea className="flex-1 overflow-auto">
        <div className="p-3">
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
              onEditSegment={onEditSegment}
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
    </>
  );
};

export default MeasurementSidebar;
