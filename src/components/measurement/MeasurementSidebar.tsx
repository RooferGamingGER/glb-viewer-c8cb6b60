
import React, { useEffect, useState } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Measurement } from '@/hooks/useMeasurements'; 
import MeasurementList from './MeasurementList';
import MeasurementTable from './MeasurementTable';
import { Button } from '@/components/ui/button';
import { BookmarkX, EyeIcon, EyeOff, Trash2 } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface MeasurementSidebarProps {
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
  movingPointInfo?: { measurementId: string; pointIndex: number } | null;
  showTable: boolean;
  handleClearMeasurements: () => void;
  toggleAllLabelsVisibility: () => void;
  allLabelsVisible: boolean;
  activeMode?: string;
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
  activeMode
}) => {
  const [activeTab, setActiveTab] = useState<string>("standard");
  
  // Filter measurements based on active tab with corrected categorization
  const filteredMeasurements = measurements.filter(m => {
    if (activeTab === "standard") {
      return ['length', 'height', 'area'].includes(m.type);
    } else if (activeTab === "roofElements") {
      return ['skylight', 'chimney', 'solar'].includes(m.type);
    } else if (activeTab === "penetrations") {
      return ['vent', 'hook', 'other'].includes(m.type);
    }
    return true;
  });
  
  // Sync the active tab with the current measurement tool when appropriate
  useEffect(() => {
    if (!activeMode || activeMode === 'none') return;
    
    if (['length', 'height', 'area'].includes(activeMode)) {
      setActiveTab("standard");
    } else if (['solar', 'chimney', 'skylight'].includes(activeMode)) {
      setActiveTab("roofElements");
    } else if (['vent', 'hook', 'other'].includes(activeMode)) {
      setActiveTab("penetrations");
    }
  }, [activeMode]);
  
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 pt-2 pb-1">
        <h2 className="text-md font-semibold">Messungen</h2>
        <div className="flex space-x-1">
          <Button 
            variant="outline" 
            size="sm"
            onClick={toggleAllLabelsVisibility}
            title={allLabelsVisible ? "Alle Labels ausblenden" : "Alle Labels einblenden"}
            className="h-7 w-7 p-0"
          >
            {allLabelsVisible ? <BookmarkX className="h-3.5 w-3.5" /> : <EyeIcon className="h-3.5 w-3.5" />}
          </Button>
          
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
      
      <div className="px-3 pb-2">
        <Tabs defaultValue="standard" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 w-full text-xs h-8">
            <TabsTrigger value="standard">Standard</TabsTrigger>
            <TabsTrigger value="roofElements">Dachelemente</TabsTrigger>
            <TabsTrigger value="penetrations">Einbauten</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full pr-2">
          {showTable ? (
            <MeasurementTable 
              measurements={filteredMeasurements} 
              toggleMeasurementVisibility={toggleMeasurementVisibility} 
              toggleLabelVisibility={toggleLabelVisibility}
              handleDeleteMeasurement={handleDeleteMeasurement}
            />
          ) : (
            <MeasurementList 
              measurements={filteredMeasurements}
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
            />
          )}
        </ScrollArea>
      </div>
    </div>
  );
};

export default MeasurementSidebar;
