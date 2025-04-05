
import React, { useState, useRef, useEffect } from 'react';
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
  const [activeCategory, setActiveCategory] = useState<string | undefined>(undefined);
  
  // Refs for scroll sections
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);
  const measurementsRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  
  // Count measurements by category
  const dachCount = measurements.filter(m => ['length', 'height', 'area'].includes(m.type)).length;
  const solarCount = measurements.filter(m => ['solar'].includes(m.type)).length;
  const dachelementeCount = measurements.filter(m => ['skylight', 'chimney'].includes(m.type)).length;
  const einbautenCount = measurements.filter(m => ['vent', 'hook', 'other'].includes(m.type)).length;
  
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
  
  const scrollTo = (ref: React.RefObject<HTMLDivElement>) => {
    if (ref.current && scrollAreaRef.current) {
      // Scroll to the section with an offset for the navigation buttons
      const offset = 10;
      scrollAreaRef.current.scrollTo({
        top: ref.current.offsetTop - offset,
        behavior: 'smooth'
      });
    }
  };
  
  const handleDownload = () => {
    if (measurements.length === 0) return;
    exportMeasurementsToCSV(measurements);
  };

  return (
    <div className="p-3 flex flex-col h-full overflow-hidden">
      {/* Navigation buttons at the top */}
      <div className="flex gap-2 mb-4 flex-shrink-0">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1 flex items-center justify-center"
          onClick={() => scrollTo(toolsRef)}
        >
          <Wrench className="h-4 w-4 mr-2" />
          Werkzeuge
        </Button>
        
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1 flex items-center justify-center"
          onClick={() => scrollTo(measurementsRef)}
        >
          <LineChart className="h-4 w-4 mr-2" />
          Messungen
        </Button>
        
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1 flex items-center justify-center"
          onClick={() => scrollTo(exportRef)}
        >
          <FileDown className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>
      
      {/* Scrollable content with all sections */}
      <ScrollArea className="pr-2 flex-1" scrollRef={scrollAreaRef}>
        <div className="space-y-6"> {/* Reduced spacing between sections */}
          {/* TOOLS SECTION */}
          <div ref={toolsRef}>
            <div className="text-lg font-semibold pb-2 border-b mb-3">Werkzeuge</div>
            
            {/* Punktfang toggle */}
            <div className="mb-3">
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
            
            {/* Messwerkzeuge - Grid Layout */}
            <div className="space-y-3">
              <div>
                <div className="text-sm font-medium mb-2">Messwerkzeuge</div>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant={activeMode === 'length' ? "default" : "outline"} 
                    size="sm"
                    className="w-full flex justify-start"
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
                    className="w-full flex justify-start"
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
                    className="w-full flex justify-start"
                    onClick={() => toggleMeasurementTool('area')}
                    disabled={!!editMeasurementId}
                    title="Flächenmessung"
                  >
                    <Square className="h-4 w-4 mr-1" />
                    Fläche
                  </Button>
                </div>
              </div>
              
              <div>
                <div className="text-sm font-medium mb-2">Solarplanung</div>
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
              
              <Separator className="my-2" />
              
              {/* Dachelemente - Grid Layout */}
              <div>
                <div className="text-sm font-medium mb-2">Dachelemente</div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={activeMode === 'skylight' ? "default" : "outline"} 
                    size="sm"
                    className="w-full flex justify-start"
                    onClick={() => toggleMeasurementTool('skylight')}
                    disabled={!!editMeasurementId}
                  >
                    <SplitSquareVertical className="h-4 w-4 mr-1" />
                    Dachfenster
                  </Button>
                  
                  <Button
                    variant={activeMode === 'chimney' ? "default" : "outline"} 
                    size="sm"
                    className="w-full flex justify-start"
                    onClick={() => toggleMeasurementTool('chimney')}
                    disabled={!!editMeasurementId}
                  >
                    <Cylinder className="h-4 w-4 mr-1" />
                    Kamin
                  </Button>
                </div>
              </div>
              
              <Separator className="my-2" />
              
              {/* Einbauten - Grid Layout */}
              <div>
                <div className="text-sm font-medium mb-2">Einbauten</div>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant={activeMode === 'vent' ? "default" : "outline"} 
                    size="sm"
                    className="w-full flex justify-start text-xs"
                    onClick={() => toggleMeasurementTool('vent')}
                    disabled={!!editMeasurementId}
                  >
                    <Wind className="h-4 w-4 mr-1" />
                    Lüfter
                  </Button>
                  
                  <Button
                    variant={activeMode === 'hook' ? "default" : "outline"} 
                    size="sm"
                    className="w-full flex justify-start text-xs"
                    onClick={() => toggleMeasurementTool('hook')}
                    disabled={!!editMeasurementId}
                  >
                    <Anchor className="h-4 w-4 mr-1" />
                    Haken
                  </Button>
                  
                  <Button
                    variant={activeMode === 'other' ? "default" : "outline"} 
                    size="sm"
                    className="w-full flex justify-start text-xs"
                    onClick={() => toggleMeasurementTool('other')}
                    disabled={!!editMeasurementId}
                  >
                    <Droplet className="h-4 w-4 mr-1" />
                    Sonst.
                  </Button>
                </div>
              </div>
            </div>
          </div>
          
          {/* MEASUREMENTS SECTION - Now with more vertical space */}
          <div ref={measurementsRef}>
            <div className="text-lg font-semibold pb-2 border-b mb-3">Messungen</div>
            
            <div className="grid grid-cols-2 gap-2 mb-3">
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
                Element ({dachelementeCount})
              </Button>
              
              <Button
                variant={activeCategory === 'einbauten' ? "default" : "outline"} 
                size="sm"
                className="w-full flex justify-start"
                onClick={() => handleCategoryChange('einbauten')}
              >
                <Anchor className="h-4 w-4 mr-2" />
                Einbau ({einbautenCount})
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
            
            <div className="max-h-96 overflow-y-auto"> {/* Increased height for measurements */}
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
          </div>
          
          {/* EXPORT SECTION - Compressed to give more space to measurements */}
          <div ref={exportRef}>
            <div className="text-lg font-semibold pb-2 border-b mb-3">Export</div>
            
            {measurements.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                <GenerateRoofPlanButton measurements={measurements} className="col-span-2" />
                
                <ExportPdfButton measurements={measurements} />
                
                <Button
                  variant="outline" 
                  size="sm"
                  className="w-full flex justify-start"
                  onClick={handleDownload}
                >
                  <Download className="h-4 w-4 mr-2" />
                  CSV Export
                </Button>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground italic text-center py-3">
                Keine Messungen vorhanden
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default MeasurementToolControls;
