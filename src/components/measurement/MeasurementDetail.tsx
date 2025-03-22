
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PanelTopOpen, Trash2, Edit, MoveUp, MoveDown, Target } from 'lucide-react';
import { Measurement } from '@/types/measurements';
import SegmentsList from './SegmentsList';
import MeasurementEditForm from './MeasurementEditForm';
import SolarModuleControls from './SolarModuleControls';

interface MeasurementDetailProps {
  measurement: Measurement;
  segmentsOpen: { [key: string]: boolean };
  toggleSegments: (id: string) => void;
  handleStartPointEdit: (id: string, index: number) => void;
  handleDeleteMeasurement: (id: string) => void;
  handleDeletePoint: (id: string, index: number) => void;
  onEditSegment: (segmentId: string) => void;
  editingSegmentId: string | null;
  updateMeasurement: (id: string, updates: Partial<Measurement>) => void;
  editMeasurementId: string | null;
  handleMoveMeasurementUp: (id: string) => void;
  handleMoveMeasurementDown: (id: string) => void;
  togglePVModulesVisibility: (id: string) => void;
}

const MeasurementDetail: React.FC<MeasurementDetailProps> = ({
  measurement,
  segmentsOpen,
  toggleSegments,
  handleStartPointEdit,
  handleDeleteMeasurement,
  handleDeletePoint,
  onEditSegment,
  editingSegmentId,
  updateMeasurement,
  editMeasurementId,
  handleMoveMeasurementUp,
  handleMoveMeasurementDown,
  togglePVModulesVisibility
}) => {
  const isEditing = editMeasurementId === measurement.id;
  
  // Type-specific rendering 
  const getMeasurementTitle = (m: Measurement) => {
    const typeLabels: Record<string, string> = {
      length: 'Länge',
      height: 'Höhe',
      area: 'Fläche',
      solar: 'Solarfläche',
      chimney: 'Kamin',
      skylight: 'Dachfenster',
      vent: 'Lüfter',
      hook: 'Dachhaken',
      other: 'Einbauteil',
      pvmodule: 'PV-Modul',
      ridge: 'First',
      eave: 'Traufe',
      verge: 'Ortgang',
      valley: 'Kehle',
      hip: 'Grat'
    };
    
    return typeLabels[m.type] || 'Messung';
  };
  
  const hasSegments = measurement.segments && measurement.segments.length > 0;
  
  return (
    <Card className="mb-2">
      <CardContent className="p-3">
        {isEditing ? (
          <MeasurementEditForm
            measurement={measurement}
            updateMeasurement={updateMeasurement}
          />
        ) : (
          <>
            <div className="flex justify-between items-center mb-2">
              <div className="font-medium">{getMeasurementTitle(measurement)}</div>
              <div className="flex space-x-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleMoveMeasurementUp(measurement.id)}
                  title="Nach oben verschieben"
                >
                  <MoveUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline" 
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleMoveMeasurementDown(measurement.id)}
                  title="Nach unten verschieben"
                >
                  <MoveDown className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline" 
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => updateMeasurement(measurement.id, { editMode: true })}
                  title="Messung bearbeiten"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline" 
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleDeleteMeasurement(measurement.id)}
                  title="Messung löschen"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div>
              <div className="text-sm">{measurement.label || `${getMeasurementTitle(measurement)}: ${measurement.value.toFixed(2)} ${measurement.type === 'area' || measurement.type === 'solar' ? 'm²' : 'm'}`}</div>
              
              {measurement.inclination !== undefined && (
                <div className="text-xs text-muted-foreground mt-1">
                  Dachneigung: {measurement.inclination.toFixed(1)}°
                </div>
              )}
              
              {measurement.description && (
                <div className="text-xs text-muted-foreground mt-1">
                  {measurement.description}
                </div>
              )}
              
              {/* Show point editing buttons for area and length measurements */}
              {(measurement.type === 'area' || measurement.type === 'length' || measurement.type === 'solar') && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {measurement.points.map((_, index) => (
                    <Button 
                      key={index}
                      variant="outline" 
                      size="sm"
                      className="h-7 py-0 px-2 text-xs"
                      onClick={() => handleStartPointEdit(measurement.id, index)}
                    >
                      <Target className="h-3 w-3 mr-1" />
                      P{index + 1} bearbeiten
                    </Button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Show segments for area measurements */}
            {hasSegments && (
              <div className="mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-between h-7 px-3 py-0 text-xs"
                  onClick={() => toggleSegments(measurement.id)}
                >
                  <span>Segmente anzeigen</span>
                  <PanelTopOpen className={`h-3 w-3 transform transition-transform ${segmentsOpen[measurement.id] ? 'rotate-180' : ''}`} />
                </Button>
                
                {segmentsOpen[measurement.id] && (
                  <div className="mt-2 border rounded-sm p-2 bg-background/50">
                    <SegmentsList 
                      segments={measurement.segments || []}
                      editingSegmentId={editingSegmentId}
                      onEditSegment={onEditSegment}
                      onUpdateSegment={(segmentId, updates) => {
                        const updatedSegments = (measurement.segments || []).map(s => 
                          s.id === segmentId ? { ...s, ...updates } : s
                        );
                        updateMeasurement(measurement.id, { segments: updatedSegments });
                      }}
                    />
                  </div>
                )}
              </div>
            )}
            
            {/* Show solar module controls for solar measurements */}
            {measurement.type === 'solar' && (
              <div className="mt-2">
                <SolarModuleControls 
                  measurement={measurement}
                  togglePVModulesVisibility={togglePVModulesVisibility}
                />
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default MeasurementDetail;
