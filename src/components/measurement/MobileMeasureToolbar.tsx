import React from 'react';
import { Button } from '@/components/ui/button';
import { Undo2, Check, X } from 'lucide-react';
import { MeasurementMode } from '@/types/measurements';
import { getMeasurementTypeDisplayName } from '@/utils/exportUtils';

interface MobileMeasureToolbarProps {
  activeMode: MeasurementMode;
  onUndo: () => void;
  onFinalize: () => void;
  onCancel: () => void;
  currentPointsCount: number;
}

const MobileMeasureToolbar: React.FC<MobileMeasureToolbarProps> = ({
  activeMode,
  onUndo,
  onFinalize,
  onCancel,
  currentPointsCount,
}) => {
  const canFinalize = activeMode === 'length' || activeMode === 'height'
    ? currentPointsCount >= 2
    : currentPointsCount >= 3;

  return (
    <div className="fixed left-0 right-0 bottom-[calc(52px+max(env(safe-area-inset-bottom),8px))] z-40 pointer-events-auto">
      <div className="mx-2 bg-background border border-border/50 rounded-lg px-2 py-1.5 flex items-center justify-between shadow-lg">
        <span className="text-xs font-medium truncate mr-1">
          {getMeasurementTypeDisplayName(activeMode)}
        </span>
        <div className="flex gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={onCancel}
            className="h-7 w-7"
            title="Abbrechen"
          >
            <X className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={onUndo}
            disabled={currentPointsCount === 0}
            className="h-7 w-7"
            title="Rückgängig"
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={onFinalize}
            disabled={!canFinalize}
            className="h-7 px-3 text-xs"
          >
            <Check className="h-3.5 w-3.5 mr-1" />
            OK
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MobileMeasureToolbar;
