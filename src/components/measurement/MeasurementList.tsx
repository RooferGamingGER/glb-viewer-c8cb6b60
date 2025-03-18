
import React, { useMemo } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  SidebarGroup,
  SidebarGroupContent,
} from "@/components/ui/sidebar";
import { Measurement } from '@/hooks/useMeasurements';
import MeasurementItem from './MeasurementItem';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface MeasurementListProps {
  measurements: Measurement[];
  toggleMeasurementVisibility: (id: string) => void;
  handleStartPointEdit: (id: string) => void;
  handleDeleteMeasurement: (id: string) => void;
  handleDeletePoint?: (measurementId: string, pointIndex: number) => void;
  updateMeasurement: (id: string, data: Partial<Measurement>) => void;
  editMeasurementId: string | null;
  segmentsOpen: Record<string, boolean>;
  toggleSegments: (id: string) => void;
  onEditSegment: (id: string | null) => void;
  movingPointInfo?: { measurementId: string; pointIndex: number } | null;
  activeCategory?: 'standard' | 'roofelements' | 'penetrations';
}

const MeasurementList: React.FC<MeasurementListProps> = ({
  measurements,
  toggleMeasurementVisibility,
  handleStartPointEdit,
  handleDeleteMeasurement,
  handleDeletePoint,
  updateMeasurement,
  editMeasurementId,
  segmentsOpen,
  toggleSegments,
  onEditSegment,
  movingPointInfo,
  activeCategory = 'standard'
}) => {
  // Group measurements by category
  const categorizedMeasurements = useMemo(() => {
    // Define which types belong to which category
    const standardTypes = ['length', 'height', 'area'];
    const roofElementTypes = ['skylight', 'chimney', 'solar', 'gutter', 'dormer'];
    const penetrationTypes = ['vent', 'hook', 'other'];
    
    // Filter measurements based on active category
    if (activeCategory === 'standard') {
      return measurements.filter(m => standardTypes.includes(m.type));
    } else if (activeCategory === 'roofelements') {
      return measurements.filter(m => roofElementTypes.includes(m.type));
    } else if (activeCategory === 'penetrations') {
      return measurements.filter(m => penetrationTypes.includes(m.type));
    }
    
    // Default: return all
    return measurements;
  }, [measurements, activeCategory]);
  
  if (!measurements || (categorizedMeasurements.length === 0 && !editMeasurementId)) return null;
  
  return (
    <div className="flex-1 flex flex-col min-h-0 w-full">
      <div className="pr-2">
        {categorizedMeasurements.map((measurement) => (
          <MeasurementItem
            key={measurement.id}
            measurement={measurement}
            toggleMeasurementVisibility={toggleMeasurementVisibility}
            handleStartPointEdit={handleStartPointEdit}
            handleDeleteMeasurement={handleDeleteMeasurement}
            handleDeletePoint={handleDeletePoint}
            updateMeasurement={updateMeasurement}
            editMeasurementId={editMeasurementId}
            segmentsOpen={segmentsOpen}
            toggleSegments={toggleSegments}
            onEditSegment={onEditSegment}
            movingPointInfo={movingPointInfo}
          />
        ))}
        
        {categorizedMeasurements.length === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            Keine Messungen in dieser Kategorie
          </div>
        )}
      </div>
    </div>
  );
};

export default MeasurementList;
