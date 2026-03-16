import React from 'react';
import { Button } from '@/components/ui/button';
import { Ruler, Download, List, CloudUpload } from 'lucide-react';
import { useWebODMAuth } from '@/lib/auth-context';
import { useURLParam } from '@/hooks/useURLState';

interface MobileBottomBarProps {
  isMeasurePanelOpen: boolean;
  onToggleMeasurePanel: () => void;
  onOpenExport: () => void;
  onOpenMasses: () => void;
  onOpenSave?: () => void;
}

const MobileBottomBar: React.FC<MobileBottomBarProps> = ({
  isMeasurePanelOpen,
  onToggleMeasurePanel,
  onOpenExport,
  onOpenMasses,
  onOpenSave,
}) => {
  const { isAuthenticated } = useWebODMAuth();
  const projectIdParam = useURLParam('projectId');
  const taskIdParam = useURLParam('taskId');

  const hasServerContext = isAuthenticated && !!projectIdParam && !!taskIdParam;

  return (
    <div className="fixed left-0 right-0 bottom-0 z-40 bg-background border-t border-border/50 pointer-events-auto pb-[max(env(safe-area-inset-bottom),8px)]">
      <div className={`grid ${hasServerContext ? 'grid-cols-4' : 'grid-cols-3'} gap-1 p-2`}>
        <Button
          variant={isMeasurePanelOpen ? 'default' : 'outline'}
          size="sm"
          className="flex flex-col items-center gap-0.5 h-auto py-2"
          onClick={onToggleMeasurePanel}
        >
          <Ruler className="h-4 w-4" />
          <span className="text-[10px]">Messen</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex flex-col items-center gap-0.5 h-auto py-2"
          onClick={onOpenExport}
        >
          <Download className="h-4 w-4" />
          <span className="text-[10px]">Export</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex flex-col items-center gap-0.5 h-auto py-2"
          onClick={onOpenMasses}
        >
          <List className="h-4 w-4" />
          <span className="text-[10px]">Massen</span>
        </Button>
        {hasServerContext && onOpenSave && (
          <Button
            variant="outline"
            size="sm"
            className="flex flex-col items-center gap-0.5 h-auto py-2"
            onClick={onOpenSave}
          >
            <CloudUpload className="h-4 w-4" />
            <span className="text-[10px]">Speichern</span>
          </Button>
        )}
      </div>
    </div>
  );
};

export default MobileBottomBar;
