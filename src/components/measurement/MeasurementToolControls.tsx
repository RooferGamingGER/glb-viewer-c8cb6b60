
import React from 'react';
import { 
  Ruler, 
  ArrowUpDown, 
  Square, 
  Table, 
  List,
  FileText,
  Home,
  Wind,
  Layers,
  SplitSquareVertical,
  Cylinder,
  Sun,
  Droplet,
  Anchor
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MeasurementMode, Measurement } from '@/hooks/useMeasurements';

interface MeasurementToolControlsProps {
  activeMode: MeasurementMode;
  toggleMeasurementTool: (mode: MeasurementMode) => void;
  editMeasurementId: string | null;
  measurements: Measurement[];
  showTable: boolean;
  setShowTable: (show: boolean) => void;
}

/**
 * Tool selection panel for measurement controls
 */
const MeasurementToolControls: React.FC<MeasurementToolControlsProps> = ({
  activeMode,
  toggleMeasurementTool,
  editMeasurementId,
  measurements,
  showTable,
  setShowTable
}) => {
  const isToolDisabled = editMeasurementId !== null;
  
  // Group tools into categories
  const standardTools = [
    { id: 'length', icon: <Ruler className="w-4 h-4" />, label: 'Länge' },
    { id: 'height', icon: <ArrowUpDown className="w-4 h-4" />, label: 'Höhe' },
    { id: 'area', icon: <Square className="w-4 h-4" />, label: 'Fläche' }
  ];
  
  const roofElementTools = [
    { id: 'skylight', icon: <SplitSquareVertical className="w-4 h-4" />, label: 'Dachfenster' },
    { id: 'chimney', icon: <Cylinder className="w-4 h-4" />, label: 'Kamin' },
    { id: 'solar', icon: <Sun className="w-4 h-4" />, label: 'Solaranlage' },
    { id: 'gutter', icon: <Droplet className="w-4 h-4" />, label: 'Dachrinne' }
  ];
  
  const penetrationTools = [
    { id: 'vent', icon: <Wind className="w-4 h-4" />, label: 'Lüfter' },
    { id: 'hook', icon: <Anchor className="w-4 h-4" />, label: 'Dachhaken' },
    { id: 'other', icon: <Layers className="w-4 h-4" />, label: 'Sonstige' }
  ];
  
  return (
    <div className="p-3">
      <Tabs defaultValue="standard">
        <TabsList className="w-full mb-3">
          <TabsTrigger value="standard">
            <Ruler className="w-4 h-4 mr-1" />
            Standard
          </TabsTrigger>
          <TabsTrigger value="roofelements">
            <Home className="w-4 h-4 mr-1" />
            Dachelemente
          </TabsTrigger>
          <TabsTrigger value="penetrations">
            <Wind className="w-4 h-4 mr-1" />
            Einbauten
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="standard" className="m-0">
          <div className="grid grid-cols-3 gap-2">
            {standardTools.map(tool => (
              <Button
                key={tool.id}
                variant={activeMode === tool.id ? "default" : "outline"}
                size="sm"
                className="h-10 flex-col py-1"
                onClick={() => toggleMeasurementTool(tool.id as MeasurementMode)}
                disabled={isToolDisabled}
                title={`${tool.label} ${activeMode === tool.id ? 'deaktivieren' : 'messen'}`}
              >
                {tool.icon}
                <span className="text-xs mt-1">{tool.label}</span>
              </Button>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="roofelements" className="m-0">
          <div className="grid grid-cols-4 gap-2">
            {roofElementTools.map(tool => (
              <Button
                key={tool.id}
                variant={activeMode === tool.id ? "default" : "outline"}
                size="sm"
                className="h-10 flex-col py-1"
                onClick={() => toggleMeasurementTool(tool.id as MeasurementMode)}
                disabled={isToolDisabled}
                title={`${tool.label} ${activeMode === tool.id ? 'deaktivieren' : 'messen'}`}
              >
                {tool.icon}
                <span className="text-xs mt-1">{tool.label}</span>
              </Button>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="penetrations" className="m-0">
          <div className="grid grid-cols-3 gap-2">
            {penetrationTools.map(tool => (
              <Button
                key={tool.id}
                variant={activeMode === tool.id ? "default" : "outline"}
                size="sm"
                className="h-10 flex-col py-1"
                onClick={() => toggleMeasurementTool(tool.id as MeasurementMode)}
                disabled={isToolDisabled}
                title={`${tool.label} ${activeMode === tool.id ? 'deaktivieren' : 'markieren'}`}
              >
                {tool.icon}
                <span className="text-xs mt-1">{tool.label}</span>
              </Button>
            ))}
          </div>
        </TabsContent>
      </Tabs>
      
      <div className="flex justify-between mt-3">
        <Button 
          variant={showTable ? "default" : "outline"} 
          size="sm" 
          className="flex-1 mr-1"
          onClick={() => setShowTable(true)}
          disabled={isToolDisabled || showTable}
        >
          <Table className="w-4 h-4 mr-1" />
          Tabelle
        </Button>
        <Button 
          variant={!showTable ? "default" : "outline"} 
          size="sm" 
          className="flex-1 ml-1"
          onClick={() => setShowTable(false)}
          disabled={isToolDisabled || !showTable}
        >
          <List className="w-4 h-4 mr-1" />
          Liste
        </Button>
      </div>
    </div>
  );
};

export default MeasurementToolControls;
