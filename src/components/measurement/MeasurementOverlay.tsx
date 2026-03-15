
import React, { useState } from 'react';
import { 
  Ruler, ArrowUpDown, Square, MinusSquare, Trash2, Magnet, Mountain,
  Eye, EyeOff, X, ChevronDown, ChevronUp, Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { MeasurementMode, Point, Measurement } from '@/types/measurements';
import { usePointSnapping } from '@/contexts/PointSnappingContext';
import { getInclinationPreference, setInclinationPreference } from '@/utils/textSprite';
import { smartToast } from '@/utils/smartToast';
import { formatMeasurementValue, getMeasurementTypeDisplayName } from '@/utils/exportUtils';
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
  const [showMeasurements, setShowMeasurements] = useState(true);

  if (!enabled) return null;

  const isAreaType = activeMode === 'area' || activeMode === 'deductionarea';
  const minPoints = isAreaType ? 3 : 2;
  const isStandardMode = ['length', 'height', 'area', 'deductionarea'].includes(activeMode);

  const selectTool = (mode: MeasurementMode) => {
    toggleMeasurementTool(mode);
    const messages: Record<string, string> = {
      length: 'Längenmessung – 2 Punkte setzen',
      height: 'Höhenmessung – 2 Punkte setzen',
      area: 'Flächenmessung – mind. 3 Punkte',
      deductionarea: 'Abzugsfläche – mind. 3 Punkte',
    };
    if (activeMode === mode) {
      smartToast.guidance('Werkzeug deaktiviert');
    } else if (messages[mode]) {
      smartToast.guidance(messages[mode]);
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
    if (activeMode === 'length') return currentPoints.length === 0 ? 'Ersten Punkt setzen' : 'Zweiten Punkt setzen';
    if (activeMode === 'height') return currentPoints.length === 0 ? 'Unteren Punkt setzen' : 'Oberen Punkt setzen';
    if (activeMode === 'area') return currentPoints.length < 3 ? `Punkt ${currentPoints.length + 1} setzen (mind. 3)` : `${currentPoints.length} Punkte – Abschließen oder weitere setzen`;
    if (activeMode === 'deductionarea') return currentPoints.length < 3 ? `Punkt ${currentPoints.length + 1} setzen (mind. 3)` : `${currentPoints.length} Punkte – Abschließen oder weitere setzen`;
    return null;
  };

  const contextHint = getContextHint();
  const toolBtnClass = (mode: MeasurementMode) =>
    `h-8 px-2 text-xs gap-1 ${activeMode === mode ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-background/90 hover:bg-accent border border-border/50'}`;

  // Get icon for measurement type
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'length': return <Ruler className="h-3 w-3" />;
      case 'height': return <ArrowUpDown className="h-3 w-3" />;
      case 'area': return <Square className="h-3 w-3" />;
      case 'deductionarea': return <MinusSquare className="h-3 w-3" />;
      default: return null;
    }
  };

  return (
    <div className="absolute top-3 left-3 z-20 pointer-events-auto flex flex-col gap-2 max-w-[320px]">
      {/* Tool buttons */}
      <div className="bg-background/95 backdrop-blur-sm rounded-lg border border-border/50 shadow-lg p-2">
        <div className="flex flex-wrap gap-1">
          <Button variant="ghost" size="sm" className={toolBtnClass('length')} onClick={() => selectTool('length')} disabled={!!editMeasurementId}>
            <Ruler className="h-3.5 w-3.5" /> Länge
          </Button>
          <Button variant="ghost" size="sm" className={toolBtnClass('height')} onClick={() => selectTool('height')} disabled={!!editMeasurementId}>
            <ArrowUpDown className="h-3.5 w-3.5" /> Höhe
          </Button>
          <Button variant="ghost" size="sm" className={toolBtnClass('area')} onClick={() => selectTool('area')} disabled={!!editMeasurementId}>
            <Square className="h-3.5 w-3.5" /> Fläche
          </Button>
          <Button variant="ghost" size="sm" className={toolBtnClass('deductionarea')} onClick={() => selectTool('deductionarea')} disabled={!!editMeasurementId}>
            <MinusSquare className="h-3.5 w-3.5" /> Abzug
          </Button>
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

      {/* Context hint + controls */}
      {(contextHint || (isStandardMode && currentPoints.length > 0)) && (
        <div className="bg-background/95 backdrop-blur-sm rounded-lg border border-border/50 shadow-lg p-2">
          {contextHint && (
            <p className="text-xs text-muted-foreground mb-1.5">{contextHint}</p>
          )}
          {isStandardMode && currentPoints.length > 0 && (
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

      {/* Compact measurement list */}
      {measurements.length > 0 && (
        <div className="bg-background/95 backdrop-blur-sm rounded-lg border border-border/50 shadow-lg">
          <button
            onClick={() => setShowMeasurements(!showMeasurements)}
            className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-medium hover:bg-accent/50 rounded-t-lg"
          >
            <span>Messungen ({measurements.length})</span>
            {showMeasurements ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          {showMeasurements && (
            <div className="max-h-[200px] overflow-y-auto border-t border-border/30">
              {measurements.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between px-2 py-1 hover:bg-accent/30 text-xs group"
                >
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    {getTypeIcon(m.type)}
                    <span className="truncate">
                      {m.label || getMeasurementTypeDisplayName(m.type)}
                    </span>
                    <span className="text-muted-foreground font-mono ml-1 whitespace-nowrap">
                      {formatMeasurementValue(m)}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                    onClick={() => handleDeleteMeasurement(m.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MeasurementOverlay;
