
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Measurement } from '@/types/measurements';
import { 
  Grid3X3, 
  Check, 
  X, 
  LayoutGrid, 
  Layers, 
  Maximize, 
  Minimize 
} from 'lucide-react';

interface PVModuleSelectorProps {
  measurement: Measurement;
  toggleModuleSelection: (measurementId: string, moduleIndex: number) => void;
  selectAllModules: (measurementId: string) => void;
  deselectAllModules: (measurementId: string) => void;
  toggleDetailedModules: (measurementId: string) => void;
}

const PVModuleSelector: React.FC<PVModuleSelectorProps> = ({
  measurement,
  toggleModuleSelection,
  selectAllModules,
  deselectAllModules,
  toggleDetailedModules
}) => {
  const [selectedCount, setSelectedCount] = useState(0);
  
  // Get module info
  const pvInfo = measurement.pvModuleInfo;
  if (!pvInfo || !pvInfo.moduleCount) return null;
  
  // Calculate total power of selected modules
  const selectedModules = measurement.selectedModules || [];
  const moduleCount = pvInfo.moduleCount;
  const modulePower = pvInfo.pvModuleSpec?.power || 0;
  const totalPower = selectedModules.length * modulePower;
  const isDetailedView = pvInfo.showDetailedModules;

  // Update selected count when selection changes
  useEffect(() => {
    setSelectedCount(selectedModules.length);
  }, [selectedModules]);
  
  // Generate grid of selectable modules
  const columns = pvInfo.columns || 1;
  const rows = pvInfo.rows || 1;
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">PV-Module</div>
        <div className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
          {selectedCount} / {moduleCount} ausgewählt
        </div>
      </div>
      
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1" 
          onClick={() => selectAllModules(measurement.id)}
        >
          <Check className="h-4 w-4 mr-1" />
          Alle
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1" 
          onClick={() => deselectAllModules(measurement.id)}
        >
          <X className="h-4 w-4 mr-1" />
          Keine
        </Button>
        <Button 
          variant={isDetailedView ? "default" : "outline"} 
          size="sm" 
          className="flex-none w-10"
          title={isDetailedView ? "Einfache Ansicht" : "Detaillierte Ansicht"}
          onClick={() => toggleDetailedModules(measurement.id)}
        >
          {isDetailedView ? 
            <Layers className="h-4 w-4" /> : 
            <LayoutGrid className="h-4 w-4" />
          }
        </Button>
      </div>
      
      <ScrollArea className="h-40 border rounded-md bg-background/50">
        <div className="p-2">
          <div 
            className="grid gap-1" 
            style={{ 
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: moduleCount }).map((_, index) => {
              const isSelected = selectedModules.includes(index);
              const row = Math.floor(index / columns);
              const col = index % columns;
              
              return (
                <button
                  key={index}
                  className={`
                    aspect-[1.7] border rounded-sm flex items-center justify-center text-xs
                    ${isSelected ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted'}
                  `}
                  onClick={() => toggleModuleSelection(measurement.id, index)}
                  title={`Modul ${index + 1} (Reihe ${row + 1}, Spalte ${col + 1})`}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
        </div>
      </ScrollArea>
      
      {modulePower > 0 && selectedCount > 0 && (
        <div className="text-sm">
          <div className="flex justify-between">
            <span>Leistung (ausgewählte Module):</span>
            <span className="font-medium">{totalPower} Wp</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Leistung pro Modul:</span>
            <span>{modulePower} Wp</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PVModuleSelector;
