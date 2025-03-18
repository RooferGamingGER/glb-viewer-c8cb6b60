import React from 'react';
import { Button } from "@/components/ui/button";
import { 
  Ruler, 
  ArrowUpDown, 
  X, 
  Square, 
  Table, 
  Download,
  LayoutGrid,
  Sun,
  Minus
} from 'lucide-react';
import { MeasurementMode } from '@/types/measurements';
import ExportPdfButton from './ExportPdfButton';
import { exportMeasurementsToCSV } from '@/utils/exportUtils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface MeasurementToolControlsProps {
  activeMode: MeasurementMode;
  toggleMeasurementTool: (mode: MeasurementMode) => void;
  editMeasurementId: string | null;
  measurements: any[];
  showTable: boolean;
  setShowTable: (show: boolean) => void;
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
  setShowTable
}) => {
  const handleDownload = () => {
    if (measurements.length === 0) return;
    exportMeasurementsToCSV(measurements);
  };

  return (
    <div className="p-3">
      <div className="text-lg font-medium mb-2">Messwerkzeuge</div>
      
      <Tabs defaultValue="standard" className="w-full">
        <TabsList className="grid grid-cols-2 mb-2">
          <TabsTrigger value="standard">Standard</TabsTrigger>
          <TabsTrigger value="roof-elements">Dachelemente</TabsTrigger>
        </TabsList>
        
        <TabsContent value="standard">
          <div className="flex space-x-2">
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
              variant={['dormer', 'chimney', 'skylight'].includes(activeMode) ? "default" : "outline"} 
              size="sm"
              className="w-full"
              onClick={() => toggleMeasurementTool(activeMode === 'dormer' ? 'none' : 'dormer')}
              disabled={!!editMeasurementId}
            >
              <LayoutGrid className="h-4 w-4 mr-1" />
              <span className="text-xs">Einbauten</span>
            </Button>
            
            <Button
              variant={['solar', 'gutter'].includes(activeMode) ? "default" : "outline"} 
              size="sm"
              className="w-full"
              onClick={() => toggleMeasurementTool(activeMode === 'solar' ? 'none' : 'solar')}
              disabled={!!editMeasurementId}
            >
              <Sun className="h-4 w-4 mr-1" />
              <span className="text-xs">Anlagen</span>
            </Button>
            
            <Button
              variant={['verge', 'valley', 'ridge'].includes(activeMode) ? "default" : "outline"} 
              size="sm"
              className="w-full"
              onClick={() => toggleMeasurementTool(activeMode === 'verge' ? 'none' : 'verge')}
              disabled={!!editMeasurementId}
            >
              <Minus className="h-4 w-4 mr-1" />
              <span className="text-xs">Kanten</span>
            </Button>
          </div>
        </TabsContent>
      </Tabs>
      
      {measurements.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mt-2">
          <Button
            variant="outline" 
            size="sm"
            className="w-full"
            onClick={() => setShowTable(!showTable)}
          >
            <Table className="h-4 w-4 mr-1" />
            {showTable ? "Liste" : "Tabelle"}
          </Button>
          
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
