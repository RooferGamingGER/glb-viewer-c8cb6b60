
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { 
  Ruler, 
  ArrowUpDown, 
  Square, 
  Download,
  Sun,
  SplitSquareVertical,
  Cylinder,
  Wind,
  Anchor,
  Droplet,
  Magnet,
  Wrench,
  LineChart,
  FileDown,
  Home,
  LayoutGrid
} from 'lucide-react';
import { MeasurementMode } from '@/types/measurements';
import ExportPdfButton from './ExportPdfButton';
import { exportMeasurementsToCSV } from '@/utils/exportUtils';
import { Separator } from "@/components/ui/separator";
import GenerateRoofPlanButton from './GenerateRoofPlanButton';
import { Toggle } from "@/components/ui/toggle";
import { usePointSnapping } from '@/contexts/PointSnappingContext';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import MeasurementList from './MeasurementList';

interface MeasurementToolControlsProps {
  activeMode: MeasurementMode;
  toggleMeasurementTool: (mode: MeasurementMode) => void;
  editMeasurementId: string | null;
  measurements: any[];
  showTable: boolean;
  setShowTable: (show: boolean) => void;
  onCategoryChange?: (category: string) => void;
  toggleMeasurementVisibility?: (id: string) => void;
  toggleLabelVisibility?: (id: string) => void;
  handleStartPointEdit?: (id: string) => void;
  handleDeleteMeasurement?: (id: string) => void;
  handleDeletePoint?: (measurementId: string, pointIndex: number) => void;
  updateMeasurement?: (id: string, data: Partial<any>) => void;
  segmentsOpen?: Record<string, boolean>;
  toggleSegments?: (id: string) => void;
  onEditSegment?: (id: string | null) => void;
  movingPointInfo?: { measurementId: string; pointIndex: number } | null;
  handleMoveMeasurementUp?: (id: string) => void;
  handleMoveMeasurementDown?: (id: string) => void;
}

/**
 * Controls for measurement tools selection
 */
const MeasurementToolControls: React.FC<MeasurementToolControlsProps> = ({
  activeMode,
  toggleMeasurementTool,
  editMeasurementId,
  measurements,
  showTable,
  setShowTable,
  onCategoryChange,
  toggleMeasurementVisibility,
  toggleLabelVisibility,
  handleStartPointEdit,
  handleDeleteMeasurement,
  handleDeletePoint,
  updateMeasurement,
  segmentsOpen,
  toggleSegments,
  onEditSegment,
  movingPointInfo,
  handleMoveMeasurementUp,
  handleMoveMeasurementDown
}) => {
  const { snapEnabled, setSnapEnabled } = usePointSnapping();
  
  const [activeTab, setActiveTab] = useState<string>("tools");
  const [activeCategory, setActiveCategory] = useState<string | undefined>(undefined);
  
  const handleDownload = () => {
    if (measurements.length === 0) return;
    exportMeasurementsToCSV(measurements);
  };
  
  const handleToggleSnap = () => {
    const newValue = !snapEnabled;
    setSnapEnabled(newValue);
    toast.info(newValue 
      ? "Punktfang aktiviert: Punkte rasten automatisch ein" 
      : "Punktfang deaktiviert: Punkte werden exakt platziert"
    );
  };

  const handleCategoryChange = (category: string | undefined) => {
    setActiveCategory(category === activeCategory ? undefined : category);
    if (onCategoryChange) {
      onCategoryChange(category === activeCategory ? '' : category);
    }
  };

  // Count measurements by category
  const dachCount = measurements.filter(m => ['length', 'height', 'area'].includes(m.type)).length;
  const solarCount = measurements.filter(m => ['solar'].includes(m.type)).length;
  const dachelementeCount = measurements.filter(m => ['skylight', 'chimney'].includes(m.type)).length;
  const einbautenCount = measurements.filter(m => ['vent', 'hook', 'other'].includes(m.type)).length;

  return (
    <div className="p-3 flex flex-col h-full overflow-hidden">
      <Tabs defaultValue="tools" value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col h-full">
        <TabsList className="w-full grid grid-cols-3 mb-4 flex-shrink-0">
          <TabsTrigger value="tools" className="flex items-center">
            <Wrench className="h-4 w-4 mr-2" />
            Werkzeuge
          </TabsTrigger>
          <TabsTrigger value="measurements" className="flex items-center">
            <LineChart className="h-4 w-4 mr-2" />
            Messungen
          </TabsTrigger>
          <TabsTrigger value="export" className="flex items-center">
            <FileDown className="h-4 w-4 mr-2" />
            Export
          </TabsTrigger>
        </TabsList>
        
        <ScrollArea className="flex-1 pr-2">
          <TabsContent value="tools" className="space-y-4 mt-0 h-full flex flex-col">
            {/* Punktfang toggle moved to the top */}
            <div className="flex-shrink-0">
              <Toggle
                pressed={snapEnabled}
                onPressedChange={handleToggleSnap}
                size="sm"
                variant={snapEnabled ? "customActive" : "outline"}
                aria-label="Punktfang ein/aus"
                title={snapEnabled ? "Punktfang deaktivieren" : "Punktfang aktivieren"}
                className="w-full justify-start"
              >
                <Magnet className={`h-4 w-4 mr-2 ${!snapEnabled ? 'text-muted-foreground' : ''}`} />
                Punktfang {snapEnabled ? 'Ein' : 'Aus'}
              </Toggle>
            </div>
            
            <div className="flex-shrink-0">
              <div className="text-sm font-medium mb-2">Messwerkzeuge</div>
              <div className="space-y-2">
                <Button
                  variant={activeMode === 'length' ? "default" : "outline"} 
                  size="sm"
                  className="w-full flex justify-start"
                  onClick={() => toggleMeasurementTool('length')}
                  disabled={!!editMeasurementId}
                  title="Längenmessung"
                >
                  <Ruler className="h-4 w-4 mr-2" />
                  Länge
                </Button>
                
                <Button
                  variant={activeMode === 'height' ? "default" : "outline"} 
                  size="sm"
                  className="w-full flex justify-start"
                  onClick={() => toggleMeasurementTool('height')}
                  disabled={!!editMeasurementId}
                  title="Höhenmessung"
                >
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  Höhe
                </Button>
                
                <Button
                  variant={activeMode === 'area' ? "default" : "outline"} 
                  size="sm"
                  className="w-full flex justify-start"
                  onClick={() => toggleMeasurementTool('area')}
                  disabled={!!editMeasurementId}
                  title="Flächenmessung"
                >
                  <Square className="h-4 w-4 mr-2" />
                  Fläche
                </Button>
              </div>
            </div>
            
            <div className="flex-shrink-0">
              <div className="text-sm font-medium mb-2">Solarplanung</div>
              <div className="space-y-2">
                <Button
                  variant={activeMode === 'solar' ? "default" : "outline"} 
                  size="sm"
                  className="w-full flex justify-start"
                  onClick={() => toggleMeasurementTool('solar')}
                  disabled={!!editMeasurementId}
                  title="Solarplanung"
                >
                  <Sun className="h-4 w-4 mr-2" />
                  Solarplanung
                </Button>
              </div>
            </div>
            
            <Separator className="flex-shrink-0" />
            
            <div className="flex-shrink-0">
              <div className="text-sm font-medium mb-2">Dachelemente</div>
              <div className="space-y-2">
                <Button
                  variant={activeMode === 'skylight' ? "default" : "outline"} 
                  size="sm"
                  className="w-full flex justify-start"
                  onClick={() => toggleMeasurementTool('skylight')}
                  disabled={!!editMeasurementId}
                >
                  <SplitSquareVertical className="h-4 w-4 mr-2" />
                  Dachfenster
                </Button>
                
                <Button
                  variant={activeMode === 'chimney' ? "default" : "outline"} 
                  size="sm"
                  className="w-full flex justify-start"
                  onClick={() => toggleMeasurementTool('chimney')}
                  disabled={!!editMeasurementId}
                >
                  <Cylinder className="h-4 w-4 mr-2" />
                  Kamin
                </Button>
              </div>
            </div>
            
            <Separator className="flex-shrink-0" />
            
            <div className="flex-shrink-0">
              <div className="text-sm font-medium mb-2">Einbauten</div>
              <div className="space-y-2">
                <Button
                  variant={activeMode === 'vent' ? "default" : "outline"} 
                  size="sm"
                  className="w-full flex justify-start"
                  onClick={() => toggleMeasurementTool('vent')}
                  disabled={!!editMeasurementId}
                >
                  <Wind className="h-4 w-4 mr-2" />
                  Lüfter
                </Button>
                
                <Button
                  variant={activeMode === 'hook' ? "default" : "outline"} 
                  size="sm"
                  className="w-full flex justify-start"
                  onClick={() => toggleMeasurementTool('hook')}
                  disabled={!!editMeasurementId}
                >
                  <Anchor className="h-4 w-4 mr-2" />
                  Haken
                </Button>
                
                <Button
                  variant={activeMode === 'other' ? "default" : "outline"} 
                  size="sm"
                  className="w-full flex justify-start"
                  onClick={() => toggleMeasurementTool('other')}
                  disabled={!!editMeasurementId}
                >
                  <Droplet className="h-4 w-4 mr-2" />
                  Sonstiges
                </Button>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="measurements" className="space-y-4 mt-0 h-full flex flex-col">
            <div className="grid grid-cols-2 gap-2 mb-4 flex-shrink-0">
              <Button
                variant={activeCategory === 'dach' ? "default" : "outline"} 
                size="sm"
                className="w-full flex justify-start"
                onClick={() => handleCategoryChange('dach')}
              >
                <Home className="h-4 w-4 mr-2" />
                Dach ({dachCount})
              </Button>
              
              <Button
                variant={activeCategory === 'solar' ? "default" : "outline"} 
                size="sm"
                className="w-full flex justify-start"
                onClick={() => handleCategoryChange('solar')}
              >
                <Sun className="h-4 w-4 mr-2" />
                Solar ({solarCount})
              </Button>
              
              <Button
                variant={activeCategory === 'dachelemente' ? "default" : "outline"} 
                size="sm"
                className="w-full flex justify-start"
                onClick={() => handleCategoryChange('dachelemente')}
              >
                <SplitSquareVertical className="h-4 w-4 mr-2" />
                Dachelemente ({dachelementeCount})
              </Button>
              
              <Button
                variant={activeCategory === 'einbauten' ? "default" : "outline"} 
                size="sm"
                className="w-full flex justify-start"
                onClick={() => handleCategoryChange('einbauten')}
              >
                <Anchor className="h-4 w-4 mr-2" />
                Einbauten ({einbautenCount})
              </Button>
              
              <Button
                variant={activeCategory === undefined ? "default" : "outline"} 
                size="sm"
                className="w-full col-span-2 flex justify-center"
                onClick={() => handleCategoryChange(undefined)}
              >
                <LayoutGrid className="h-4 w-4 mr-2" />
                Alle anzeigen
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {toggleMeasurementVisibility && toggleLabelVisibility && handleStartPointEdit && 
               handleDeleteMeasurement && updateMeasurement && segmentsOpen && toggleSegments && onEditSegment && (
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
                  activeCategory={activeCategory}
                />
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="export" className="space-y-4 mt-0 h-full flex flex-col">
            <div className="text-sm font-medium mb-2 flex-shrink-0">Export-Optionen</div>
            {measurements.length > 0 ? (
              <div className="space-y-2 flex-shrink-0">
                <GenerateRoofPlanButton measurements={measurements} />
                
                <ExportPdfButton measurements={measurements} />
                
                <Button
                  variant="outline" 
                  size="sm"
                  className="w-full flex justify-start"
                  onClick={handleDownload}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Als CSV exportieren
                </Button>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground italic text-center py-4 flex-shrink-0">
                Keine Messungen vorhanden
              </div>
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
};

export default MeasurementToolControls;
