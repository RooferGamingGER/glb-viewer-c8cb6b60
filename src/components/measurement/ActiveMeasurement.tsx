
import React from 'react';
import { Button } from "@/components/ui/button";
import { 
  CheckCircle2,
  ArrowLeft,
  X
} from 'lucide-react';
import { Point } from '@/hooks/useMeasurements';
import { 
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar";

interface ActiveMeasurementProps {
  activeMode: string;
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
  if (activeMode === 'none' || currentPoints.length === 0) return null;
  
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Aktive Messung</SidebarGroupLabel>
      <SidebarGroupContent>
        {/* Show the finalize button only for area measurements with 3+ points */}
        {activeMode === 'area' && currentPoints.length >= 3 && (
          <Button 
            variant="default" 
            className="w-full mb-2"
            onClick={handleFinalizeMeasurement}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Messung abschließen ({currentPoints.length} Punkte)
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
        
        <div className="mt-3">
          <p className="text-xs text-muted-foreground mb-1">Messpunkte ({currentPoints.length}):</p>
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
      </SidebarGroupContent>
    </SidebarGroup>
  );
};

export default ActiveMeasurement;
