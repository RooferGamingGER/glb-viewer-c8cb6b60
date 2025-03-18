
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { 
  Eye, 
  EyeOff, 
  Pencil, 
  Trash2, 
  Save, 
  X,
  House,
  Cylinder,
  SplitSquareVertical,
  Sun,
  Droplet,
  Minus,
  ArrowDown,
  Wind,
  Square
} from 'lucide-react';
import { Measurement } from '@/types/measurements';
import { Input } from "@/components/ui/input";
import SegmentList from './SegmentList';
import PointEditList from './PointEditList';
import { Badge } from "@/components/ui/badge";

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

  const getTypeIcon = (type: string) => {
    switch(type) {
      case 'dormer': return <House className="h-4 w-4 mr-1" />;
      case 'chimney': return <Cylinder className="h-4 w-4 mr-1" />;
      case 'skylight': return <SplitSquareVertical className="h-4 w-4 mr-1" />;
      case 'solar': return <Sun className="h-4 w-4 mr-1" />;
      case 'gutter': return <Droplet className="h-4 w-4 mr-1" />;
      case 'verge': return <Minus className="h-4 w-4 mr-1" />;
      case 'valley': return <ArrowDown className="h-4 w-4 rotate-45 mr-1" />;
      case 'ridge': return <ArrowDown className="h-4 w-4 rotate-135 mr-1" />;
      case 'vent': return <Wind className="h-4 w-4 mr-1" />;
      case 'length': return <Minus className="h-4 w-4 mr-1" />;
      case 'height': return <ArrowDown className="h-4 w-4 mr-1" />;
      case 'area': return <Square className="h-4 w-4 mr-1" />;
      default: return null;
    }
  };

  const getTypeName = (type: string) => {
    const typeNames: Record<string, string> = {
      'length': 'Länge',
      'height': 'Höhe',
      'area': 'Fläche',
      'dormer': 'Gaube',
      'chimney': 'Kamin',
      'skylight': 'Dachfenster',
      'solar': 'Solaranlage',
      'gutter': 'Dachrinne',
      'verge': 'Ortgang/Traufe',
      'valley': 'Kehle',
      'ridge': 'Grat',
      'vent': 'Lüfter'
    };
    
    return typeNames[type] || type;
  };

  const isRoofElement = [
    'dormer', 'chimney', 'skylight', 'solar', 
    'gutter', 'verge', 'valley', 'ridge', 'vent'
  ].includes(measurement.type);

  return (
    <div 
      className={`mb-3 p-2 rounded-md border ${
        measurement.editMode ? 'border-primary bg-secondary/20' : 
        isRoofElement ? 'border-blue-300/50 bg-blue-50/10' : 'border-border'
      }`}
    >
      <div className="flex justify-between items-center mb-1">
        <div className="font-medium flex items-center">
          {getTypeIcon(measurement.type)}
          {getTypeName(measurement.type)}
          
          {measurement.subType && (
            <Badge variant="outline" className="ml-2 text-xs">
              {measurement.subType}
            </Badge>
          )}
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
        
        {/* Abmessungen für Dachelemente */}
        {measurement.dimensions && (
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-1 text-xs">
            {measurement.dimensions.length !== undefined && (
              <div><strong>Länge:</strong> {measurement.dimensions.length.toFixed(2)} m</div>
            )}
            {measurement.dimensions.width !== undefined && (
              <div><strong>Breite:</strong> {measurement.dimensions.width.toFixed(2)} m</div>
            )}
            {measurement.dimensions.height !== undefined && (
              <div><strong>Höhe:</strong> {measurement.dimensions.height.toFixed(2)} m</div>
            )}
            {measurement.dimensions.diameter !== undefined && (
              <div><strong>Durchmesser:</strong> {measurement.dimensions.diameter.toFixed(2)} m</div>
            )}
            {measurement.dimensions.area !== undefined && (
              <div><strong>Fläche:</strong> {measurement.dimensions.area.toFixed(2)} m²</div>
            )}
          </div>
        )}
        
        {/* Nur für Längenmessungen die Neigung anzeigen */}
        {(measurement.type === 'length' || ['valley', 'ridge', 'verge'].includes(measurement.type)) && 
         measurement.inclination !== undefined && (
          <span className="ml-2">
            <strong>Neigung:</strong> {Math.abs(measurement.inclination).toFixed(1)}°
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
      
      {(measurement.type === 'area' || measurement.type === 'solar' || measurement.type === 'dormer') && 
        measurement.segments && (
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
