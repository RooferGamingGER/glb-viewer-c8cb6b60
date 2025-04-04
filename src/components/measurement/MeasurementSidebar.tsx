
import React, { useEffect, useState } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Measurement } from '@/hooks/useMeasurements'; 
import MeasurementList from './MeasurementList';
import MeasurementTable from './MeasurementTable';
import { Button } from '@/components/ui/button';
import { Trash2, Sun } from 'lucide-react';
import ExportPdfButton from './ExportPdfButton';
import GenerateRoofPlanButton from './GenerateRoofPlanButton';
import * as THREE from 'three';
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
import { useToast } from "@/components/ui/use-toast";
import { usePointSnapping } from '@/contexts/PointSnappingContext';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  
  // Use our centralized point snapping hook
  const { snapEnabled } = usePointSnapping();
  
  // Count measurements by type for display in tabs
  const standardCount = measurements.filter(m => 
    ['length', 'height', 'area'].includes(m.type)).length;
  
  const roofElementsCount = measurements.filter(m => 
    ['solar', 'chimney', 'skylight', 'pvmodule', 'pvplanning'].includes(m.type)).length;
  
  const penetrationsCount = measurements.filter(m => 
    ['vent', 'hook', 'other'].includes(m.type)).length;
  
  useEffect(() => {
    if (!activeMode || activeMode === 'none') return;
    
    const lastActiveMode = localStorage.getItem('lastActiveMode');
    
    if (lastActiveMode === activeMode) return;
    
    if (['length', 'height', 'area'].includes(activeMode)) {
      setActiveTab("standard");
    } else if (['solar', 'chimney', 'skylight', 'pvplanning'].includes(activeMode)) {
      setActiveTab("roofElements");
    } else if (['vent', 'hook', 'other'].includes(activeMode)) {
      setActiveTab("penetrations");
    }
    
    localStorage.setItem('lastActiveMode', activeMode);
  }, [activeMode]);
  
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 pt-2 pb-1">
        <h2 className="text-md font-semibold">Messungen</h2>
        <div className="flex space-x-1">
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
          {!showTable && (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
              <TabsList className="w-full grid grid-cols-3 mb-2">
                <TabsTrigger value="standard" className="text-xs py-1 px-2">
                  Standard ({standardCount})
                </TabsTrigger>
                <TabsTrigger value="roofElements" className="text-xs py-1 px-2">
                  D-Elemente ({roofElementsCount})
                </TabsTrigger>
                <TabsTrigger value="penetrations" className="text-xs py-1 px-2">
                  Einbau ({penetrationsCount})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}
          
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
              activeTab={activeTab}
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
