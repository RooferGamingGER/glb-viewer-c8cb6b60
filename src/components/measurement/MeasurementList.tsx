import React from 'react';
import { Measurement } from '@/hooks/useMeasurements';
import MeasurementItem from './MeasurementItem';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

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
  movingPointInfo?: {
    measurementId: string;
    pointIndex: number;
  } | null;
  handleMoveMeasurementUp?: (id: string) => void;
  handleMoveMeasurementDown?: (id: string) => void;
  activeCategory?: string;
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
  handleMoveMeasurementDown,
  activeCategory
}) => {
  if (!measurements || measurements.length === 0 && !editMeasurementId) {
    return <div className="text-center text-muted-foreground py-8">
        Keine Messungen vorhanden.
      </div>;
  }

  // Group measurements by category
  // 1. Dach (standard measurements: length, height, area)
  const dachMeasurements = measurements.filter(m => ['length', 'height', 'area'].includes(m.type));

  // 2. Solar (solar planning measurements)
  const solarMeasurements = measurements.filter(m => ['solar'].includes(m.type));

  // 3. Dachelemente (skylight, chimney)
  const dachelementeMeasurements = measurements.filter(m => ['skylight', 'chimney'].includes(m.type));

  // 4. Einbauten (vent, hook, other)
  const einbautenMeasurements = measurements.filter(m => ['vent', 'hook', 'other'].includes(m.type));

  // 5. Any other measurements not categorized
  const otherMeasurements = measurements.filter(m => !['length', 'height', 'area', 'solar', 'skylight', 'chimney', 'vent', 'hook', 'other'].includes(m.type));
  
  const renderMeasurementGroup = (title: string, items: Measurement[], showEmpty: boolean = false) => {
    if (items.length === 0 && !showEmpty) return null;
    return <div className="mb-3">
        <h3 className="text-sm font-medium mb-1 flex justify-between sticky top-0 bg-background z-10 py-1">
          <span>{title}</span>
          <span className="text-muted-foreground">({items.length})</span>
        </h3>
        
        {items.length > 0 ? items.map(measurement => <MeasurementItem key={measurement.id} measurement={measurement} toggleMeasurementVisibility={toggleMeasurementVisibility} toggleLabelVisibility={toggleLabelVisibility} handleStartPointEdit={handleStartPointEdit} handleDeleteMeasurement={handleDeleteMeasurement} handleDeletePoint={handleDeletePoint} updateMeasurement={updateMeasurement} editMeasurementId={editMeasurementId} segmentsOpen={segmentsOpen[measurement.id] || false} toggleSegments={toggleSegments} onEditSegment={onEditSegment} movingPointInfo={movingPointInfo} handleMoveUp={handleMoveMeasurementUp} handleMoveDown={handleMoveMeasurementDown} />) : <div className="text-sm text-muted-foreground py-1 text-center">
            Keine {title} vorhanden
          </div>}
      </div>;
  };

  // Render content based on activeCategory
  const renderCategoryContent = (category: string) => {
    switch (category) {
      case 'dach':
        return renderMeasurementGroup("Dach", dachMeasurements, true);
      case 'solar':
        return renderMeasurementGroup("Solar", solarMeasurements, true);
      case 'dachelemente':
        return renderMeasurementGroup("Dachelemente", dachelementeMeasurements, true);
      case 'einbauten':
        return renderMeasurementGroup("Einbauten", einbautenMeasurements, true);
      default:
        return null;
    }
  };

  // Filter measurements based on activeCategory if provided
  if (activeCategory) {
    return (
      <div className="flex-1 flex flex-col w-full px-2 pr-1">
        <div className="pr-2">
          {renderCategoryContent(activeCategory)}
        </div>
      </div>
    );
  }

  // Default rendering with all categories in tabs
  return (
    <div className="flex-1 flex flex-col w-full px-2">
      <Tabs defaultValue="dach" className="w-full">
        <TabsList className="w-full grid grid-cols-4 h-8 mb-2 sticky top-0 z-20">
          <TabsTrigger value="dach" className="text-xs py-1 px-0">
            Dach ({dachMeasurements.length})
          </TabsTrigger>
          <TabsTrigger value="solar" className="text-xs py-1 px-0">
            Solar ({solarMeasurements.length})
          </TabsTrigger>
          <TabsTrigger value="dachelemente" className="text-xs py-1 px-0">
            Elemente ({dachelementeMeasurements.length})
          </TabsTrigger>
          <TabsTrigger value="einbauten" className="text-xs py-1 px-0">
            Einbau ({einbautenMeasurements.length})
          </TabsTrigger>
        </TabsList>

        <div className="pr-2">
          <TabsContent value="dach" className="m-0">
            {renderMeasurementGroup("Dach", dachMeasurements, true)}
          </TabsContent>
          
          <TabsContent value="solar" className="m-0">
            {renderMeasurementGroup("Solar", solarMeasurements, true)}
          </TabsContent>
          
          <TabsContent value="dachelemente" className="m-0">
            {renderMeasurementGroup("Dachelemente", dachelementeMeasurements, true)}
          </TabsContent>
          
          <TabsContent value="einbauten" className="m-0">
            {renderMeasurementGroup("Einbauten", einbautenMeasurements, true)}
          </TabsContent>

          {/* Other measurements not categorized (if any) */}
          {otherMeasurements.length > 0 && (
            <>
              <Separator className="my-3" />
              {renderMeasurementGroup("Sonstige", otherMeasurements)}
            </>
          )}
        </div>
      </Tabs>
    </div>
  );
};

export default MeasurementList;
