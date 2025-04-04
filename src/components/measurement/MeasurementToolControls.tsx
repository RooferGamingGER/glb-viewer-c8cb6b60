
import React, { useState, useEffect } from 'react';
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
  Tool,
  LineChart
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

interface MeasurementToolControlsProps {
  activeMode: MeasurementMode;
  toggleMeasurementTool: (mode: MeasurementMode) => void;
  editMeasurementId: string | null;
  measurements: any[];
  showTable: boolean;
  setShowTable: (show: boolean) => void;
  onCategoryChange?: (category: string) => void;
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
  onCategoryChange
}) => {
  // Use the centralized point snapping context
  const { snapEnabled, setSnapEnabled } = usePointSnapping();
  
  // State for the active tab
  const [activeTab, setActiveTab] = useState<string>("tools");
  
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

  return (
    <div className="p-3">
      <Tabs defaultValue="tools" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-2 mb-4">
          <TabsTrigger value="tools" className="flex items-center">
            <Tool className="h-4 w-4 mr-2" />
            Werkzeuge
          </TabsTrigger>
          <TabsTrigger value="measurements" className="flex items-center">
            <LineChart className="h-4 w-4 mr-2" />
            Messungen
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="tools" className="space-y-4">
          {/* Standard measurement tools section */}
          <div>
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
          
          {/* Solarplanung section */}
          <div>
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
          
          {/* Point snap toggle */}
          <div>
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
          
          <Separator />
          
          {/* Roof elements section */}
          <div>
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
          
          <Separator />
          
          {/* Penetrations section */}
          <div>
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
        
        <TabsContent value="measurements" className="space-y-4">
          <div className="text-sm font-medium mb-2">Messungen</div>
          {measurements.length > 0 ? (
            <div className="space-y-2">
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
            <div className="text-sm text-muted-foreground italic text-center py-4">
              Keine Messungen vorhanden
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MeasurementToolControls;
