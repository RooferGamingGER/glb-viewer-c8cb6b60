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
 * Shows a confirmation toast before loading. If existing measurements are present,
 * offers "Ersetzen" (replace) and "Ergänzen" (append) options.
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

    console.log('[AutoLoad] Checking for saved measurements:', { projectId, taskId: taskIdParam, username });

    const doLoad = (append: boolean) => {
      loadMeasurements(token, projectId, taskIdParam, username || undefined)
        .then((loadResult) => {
          if (loadResult.found && loadResult.measurements && loadResult.measurements.length > 0) {
            importMeasurements(loadResult.measurements, append, true);
            smartToast.success(
              `${loadResult.measurements.length} Messung${loadResult.measurements.length !== 1 ? 'en' : ''} ${append ? 'ergänzt' : 'geladen'}`
            );
          }
        })
        .catch((err) => {
          console.warn('[AutoLoad] Load measurements failed:', err);
          smartToast.error('Laden der Messungen fehlgeschlagen');
        });
    };

    checkSavedMeasurements(token, projectId, taskIdParam, username || undefined)
      .then((result) => {
        console.log('[AutoLoad] Check result:', result);
        if (!result.exists) return;

        const hasExisting = existingMeasurements.length > 0;

        if (hasExisting) {
          // User has existing measurements (e.g. from GLB) — offer replace or append
          toast('Gespeicherte Messungen gefunden', {
            description: 'Es sind bereits Messungen vorhanden. Ersetzen oder ergänzen?',
            duration: 20000,
            action: {
              label: 'Ersetzen',
              onClick: () => doLoad(false),
            },
            cancel: {
              label: 'Ergänzen',
              onClick: () => doLoad(true),
            },
          });
        } else {
          // No existing measurements — just offer to load
          toast('Gespeicherte Messungen gefunden', {
            description: 'Möchten Sie die gespeicherten Messungen laden?',
            duration: 15000,
            action: {
              label: 'Laden',
              onClick: () => doLoad(false),
            },
          });
        }
      })
      .catch((err) => {
        console.warn('[AutoLoad] Check saved measurements failed:', err);
      });
  }, [isAuthenticated, token, username, projectIdParam, taskIdParam, importMeasurements, existingMeasurements]);
}
