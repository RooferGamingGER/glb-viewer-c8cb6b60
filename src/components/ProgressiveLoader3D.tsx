import React from 'react';
import { Html } from '@react-three/drei';
import { Loader2, Download, Cpu, Box, CheckCircle, XCircle, X } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  LoadingPhase, 
  formatBytes, 
  formatSpeed, 
  formatTimeRemaining 
} from '@/hooks/useProgressiveModelLoader';

interface ProgressiveLoader3DProps {
  phase: LoadingPhase;
  progress: number;
  phaseProgress: number;
  downloadedBytes: number;
  totalBytes: number;
  downloadSpeed: number;
  estimatedTimeRemaining: number | null;
  error: string | null;
  onCancel?: () => void;
}

const phaseConfig: Record<LoadingPhase, { icon: React.ReactNode; label: string; color: string }> = {
  idle: { icon: <Box className="h-5 w-5" />, label: 'Bereit', color: 'text-muted-foreground' },
  downloading: { icon: <Download className="h-5 w-5 animate-pulse" />, label: 'Herunterladen...', color: 'text-blue-500' },
  parsing: { icon: <Cpu className="h-5 w-5 animate-pulse" />, label: 'Analysieren...', color: 'text-amber-500' },
  processing: { icon: <Box className="h-5 w-5 animate-pulse" />, label: 'Geometrie verarbeiten...', color: 'text-purple-500' },
  finalizing: { icon: <CheckCircle className="h-5 w-5 animate-pulse" />, label: 'Finalisieren...', color: 'text-green-500' },
  complete: { icon: <CheckCircle className="h-5 w-5" />, label: 'Fertig!', color: 'text-green-500' },
  error: { icon: <XCircle className="h-5 w-5" />, label: 'Fehler', color: 'text-destructive' },
};

export const ProgressiveLoader3D: React.FC<ProgressiveLoader3DProps> = ({
  phase,
  progress,
  phaseProgress,
  downloadedBytes,
  totalBytes,
  downloadSpeed,
  estimatedTimeRemaining,
  error,
  onCancel,
}) => {
  const config = phaseConfig[phase];
  const showDownloadInfo = phase === 'downloading' && totalBytes > 0;
  const showTimeEstimate = phase === 'downloading' && estimatedTimeRemaining !== null && estimatedTimeRemaining > 0;
  const isLargeFile = totalBytes > 20 * 1024 * 1024; // > 20MB
  const isActivePhase = phase !== 'idle' && phase !== 'complete' && phase !== 'error';

  if (phase === 'complete' || phase === 'idle') {
    return null; // Don't render when complete or idle
  }

  return (
    <Html center>
      <div className="flex flex-col items-center glass-panel px-8 py-6 rounded-xl min-w-[280px] shadow-2xl">
        {/* Phase indicator with icon */}
        <div className={`flex items-center gap-2 mb-3 ${config.color}`}>
          {phase === 'error' ? config.icon : <Loader2 className="animate-spin h-6 w-6" />}
          <span className="font-medium">{config.label}</span>
        </div>

        {/* Error message */}
        {phase === 'error' && error && (
          <div className="text-sm text-destructive mb-4 text-center max-w-[250px]">
            {error}
          </div>
        )}

        {/* Main progress */}
        {phase !== 'error' && (
          <>
            <div className="text-2xl font-bold mb-2 tabular-nums">
              {progress.toFixed(0)}%
            </div>

            {/* Overall progress bar */}
            <Progress value={progress} className="w-full h-2 mb-3" />

            {/* Phase-specific progress bar (subtle) */}
            <div className="w-full mb-3">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>{config.label.replace('...', '')}</span>
                <span>{phaseProgress.toFixed(0)}%</span>
              </div>
              <Progress value={phaseProgress} className="w-full h-1 opacity-60" />
            </div>

            {/* Download info */}
            {showDownloadInfo && (
              <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                <span className="tabular-nums">
                  {formatBytes(downloadedBytes)} / {formatBytes(totalBytes)}
                </span>
                {downloadSpeed > 0 && (
                  <>
                    <span className="text-muted-foreground/50">•</span>
                    <span className="tabular-nums">{formatSpeed(downloadSpeed)}</span>
                  </>
                )}
              </div>
            )}

            {/* Time estimate */}
            {showTimeEstimate && (
              <div className="text-xs text-muted-foreground mb-3">
                {formatTimeRemaining(estimatedTimeRemaining)}
              </div>
            )}

            {/* Large file warning */}
            {isLargeFile && phase === 'downloading' && (
              <div className="text-xs text-amber-500/80 mb-3 text-center">
                Große Datei – dies kann etwas dauern
              </div>
            )}

            {/* Processing info for later phases */}
            {(phase === 'parsing' || phase === 'processing') && (
              <div className="text-xs text-muted-foreground mb-3">
                3D-Modell wird vorbereitet...
              </div>
            )}
          </>
        )}

        {/* Cancel button for long loads */}
        {onCancel && phase !== 'error' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="mt-2 text-muted-foreground hover:text-destructive"
          >
            <X className="h-4 w-4 mr-1" />
            Abbrechen
          </Button>
        )}
      </div>
    </Html>
  );
};

export default ProgressiveLoader3D;
