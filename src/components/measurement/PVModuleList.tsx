
import React from 'react';
import { Measurement } from '@/types/measurements';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CircleX } from 'lucide-react';

interface PVModuleListProps {
  measurement: Measurement;
  selectedModuleIndex: number | null;
  handleSelectModule: (measurementId: string, moduleIndex: number) => void;
  handleDeleteModule: () => void;
}

const PVModuleList: React.FC<PVModuleListProps> = ({
  measurement,
  selectedModuleIndex,
  handleSelectModule,
  handleDeleteModule
}) => {
  // Only show for solar measurements with PV modules
  if (measurement.type !== 'solar' || !measurement.pvModuleInfo || !measurement.pvModuleInfo.modulePositions) {
    return null;
  }

  const modulePositions = measurement.pvModuleInfo.modulePositions;
  const moduleCount = modulePositions.length;

  if (moduleCount === 0) {
    return (
      <div className="mt-2 border border-border/50 rounded-md p-2 bg-secondary/10">
        <div className="text-sm font-medium mb-1">PV-Module</div>
        <div className="text-xs text-muted-foreground">
          Keine Module vorhanden
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2 border border-border/50 rounded-md p-2 bg-secondary/10">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium">PV-Module ({moduleCount})</div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleDeleteModule}
          disabled={selectedModuleIndex === null}
          className="h-6 text-xs"
        >
          <CircleX className="h-3.5 w-3.5 mr-1 text-destructive" />
          Modul löschen
        </Button>
      </div>
      
      {moduleCount > 10 ? (
        <ScrollArea className="h-32">
          <div className="grid grid-cols-3 gap-1">
            {modulePositions.map((_, index) => (
              <div 
                key={index}
                className={`flex items-center justify-between p-1 rounded-md cursor-pointer ${
                  selectedModuleIndex === index 
                    ? 'bg-primary/20 border border-primary/50' 
                    : 'border border-border/50 hover:bg-secondary/20'
                }`}
                onClick={() => handleSelectModule(measurement.id, index)}
              >
                <div className="text-xs font-medium">Modul {index + 1}</div>
              </div>
            ))}
          </div>
        </ScrollArea>
      ) : (
        <div className="grid grid-cols-3 gap-1">
          {modulePositions.map((_, index) => (
            <div 
              key={index}
              className={`flex items-center justify-between p-1 rounded-md cursor-pointer ${
                selectedModuleIndex === index 
                  ? 'bg-primary/20 border border-primary/50' 
                  : 'border border-border/50 hover:bg-secondary/20'
              }`}
              onClick={() => handleSelectModule(measurement.id, index)}
            >
              <div className="text-xs font-medium">Modul {index + 1}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PVModuleList;
