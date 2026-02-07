import React from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { Measurement } from '@/hooks/useMeasurements';
import { getMeasurementTypeDisplayName } from '@/utils/exportUtils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MobileMassesOverlayProps {
  measurements: Measurement[];
  onClose: () => void;
}

const getUnit = (type: string): string => {
  if (['area', 'solar', 'chimney', 'deductionarea', 'skylight'].includes(type)) return 'm²';
  if (['height', 'length'].includes(type)) return 'm';
  return '';
};

const MobileMassesOverlay: React.FC<MobileMassesOverlayProps> = ({
  measurements,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-background pointer-events-auto flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <h2 className="text-lg font-semibold">Massen</h2>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <X className="h-5 w-5" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        {measurements.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            Noch keine Messungen vorhanden.
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {measurements.map((m) => (
              <div
                key={m.id}
                className="flex items-start justify-between p-3 rounded-lg border border-border/50 bg-card"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {m.label || getMeasurementTypeDisplayName(m.type)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Typ: {getMeasurementTypeDisplayName(m.type)}
                  </div>
                </div>
                <div className="ml-3 shrink-0 text-right">
                  <span className="text-sm font-semibold tabular-nums">
                    {m.value.toFixed(2)} {getUnit(m.type)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default MobileMassesOverlay;
