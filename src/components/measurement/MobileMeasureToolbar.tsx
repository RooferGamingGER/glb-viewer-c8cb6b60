import React from 'react';
import { Button } from '@/components/ui/button';
import { Undo2, Check } from 'lucide-react';
import { MeasurementMode } from '@/types/measurements';
import { getMeasurementTypeDisplayName } from '@/utils/exportUtils';

interface MobileMeasureToolbarProps {
  activeMode: MeasurementMode;
  onUndo: () => void;
  onFinalize: () => void;
  currentPointsCount: number;
}

const MobileMeasureToolbar: React.FC<MobileMeasureToolbarProps> = ({
  activeMode,
  onUndo,
  onFinalize,
  currentPointsCount,
}) => {
  const canFinalize = activeMode === 'length' || activeMode === 'height'
    ? currentPointsCount >= 2
    : currentPointsCount >= 3;

  return (
    <div className="fixed left-0 right-0 bottom-[calc(52px+max(env(safe-area-inset-bottom),8px))] z-40 pointer-events-auto">
      <div className="mx-2 bg-background border border-border/50 rounded-lg px-3 py-2 flex items-center justify-between shadow-lg">
        <span className="text-sm font-medium truncate">
          {getMeasurementTypeDisplayName(activeMode)} aktiv
        </span>
        <div className="flex gap-2 ml-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onUndo}
            disabled={currentPointsCount === 0}
            className="h-8"
          >
            <Undo2 className="h-3.5 w-3.5 mr-1" />
            Rückgängig
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={onFinalize}
            disabled={!canFinalize}
            className="h-8"
          >
            <Check className="h-3.5 w-3.5 mr-1" />
            Abschließen
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MobileMeasureToolbar;
