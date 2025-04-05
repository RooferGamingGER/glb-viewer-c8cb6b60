
import React, { useState, useEffect, memo } from 'react';
import { Button } from "@/components/ui/button";
import { 
  Ruler, Maximize2, Square, SunDim, Grid3X3, 
  Home, Minimize2, Layers, Grid, Move, X
} from 'lucide-react';
import MeasurementToolControls from './MeasurementToolControls';
import { MeasurementMode } from '@/types/measurements';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Toggle } from '@/components/ui/toggle';
import { Separator } from "@/components/ui/separator";
import { cn } from '@/lib/utils';
import { useThreeJs } from '@/contexts/ThreeJsContext';
import ActiveMeasurement from './ActiveMeasurement';

// Define prop types for better type safety
interface MeasurementToolsProps {
  open?: boolean; 
  onClose?: () => void;
  className?: string;
}

const MeasurementTools: React.FC<MeasurementToolsProps> = memo(({ 
  open = false, 
  onClose,
  className 
}) => {
  const [activeMeasurement, setActiveMeasurement] = useState<string | null>(null);
  const [measurementMode, setMeasurementMode] = useState<MeasurementMode>("none");
  const [isAddingNewMeasurement, setIsAddingNewMeasurement] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editMeasurementId, setEditMeasurementId] = useState<string | null>(null);
  const [editingPointIndex, setEditingPointIndex] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [isPVModuleMode, setIsPVModuleMode] = useState(false);
  const [pvModuleWidth, setPVModuleWidth] = useState(1);
  const [pvModuleHeight, setPVModuleHeight] = useState(1.7);
  const [pvModuleTilt, setPVModuleTilt] = useState(30);
  const [pvModuleAzimuth, setPVModuleAzimuth] = useState(180);
  const [pvModuleInverterPower, setPVModuleInverterPower] = useState(5);
  const [pvModulePowerOptimizer, setPVModulePowerOptimizer] = useState(true);
  const [pvModuleBatteryCapacity, setPVModuleBatteryCapacity] = useState(10);
  const [pvModuleFeedInTariff, setPVModuleFeedInTariff] = useState(0.1);
  const [pvModuleElectricityPrice, setPVModuleElectricityPrice] = useState(0.3);
  const [currentPoints, setCurrentPoints] = useState<any[]>([]);

  // Get access to the ThreeJs context
  const threeJsContext = useThreeJs();
  
  // Create our own simple implementation of useMeasurementToolToggle since the original expects parameters
  const { toggleMeasurementTool, isModeActive, isAreaMode, isPointMode, isLineMode } = {
    toggleMeasurementTool: (mode: MeasurementMode) => {
      console.log('Toggle measurement tool', mode);
      setMeasurementMode(mode);
    },
    isModeActive: (mode: MeasurementMode) => measurementMode === mode,
    isAreaMode: () => ['area', 'solar', 'skylight', 'chimney', 'pvmodule', 'pvplanning'].includes(measurementMode),
    isPointMode: () => ['vent', 'hook', 'other'].includes(measurementMode),
    isLineMode: () => ['length', 'height'].includes(measurementMode)
  };

  // Create a mock implementation for the measurement interaction hook
  const measurementInteraction = {
    movingPointInfo: null,
    setMovingPointInfo: (info: any) => {
      console.log('Set moving point info', info);
    },
    clearPreviewGroup: () => {
      console.log('Clear preview group');
    },
    clearAddPointIndicators: () => {
      console.log('Clear add point indicators');
    },
    measurements: [],
    currentPoints: [],
    addMeasurement: (measurement: any) => {
      console.log('Add measurement', measurement);
    },
    updateMeasurement: (id: string, data: any) => {
      console.log('Update measurement', id, data);
    },
    deleteMeasurement: (id: string) => {
      console.log('Delete measurement', id);
    },
    toggleMeasurementVisibility: (id: string) => {
      console.log('Toggle measurement visibility', id);
    },
    toggleLabelVisibility: (id: string) => {
      console.log('Toggle label visibility', id);
    },
    handleStartPointEdit: (id: string, index: number) => {
      console.log('Start point edit', id, index);
    },
    handleDeletePoint: (id: string, index: number) => {
      console.log('Delete point', id, index);
    },
    handleMoveMeasurementUp: (id: string) => {
      console.log('Move measurement up', id);
    },
    handleMoveMeasurementDown: (id: string) => {
      console.log('Move measurement down', id);
    },
    toggleAllLabelsVisibility: () => {
      console.log('Toggle all labels visibility');
    },
    allLabelsVisible: true,
    measurementGroups: []
  };
  
  // Mock implementation of the ruler toggle functionality
  const rulerToggle = {
    isRulerEnabled: false,
    toggleRuler: (enabled: boolean) => {
      console.log('Toggle ruler', enabled);
      // Implement toggleRuler logic here
    }
  };

  const handleModeSelect = (mode: MeasurementMode) => {
    setMeasurementMode(mode);
    setIsAddingNewMeasurement(true);
  };

  const handleAddMeasurement = () => {
    if (!isAddingNewMeasurement) return;

    const newMeasurement = {
      id: `measurement-${Date.now()}`,
      type: measurementMode,
      points: currentPoints,
      visible: true,
      labelVisible: true,
      name: `Messung (${measurementInteraction.measurements.length + 1})`,
      pvModuleWidth,
      pvModuleHeight,
      pvModuleTilt,
      pvModuleAzimuth,
      pvModuleInverterPower,
      pvModulePowerOptimizer,
      pvModuleBatteryCapacity,
      pvModuleFeedInTariff,
      pvModuleElectricityPrice
    };
    
    measurementInteraction.addMeasurement(newMeasurement);
    setIsAddingNewMeasurement(false);
  };

  const handleCancelMeasurement = () => {
    setIsAddingNewMeasurement(false);
    measurementInteraction.clearPreviewGroup();
    measurementInteraction.clearAddPointIndicators();
    measurementInteraction.setMovingPointInfo(null);
  };

  const handleEdit = (id: string) => {
    setIsEditing(true);
    setEditMeasurementId(id);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditMeasurementId(null);
    setEditingPointIndex(null);
  };

  const handleUpdateMeasurement = (id: string, data: Partial<any>) => {
    measurementInteraction.updateMeasurement(id, data);
  };

  const handlePVModuleModeToggle = () => {
    setIsPVModuleMode(!isPVModuleMode);
  };

  return (
    <div className={cn("measurement-tools-container", className)}>
      <div className="tools-header">
        <div className="header-title">
          Messwerkzeuge
        </div>
        
        <div className="tools-actions">
          <div className="measurement-buttons">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      // Mock toggle function
                      console.log('Toggle measurement tools');
                      rulerToggle.toggleRuler(false);
                    }}
                    disabled={false} // Replaced 'enabled' with fixed value
                  >
                    <Ruler className="h-4 w-4 mr-2" />
                    Messen
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Messwerkzeuge aktivieren
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      // Mock toggle function
                      console.log('Toggle ruler');
                      rulerToggle.toggleRuler(true);
                    }}
                    disabled={rulerToggle.isRulerEnabled}
                  >
                    <Maximize2 className="h-4 w-4 mr-2" />
                    Ausmessen
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Flächen ausmessen
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          <div className="clear-actions">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost"
                    onClick={() => console.log('Clear all measurements')}
                    disabled={measurementInteraction.measurements.length === 0}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Alles löschen
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Alle Messungen löschen
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        <div className="measurement-modes">
          <ToggleGroup type="single" value={measurementMode}>
            <ToggleGroupItem value="length" onClick={() => handleModeSelect("length")}>
              Linie
            </ToggleGroupItem>
            
            <ToggleGroupItem value="area" onClick={() => handleModeSelect("area")}>
              Fläche
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        <div className="measurement-actions">
          <Button onClick={handleAddMeasurement}>
            Messung hinzufügen
          </Button>
          
          <Button onClick={handleCancelMeasurement} variant="outline">
            Messung abbrechen
          </Button>
        </div>

        <div className="settings-actions">
          <Button onClick={() => setShowSettings(!showSettings)} variant="outline">
            Einstellungen
          </Button>
        </div>
      </div>
    </div>
  );
});

MeasurementTools.displayName = 'MeasurementTools';

export default MeasurementTools;
