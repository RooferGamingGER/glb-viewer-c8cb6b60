import React, { useState } from 'react';
import { CloudUpload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { Measurement } from '@/types/measurements';
import { useWebODMAuth } from '@/lib/auth-context';
import { useURLParam } from '@/hooks/useURLState';
import { saveMeasurements } from '@/utils/measurementStorage';
import { smartToast } from '@/utils/smartToast';

interface SaveMeasurementsButtonProps {
  measurements: Measurement[];
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showLabel?: boolean;
  iconOnly?: boolean;
}

const SaveMeasurementsButton: React.FC<SaveMeasurementsButtonProps> = ({
  measurements,
  className,
  variant = 'outline',
  size = 'sm',
  showLabel = true,
  iconOnly = false,
}) => {
  const { token, username, isAuthenticated } = useWebODMAuth();
  const projectIdParam = useURLParam('projectId');
  const taskIdParam = useURLParam('taskId');
  const taskNameParam = useURLParam('taskName');
  const projectNameParam = useURLParam('projectName');
  const [saving, setSaving] = useState(false);

  // Only show if we have server context
  if (!isAuthenticated || !token || !projectIdParam || !taskIdParam) {
    return null;
  }

  const projectId = parseInt(projectIdParam, 10);
  if (isNaN(projectId)) return null;

  const handleSave = async () => {
    if (measurements.length === 0) {
      smartToast.warning('Keine Messungen zum Speichern vorhanden');
      return;
    }

    setSaving(true);
    try {
      await saveMeasurements(
        token,
        projectId,
        taskIdParam,
        measurements,
        taskNameParam || undefined,
        projectNameParam || undefined,
        username || undefined
      );
      smartToast.success(`${measurements.length} Messung${measurements.length !== 1 ? 'en' : ''} gespeichert`);
    } catch (err: any) {
      if (err.code === 'limit_reached') {
        smartToast.error('Speicherlimit erreicht (max. 100).');
      } else {
        smartToast.error(err.message || 'Speichern fehlgeschlagen');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={className}
          disabled={saving || measurements.length === 0}
          title="Messungen auf dem Server speichern"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CloudUpload className="h-4 w-4" />
          )}
          {showLabel && !iconOnly && (
            <span className="ml-1.5">
              {saving ? 'Speichern...' : 'Speichern'}
            </span>
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Messdaten sichern?</AlertDialogTitle>
          <AlertDialogDescription>
            Die Messungen werden im DrohnenGLB gespeichert und können beim nächsten Öffnen dieses Tasks wieder eingelesen werden.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
          <AlertDialogAction onClick={handleSave} disabled={saving}>
            {saving ? 'Speichern...' : 'Speichern'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default SaveMeasurementsButton;
