import React, { useState } from 'react';
import { CloudUpload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
}

const SaveMeasurementsButton: React.FC<SaveMeasurementsButtonProps> = ({
  measurements,
  className,
  variant = 'outline',
  size = 'sm',
  showLabel = true,
}) => {
  const { token, isAuthenticated } = useWebODMAuth();
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
        projectNameParam || undefined
      );
      smartToast.success(`${measurements.length} Messung${measurements.length !== 1 ? 'en' : ''} gespeichert`);
    } catch (err: any) {
      if (err.code === 'limit_reached') {
        smartToast.error('Speicherlimit erreicht (max. 100). Bitte löschen Sie nicht mehr benötigte Messungen.');
      } else {
        smartToast.error(err.message || 'Speichern fehlgeschlagen');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleSave}
      disabled={saving || measurements.length === 0}
      title="Messungen auf dem Server speichern"
    >
      {saving ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <CloudUpload className="h-4 w-4" />
      )}
      {showLabel && (
        <span className="ml-1.5">
          {saving ? 'Speichern...' : 'Im DrohnenGLB speichern'}
        </span>
      )}
    </Button>
  );
};

export default SaveMeasurementsButton;
