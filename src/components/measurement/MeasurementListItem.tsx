
import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  Eye, 
  EyeOff, 
  Tag, 
  ArrowUp, 
  ArrowDown, 
  Trash2, 
  Edit 
} from 'lucide-react';
import { Measurement } from '@/types/measurements';

interface MeasurementListItemProps {
  measurement: Measurement;
  toggleMeasurementVisibility: (id: string) => void;
  toggleLabelVisibility: (id: string) => void;
  handleStartPointEdit: (id: string) => void;
  handleDeleteMeasurement: (id: string) => void;
  handleMoveMeasurementUp: (id: string) => void;
  handleMoveMeasurementDown: (id: string) => void;
}

export const MeasurementListItem: React.FC<MeasurementListItemProps> = ({
  measurement,
  toggleMeasurementVisibility,
  toggleLabelVisibility,
  handleStartPointEdit,
  handleDeleteMeasurement,
  handleMoveMeasurementUp,
  handleMoveMeasurementDown
}) => {
  // Format measurement value with proper units
  const formatValue = () => {
    if (measurement.type === 'length' || measurement.type === 'height') {
      return `${measurement.value.toFixed(2)} m`;
    } else if (measurement.type === 'area' || measurement.type === 'solar' || 
              measurement.type === 'skylight' || measurement.type === 'chimney') {
      return `${measurement.value.toFixed(2)} m²`;
    } else {
      return measurement.value.toFixed(2);
    }
  };
  
  // Get type label in German
  const getTypeLabel = () => {
    switch (measurement.type) {
      case 'length': return 'Länge';
      case 'height': return 'Höhe';
      case 'area': return 'Fläche';
      case 'solar': return 'Solar';
      case 'chimney': return 'Kamin';
      case 'skylight': return 'Dachfenster';
      case 'vent': return 'Entlüfter';
      case 'hook': return 'Dachhaken';
      case 'other': return 'Sonstiges';
      default: return measurement.type;
    }
  };
  
  return (
    <tr className="border-b last:border-b-0 hover:bg-muted/50">
      <td className="px-1 py-1">
        <div className="flex items-center">
          <span className="text-xs">
            {getTypeLabel()}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 ml-1"
            onClick={() => toggleMeasurementVisibility(measurement.id)}
            title={measurement.visible === false ? "Einblenden" : "Ausblenden"}
          >
            {measurement.visible === false ? 
              <Eye className="h-3 w-3" /> : 
              <EyeOff className="h-3 w-3" />
            }
          </Button>
        </div>
      </td>
      <td className="px-1 py-1">
        <div className="flex items-center">
          <span className="text-xs font-medium mr-1">
            {measurement.label || `#${measurement.id.substring(0, 4)}`}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatValue()}
          </span>
        </div>
      </td>
      <td className="px-1 py-1 text-right">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={() => handleMoveMeasurementUp(measurement.id)}
            title="Nach oben"
          >
            <ArrowUp className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={() => handleMoveMeasurementDown(measurement.id)}
            title="Nach unten"
          >
            <ArrowDown className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={() => toggleLabelVisibility(measurement.id)}
            title={measurement.labelVisible === false ? "Label anzeigen" : "Label ausblenden"}
          >
            <Tag className={`h-3 w-3 ${measurement.labelVisible === false ? 'opacity-50' : ''}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={() => handleStartPointEdit(measurement.id)}
            title="Punkte bearbeiten"
          >
            <Edit className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={() => handleDeleteMeasurement(measurement.id)}
            title="Löschen"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </td>
    </tr>
  );
};
