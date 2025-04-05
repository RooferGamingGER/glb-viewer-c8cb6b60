import React, { useState, useEffect, memo } from 'react';
import { Button } from "@/components/ui/button";
import { 
  Ruler, Maximize2, Square, SunDim, Grid3X3, 
  Home, Minimize2, Layers, Grid, Move, X
} from 'lucide-react';
import MeasurementToolControls from './MeasurementToolControls';
import { MeasurementMode } from '@/types/measurements';
import { useMeasurementInteraction } from '@/hooks/useMeasurementInteraction';
import { useMeasurementToolToggle } from '@/hooks/useMeasurementToolToggle';
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
  const [measurementMode, setMeasurementMode] = useState<MeasurementMode>("line");
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

  const { scene, camera, enabled, toggle, clearAll, measurements, 
    addMeasurement, updateMeasurement, deleteMeasurement, 
    toggleMeasurementVisibility, toggleLabelVisibility,
    handleStartPointEdit, handleDeletePoint,
    currentPoints, movingPointInfo, setMovingPointInfo,
    clearPreviewGroup, clearAddPointIndicators,
    handleMoveMeasurementUp, handleMoveMeasurementDown,
    toggleAllLabelsVisibility, allLabelsVisible,
    measurementGroups
  } = useMeasurementInteraction();
  
  const { isRulerEnabled, toggleRuler } = useMeasurementToolToggle();
  const { clearGroup } = useThreeJs();

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
      name: `Messung (${measurements.length + 1})`,
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
    
    addMeasurement(newMeasurement);
    setIsAddingNewMeasurement(false);
  };

  const handleCancelMeasurement = () => {
    setIsAddingNewMeasurement(false);
    clearPreviewGroup();
    clearAddPointIndicators();
    setMovingPointInfo(null);
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
    updateMeasurement(id, data);
  };

  const handlePVModuleModeToggle = () => {
    setIsPVModuleMode(!isPVModuleMode);
  };

  return (
    
      
        
          Messwerkzeuge
        
        
          
            
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        toggle(true);
                        toggleRuler(false);
                      }}
                      disabled={enabled}
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
                        toggle(false);
                        toggleRuler(true);
                      }}
                      disabled={isRulerEnabled}
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
            
          
          
            
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost"
                      onClick={clearAll}
                      disabled={measurements.length === 0}
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
            
          
        

        
          
            
              Linie
            
            
              Fläche
            
          
        

        
          
            Messung hinzufügen
          
          
            Messung abbrechen
          
        

        
          
            Einstellungen
          
        
      
    
  );
});

MeasurementTools.displayName = 'MeasurementTools';

// Memoize the ActiveMeasurement component as well
const MemoizedActiveMeasurement = memo(ActiveMeasurement);

export default MeasurementTools;
