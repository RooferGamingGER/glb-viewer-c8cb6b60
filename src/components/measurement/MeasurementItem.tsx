
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Pencil, Trash2, Save, X } from 'lucide-react';
import { Measurement, Segment } from '@/hooks/useMeasurements';
import { Input } from "@/components/ui/input";
import SegmentList from './SegmentList';
import PointEditList from './PointEditList';

interface MeasurementItemProps {
  measurement: Measurement;
  toggleMeasurementVisibility: (id: string) => void;
  handleStartPointEdit: (id: string) => void;
  handleDeleteMeasurement: (id: string) => void;
  handleDeletePoint?: (measurementId: string, pointIndex: number) => void;
  updateMeasurement: (id: string, data: Partial<Measurement>) => void;
  editMeasurementId: string | null;
  segmentsOpen: Record<string, boolean>;
  toggleSegments: (id: string) => void;
  onEditSegment: (segmentId: string) => void;
  movingPointInfo?: { measurementId: string; pointIndex: number } | null;
}

const MeasurementItem: React.FC<MeasurementItemProps> = ({
  measurement,
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleEditStart = (id: string, description: string = '') => {
    setEditingId(id);
    setEditValue(description || '');
  };

  const handleEditSave = (id: string) => {
    updateMeasurement(id, { description: editValue });
    setEditingId(null);
  };

  return (
    <div 
      className={`mb-3 p-2 rounded-md border ${
        measurement.editMode ? 'border-primary bg-secondary/20' : 'border-border'
      }`}
    >
      <div className="flex justify-between items-center mb-1">
        <div className="font-medium">
          {measurement.type === 'length' && "Länge"}
          {measurement.type === 'height' && "Höhe"}
          {measurement.type === 'area' && "Fläche"}
        </div>
        <div className="flex space-x-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6" 
            onClick={() => toggleMeasurementVisibility(measurement.id)}
            title={measurement.visible === false ? "Einblenden" : "Ausblenden"}
          >
            {measurement.visible === false ? (
              <Eye className="h-3 w-3" />
            ) : (
              <EyeOff className="h-3 w-3" />
            )}
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6" 
            onClick={() => handleStartPointEdit(measurement.id)}
            title="Punkte bearbeiten"
          >
            <Pencil className="h-3 w-3" />
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6" 
            onClick={() => handleDeleteMeasurement(measurement.id)}
            title="Löschen"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      <div className="text-sm mb-1">
        <strong>Wert:</strong> {measurement.label}
        {(measurement.type === 'length' || measurement.type === 'area') && 
         measurement.inclination !== undefined && (
          <span className="ml-2">
            <strong>Neigung:</strong> {Math.abs(measurement.inclination).toFixed(1)}°
            {measurement.type === 'area' && " Ø"}
          </span>
        )}
      </div>
      
      {editingId === measurement.id ? (
        <div className="flex flex-col space-y-2 mt-2">
          <Input
            placeholder="Beschreibung hinzufügen"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
          />
          <div className="flex space-x-2">
            <Button 
              variant="default" 
              size="sm" 
              className="flex-1"
              onClick={() => handleEditSave(measurement.id)}
            >
              <Save className="h-3 w-3 mr-1" />
              Speichern
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={() => setEditingId(null)}
            >
              <X className="h-3 w-3 mr-1" />
              Abbrechen
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex mt-1">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs h-7 px-2"
            onClick={() => handleEditStart(measurement.id, measurement.description)}
          >
            {measurement.description ? 
              measurement.description : 
              "Beschreibung hinzufügen..."
            }
          </Button>
        </div>
      )}
      
      {measurement.editMode && handleDeletePoint && (
        <PointEditList 
          measurement={measurement}
          handleDeletePoint={handleDeletePoint}
          movingPointInfo={movingPointInfo}
        />
      )}
      
      {measurement.type === 'area' && measurement.segments && (
        <SegmentList 
          measurementId={measurement.id}
          segments={measurement.segments}
          isOpen={segmentsOpen[measurement.id] || false}
          toggleSegments={toggleSegments}
          onEditSegment={onEditSegment}
        />
      )}
    </div>
  );
};

export default MeasurementItem;
