
import React, { useState, useRef } from 'react';
import { Measurement } from '@/hooks/useMeasurements';
import { ScrollArea } from '@/components/ui/scroll-area';
import MeasurementList from './MeasurementList';
import MeasurementTable from './MeasurementTable';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Trash2, Eye, EyeOff } from 'lucide-react';
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
import { Separator } from "@/components/ui/separator";
import CollapsibleSection from '@/components/ui/collapsible-section';
import MeasurementToolbar from './MeasurementToolbar';
import RoofElementsToolbar from './RoofElementsToolbar';

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
  activeMode: string;
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
}

const MeasurementToolControls: React.FC<MeasurementToolControlsProps> = ({
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
  activeMode,
  movingPointInfo,
  handleClearMeasurements,
  toggleAllMeasurementsVisibility,
  toggleAllLabelsVisibility,
  allMeasurementsVisible,
  allLabelsVisible,
  showTable,
  setShowTable,
  handleMoveMeasurementUp,
  handleMoveMeasurementDown
}) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("measurements");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const handleCategoryClick = (category: string) => {
    setActiveCategory(category);
    setActiveTab("measurements");
  };
  
  return (
    <ScrollArea className="flex-1 h-full">
      <div className="p-3 flex flex-col h-full">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium">Messwerkzeuge</h3>
          
          <div className="flex gap-1">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={measurements.length === 0 || !!editMeasurementId}
                  title="Alle Messungen löschen"
                  className="h-7"
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Alle Messungen löschen?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Möchten Sie wirklich alle Messungen löschen? Diese Aktion kann nicht rückgängig gemacht werden.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => {
                      handleClearMeasurements();
                      toast({
                        title: "Messungen gelöscht",
                        description: "Alle Messungen wurden erfolgreich gelöscht."
                      });
                    }}
                  >
                    Löschen
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            
            {toggleAllLabelsVisibility && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={toggleAllLabelsVisibility}
                title={allLabelsVisible ? "Alle Labels ausblenden" : "Alle Labels einblenden"}
                className="h-7"
              >
                {allLabelsVisible ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
              </Button>
            )}
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="w-full grid grid-cols-2 h-8 mb-3">
            <TabsTrigger value="tools">Werkzeuge</TabsTrigger>
            <TabsTrigger value="measurements">
              Messungen 
              {measurements.length > 0 && <span className="ml-1 text-muted-foreground text-xs">({measurements.length})</span>}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="tools" className="flex-1 m-0 space-y-3">
            <MeasurementToolbar 
              activeMode={activeMode} 
              toggleMeasurementTool={function (mode: any): void {
                // This is just a stub implementation as the real function would be passed from the parent
              } } 
              editMeasurementId={editMeasurementId}
              onCategoryClick={handleCategoryClick}
            />
            
            <RoofElementsToolbar 
              activeMode={activeMode}
              toggleMeasurementTool={function (mode: any): void {
                // This is just a stub implementation as the real function would be passed from the parent
              } }
              editMeasurementId={editMeasurementId}
            />
          </TabsContent>
          
          <TabsContent value="measurements" className="flex-1 m-0">
            <div className="flex mb-3 items-center justify-between">
              <div className="text-sm font-medium">
                {activeCategory ? (
                  <Button 
                    variant="link" 
                    className="p-0 h-auto text-sm -ml-3" 
                    onClick={() => setActiveCategory(null)}
                  >
                    ← Zurück zu allen Messungen
                  </Button>
                ) : (
                  "Alle Messungen"
                )}
              </div>
              
              <div className="flex gap-1">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowTable(!showTable)}
                  title={showTable ? "Als Liste anzeigen" : "Als Tabelle anzeigen"}
                  className="h-7"
                >
                  {showTable ? "Liste" : "Tabelle"}
                </Button>
              </div>
            </div>
            
            {showTable ? (
              <MeasurementTable 
                measurements={measurements}
                toggleMeasurementVisibility={toggleMeasurementVisibility}
                handleDeleteMeasurement={handleDeleteMeasurement}
              />
            ) : (
              <div className="flex-1">
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
                  activeCategory={activeCategory || undefined}
                />
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </ScrollArea>
  );
};

export default MeasurementToolControls;
