
import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  Ruler, 
  ArrowUpDown, 
  MousePointer, 
  Square, 
  Sun, 
  Home, 
  PanelTop, 
  Fan, 
  Link, 
  Plus, 
  Calculator, 
  LayoutGrid
} from 'lucide-react';
import { Measurement } from '@/types/measurements';
import MeasurementList from './MeasurementList';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';

interface MeasurementToolControlsProps {
  activeMode: string;
  toggleMeasurementTool: (mode: string) => void;
  editMeasurementId: string | null;
  measurements: Measurement[];
  showTable: boolean;
  setShowTable: (show: boolean) => void;
  toggleMeasurementVisibility: (id: string) => void;
  toggleLabelVisibility: (id: string) => void;
  handleStartPointEdit: (id: string) => void;
  handleDeleteMeasurement: (id: string) => void;
  handleDeletePoint?: (measurementId: string, pointIndex: number) => void;
  updateMeasurement: (id: string, data: Partial<Measurement>) => void;
  segmentsOpen: Record<string, boolean>;
  toggleSegments: (id: string) => void;
  onEditSegment: (id: string | null) => void;
  movingPointInfo?: { measurementId: string; pointIndex: number } | null;
  handleMoveMeasurementUp?: (id: string) => void;
  handleMoveMeasurementDown?: (id: string) => void;
  showMeasurementList?: boolean;
}

const MeasurementToolControls: React.FC<MeasurementToolControlsProps> = ({ 
  activeMode,
  toggleMeasurementTool,
  editMeasurementId,
  measurements,
  showTable,
  setShowTable,
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
  handleMoveMeasurementDown,
  showMeasurementList = true
}) => {
  const isMobile = useIsMobile();
  const isEditing = editMeasurementId !== null || movingPointInfo !== null;
  
  // Disable tool buttons when editing
  const disableToolButtons = isEditing;
  
  // Helper for button variant
  const getButtonVariant = (mode: string) => {
    return activeMode === mode ? "default" : "outline";
  };
  
  return (
    <div className="flex flex-col space-y-4">
      {/* Measurement tools */}
      <div>
        <h3 className="text-sm font-medium mb-2">Messwerkzeuge</h3>
        
        <div className="grid grid-cols-3 gap-2 mb-2">
          <Button
            variant={getButtonVariant('none')}
            size="sm"
            onClick={() => toggleMeasurementTool('none')}
            disabled={disableToolButtons}
            title="Auswählen"
          >
            <MousePointer className="h-4 w-4 mr-2" />
            <span className="sr-only md:not-sr-only md:inline-flex">Auswählen</span>
          </Button>
          
          <Button
            variant={getButtonVariant('length')}
            size="sm"
            onClick={() => toggleMeasurementTool('length')}
            disabled={disableToolButtons}
            title="Längenmessung"
          >
            <Ruler className="h-4 w-4 mr-2" />
            <span className="sr-only md:not-sr-only md:inline-flex">Länge</span>
          </Button>
          
          <Button
            variant={getButtonVariant('height')}
            size="sm"
            onClick={() => toggleMeasurementTool('height')}
            disabled={disableToolButtons}
            title="Höhenmessung"
          >
            <ArrowUpDown className="h-4 w-4 mr-2" />
            <span className="sr-only md:not-sr-only md:inline-flex">Höhe</span>
          </Button>
        </div>
        
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant={getButtonVariant('area')}
            size="sm"
            onClick={() => toggleMeasurementTool('area')}
            disabled={disableToolButtons}
            title="Flächenmessung"
          >
            <Square className="h-4 w-4 mr-2" />
            <span className="sr-only md:not-sr-only md:inline-flex">Fläche</span>
          </Button>
          
          <Button
            variant={getButtonVariant('solar')}
            size="sm"
            onClick={() => toggleMeasurementTool('solar')}
            disabled={disableToolButtons}
            title="Solaranlage"
          >
            <Sun className="h-4 w-4 mr-2" />
            <span className="sr-only md:not-sr-only md:inline-flex">Solar</span>
          </Button>
          
          <Button
            variant={getButtonVariant('skylight')}
            size="sm"
            onClick={() => toggleMeasurementTool('skylight')}
            disabled={disableToolButtons}
            title="Dachfenster"
          >
            <PanelTop className="h-4 w-4 mr-2" />
            <span className="sr-only md:not-sr-only md:inline-flex">Fenster</span>
          </Button>
        </div>
      </div>
      
      {/* Other roof elements */}
      <div>
        <h3 className="text-sm font-medium mb-2">Weitere Dachelemente</h3>
        
        <div className="grid grid-cols-3 gap-2 mb-2">
          <Button
            variant={getButtonVariant('chimney')}
            size="sm"
            onClick={() => toggleMeasurementTool('chimney')}
            disabled={disableToolButtons}
            title="Kamin"
          >
            <Home className="h-4 w-4 mr-2" />
            <span className="sr-only md:not-sr-only md:inline-flex">Kamin</span>
          </Button>
          
          <Button
            variant={getButtonVariant('vent')}
            size="sm"
            onClick={() => toggleMeasurementTool('vent')}
            disabled={disableToolButtons}
            title="Lüfter"
          >
            <Fan className="h-4 w-4 mr-2" />
            <span className="sr-only md:not-sr-only md:inline-flex">Lüfter</span>
          </Button>
          
          <Button
            variant={getButtonVariant('hook')}
            size="sm"
            onClick={() => toggleMeasurementTool('hook')}
            disabled={disableToolButtons}
            title="Dachhaken"
          >
            <Link className="h-4 w-4 mr-2" />
            <span className="sr-only md:not-sr-only md:inline-flex">Haken</span>
          </Button>
        </div>
        
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant={getButtonVariant('other')}
            size="sm"
            onClick={() => toggleMeasurementTool('other')}
            disabled={disableToolButtons}
            title="Sonstiges"
          >
            <Plus className="h-4 w-4 mr-2" />
            <span className="sr-only md:not-sr-only md:inline-flex">Sonst.</span>
          </Button>
          
          <Button
            variant={getButtonVariant('pvmodule')}
            size="sm"
            onClick={() => toggleMeasurementTool('pvmodule')}
            disabled={disableToolButtons}
            title="PV-Module"
          >
            <LayoutGrid className="h-4 w-4 mr-2" />
            <span className="sr-only md:not-sr-only md:inline-flex">PV-Module</span>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTable(!showTable)}
            title="Umschalten: Tabelle/Liste"
          >
            <Calculator className="h-4 w-4 mr-2" />
            <span className="sr-only md:not-sr-only md:inline-flex">{showTable ? "Liste" : "Tabelle"}</span>
          </Button>
        </div>
      </div>
      
      {/* Measurements list */}
      {showMeasurementList && (
        <>
          <Separator className="my-2" />
          <div>
            <h3 className="text-sm font-medium mb-2">Messungen</h3>
            <MeasurementList 
              measurements={measurements}
              editMeasurementId={editMeasurementId}
              showTable={showTable}
              toggleMeasurementVisibility={toggleMeasurementVisibility}
              toggleLabelVisibility={toggleLabelVisibility}
              handleStartPointEdit={handleStartPointEdit}
              handleDeleteMeasurement={handleDeleteMeasurement}
              handleDeletePoint={handleDeletePoint}
              updateMeasurement={updateMeasurement}
              segmentsOpen={segmentsOpen}
              toggleSegments={toggleSegments}
              onEditSegment={onEditSegment}
              editingDisabled={isEditing}
              handleMoveMeasurementUp={handleMoveMeasurementUp}
              handleMoveMeasurementDown={handleMoveMeasurementDown}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default MeasurementToolControls;
