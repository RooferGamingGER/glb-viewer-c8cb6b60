
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { 
  Ruler, 
  ArrowUpDown, 
  X, 
  Square, 
  Download,
  Sun,
  SplitSquareVertical,
  Cylinder,
  Wind,
  Anchor,
  Droplet
} from 'lucide-react';
import { MeasurementMode } from '@/types/measurements';
import ExportPdfButton from './ExportPdfButton';
import { exportMeasurementsToCSV } from '@/utils/exportUtils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GenerateRoofPlanButton from './GenerateRoofPlanButton';

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
  const [activeTab, setActiveTab] = useState("standard");
  
  const handleDownload = () => {
    if (measurements.length === 0) return;
    exportMeasurementsToCSV(measurements);
  };
  
  // When tab changes, notify parent if callback provided
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (onCategoryChange) {
      onCategoryChange(value);
    }
  };
  
  // Sync the active tab with the current measurement tool
  useEffect(() => {
    if (activeMode === 'none') return;
    
    if (['length', 'height', 'area'].includes(activeMode)) {
      setActiveTab("standard");
    } else if (['solar'].includes(activeMode)) {
      setActiveTab("roof-elements");
    } else if (['skylight', 'chimney', 'vent', 'hook', 'other'].includes(activeMode)) {
      setActiveTab("penetrations");
    }
  }, [activeMode]);

  return (
    <div className="p-3">
      <div className="text-lg font-medium mb-2">Messwerkzeuge</div>
      
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid grid-cols-3 mb-2">
          <TabsTrigger value="standard">Standard</TabsTrigger>
          <TabsTrigger value="roof-elements">Dachelemente</TabsTrigger>
          <TabsTrigger value="penetrations">Einbauten</TabsTrigger>
        </TabsList>
        
        <TabsContent value="standard">
          <div className="flex space-x-2 mb-2">
            <Button
              variant={activeMode === 'length' ? "default" : "outline"} 
              size="sm"
              className="flex-1"
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
              className="flex-1"
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
              className="flex-1"
              onClick={() => toggleMeasurementTool('area')}
              disabled={!!editMeasurementId}
              title="Flächenmessung"
            >
              <Square className="h-4 w-4 mr-1" />
              Fläche
            </Button>
          </div>
        </TabsContent>
        
        <TabsContent value="roof-elements">
          <div className="grid grid-cols-3 gap-1">
            <Button
              variant={activeMode === 'skylight' ? "default" : "outline"} 
              size="sm"
              className="w-full"
              onClick={() => toggleMeasurementTool(activeMode === 'skylight' ? 'none' : 'skylight')}
              disabled={!!editMeasurementId}
            >
              <SplitSquareVertical className="h-4 w-4 mr-1" />
              <span className="text-xs">Dachfenster</span>
            </Button>
            
            <Button
              variant={activeMode === 'chimney' ? "default" : "outline"} 
              size="sm"
              className="w-full"
              onClick={() => toggleMeasurementTool(activeMode === 'chimney' ? 'none' : 'chimney')}
              disabled={!!editMeasurementId}
            >
              <Cylinder className="h-4 w-4 mr-1" />
              <span className="text-xs">Kamine</span>
            </Button>
            
            <Button
              variant={activeMode === 'solar' ? "default" : "outline"} 
              size="sm"
              className="w-full"
              onClick={() => toggleMeasurementTool(activeMode === 'solar' ? 'none' : 'solar')}
              disabled={!!editMeasurementId}
            >
              <Sun className="h-4 w-4 mr-1" />
              <span className="text-xs">Solarfläche</span>
            </Button>
          </div>
        </TabsContent>
        
        <TabsContent value="penetrations">
          <div className="grid grid-cols-3 gap-1">
            <Button
              variant={activeMode === 'vent' ? "default" : "outline"} 
              size="sm"
              className="w-full"
              onClick={() => toggleMeasurementTool(activeMode === 'vent' ? 'none' : 'vent')}
              disabled={!!editMeasurementId}
            >
              <Wind className="h-4 w-4 mr-1" />
              <span className="text-xs">Lüfter</span>
            </Button>
            
            <Button
              variant={activeMode === 'hook' ? "default" : "outline"} 
              size="sm"
              className="w-full"
              onClick={() => toggleMeasurementTool(activeMode === 'hook' ? 'none' : 'hook')}
              disabled={!!editMeasurementId}
            >
              <Anchor className="h-4 w-4 mr-1" />
              <span className="text-xs">Dachhaken</span>
            </Button>
            
            <Button
              variant={activeMode === 'other' ? "default" : "outline"} 
              size="sm"
              className="w-full"
              onClick={() => toggleMeasurementTool(activeMode === 'other' ? 'none' : 'other')}
              disabled={!!editMeasurementId}
            >
              <X className="h-4 w-4 mr-1" />
              <span className="text-xs">Sonstiges</span>
            </Button>
          </div>
        </TabsContent>
      </Tabs>
      
      {measurements.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mt-2">
          <GenerateRoofPlanButton measurements={measurements} />
          
          <ExportPdfButton measurements={measurements} />
          
          <Button
            variant="outline" 
            size="sm"
            className="w-full"
            onClick={handleDownload}
          >
            <Download className="h-4 w-4 mr-1" />
            CSV
          </Button>
        </div>
      )}
    </div>
  );
};

export default MeasurementToolControls;
