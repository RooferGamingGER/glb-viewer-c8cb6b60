
import React, { useEffect, useState } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Measurement } from '@/types/measurements'; 
import MeasurementList from './MeasurementList';
import MeasurementTable from './MeasurementTable';
import { Button } from '@/components/ui/button';
import { Trash2, Magnet } from 'lucide-react';
import ExportPdfButton from './ExportPdfButton';
import GenerateRoofPlanButton from './GenerateRoofPlanButton';
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
import { Toggle } from "@/components/ui/toggle";
import { useToast } from "@/components/ui/use-toast";
import { usePointSnapping } from '@/hooks/usePointSnapping';
import * as THREE from 'three';

interface MeasurementSidebarProps {
  measurements: Measurement[];
  toggleMeasurementVisibility: (id: string) => void;
  toggleLabelVisibility?: (id: string) => void; // Keep for backward compatibility but we won't use it
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
  toggleAllLabelsVisibility?: () => void; // Keep for backward compatibility but we won't use it
  allLabelsVisible?: boolean; // Keep for backward compatibility but we won't use it
  activeMode?: string;
  handleMoveMeasurementUp?: (id: string) => void;
  handleMoveMeasurementDown?: (id: string) => void;
  measurementGroups?: THREE.Group[];
}

const MeasurementSidebar: React.FC<MeasurementSidebarProps> = ({ 
  measurements,
  toggleMeasurementVisibility,
  toggleLabelVisibility,
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
  toggleAllLabelsVisibility,
  allLabelsVisible,
  activeMode,
  handleMoveMeasurementUp,
  handleMoveMeasurementDown,
  measurementGroups
}) => {
  const [activeTab, setActiveTab] = useState<string>("standard");
  const { toast } = useToast();
  
  // Use our improved snapping hook
  const { snapEnabled, setSnapEnabled } = usePointSnapping(null);
  
  useEffect(() => {
    if (!activeMode || activeMode === 'none') return;
    
    const lastActiveMode = localStorage.getItem('lastActiveMode');
    
    if (lastActiveMode === activeMode) return;
    
    if (['length', 'height', 'area'].includes(activeMode)) {
      setActiveTab("standard");
    } else if (['solar', 'chimney', 'skylight'].includes(activeMode)) {
      setActiveTab("roofElements");
    } else if (['vent', 'hook', 'other'].includes(activeMode)) {
      setActiveTab("penetrations");
    }
    
    localStorage.setItem('lastActiveMode', activeMode);
  }, [activeMode]);
  
  const handleToggleSnap = () => {
    const newValue = !snapEnabled;
    setSnapEnabled(newValue);
    toast({
      title: newValue ? "Punktfang aktiviert" : "Punktfang deaktiviert",
      description: newValue 
        ? "Punkte rasten automatisch ein wenn sie sich in der Nähe vorhandener Punkte befinden" 
        : "Punkte werden exakt an der geklickten Position platziert",
      duration: 3000
    });
  };
  
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 pt-2 pb-1">
        <h2 className="text-md font-semibold">Messungen</h2>
        <div className="flex space-x-1">
          <Toggle
            pressed={snapEnabled}
            onPressedChange={handleToggleSnap}
            size="sm"
            variant="outline"
            aria-label="Punktfang ein/aus"
            title="Punktfang ein/aus"
            className="h-7 text-xs"
          >
            <Magnet className="h-3.5 w-3.5 mr-1" />
            Punktfang
          </Toggle>
          
          {measurements.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="h-7 text-xs">
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
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
      </div>
      
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full pr-2">
          {showTable ? (
            <MeasurementTable 
              measurements={measurements} 
              toggleMeasurementVisibility={toggleMeasurementVisibility} 
              handleDeleteMeasurement={handleDeleteMeasurement}
              handleStartPointEdit={handleStartPointEdit}
              editMeasurementId={editMeasurementId}
              onMoveUp={handleMoveMeasurementUp}
              onMoveDown={handleMoveMeasurementDown}
            />
          ) : (
            <MeasurementList 
              measurements={measurements}
              toggleMeasurementVisibility={toggleMeasurementVisibility}
              toggleLabelVisibility={toggleLabelVisibility || (() => {})} // Provide an empty function as fallback
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
            />
          )}
          
          {measurements.length > 0 && (
            <div className="mt-4 space-y-2 px-2">
              <GenerateRoofPlanButton measurements={measurements} />
              <ExportPdfButton measurements={measurements} />
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
};

export default MeasurementSidebar;
