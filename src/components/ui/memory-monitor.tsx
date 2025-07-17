import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useMemoryOptimization } from '@/hooks/useMemoryOptimization';
import { AlertTriangle, Zap } from 'lucide-react';

interface MemoryMonitorProps {
  className?: string;
}

export const MemoryMonitor: React.FC<MemoryMonitorProps> = ({ className }) => {
  const { isLowMemory, getFormattedMemoryUsage } = useMemoryOptimization();
  const memoryInfo = getFormattedMemoryUsage();

  if (!memoryInfo) {
    return null;
  }

  return (
    <Card className={`w-64 ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          {isLowMemory ? (
            <AlertTriangle className="h-4 w-4 text-warning" />
          ) : (
            <Zap className="h-4 w-4 text-success" />
          )}
          Speicherverbrauch
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span>Verwendet:</span>
            <span>{memoryInfo.used}</span>
          </div>
          <Progress 
            value={memoryInfo.percentage} 
            className={`h-2 ${isLowMemory ? 'bg-destructive' : ''}`}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Gesamt: {memoryInfo.total}</span>
            <span>Limit: {memoryInfo.limit}</span>
          </div>
          {isLowMemory && (
            <div className="text-xs text-warning mt-2">
              Hoher Speicherverbrauch! Optimierungen aktiv.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};