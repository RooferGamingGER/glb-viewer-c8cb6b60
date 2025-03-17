
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
  updateMeasurement: (id: string, data: Partial<Measurement>) => void;
  editMeasurementId: string | null;
  editingSegmentId: string | null;
  handleCancelEditing: () => void;
  segmentsOpen: Record<string, boolean>;
  toggleSegments: (id: string) => void;
  setEditingSegmentId: (id: string | null) => void;
  movingPointInfo?: { measurementId: string; pointIndex: number } | null;
}

const MeasurementList: React.FC<MeasurementListProps> = ({
  measurements,
  toggleMeasurementVisibility,
  handleStartPointEdit,
  handleDeleteMeasurement,
  updateMeasurement,
  editMeasurementId,
  editingSegmentId,
  handleCancelEditing,
  segmentsOpen,
  toggleSegments,
  setEditingSegmentId,
  movingPointInfo
}) => {
  if (measurements.length === 0 && !editMeasurementId && !editingSegmentId) return null;
  
  return (
    <SidebarGroup className="flex-1 flex flex-col min-h-0">
      <Accordion type="single" collapsible defaultValue="measurements">
        <AccordionItem value="measurements" className="border-0">
          <AccordionTrigger className="py-2 px-1 font-medium">
            Messungen ({measurements.length})
          </AccordionTrigger>
          <AccordionContent>
            <SidebarGroupContent className="flex-1 flex flex-col min-h-0">
              <ScrollArea className="flex-1" style={{ height: 'calc(100vh - 500px)' }}>
                {measurements.map((measurement) => (
                  <MeasurementItem
                    key={measurement.id}
                    measurement={measurement}
                    toggleMeasurementVisibility={toggleMeasurementVisibility}
                    handleStartPointEdit={handleStartPointEdit}
                    handleDeleteMeasurement={handleDeleteMeasurement}
                    updateMeasurement={updateMeasurement}
                    editMeasurementId={editMeasurementId}
                    segmentsOpen={segmentsOpen}
                    toggleSegments={toggleSegments}
                    onEditSegment={setEditingSegmentId}
                  />
                ))}
              </ScrollArea>
            </SidebarGroupContent>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </SidebarGroup>
  );
};

export default MeasurementList;
