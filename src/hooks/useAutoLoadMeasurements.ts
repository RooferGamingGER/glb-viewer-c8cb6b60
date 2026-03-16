import { useEffect, useRef } from 'react';
import { useURLParam } from '@/hooks/useURLState';
import { useWebODMAuth } from '@/lib/auth-context';
import { checkSavedMeasurements } from '@/utils/measurementStorage';
import { loadMeasurements } from '@/utils/measurementStorage';
import { Measurement } from '@/types/measurements';
import { smartToast } from '@/utils/smartToast';
import { toast } from 'sonner';

/**
 * Hook that checks for saved measurements when the viewer opens with projectId/taskId params.
 * Shows a confirmation toast before loading.
 */
export function useAutoLoadMeasurements(
  importMeasurements: (list: Measurement[], append?: boolean, linkShared?: boolean) => void,
  existingMeasurements: Measurement[]
) {
  const { token, username, isAuthenticated } = useWebODMAuth();
  const projectIdParam = useURLParam('projectId');
  const taskIdParam = useURLParam('taskId');
  const hasChecked = useRef(false);

  useEffect(() => {
    // Don't block on existingMeasurements — user may have embedded measurements in GLB
    // but still want to load newer saved ones from the server
    if (
      hasChecked.current ||
      !isAuthenticated ||
      !token ||
      !projectIdParam ||
      !taskIdParam
    ) {
      return;
    }

    const projectId = parseInt(projectIdParam, 10);
    if (isNaN(projectId)) return;

    hasChecked.current = true;

    console.log('[AutoLoad] Checking for saved measurements:', { projectId, taskId: taskIdParam, username });

    checkSavedMeasurements(token, projectId, taskIdParam, username || undefined)
      .then((result) => {
        console.log('[AutoLoad] Check result:', result);
        if (!result.exists) return;

        // Show confirmation toast
        toast('Gespeicherte Messungen gefunden', {
          description: 'Möchten Sie die gespeicherten Messungen laden?',
          duration: 15000,
          action: {
            label: 'Laden',
            onClick: () => {
              loadMeasurements(token, projectId, taskIdParam, username || undefined)
                .then((loadResult) => {
                  if (loadResult.found && loadResult.measurements && loadResult.measurements.length > 0) {
                    importMeasurements(loadResult.measurements, false, true);
                    smartToast.success(
                      `${loadResult.measurements.length} Messung${loadResult.measurements.length !== 1 ? 'en' : ''} geladen`
                    );
                  }
                })
                .catch((err) => {
                  console.warn('[AutoLoad] Load measurements failed:', err);
                  smartToast.error('Laden der Messungen fehlgeschlagen');
                });
            },
          },
        });
      })
      .catch((err) => {
        console.warn('[AutoLoad] Check saved measurements failed:', err);
      });
  }, [isAuthenticated, token, username, projectIdParam, taskIdParam, importMeasurements]);
}
