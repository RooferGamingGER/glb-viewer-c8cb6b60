
import React, { useEffect, useState } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Measurement } from '@/hooks/useMeasurements'; 
import MeasurementList from './MeasurementList';
import MeasurementTable from './MeasurementTable';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
  movingPointInfo?: { measurementId: string; pointIndex: number } | null;
  showTable: boolean;
  handleClearMeasurements: () => void;
  activeMode?: string;
}

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
  handleClearMeasurements,
  activeMode
}) => {
  const [activeTab, setActiveTab] = useState<string>("standard");
  
  // Sync the active tab with the current measurement tool when appropriate
  useEffect(() => {
    if (!activeMode || activeMode === 'none') return;
    
    if (['length', 'height', 'area'].includes(activeMode)) {
      setActiveTab("standard");
    } else if (['solar', 'gutter'].includes(activeMode)) {
      setActiveTab("roofElements");
    } else if (['skylight', 'chimney', 'vent', 'hook', 'other'].includes(activeMode)) {
      setActiveTab("penetrations");
    }
  }, [activeMode]);
  
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-2 pb-1">
        <h2 className="text-md font-semibold">Messungen</h2>
        {measurements.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 mr-1" />
                Alle löschen
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Alle Messungen löschen?</AlertDialogTitle>
                <AlertDialogDescription>
                  Diese Aktion kann nicht rückgängig gemacht werden. Alle Messungen werden dauerhaft gelöscht.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearMeasurements}>
                  Alle löschen
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
      
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full pr-2">
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
        </ScrollArea>
      </div>
    </div>
  );
};

export default MeasurementSidebar;
