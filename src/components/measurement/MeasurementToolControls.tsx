
import React, { useState, useRef } from 'react';
import { Measurement } from '@/hooks/useMeasurements';
import { ScrollArea } from '@/components/ui/scroll-area';
import MeasurementList from './MeasurementList';
import MeasurementTable from './MeasurementTable';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { FileText, Trash2 } from 'lucide-react';
import { MeasurementMode } from '@/types/measurements';
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
// Replace CollapsibleSection import with the SidebarGroup components
import { SidebarGroup, SidebarGroupLabel, SidebarGroupContent } from "@/components/ui/collapsible-section";
import MeasurementToolbar from './MeasurementToolbar';
import SolarToolbar from './SolarToolbar';
import RoofElementsToolbar from './RoofElementsToolbar';
import GenerateRoofPlanButton from './GenerateRoofPlanButton';
import ExportPdfButton from './ExportPdfButton';


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
  toggleMeasurementTool,
  movingPointInfo,
  handleClearMeasurements,
  toggleAllMeasurementsVisibility,
  toggleAllLabelsVisibility,
  allMeasurementsVisible,
  allLabelsVisible,
  showTable,
  setShowTable,
  handleMoveMeasurementUp,
  handleMoveMeasurementDown,
  showMeasurementList = true
}) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("tools"); // Changed from "measurements" to "tools"
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const handleCategoryClick = (category: MeasurementMode) => {
    setActiveCategory(category);
    setActiveTab("measurements");
  };
  
  // Function to export measurements as CSV
  const exportMeasurementsAsCSV = () => {
    if (!measurements || measurements.length === 0) {
      toast({
        title: "Fehler",
        description: "Keine Messungen für den Export vorhanden",
        variant: "destructive"
      });
      return;
    }
    
    // CSV headers
    let csvContent = 'ID,Typ,Wert,Punkte\n';
    
    // Add each measurement
    measurements.forEach(m => {
      const type = m.type;
      const value = m.value || 0;
      const pointsStr = m.points ? m.points.map((p: any) => 
        `(${p.x.toFixed(2)},${p.y.toFixed(2)},${p.z.toFixed(2)})`
      ).join(' ') : '';
      
      csvContent += `${m.id},"${type}",${value.toFixed(2)},"${pointsStr}"\n`;
    });
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.href = url;
    link.setAttribute('download', `Messungen_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "CSV-Export erfolgreich",
      description: "Die CSV-Datei wurde heruntergeladen"
    });
  };
  
  // Style for table mode to prevent sidebar overflow - fixing the TypeScript error
  const tableContainerStyle = showTable ? { 
    maxWidth: '100%', 
    overflowX: 'auto' as const  // Using 'as const' to specify the correct type
  } : {};
  
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
              toggleMeasurementTool={toggleMeasurementTool || ((mode) => {
                console.log('Toggle measurement tool', mode);
                // Default implementation if not provided
              })}
              measurements={measurements}
              handleClearMeasurements={handleClearMeasurements}
              onCategoryClick={handleCategoryClick}
              toggleAllLabelsVisibility={toggleAllLabelsVisibility}
              allLabelsVisible={allLabelsVisible}
            />
            
            {/* Add the new Solar toolbar between measurement tools and roof elements */}
            <SolarToolbar 
              activeMode={activeMode}
              toggleMeasurementTool={toggleMeasurementTool || ((mode) => {
                console.log('Toggle measurement tool', mode);
                // Default implementation if not provided
              })}
              editMeasurementId={editMeasurementId}
            />
            
            <RoofElementsToolbar 
              activeMode={activeMode}
              toggleMeasurementTool={toggleMeasurementTool || ((mode) => {
                console.log('Toggle measurement tool', mode);
                // Default implementation if not provided
              })}
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
            
            {/* Export options - Only in Measurements tab */}
            {measurements && measurements.length > 0 && (
              <div className="flex flex-col gap-2 mb-4 border-b pb-3">
                <div className="text-xs text-muted-foreground mb-1">
                  Exportoptionen:
                </div>
                
                {/* Roof plan generation button */}
                <GenerateRoofPlanButton measurements={measurements} />
                
                {/* CSV Export button */}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={exportMeasurementsAsCSV}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  CSV Export
                </Button>
                
                {/* PDF Export button */}
                <ExportPdfButton measurements={measurements} />
              </div>
            )}
            
            {showMeasurementList && (
              <div style={tableContainerStyle}>
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
                      showTable={showTable}
                    />
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </ScrollArea>
  );
};

export default MeasurementToolControls;
