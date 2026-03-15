
import React, { useState } from 'react';
import { 
  Ruler, ArrowUpDown, Square, MinusSquare, Trash2, Magnet, Mountain,
  Eye, EyeOff, X, ChevronDown, ChevronUp, Download,
  Home, Asterisk, CircleDot, CircleX, Sun
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { MeasurementMode, Point, Measurement } from '@/types/measurements';
import { usePointSnapping } from '@/contexts/PointSnappingContext';
import { getInclinationPreference, setInclinationPreference } from '@/utils/textSprite';
import { smartToast } from '@/utils/smartToast';
import ExportDialog from './ExportDialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';

interface MeasurementOverlayProps {
  enabled: boolean;
  activeMode: MeasurementMode;
  toggleMeasurementTool: (mode: MeasurementMode) => void;
  measurements: Measurement[];
  currentPoints: Point[];
  editMeasurementId: string | null;
  movingPointInfo: { measurementId: string; pointIndex: number } | null;
  handleFinalizeMeasurement: () => void;
  handleUndoLastPoint: () => void;
  clearCurrentPoints: () => void;
  handleClearMeasurements: () => void;
  handleDeleteMeasurement: (id: string) => void;
  toggleAllLabelsVisibility?: () => void;
  allLabelsVisible?: boolean;
  handleCancelEditing: () => void;
}

const MeasurementOverlay: React.FC<MeasurementOverlayProps> = ({
  enabled, activeMode, toggleMeasurementTool, measurements, currentPoints,
  editMeasurementId, movingPointInfo, handleFinalizeMeasurement,
  handleUndoLastPoint, clearCurrentPoints, handleClearMeasurements,
  handleDeleteMeasurement, toggleAllLabelsVisibility, allLabelsVisible,
  handleCancelEditing
}) => {
  const { snapEnabled, setSnapEnabled } = usePointSnapping();
  const [showInclination, setShowInclination] = useState(getInclinationPreference());

  if (!enabled) return null;

  // Roof element modes for the overlay
  const roofElementModes: { mode: MeasurementMode; label: string; icon: React.ReactNode }[] = [
    { mode: 'skylight', label: 'Dachfenster', icon: <Square className="h-3.5 w-3.5" /> },
    { mode: 'chimney', label: 'Kamin', icon: <Home className="h-3.5 w-3.5" /> },
    { mode: 'vent', label: 'Lüfter', icon: <Asterisk className="h-3.5 w-3.5" /> },
    { mode: 'hook', label: 'Haken', icon: <CircleDot className="h-3.5 w-3.5" /> },
    { mode: 'other', label: 'Sonstige', icon: <CircleX className="h-3.5 w-3.5" /> },
    { mode: 'solar', label: 'Solar', icon: <Sun className="h-3.5 w-3.5" /> },
  ];

  // Area/roof element active mode controls
  const isRoofElementMode = roofElementModes.some(r => r.mode === activeMode);
  const isAreaType = activeMode === 'area' || activeMode === 'deductionarea' || activeMode === 'solar' || isRoofElementMode;
  const minPoints = (activeMode === 'length' || activeMode === 'height') ? 2 : 3;
  const isStandardMode = ['length', 'height', 'area', 'deductionarea'].includes(activeMode);
  const isActiveToolMode = activeMode !== 'none';

  const selectTool = (mode: MeasurementMode) => {
    toggleMeasurementTool(mode);
    if (activeMode === mode) {
      smartToast.guidance('Werkzeug deaktiviert');
    } else {
      const messages: Record<string, string> = {
        skylight: 'Dachfenster – 4 Punkte setzen',
        chimney: 'Kamin – 4 Punkte setzen',
        vent: 'Lüfter – Punkt setzen',
        hook: 'Dachhaken – Punkt setzen',
        other: 'Sonstiges – Punkt setzen',
        solar: 'Solarfläche – mind. 3 Punkte',
      };
      if (messages[mode]) smartToast.guidance(messages[mode]);
    }
  };

  const handleToggleSnap = () => {
    const v = !snapEnabled;
    setSnapEnabled(v);
    smartToast.guidance(v ? 'Punktfang aktiviert' : 'Punktfang deaktiviert');
  };

  const handleToggleInclination = () => {
    const v = !showInclination;
    setShowInclination(v);
    setInclinationPreference(v);
    smartToast.guidance(v ? 'Neigung Ein (>5°)' : 'Neigung Aus');
  };

  const getContextHint = (): string | null => {
    if (movingPointInfo) return 'Punkt verschieben – klicken zum Platzieren';
    if (editMeasurementId && activeMode === 'none') return 'Bearbeitungsmodus – Punkte anklicken zum Verschieben';
    if (activeMode === 'skylight') return currentPoints.length < 4 ? `Dachfenster: Punkt ${currentPoints.length + 1}/4` : 'Abschließen';
    if (activeMode === 'chimney') return currentPoints.length < 4 ? `Kamin: Punkt ${currentPoints.length + 1}/4` : 'Abschließen';
    if (activeMode === 'vent' || activeMode === 'hook' || activeMode === 'other') return 'Punkt auf dem Modell setzen';
    if (activeMode === 'solar') return currentPoints.length < 3 ? `Solarfläche: Punkt ${currentPoints.length + 1} (mind. 3)` : `${currentPoints.length} Punkte – Abschließen`;
    return null;
  };

  const contextHint = getContextHint();
  const toolBtnClass = (mode: MeasurementMode) =>
    `h-8 px-2 text-xs gap-1 ${activeMode === mode ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-background/90 hover:bg-accent border border-border/50'}`;

  return (
    <div className="absolute top-3 left-3 z-20 pointer-events-auto flex flex-col gap-2 max-w-[320px]">
      {/* Dachelemente + Solar tools */}
      <div className="bg-background/95 backdrop-blur-sm rounded-lg border border-border/50 shadow-lg p-2">
        <p className="text-[10px] text-muted-foreground mb-1.5 font-medium">Dachelemente & Solar</p>
        <div className="flex flex-wrap gap-1">
          {roofElementModes.map(({ mode, label, icon }) => (
            <Button
              key={mode}
              variant="ghost"
              size="sm"
              className={toolBtnClass(mode)}
              onClick={() => selectTool(mode)}
              disabled={!!editMeasurementId}
            >
              {icon} {label}
            </Button>
          ))}
        </div>

        {/* Toggles row */}
        <div className="flex gap-1 mt-1.5 flex-wrap">
          <Toggle
            pressed={snapEnabled}
            onPressedChange={handleToggleSnap}
            size="sm"
            className={`h-7 px-2 text-xs gap-1 ${snapEnabled ? 'bg-green-500/20 text-green-700 border-green-500/50' : ''}`}
          >
            <Magnet className="h-3 w-3" /> Snap
          </Toggle>
          <Toggle
            pressed={showInclination}
            onPressedChange={handleToggleInclination}
            size="sm"
            className={`h-7 px-2 text-xs gap-1 ${showInclination ? 'bg-blue-500/20 text-blue-700 border-blue-500/50' : ''}`}
          >
            <Mountain className="h-3 w-3" /> Neigung
          </Toggle>
          {measurements.length > 0 && toggleAllLabelsVisibility && (
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={toggleAllLabelsVisibility} title={allLabelsVisible ? 'Labels aus' : 'Labels ein'}>
              {allLabelsVisible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            </Button>
          )}
          {measurements.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive hover:text-destructive" title="Alle löschen">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Alle Messungen löschen?</AlertDialogTitle>
                  <AlertDialogDescription>Diese Aktion kann nicht rückgängig gemacht werden.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearMeasurements}>Löschen</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {measurements.length > 0 && (
            <ExportDialog measurements={measurements} />
          )}
        </div>
      </div>

      {/* Context hint + controls for roof elements */}
      {(contextHint || (isActiveToolMode && currentPoints.length > 0)) && (
        <div className="bg-background/95 backdrop-blur-sm rounded-lg border border-border/50 shadow-lg p-2">
          {contextHint && (
            <p className="text-xs text-muted-foreground mb-1.5">{contextHint}</p>
          )}
          {isActiveToolMode && currentPoints.length > 0 && (
            <div className="flex gap-1">
              <Button size="sm" className="h-7 text-xs flex-1" onClick={handleFinalizeMeasurement} disabled={currentPoints.length < minPoints}>
                ✓ Abschließen
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleUndoLastPoint} disabled={currentPoints.length === 0}>
                Zurück
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={clearCurrentPoints}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
          {(editMeasurementId || movingPointInfo) && (
            <div className="flex gap-1 mt-1">
              <Button variant="outline" size="sm" className="h-7 text-xs flex-1" onClick={handleCancelEditing}>
                Bearbeitung beenden
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MeasurementOverlay;
