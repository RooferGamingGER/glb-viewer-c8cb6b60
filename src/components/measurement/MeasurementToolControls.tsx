
import React from 'react';
import { Button } from "@/components/ui/button";
import { 
  RulerSquare, 
  LineHeight, 
  Box, 
  Square, 
  Grid, 
  Home, 
  Wind, 
  Anchor, 
  CircleDashed,
  ChevronUp, 
  ChevronDown, 
  Ban, 
  Check, 
  Trash2,
  Sun
} from 'lucide-react';
import { MeasurementMode } from '@/types/measurements';
import { toast } from 'sonner';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MeasurementToolControlsProps {
  activeMode: MeasurementMode;
  hasCurrentPoints: boolean;
  toggleMeasurementTool: (mode: MeasurementMode) => void;
  isModeActive: (mode: MeasurementMode) => boolean;
  clearCurrentPoints: () => void;
  finalizeMeasurement: () => void;
  undoLastPoint: () => void;
  className?: string;
  disabled?: boolean;
}

const MeasurementToolControls: React.FC<MeasurementToolControlsProps> = ({ 
  activeMode,
  hasCurrentPoints,
  toggleMeasurementTool,
  isModeActive,
  clearCurrentPoints,
  finalizeMeasurement,
  undoLastPoint,
  className,
  disabled
}) => {
  const handleModeSelection = (mode: MeasurementMode) => {
    if (hasCurrentPoints && activeMode !== 'none') {
      toast.warning(
        'Sie haben eine aktive Messung. Bitte schließen Sie diese ab oder brechen Sie sie ab, bevor Sie einen neuen Messmodus wählen.',
        {
          action: {
            label: 'Messung abbrechen',
            onClick: () => {
              clearCurrentPoints();
              toggleMeasurementTool(mode);
            },
          },
        }
      );
      return;
    }
    
    toggleMeasurementTool(mode);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Grundmessungen</h3>
        
        <div className="flex flex-col gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isModeActive('length') ? "default" : "outline"}
                  className="justify-start"
                  onClick={() => handleModeSelection('length')}
                  disabled={disabled}
                >
                  <RulerSquare className="h-4 w-4 mr-2" />
                  Längenmessung
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Strecke zwischen zwei Punkten messen</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isModeActive('height') ? "default" : "outline"}
                  className="justify-start"
                  onClick={() => handleModeSelection('height')}
                  disabled={disabled}
                >
                  <LineHeight className="h-4 w-4 mr-2" />
                  Höhenmessung
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Vertikalen Höhenunterschied messen</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isModeActive('area') ? "default" : "outline"}
                  className="justify-start"
                  onClick={() => handleModeSelection('area')}
                  disabled={disabled}
                >
                  <Square className="h-4 w-4 mr-2" />
                  Flächenmessung
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Fläche mit beliebigen Punkten messen</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Solarplanung</h3>
        
        <div className="flex flex-col gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isModeActive('solar') ? "default" : "outline"}
                  className="justify-start"
                  onClick={() => handleModeSelection('solar')}
                  disabled={disabled}
                >
                  <Sun className="h-4 w-4 mr-2" />
                  Solarfläche
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Fläche für Solarmodule bestimmen</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isModeActive('pvmodule') ? "default" : "outline"}
                  className="justify-start"
                  onClick={() => handleModeSelection('pvmodule')}
                  disabled={disabled}
                >
                  <Grid className="h-4 w-4 mr-2" />
                  PV-Module
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>PV-Module automatisch platzieren</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isModeActive('pvplanning') ? "default" : "outline"}
                  className="justify-start text-primary-foreground bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800"
                  onClick={() => handleModeSelection('pvplanning')}
                  disabled={disabled}
                >
                  <Grid className="h-4 w-4 mr-2" />
                  PV-Planung (Neu)
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Interaktive PV-Modulanordnung planen</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Dacheinbauten</h3>
        
        <div className="flex flex-col gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isModeActive('skylight') ? "default" : "outline"}
                  className="justify-start"
                  onClick={() => handleModeSelection('skylight')}
                  disabled={disabled}
                >
                  <Box className="h-4 w-4 mr-2" />
                  Dachfenster
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Dachfenster einzeichnen</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isModeActive('chimney') ? "default" : "outline"}
                  className="justify-start"
                  onClick={() => handleModeSelection('chimney')}
                  disabled={disabled}
                >
                  <Home className="h-4 w-4 mr-2" />
                  Kamin
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Kamin oder andere Dachaufbauten einzeichnen</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Markierungen</h3>
        
        <div className="flex flex-col gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isModeActive('vent') ? "default" : "outline"}
                  className="justify-start"
                  onClick={() => handleModeSelection('vent')}
                  disabled={disabled}
                >
                  <Wind className="h-4 w-4 mr-2" />
                  Lüfter/Entlüfter
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Lüfter oder Durchdringungen markieren</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isModeActive('hook') ? "default" : "outline"}
                  className="justify-start"
                  onClick={() => handleModeSelection('hook')}
                  disabled={disabled}
                >
                  <Anchor className="h-4 w-4 mr-2" />
                  Dachhaken
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Dachhaken oder Befestigungspunkte markieren</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isModeActive('other') ? "default" : "outline"}
                  className="justify-start"
                  onClick={() => handleModeSelection('other')}
                  disabled={disabled}
                >
                  <CircleDashed className="h-4 w-4 mr-2" />
                  Sonstige Markierung
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Sonstige wichtige Punkte markieren</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      
      {activeMode !== 'none' && (
        <div className="flex flex-col gap-2 pt-2 border-t border-border">
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={undoLastPoint}
              disabled={!hasCurrentPoints || disabled}
            >
              <ChevronUp className="h-4 w-4 mr-2" />
              Punkt zurück
            </Button>
            
            <Button 
              variant="outline"
              className="flex-1"
              onClick={clearCurrentPoints}
              disabled={!hasCurrentPoints || disabled}
            >
              <Ban className="h-4 w-4 mr-2" />
              Abbrechen
            </Button>
          </div>
          
          <Button 
            onClick={finalizeMeasurement}
            disabled={!hasCurrentPoints || disabled}
          >
            <Check className="h-4 w-4 mr-2" />
            Messung abschließen
          </Button>
        </div>
      )}
    </div>
  );
};

export default MeasurementToolControls;
