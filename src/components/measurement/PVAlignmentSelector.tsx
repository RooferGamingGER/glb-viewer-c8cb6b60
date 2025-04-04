
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Measurement, Point } from '@/types/measurements';
import { toast } from '@/components/ui/use-toast';
import { PinIcon, ArrowLeftRightIcon, RotateCcwIcon, CheckIcon } from 'lucide-react';
import * as THREE from 'three';

interface PVAlignmentSelectorProps {
  measurement: Measurement;
  measurements: Measurement[];
  onAlignmentSet: (edgePoints: { from: Point; to: Point }) => void;
  onCancel: () => void;
}

const PVAlignmentSelector: React.FC<PVAlignmentSelectorProps> = ({
  measurement,
  measurements,
  onAlignmentSet,
  onCancel,
}) => {
  const [selectedEdge, setSelectedEdge] = useState<{ measurementId: string; edgeIndex: number } | null>(null);
  const [previewEdge, setPreviewEdge] = useState<{ from: Point; to: Point } | null>(null);
  
  // Find all possible alignment edges (from length measurements or segments of area measurements)
  const availableEdges = React.useMemo(() => {
    const edges: Array<{
      measurementId: string;
      type: string;
      edgeIndex: number;
      from: Point;
      to: Point;
      length: number;
    }> = [];
    
    measurements.forEach(m => {
      // Skip the current solar measurement
      if (m.id === measurement.id) return;
      
      // Add length measurements as potential alignment edges
      if (m.type === 'length' && m.points?.length >= 2) {
        edges.push({
          measurementId: m.id,
          type: m.type,
          edgeIndex: 0,
          from: m.points[0],
          to: m.points[1],
          length: new THREE.Vector3()
            .subVectors(
              new THREE.Vector3(m.points[1].x, m.points[1].y, m.points[1].z),
              new THREE.Vector3(m.points[0].x, m.points[0].y, m.points[0].z)
            )
            .length()
        });
      }
      
      // Add edges of area measurements (like roof edges)
      if ((m.type === 'area' || m.type === 'ridge' || m.type === 'eave' || m.type === 'verge') && 
          m.points?.length >= 3) {
        // Add each edge of the area as a potential alignment edge
        for (let i = 0; i < m.points.length; i++) {
          const nextIndex = (i + 1) % m.points.length;
          edges.push({
            measurementId: m.id,
            type: m.type,
            edgeIndex: i,
            from: m.points[i],
            to: m.points[nextIndex],
            length: new THREE.Vector3()
              .subVectors(
                new THREE.Vector3(m.points[nextIndex].x, m.points[nextIndex].y, m.points[nextIndex].z),
                new THREE.Vector3(m.points[i].x, m.points[i].y, m.points[i].z)
              )
              .length()
          });
        }
      }
    });
    
    // Sort by length descending (prioritize longer edges)
    return edges.sort((a, b) => b.length - a.length);
  }, [measurements, measurement.id]);
  
  // Prioritize eave lines if they exist
  useEffect(() => {
    // Try to auto-detect good alignment edges
    const eaveEdges = availableEdges.filter(edge => {
      const m = measurements.find(m => m.id === edge.measurementId);
      return m?.type === 'eave';
    });
    
    if (eaveEdges.length > 0) {
      // Select the longest eave edge as default
      setSelectedEdge({
        measurementId: eaveEdges[0].measurementId,
        edgeIndex: eaveEdges[0].edgeIndex
      });
      setPreviewEdge({
        from: eaveEdges[0].from,
        to: eaveEdges[0].to
      });
    }
  }, [availableEdges, measurements]);
  
  const handleSelectEdge = (edge: typeof availableEdges[0]) => {
    setSelectedEdge({
      measurementId: edge.measurementId,
      edgeIndex: edge.edgeIndex
    });
    
    setPreviewEdge({
      from: edge.from,
      to: edge.to
    });
    
    // Show toast to indicate selection
    toast({
      title: "Ausrichtungskante ausgewählt",
      description: `Kante mit ${edge.length.toFixed(2)}m Länge ausgewählt.`,
      duration: 2000
    });
  };
  
  const handleConfirm = () => {
    if (!previewEdge) {
      toast({
        title: "Keine Ausrichtungskante ausgewählt",
        description: "Bitte wählen Sie eine Kante für die Ausrichtung der PV-Module.",
        variant: "destructive"
      });
      return;
    }
    
    onAlignmentSet(previewEdge);
  };
  
  const handleInvertDirection = () => {
    if (!previewEdge) return;
    
    // Swap from and to points
    setPreviewEdge({
      from: previewEdge.to,
      to: previewEdge.from
    });
    
    toast({
      title: "Ausrichtung umgekehrt",
      description: "Die Ausrichtung der Module wurde umgekehrt.",
      duration: 2000
    });
  };
  
  return (
    <div className="space-y-4 p-3 bg-background/80 rounded border border-border">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium">PV-Modul Ausrichtung festlegen</h3>
      </div>
      
      <div className="text-xs text-muted-foreground mb-2">
        Wählen Sie eine Kante für die Ausrichtung der PV-Module.
      </div>
      
      <div className="max-h-40 overflow-y-auto space-y-2">
        {availableEdges.length === 0 ? (
          <div className="text-sm text-muted-foreground p-2 bg-muted rounded">
            Keine Kanten zur Ausrichtung verfügbar. Erstellen Sie zuerst Messungen für Dachkanten.
          </div>
        ) : (
          availableEdges.map((edge, index) => {
            const isSelected = selectedEdge?.measurementId === edge.measurementId && 
                              selectedEdge?.edgeIndex === edge.edgeIndex;
            
            // Get measurement for this edge
            const edgeMeasurement = measurements.find(m => m.id === edge.measurementId);
            
            // Create a descriptive label
            const edgeLabel = `${edgeMeasurement?.type || 'Kante'} (${edge.length.toFixed(2)}m)`;
            
            return (
              <Button
                key={`${edge.measurementId}-${edge.edgeIndex}`}
                size="sm"
                variant={isSelected ? "default" : "outline"}
                className={`w-full justify-start ${isSelected ? 'border-primary' : ''}`}
                onClick={() => handleSelectEdge(edge)}
              >
                <PinIcon className="h-3 w-3 mr-2" />
                <span className="truncate text-xs">{edgeLabel}</span>
              </Button>
            );
          })
        )}
      </div>
      
      <div className="flex justify-between gap-2 pt-2">
        <Button 
          size="sm" 
          variant="outline" 
          onClick={handleInvertDirection}
          disabled={!previewEdge}
        >
          <ArrowLeftRightIcon className="h-4 w-4 mr-1" />
          <span className="text-xs">Umkehren</span>
        </Button>
        
        <div className="space-x-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={onCancel}
          >
            <RotateCcwIcon className="h-4 w-4 mr-1" />
            <span className="text-xs">Abbrechen</span>
          </Button>
          
          <Button 
            size="sm" 
            variant="default" 
            onClick={handleConfirm}
            disabled={!previewEdge}
          >
            <CheckIcon className="h-4 w-4 mr-1" />
            <span className="text-xs">Bestätigen</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PVAlignmentSelector;
