
import { useCallback } from 'react';
import { MeasurementMode, Measurement } from '@/types/measurements';
import { toast } from 'sonner';

/**
 * Hook for toggling measurement tools
 */
export const useMeasurementToolToggle = (
  activeMode: MeasurementMode,
  setActiveMode: React.Dispatch<React.SetStateAction<MeasurementMode>>,
  clearCurrentPoints: () => void,
  setEditMeasurementId: React.Dispatch<React.SetStateAction<string | null>>,
  setEditingPointIndex: React.Dispatch<React.SetStateAction<number | null>>,
  setMeasurements: React.Dispatch<React.SetStateAction<Measurement[]>>
) => {
  // Toggle between tool modes
  const toggleMeasurementTool = useCallback((mode: MeasurementMode) => {
    // Special handling for cancel, which just resets to "none"
    if (mode === 'none') {
      clearCurrentPoints();
      setActiveMode('none');
      // Don't cancel editing mode when tool is canceled - this allows better user experience
      // when the user wants to toggle between navigation and editing
      return;
    }
    
    // Cancel any ongoing editing when switching tools
    setEditMeasurementId(null);
    setEditingPointIndex(null);
    
    // If toggling to the same tool that's already active, turn it off
    if (mode === activeMode) {
      clearCurrentPoints();
      setActiveMode('none');
      return;
    }
    
    // When switching to a new tool, clear any current points and set the new mode
    clearCurrentPoints();
    setActiveMode(mode);
    
    // Display guidance message based on the activated tool
    switch (mode) {
      case 'length':
        toast.info('Längenmessung aktiviert. Platzieren Sie zwei Punkte, um eine Linie zu messen.');
        break;
      case 'height':
        toast.info('Höhenmessung aktiviert. Platzieren Sie zwei Punkte, um eine vertikale Distanz zu messen.');
        break;
      case 'area':
        toast.info('Flächenmessung aktiviert. Platzieren Sie mindestens drei Punkte und schließen Sie die Fläche.');
        break;
      case 'skylight':
        toast.info('Dachfenster-Messung aktiviert. Markieren Sie die vier Ecken des Fensters.');
        break;
      case 'chimney':
        toast.info('Kamin-Messung aktiviert. Markieren Sie die vier Ecken des Kamins.');
        break;
      case 'solar':
        toast.info('Solaranlagen-Messung aktiviert. Markieren Sie den Umriss der Solaranlage mit mindestens drei Punkten.');
        break;
      case 'gutter':
        toast.info('Dachrinnen-Messung aktiviert. Markieren Sie Anfangs- und Endpunkt der Dachrinne.');
        break;
      case 'vent':
        toast.info('Lüfter-Markierung aktiviert. Klicken Sie auf jeden Lüfter, um ihn zu markieren.');
        break;
      case 'hook':
        toast.info('Dachhaken-Markierung aktiviert. Klicken Sie auf jeden Dachhaken, um ihn zu markieren.');
        break;
      case 'other':
        toast.info('Sonstige Einbauten-Markierung aktiviert. Klicken Sie auf jedes Element, um es zu markieren.');
        break;
    }
    
    // Reset all measurement visibility to true when switching tools
    // This ensures all measurements are visible when a new tool is selected
    setMeasurements(prevMeasurements => 
      prevMeasurements.map(m => ({ ...m, visible: true, editMode: false }))
    );
  }, [
    activeMode, 
    setActiveMode, 
    clearCurrentPoints, 
    setEditMeasurementId, 
    setEditingPointIndex,
    setMeasurements
  ]);

  return {
    toggleMeasurementTool
  };
};
