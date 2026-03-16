import { useEffect, useRef } from 'react';
import { useURLParam } from '@/hooks/useURLState';
import { useWebODMAuth } from '@/lib/auth-context';
import { loadMeasurements } from '@/utils/measurementStorage';
import { Measurement } from '@/types/measurements';
import { smartToast } from '@/utils/smartToast';
import { toast } from 'sonner';

/**
 * Hook that directly loads saved measurements when the viewer opens with projectId/taskId params.
 * Uses a single `load` call instead of check+load to halve latency.
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

    console.log('[AutoLoad] Loading measurements directly:', { projectId, taskId: taskIdParam, username });

    // Single load call — skip the separate check
    loadMeasurements(token, projectId, taskIdParam, username || undefined)
      .then((loadResult) => {
        if (!loadResult.found || !loadResult.measurements || loadResult.measurements.length === 0) {
          console.log('[AutoLoad] No saved measurements found');
          return;
        }

        const savedList = loadResult.measurements;
        const hasExisting = existingMeasurements.length > 0;

        if (hasExisting) {
          toast('Gespeicherte Messungen gefunden', {
            description: `${savedList.length} Messung${savedList.length !== 1 ? 'en' : ''} verfügbar. Ersetzen oder ergänzen?`,
            duration: 20000,
            action: {
              label: 'Ersetzen',
              onClick: () => {
                importMeasurements(savedList, false, true);
                smartToast.success(`${savedList.length} Messung${savedList.length !== 1 ? 'en' : ''} geladen`);
              },
            },
            cancel: {
              label: 'Ergänzen',
              onClick: () => {
                importMeasurements(savedList, true, true);
                smartToast.success(`${savedList.length} Messung${savedList.length !== 1 ? 'en' : ''} ergänzt`);
              },
            },
          });
        } else {
          toast('Gespeicherte Messungen gefunden', {
            description: `${savedList.length} Messung${savedList.length !== 1 ? 'en' : ''} verfügbar.`,
            duration: 15000,
            action: {
              label: 'Laden',
              onClick: () => {
                importMeasurements(savedList, false, true);
                smartToast.success(`${savedList.length} Messung${savedList.length !== 1 ? 'en' : ''} geladen`);
              },
            },
          });
        }
      })
      .catch((err) => {
        console.warn('[AutoLoad] Load measurements failed:', err);
      });
  }, [isAuthenticated, token, username, projectIdParam, taskIdParam, importMeasurements, existingMeasurements]);
}
