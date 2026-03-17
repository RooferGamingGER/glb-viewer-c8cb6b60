
import React, { useState } from 'react';
import { 
  Ruler, ArrowUpDown, Square, MinusSquare, Trash2, Magnet,
  Eye, EyeOff, X, Download, Sun, Home, Asterisk, CircleDot, CircleX,
  ChevronDown, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { MeasurementMode, Point, Measurement } from '@/types/measurements';
import { CompleteMaterialList } from '@/types/pvPlanning';
import { usePointSnapping } from '@/contexts/PointSnappingContext';

import { smartToast } from '@/utils/smartToast';
import ExportDialog from './ExportDialog';
import SaveMeasurementsButton from './SaveMeasurementsButton';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator, DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { calculatePolygonArea } from '@/utils/measurementCalculations';
import PVPlanningDisclaimer from '../pvplanning/PVPlanningDisclaimer';

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
  updateMeasurement?: (id: string, data: Partial<Measurement>) => void;
  onConvertAreaToSolar?: (areaId: string) => void;
}

const MeasurementOverlay: React.FC<MeasurementOverlayProps> = ({
  enabled, activeMode, toggleMeasurementTool, measurements, currentPoints,
  editMeasurementId, movingPointInfo, handleFinalizeMeasurement,
  handleUndoLastPoint, clearCurrentPoints, handleClearMeasurements,
  handleDeleteMeasurement, toggleAllLabelsVisibility, allLabelsVisible,
  handleCancelEditing, updateMeasurement, onConvertAreaToSolar
}) => {
  const { snapEnabled, setSnapEnabled } = usePointSnapping();
  const [solarOpen, setSolarOpen] = useState(false);
  const [roofOpen, setRoofOpen] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

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

  // Solar disclaimer handling
  const handleSolarAction = (action: () => void) => {
    setPendingAction(() => action);
    setShowDisclaimer(true);
  };

  const handleDisclaimerConfirm = () => {
    setShowDisclaimer(false);
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  };

  const selectSolarTool = (mode: MeasurementMode) => {
    if (activeMode === mode) {
      toggleMeasurementTool(mode);
      smartToast.guidance('Solarplanungswerkzeug deaktiviert');
    } else {
      handleSolarAction(() => {
        toggleMeasurementTool(mode);
        smartToast.guidance('Solarfläche ausgewählt - Platzieren Sie mindestens 3 Punkte');
      });
    }
  };

  const selectRoofTool = (mode: MeasurementMode) => {
    toggleMeasurementTool(mode);
    if (activeMode === mode) {
      smartToast.guidance('Dachelemente-Werkzeug deaktiviert');
    } else {
      const msgs: Record<string, string> = {
        skylight: 'Dachfenster ausgewählt - 4 Punkte',
        chimney: 'Kamin ausgewählt - 4 Punkte',
        vent: 'Lüfter ausgewählt - Punkt platzieren',
        hook: 'Dachhaken ausgewählt - Punkt platzieren',
        other: 'Sonstige Einbauten - Punkt platzieren',
      };
      if (msgs[mode]) smartToast.guidance(msgs[mode]);
    }
  };

  const areaMeasurements = measurements.filter(m => m.type === 'area' && m.points && m.points.length >= 3);

  const roofTools: { mode: MeasurementMode; icon: React.ReactNode; label: string }[] = [
    { mode: 'skylight', icon: <Square className="h-3 w-3" />, label: 'Fenster' },
    { mode: 'chimney', icon: <Home className="h-3 w-3" />, label: 'Kamin' },
    { mode: 'vent', icon: <Asterisk className="h-3 w-3" />, label: 'Lüfter' },
    { mode: 'hook', icon: <CircleDot className="h-3 w-3" />, label: 'Haken' },
    { mode: 'other', icon: <CircleX className="h-3 w-3" />, label: 'Sonstig' },
  ];

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

  return (
    <>
      <PVPlanningDisclaimer 
        open={showDisclaimer}
        onConfirm={handleDisclaimerConfirm}
        onCancel={() => { setShowDisclaimer(false); setPendingAction(null); }}
      />

      <div className="absolute top-3 left-3 z-20 pointer-events-auto flex flex-col gap-2 max-w-[340px]">
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

          {/* Toggles row: Snap, visibility, delete, export, save */}
          <div className="flex gap-1 mt-1.5 flex-wrap items-center">
            <Toggle
              pressed={snapEnabled}
              onPressedChange={handleToggleSnap}
              size="sm"
              className={`h-7 px-2 text-xs gap-1 border ${snapEnabled ? 'bg-green-500 text-white hover:bg-green-600 border-green-600 data-[state=on]:bg-green-500 data-[state=on]:text-white' : 'border-border/50'}`}
            >
              <Magnet className="h-3 w-3" /> Snap
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
            <SaveMeasurementsButton
              measurements={measurements}
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs gap-1"
              showLabel={true}
            />
          </div>
        </div>

        {/* Collapsible: Solar Planning */}
        <div className="bg-background/95 backdrop-blur-sm rounded-lg border border-border/50 shadow-lg">
          <button
            className="flex items-center gap-1.5 w-full px-2.5 py-1.5 text-xs font-medium hover:bg-accent/50 rounded-lg transition-colors"
            onClick={() => setSolarOpen(!solarOpen)}
            disabled={!!editMeasurementId}
          >
            {solarOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            <Sun className="h-3.5 w-3.5" />
            Solarplanung
          </button>
          {solarOpen && (
            <div className="px-2 pb-2 flex flex-col gap-1">
              <Button
                variant="ghost"
                size="sm"
                className={toolBtnClass('solar')}
                onClick={() => selectSolarTool('solar')}
                disabled={!!editMeasurementId}
              >
                <Sun className="h-3.5 w-3.5" /> Solarfläche zeichnen
              </Button>
              {areaMeasurements.length > 0 && onConvertAreaToSolar && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 text-xs w-full justify-between" disabled={!!editMeasurementId}>
                      <span className="flex items-center gap-1">
                        <Sun className="h-3 w-3" /> PV für bestehende Fläche
                      </span>
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    <DropdownMenuLabel className="text-xs text-muted-foreground">Fläche für PV-Planung wählen</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {areaMeasurements.map(m => {
                      const areaValue = calculatePolygonArea(m.points);
                      return (
                        <DropdownMenuItem key={m.id} onClick={() => handleSolarAction(() => onConvertAreaToSolar!(m.id))} className="text-xs">
                          <Square className="h-3 w-3 mr-2 shrink-0" />
                          <span className="truncate flex-1">{m.label || 'Fläche'}</span>
                          <span className="text-muted-foreground font-mono ml-2">{areaValue.toFixed(1)} m²</span>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )}
        </div>

        {/* Collapsible: Roof Elements */}
        <div className="bg-background/95 backdrop-blur-sm rounded-lg border border-border/50 shadow-lg">
          <button
            className="flex items-center gap-1.5 w-full px-2.5 py-1.5 text-xs font-medium hover:bg-accent/50 rounded-lg transition-colors"
            onClick={() => setRoofOpen(!roofOpen)}
            disabled={!!editMeasurementId}
          >
            {roofOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            <Home className="h-3.5 w-3.5" />
            Dachelemente
          </button>
          {roofOpen && (
            <div className="px-2 pb-2">
              <div className="grid grid-cols-5 gap-1">
                {roofTools.map(({ mode, icon, label }) => (
                  <button
                    key={mode}
                    onClick={() => selectRoofTool(mode)}
                    disabled={!!editMeasurementId}
                    title={activeMode === mode ? `${label} deaktivieren` : label}
                    className={`flex flex-col items-center justify-center gap-0.5 rounded-md p-1 text-[10px] leading-tight transition-colors
                      ${activeMode === mode
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-background hover:bg-accent border border-border/40'}
                      ${editMeasurementId ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    {icon}
                    <span className="truncate w-full text-center">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
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

        {/* Measurement count badge */}
        {measurements.length > 0 && (
          <div className="bg-background/95 backdrop-blur-sm rounded-lg border border-border/50 shadow-lg px-2 py-1.5">
            <span className="text-xs text-muted-foreground">{measurements.length} Messung{measurements.length !== 1 ? 'en' : ''}</span>
          </div>
        )}
      </div>
    </>
  );
};

export default MeasurementOverlay;
