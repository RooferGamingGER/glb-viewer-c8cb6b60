
import React, { useState } from 'react';
import { Measurement } from '@/types/measurements';
import MeasurementCard from './MeasurementCard';
import { Button } from "@/components/ui/button";
import { Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MeasurementListProps {
  measurements: Measurement[];
  toggleMeasurementVisibility: (id: string, data: Partial<Measurement>) => void;
  toggleEditMode: (id: string) => void;
  deleteMeasurement: (id: string) => void;
  deletePoint: (measurementId: string, pointIndex: number) => void;
  updateMeasurement: (id: string, data: Partial<Measurement>) => void;
  handleStartPointEdit: (id: string) => void;
  moveMeasurementUp?: (id: string) => void;
  moveMeasurementDown?: (id: string) => void;
}

const MeasurementList: React.FC<MeasurementListProps> = ({
  measurements,
  toggleMeasurementVisibility,
  toggleEditMode,
  deleteMeasurement,
  deletePoint,
  updateMeasurement,
  handleStartPointEdit,
  moveMeasurementUp,
  moveMeasurementDown
}) => {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  
  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };
  
  const handleDelete = (id: string) => {
    setConfirmDelete(id);
  };
  
  const confirmDeleteMeasurement = () => {
    if (confirmDelete) {
      deleteMeasurement(confirmDelete);
      toast.success('Messung gelöscht');
      setConfirmDelete(null);
    }
  };
  
  const handleVisibilityChange = (id: string, visible: boolean) => {
    toggleMeasurementVisibility(id, { visible });
  };
  
  const handleLabelVisibilityChange = (id: string, labelVisible: boolean) => {
    toggleMeasurementVisibility(id, { labelVisible });
  };
  
  const handleEditModeToggle = (id: string) => {
    toggleEditMode(id);
  };
  
  const handlePointEdit = (id: string) => {
    handleStartPointEdit(id);
  };
  
  const handleDeletePoint = (measurementId: string, pointIndex: number) => {
    deletePoint(measurementId, pointIndex);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Messungen ({measurements.length})</h3>
        
        {measurements.length > 0 && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 text-destructive hover:text-destructive"
            onClick={() => setConfirmDelete('all')}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Alle löschen
          </Button>
        )}
      </div>
      
      <ScrollArea className="h-auto max-h-[calc(100vh-15rem)]">
        <div className="space-y-3">
          {measurements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Keine Messungen vorhanden
            </div>
          ) : (
            measurements.map((measurement) => (
              <MeasurementCard
                key={measurement.id}
                measurement={measurement}
                expanded={expandedIds.has(measurement.id)}
                onToggleExpanded={() => toggleExpanded(measurement.id)}
                onVisibilityChange={(visible) => handleVisibilityChange(measurement.id, visible)}
                onLabelVisibilityChange={(visible) => handleLabelVisibilityChange(measurement.id, visible)}
                onEdit={() => handleEditModeToggle(measurement.id)}
                onDelete={() => handleDelete(measurement.id)}
                onPointEdit={() => handlePointEdit(measurement.id)}
                onDeletePoint={(pointIndex) => handleDeletePoint(measurement.id, pointIndex)}
                onMoveUp={moveMeasurementUp ? () => moveMeasurementUp(measurement.id) : undefined}
                onMoveDown={moveMeasurementDown ? () => moveMeasurementDown(measurement.id) : undefined}
                onUpdateData={(data) => updateMeasurement(measurement.id, data)}
              />
            ))
          )}
        </div>
      </ScrollArea>
      
      <AlertDialog open={confirmDelete !== null} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-destructive mr-2" />
              {confirmDelete === 'all' ? 'Alle Messungen löschen?' : 'Messung löschen?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete === 'all'
                ? 'Möchten Sie wirklich alle Messungen löschen? Diese Aktion kann nicht rückgängig gemacht werden.'
                : 'Möchten Sie diese Messung wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteMeasurement}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MeasurementList;
