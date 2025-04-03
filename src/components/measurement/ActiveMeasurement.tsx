
import React from 'react';
import { Button } from "@/components/ui/button";
import { 
  CheckCircle2,
  ArrowLeft,
  X
} from 'lucide-react';
import { Point, MeasurementMode } from '@/hooks/useMeasurements';
import { 
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar";

interface ActiveMeasurementProps {
  activeMode: MeasurementMode;
  currentPoints: Point[];
  handleFinalizeMeasurement: () => void;
  handleUndoLastPoint: () => void;
  clearCurrentPoints: () => void;
}

const ActiveMeasurement: React.FC<ActiveMeasurementProps> = ({
  activeMode,
  currentPoints,
  handleFinalizeMeasurement,
  handleUndoLastPoint,
  clearCurrentPoints
}) => {
  // Don't render anything if no measurement tool is active or if there are no points
  if (activeMode === 'none') return null;
  
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Aktive Messung</SidebarGroupLabel>
      <SidebarGroupContent>
        <div className="mb-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">
              {activeMode === 'length' && "Längenmessung"}
              {activeMode === 'height' && "Höhenmessung"}
              {activeMode === 'area' && "Flächenmessung"}
            </div>
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
              {currentPoints.length} Punkte
            </span>
          </div>
        </div>

        {/* Show the finalize button only for area measurements with 3+ points */}
        {activeMode === 'area' && currentPoints.length >= 3 && (
          <Button 
            variant="default" 
            className="w-full mb-2"
            onClick={handleFinalizeMeasurement}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Messung abschließen
          </Button>
        )}
        
        <div className="flex gap-2 w-full">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={handleUndoLastPoint}
            disabled={currentPoints.length === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück
          </Button>
          
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={clearCurrentPoints}
          >
            <X className="h-4 w-4 mr-2" />
            Abbrechen
          </Button>
        </div>
        
        {currentPoints.length > 0 && (
          <div className="mt-3">
            <p className="text-xs text-muted-foreground mb-1">Messpunkte:</p>
            <div className="space-y-1 max-h-32 overflow-y-auto pl-2 pr-1">
              {currentPoints.map((point, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs border border-border p-1 rounded">
                  <span>
                    Punkt {idx + 1}: ({point.x.toFixed(2)}, {point.y.toFixed(2)}, {point.z.toFixed(2)})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </SidebarGroupContent>
    </SidebarGroup>
  );
};

export default ActiveMeasurement;
