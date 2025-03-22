
import React, { useState } from 'react';
import { Measurement } from '@/hooks/useMeasurements';
import { SegmentsList } from './SegmentsList';
import { MeasurementEditForm } from './MeasurementEditForm';
import { 
  ChevronDown, 
  ChevronUp, 
  Pencil, 
  Trash2, 
  X, 
  Edit, 
  Eye, 
  EyeOff, 
  Tag, 
  Sun, // Replacing SolarIcon with Sun
  ArrowUpDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import PVModuleSelector from '../pv/PVModuleSelector';

interface MeasurementDetailProps {
  measurement: Measurement;
  toggleMeasurementVisibility: (id: string) => void;
  toggleLabelVisibility: (id: string) => void;
  togglePVModulesVisibility?: (id: string) => void;
  onStartEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onDeletePoint?: (id: string, pointIndex: number) => void;
  updateMeasurement: (measurement: Measurement) => void;
  segmentsOpen?: boolean;
  onToggleSegments?: () => void;
  onEditSegment?: (segmentId: string) => void;
  toggleModuleSelection?: (measurementId: string, moduleIndex: number) => void;
  selectAllModules?: (measurementId: string) => void;
  deselectAllModules?: (measurementId: string) => void;
  toggleDetailedModules?: (measurementId: string) => void;
}

export const MeasurementDetail: React.FC<MeasurementDetailProps> = ({
  measurement,
  toggleMeasurementVisibility,
  toggleLabelVisibility,
  togglePVModulesVisibility,
  onStartEdit,
  onDelete,
  onDeletePoint,
  updateMeasurement,
  segmentsOpen = false,
  onToggleSegments,
  onEditSegment,
  toggleModuleSelection,
  selectAllModules,
  deselectAllModules,
  toggleDetailedModules
}) => {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  
  const startEditing = () => {
    setEditing(true);
  };
  
  const stopEditing = () => {
    setEditing(false);
  };
  
  const handleStartEdit = () => {
    onStartEdit(measurement.id);
  };
  
  const handleDelete = () => {
    if (confirmDelete) {
      onDelete(measurement.id);
    } else {
      setConfirmDelete(true);
    }
  };
  
  const updateMeasurementData = (updatedData: Partial<Measurement>) => {
    updateMeasurement({
      ...measurement,
      ...updatedData
    });
    setEditing(false);
  };
  
  const isSolar = measurement.type === 'solar';
  const hasPVModules = isSolar && measurement.pvModuleInfo && measurement.pvModuleInfo.moduleCount > 0;
  
  // Format for area display
  const formatArea = (area: number) => {
    return `${area.toFixed(2)} m²`;
  };
  
  // Format for length display
  const formatLength = (length: number) => {
    return `${length.toFixed(2)} m`;
  };
  
  const renderMeasurementValue = () => {
    switch (measurement.type) {
      case 'area':
      case 'solar':
      case 'skylight':
      case 'chimney':
        return formatArea(measurement.value);
      case 'length':
      case 'height':
        return formatLength(measurement.value);
      default:
        return measurement.value.toFixed(2);
    }
  };
  
  // Determine badge color based on measurement type
  const getBadgeVariant = () => {
    switch (measurement.type) {
      case 'length': return 'default';
      case 'height': return 'outline';
      case 'area': return 'secondary';
      case 'solar': return 'blue';
      case 'skylight': return 'amber';
      case 'chimney': return 'destructive';
      case 'hook': 
      case 'vent': 
      case 'other': return 'outline';
      default: return 'default';
    }
  };
  
  // Get label for measurement type
  const getMeasurementTypeLabel = () => {
    switch (measurement.type) {
      case 'length': return 'Länge';
      case 'height': return 'Höhe';
      case 'area': return 'Fläche';
      case 'solar': return 'Solar';
      case 'skylight': return 'Dachfenster';
      case 'chimney': return 'Kamin';
      case 'vent': return 'Entlüfter';
      case 'hook': return 'Dachhaken';
      case 'other': return 'Sonstiges';
      default: return measurement.type;
    }
  };
  
  if (editing) {
    return (
      <Card className="p-3 mb-3">
        <MeasurementEditForm 
          measurement={measurement}
          onSave={updateMeasurementData}
          onCancel={stopEditing}
        />
      </Card>
    );
  }
  
  return (
    <Card className="p-3 mb-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant={getBadgeVariant() as any}>{getMeasurementTypeLabel()}</Badge>
          <span className="font-semibold">{measurement.label || `#${measurement.id.substring(0, 4)}`}</span>
        </div>
        
        <div className="flex gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7"
            onClick={() => toggleMeasurementVisibility(measurement.id)}
            title={measurement.visible === false ? "Einblenden" : "Ausblenden"}
          >
            {measurement.visible === false ? 
              <Eye className="h-4 w-4" /> : 
              <EyeOff className="h-4 w-4" />
            }
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7"
            onClick={() => toggleLabelVisibility(measurement.id)}
            title={measurement.labelVisible === false ? "Label anzeigen" : "Label ausblenden"}
          >
            <Tag className={`h-4 w-4 ${measurement.labelVisible === false ? 'opacity-50' : ''}`} />
          </Button>
          
          {/* PV Modules visibility toggle */}
          {isSolar && hasPVModules && togglePVModulesVisibility && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={() => togglePVModulesVisibility(measurement.id)}
              title={measurement.modulesVisible === false ? "Module anzeigen" : "Module ausblenden"}
            >
              <Sun className={`h-4 w-4 ${measurement.modulesVisible === false ? 'opacity-50' : ''}`} />
            </Button>
          )}
        </div>
      </div>
      
      <div className="mt-2 text-sm">
        <div className="grid grid-cols-2 gap-x-2 gap-y-1">
          <span className="text-muted-foreground">Wert:</span>
          <span className="font-medium">{renderMeasurementValue()}</span>
          
          {measurement.inclination !== undefined && (
            <>
              <span className="text-muted-foreground">Neigung:</span>
              <span className="font-medium">{measurement.inclination.toFixed(1)}°</span>
            </>
          )}
          
          <span className="text-muted-foreground">Punkte:</span>
          <span className="font-medium">{measurement.points.length}</span>
        </div>
      </div>
      
      {/* PV Module Selector */}
      {isSolar && hasPVModules && toggleModuleSelection && selectAllModules && deselectAllModules && toggleDetailedModules && (
        <div className="mt-3">
          <Separator className="my-2" />
          <PVModuleSelector 
            measurement={measurement}
            toggleModuleSelection={toggleModuleSelection}
            selectAllModules={selectAllModules}
            deselectAllModules={deselectAllModules}
            toggleDetailedModules={toggleDetailedModules}
          />
        </div>
      )}
      
      {/* Show segments for area/solar measurements */}
      {(measurement.type === 'area' || measurement.type === 'solar') && 
       measurement.segments && measurement.segments.length > 0 && (
        <div className="mt-3">
          <Separator className="my-2" />
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              size="sm" 
              className="flex items-center justify-start px-0 -ml-2 text-sm font-medium"
              onClick={onToggleSegments}
            >
              {segmentsOpen ? 
                <ChevronUp className="h-4 w-4 mr-1" /> : 
                <ChevronDown className="h-4 w-4 mr-1" />
              }
              Segmente ({measurement.segments.length})
            </Button>
          </div>
          
          {segmentsOpen && (
            <div className="mt-2">
              <SegmentsList 
                segments={measurement.segments} 
                onEditSegment={segmentId => onEditSegment && onEditSegment(segmentId)}
              />
            </div>
          )}
        </div>
      )}
      
      <div className="flex justify-between gap-2 mt-3">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1"
          onClick={startEditing}
        >
          <Pencil className="h-4 w-4 mr-2" />
          Bearbeiten
        </Button>
        
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleStartEdit}
        >
          <Edit className="h-4 w-4 mr-2" />
          Punkte
        </Button>
        
        <Button 
          variant={confirmDelete ? "destructive" : "outline"} 
          size="sm"
          onClick={handleDelete}
        >
          {confirmDelete ? (
            <>
              <X className="h-4 w-4 mr-2" />
              Sicher?
            </>
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      </div>
    </Card>
  );
};
