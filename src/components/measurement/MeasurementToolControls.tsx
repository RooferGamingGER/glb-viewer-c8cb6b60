
import React from 'react';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Ruler, Square, ArrowUpDown, Home, Sun } from "lucide-react";
import { MeasurementMode } from '@/types/measurements';
import SolarPlanningButton from './SolarPlanningButton';

interface MeasurementToolControlsProps {
  activeMode: MeasurementMode;
  toggleMeasurementTool: (mode: MeasurementMode) => void;
  showSolarPlanningButton?: boolean;
}

const MeasurementToolControls: React.FC<MeasurementToolControlsProps> = ({
  activeMode,
  toggleMeasurementTool,
  showSolarPlanningButton = true
}) => {
  return (
    <div className="flex flex-col space-y-2">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-medium">Messwerkzeuge</h3>
      </div>
      
      <ToggleGroup type="single" className="flex justify-between" value={activeMode}>
        <ToggleGroupItem 
          value="length" 
          aria-label="Länge messen"
          onClick={() => toggleMeasurementTool('length')}
          className="flex-1 h-9"
          variant="outline"
          data-state={activeMode === 'length' ? 'on' : 'off'}
        >
          <Ruler className="h-4 w-4 mr-1" />
          <span className="text-xs">Länge</span>
        </ToggleGroupItem>
        
        <ToggleGroupItem 
          value="height" 
          aria-label="Höhe messen"
          onClick={() => toggleMeasurementTool('height')}
          className="flex-1 h-9"
          variant="outline"
          data-state={activeMode === 'height' ? 'on' : 'off'}
        >
          <ArrowUpDown className="h-4 w-4 mr-1" />
          <span className="text-xs">Höhe</span>
        </ToggleGroupItem>
        
        <ToggleGroupItem 
          value="area" 
          aria-label="Fläche messen"
          onClick={() => toggleMeasurementTool('area')}
          className="flex-1 h-9"
          variant="outline"
          data-state={activeMode === 'area' ? 'on' : 'off'}
        >
          <Square className="h-4 w-4 mr-1" />
          <span className="text-xs">Fläche</span>
        </ToggleGroupItem>
      </ToggleGroup>
      
      {showSolarPlanningButton && (
        <div className="pt-1">
          <SolarPlanningButton 
            activeMode={activeMode} 
            toggleMeasurementTool={toggleMeasurementTool}
          />
        </div>
      )}
      
      <div className="flex items-center justify-between mt-3 mb-1">
        <h3 className="text-sm font-medium">Dachelemente</h3>
      </div>
      
      <ToggleGroup type="single" className="flex justify-between" value={activeMode}>
        <ToggleGroupItem 
          value="solar" 
          aria-label="Solarfläche"
          onClick={() => toggleMeasurementTool('solar')}
          className="flex-1 h-9"
          variant="outline"
          data-state={activeMode === 'solar' ? 'on' : 'off'}
        >
          <Sun className="h-4 w-4 mr-1" />
          <span className="text-xs">Solar</span>
        </ToggleGroupItem>
        
        <ToggleGroupItem 
          value="skylight" 
          aria-label="Dachfenster"
          onClick={() => toggleMeasurementTool('skylight')}
          className="flex-1 h-9"
          variant="outline"
          data-state={activeMode === 'skylight' ? 'on' : 'off'}
        >
          <Square className="h-4 w-4 mr-1" />
          <span className="text-xs">Fenster</span>
        </ToggleGroupItem>
        
        <ToggleGroupItem 
          value="chimney" 
          aria-label="Kamin"
          onClick={() => toggleMeasurementTool('chimney')}
          className="flex-1 h-9"
          variant="outline"
          data-state={activeMode === 'chimney' ? 'on' : 'off'}
        >
          <Home className="h-4 w-4 mr-1" />
          <span className="text-xs">Kamin</span>
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
};

export default MeasurementToolControls;
