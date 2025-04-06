
import React, { useState } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  SidebarGroup,
  SidebarGroupContent,
} from "@/components/ui/sidebar";
import { Measurement } from '@/hooks/useMeasurements';
import MeasurementItem from './MeasurementItem';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface MeasurementListProps {
  measurements: Measurement[];
  toggleMeasurementVisibility: (id: string) => void;
  toggleLabelVisibility: (id: string) => void;
  handleStartPointEdit: (id: string) => void;
  handleDeleteMeasurement: (id: string) => void;
  handleDeletePoint?: (measurementId: string, pointIndex: number) => void;
  updateMeasurement: (id: string, data: Partial<Measurement>) => void;
  editMeasurementId: string | null;
  segmentsOpen: Record<string, boolean>;
  toggleSegments: (id: string) => void;
  onEditSegment: (id: string | null) => void;
  movingPointInfo?: { measurementId: string; pointIndex: number } | null;
  handleMoveMeasurementUp?: (id: string) => void;
  handleMoveMeasurementDown?: (id: string) => void;
}

const MeasurementList: React.FC<MeasurementListProps> = ({
  measurements,
  toggleMeasurementVisibility,
  toggleLabelVisibility,
  handleStartPointEdit,
  handleDeleteMeasurement,
  handleDeletePoint,
  updateMeasurement,
  editMeasurementId,
  segmentsOpen,
  toggleSegments,
  onEditSegment,
  movingPointInfo,
  handleMoveMeasurementUp,
  handleMoveMeasurementDown
}) => {
  const [activeTab, setActiveTab] = useState<string>("standard");
  
  if (!measurements || measurements.length === 0 && !editMeasurementId) return null;
  
  // Group measurements by category with corrected categorization
  const standardMeasurements = measurements.filter(m => 
    ['length', 'height', 'area'].includes(m.type)
  );
  
  // Fixed categorization for roof elements - solar, chimney, and skylight
  const roofElementMeasurements = measurements.filter(m => 
    ['solar', 'chimney', 'skylight'].includes(m.type)
  );
  
  // Fixed categorization for penetrations - vent, hook, and other
  const penetrationMeasurements = measurements.filter(m => 
    ['vent', 'hook', 'other'].includes(m.type)
  );
  
  // Other measurements (if any new types are added in the future)
  const otherMeasurements = measurements.filter(m => 
    !['length', 'height', 'area', 'solar', 'skylight', 'chimney', 'vent', 'hook', 'other'].includes(m.type)
  );
  
  // Counts for each category
  const counts = {
    standard: standardMeasurements.length,
    roofElements: roofElementMeasurements.length,
    penetrations: penetrationMeasurements.length
  };
  
  return (
    <div className="flex-1 flex flex-col min-h-0 w-full">
      <div className="pr-2">
        <Tabs defaultValue="standard" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 mb-2">
            <TabsTrigger value="standard">
              Standard ({counts.standard})
            </TabsTrigger>
            <TabsTrigger value="roofElements">
              Dachelemente ({counts.roofElements})
            </TabsTrigger>
            <TabsTrigger value="penetrations">
              Einbauten ({counts.penetrations})
            </TabsTrigger>
          </TabsList>

          {/* Standard measurements tab */}
          <TabsContent value="standard" className="mt-0">
            {standardMeasurements.length > 0 ? (
              standardMeasurements.map((measurement) => (
                <MeasurementItem
                  key={measurement.id}
                  measurement={measurement}
                  toggleMeasurementVisibility={toggleMeasurementVisibility}
                  toggleLabelVisibility={toggleLabelVisibility}
                  handleStartPointEdit={handleStartPointEdit}
                  handleDeleteMeasurement={handleDeleteMeasurement}
                  handleDeletePoint={handleDeletePoint}
                  updateMeasurement={updateMeasurement}
                  editMeasurementId={editMeasurementId}
                  segmentsOpen={segmentsOpen}
                  toggleSegments={toggleSegments}
                  onEditSegment={onEditSegment}
                  movingPointInfo={movingPointInfo}
                  handleMoveMeasurementUp={handleMoveMeasurementUp}
                  handleMoveMeasurementDown={handleMoveMeasurementDown}
                />
              ))
            ) : (
              <div className="text-sm text-muted-foreground py-4 text-center">
                Keine Standard-Messungen vorhanden
              </div>
            )}
          </TabsContent>

          {/* Roof elements tab */}
          <TabsContent value="roofElements" className="mt-0">
            {roofElementMeasurements.length > 0 ? (
              roofElementMeasurements.map((measurement) => (
                <MeasurementItem
                  key={measurement.id}
                  measurement={measurement}
                  toggleMeasurementVisibility={toggleMeasurementVisibility}
                  toggleLabelVisibility={toggleLabelVisibility}
                  handleStartPointEdit={handleStartPointEdit}
                  handleDeleteMeasurement={handleDeleteMeasurement}
                  handleDeletePoint={handleDeletePoint}
                  updateMeasurement={updateMeasurement}
                  editMeasurementId={editMeasurementId}
                  segmentsOpen={segmentsOpen}
                  toggleSegments={toggleSegments}
                  onEditSegment={onEditSegment}
                  movingPointInfo={movingPointInfo}
                  handleMoveMeasurementUp={handleMoveMeasurementUp}
                  handleMoveMeasurementDown={handleMoveMeasurementDown}
                />
              ))
            ) : (
              <div className="text-sm text-muted-foreground py-4 text-center">
                Keine Dachelemente vorhanden
              </div>
            )}
          </TabsContent>

          {/* Penetrations tab */}
          <TabsContent value="penetrations" className="mt-0">
            {penetrationMeasurements.length > 0 ? (
              penetrationMeasurements.map((measurement) => (
                <MeasurementItem
                  key={measurement.id}
                  measurement={measurement}
                  toggleMeasurementVisibility={toggleMeasurementVisibility}
                  toggleLabelVisibility={toggleLabelVisibility}
                  handleStartPointEdit={handleStartPointEdit}
                  handleDeleteMeasurement={handleDeleteMeasurement}
                  handleDeletePoint={handleDeletePoint}
                  updateMeasurement={updateMeasurement}
                  editMeasurementId={editMeasurementId}
                  segmentsOpen={segmentsOpen}
                  toggleSegments={toggleSegments}
                  onEditSegment={onEditSegment}
                  movingPointInfo={movingPointInfo}
                  handleMoveMeasurementUp={handleMoveMeasurementUp}
                  handleMoveMeasurementDown={handleMoveMeasurementDown}
                />
              ))
            ) : (
              <div className="text-sm text-muted-foreground py-4 text-center">
                Keine Einbauten vorhanden
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        {/* Other measurements not categorized (if any) */}
        {otherMeasurements.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium mb-2">Sonstige Messungen</h3>
            {otherMeasurements.map((measurement) => (
              <MeasurementItem
                key={measurement.id}
                measurement={measurement}
                toggleMeasurementVisibility={toggleMeasurementVisibility}
                toggleLabelVisibility={toggleLabelVisibility}
                handleStartPointEdit={handleStartPointEdit}
                handleDeleteMeasurement={handleDeleteMeasurement}
                handleDeletePoint={handleDeletePoint}
                updateMeasurement={updateMeasurement}
                editMeasurementId={editMeasurementId}
                segmentsOpen={segmentsOpen}
                toggleSegments={toggleSegments}
                onEditSegment={onEditSegment}
                movingPointInfo={movingPointInfo}
                handleMoveMeasurementUp={handleMoveMeasurementUp}
                handleMoveMeasurementDown={handleMoveMeasurementDown}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MeasurementList;
