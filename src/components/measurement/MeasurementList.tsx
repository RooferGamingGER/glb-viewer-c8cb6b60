
import React from 'react';
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
  movingPointInfo
}) => {
  if (!measurements || measurements.length === 0 && !editMeasurementId) return null;
  
  // Gruppiere Messungen nach Typ
  const standardMeasurements = measurements.filter(m => 
    ['length', 'height', 'area'].includes(m.type)
  );
  
  const roofElementMeasurements = measurements.filter(m => 
    ['solar', 'gutter'].includes(m.type)
  );
  
  const penetrationMeasurements = measurements.filter(m => 
    ['skylight', 'chimney', 'vent', 'hook', 'other'].includes(m.type)
  );
  
  return (
    <div className="flex-1 flex flex-col min-h-0 w-full">
      <div className="pr-2">
        {/* Standard-Messungen */}
        {standardMeasurements.length > 0 && (
          <Accordion type="single" collapsible defaultValue="standard-measurements" className="mb-2">
            <AccordionItem value="standard-measurements">
              <AccordionTrigger className="py-2 text-sm font-medium">
                Standard-Messungen ({standardMeasurements.length})
              </AccordionTrigger>
              <AccordionContent>
                {standardMeasurements.map((measurement) => (
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
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
        
        {/* Dachelemente */}
        {roofElementMeasurements.length > 0 && (
          <Accordion type="single" collapsible defaultValue="roof-elements" className="mb-2">
            <AccordionItem value="roof-elements">
              <AccordionTrigger className="py-2 text-sm font-medium">
                Dachelemente ({roofElementMeasurements.length})
              </AccordionTrigger>
              <AccordionContent>
                {roofElementMeasurements.map((measurement) => (
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
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
        
        {/* Dachdurchdringungen */}
        {penetrationMeasurements.length > 0 && (
          <Accordion type="single" collapsible defaultValue="penetrations" className="mb-2">
            <AccordionItem value="penetrations">
              <AccordionTrigger className="py-2 text-sm font-medium">
                Dachdurchdringungen ({penetrationMeasurements.length})
              </AccordionTrigger>
              <AccordionContent>
                {penetrationMeasurements.map((measurement) => (
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
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
        
        {/* Nicht kategorisierte Messungen, falls vorhanden */}
        {measurements.filter(m => 
          !['length', 'height', 'area', 'solar', 'gutter', 'skylight', 'chimney', 'vent', 'hook', 'other'].includes(m.type)
        ).map((measurement) => (
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
      </div>
    </div>
  );
};

export default MeasurementList;
