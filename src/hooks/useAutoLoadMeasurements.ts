import { useEffect, useRef } from 'react';
import { useURLParam } from '@/hooks/useURLState';
import { useWebODMAuth } from '@/lib/auth-context';
import { loadMeasurements } from '@/utils/measurementStorage';
import { Measurement } from '@/types/measurements';
import { smartToast } from '@/utils/smartToast';

/**
 * Hook that auto-loads saved measurements when the viewer opens with projectId/taskId params.
 * Calls importMeasurements when saved data is found.
 */
export function useAutoLoadMeasurements(
  importMeasurements: (list: Measurement[], append?: boolean, linkShared?: boolean) => void,
  existingMeasurements: Measurement[]
) {
  const { token, isAuthenticated } = useWebODMAuth();
  const projectIdParam = useURLParam('projectId');
  const taskIdParam = useURLParam('taskId');
  const hasLoaded = useRef(false);

  useEffect(() => {
    // Only load once, only if we have server context, and no existing measurements
    if (
      hasLoaded.current ||
      !isAuthenticated ||
      !token ||
      !projectIdParam ||
      !taskIdParam ||
      existingMeasurements.length > 0
    ) {
      return;
    }

    const projectId = parseInt(projectIdParam, 10);
    if (isNaN(projectId)) return;

    hasLoaded.current = true;

    loadMeasurements(token, projectId, taskIdParam)
      .then((result) => {
        if (result.found && result.measurements && result.measurements.length > 0) {
          importMeasurements(result.measurements, false, true);
          smartToast.success(
            `${result.measurements.length} gespeicherte Messung${result.measurements.length !== 1 ? 'en' : ''} geladen`
          );
        }
      })
      .catch((err) => {
        // Silently fail - user can manually load
        console.warn('Auto-load measurements failed:', err);
      });
  }, [isAuthenticated, token, projectIdParam, taskIdParam, importMeasurements, existingMeasurements.length]);
}
