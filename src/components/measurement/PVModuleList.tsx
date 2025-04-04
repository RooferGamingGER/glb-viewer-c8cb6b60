
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Measurement, Point } from '@/types/measurements';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, Maximize2, Minimize2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface PVModuleListProps {
  measurement: Measurement;
  updateMeasurement: (id: string, data: Partial<Measurement>) => void;
  onSelectModule: (moduleIndex: number | null) => void;
  selectedModuleIndex: number | null;
}

const PVModuleList: React.FC<PVModuleListProps> = ({
  measurement,
  updateMeasurement,
  onSelectModule,
  selectedModuleIndex
}) => {
  const [expanded, setExpanded] = useState(false);
  
  if (!measurement.pvModuleInfo) return null;
  
  const { moduleCount } = measurement.pvModuleInfo;
  const modulePoints = measurement.pvModuleInfo.points || [];
  
  const handleDeleteModule = (moduleIndex: number) => {
    if (!measurement.pvModuleInfo) return;
    
    // Filter out the selected module
    const updatedPoints = modulePoints.filter((_, index) => index !== moduleIndex);
    
    // Update the PV module info
    const updatedPVInfo = {
      ...measurement.pvModuleInfo,
      moduleCount: moduleCount - 1,
      points: updatedPoints
    };
    
    // Update the measurement
    updateMeasurement(measurement.id, {
      pvModuleInfo: updatedPVInfo
    });
    
    // Clear selection if the deleted module was selected
    if (selectedModuleIndex === moduleIndex) {
      onSelectModule(null);
    }
    // Adjust selection index if a module before the selected one was deleted
    else if (selectedModuleIndex && selectedModuleIndex > moduleIndex) {
      onSelectModule(selectedModuleIndex - 1);
    }
    
    toast.success(`PV-Modul ${moduleIndex + 1} gelöscht`);
  };
  
  const handleRecalculateModules = () => {
    if (!measurement.pvModuleInfo) return;
    
    // Clear module points to force recalculation
    const updatedPVInfo = {
      ...measurement.pvModuleInfo,
      points: undefined
    };
    
    // Update the measurement
    updateMeasurement(measurement.id, {
      pvModuleInfo: updatedPVInfo
    });
    
    // Clear selection
    onSelectModule(null);
    
    toast.success('PV-Module werden neu berechnet');
  };
  
  return (
    <div className="bg-background border rounded-md p-1 mb-2">
      <div className="flex justify-between items-center">
        <Button
          variant="ghost"
          size="sm"
          className="text-sm font-medium w-full justify-start"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <Minimize2 className="h-3.5 w-3.5 mr-1" /> : <Maximize2 className="h-3.5 w-3.5 mr-1" />}
          {moduleCount} PV-Module
        </Button>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={handleRecalculateModules}
          title="Module neu berechnen"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>
      
      {expanded && modulePoints.length > 0 && (
        <ScrollArea className="max-h-48 mt-1">
          <div className="grid grid-cols-3 gap-1">
            {modulePoints.map((_, index) => (
              <div 
                key={index}
                className={`border rounded p-1 text-xs flex justify-between items-center ${
                  selectedModuleIndex === index ? 'bg-primary/10 border-primary' : ''
                }`}
              >
                <span 
                  className="cursor-pointer" 
                  onClick={() => onSelectModule(selectedModuleIndex === index ? null : index)}
                >
                  Modul {index + 1}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={() => handleDeleteModule(index)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

export default PVModuleList;
