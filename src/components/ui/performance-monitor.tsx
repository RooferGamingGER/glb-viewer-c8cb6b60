import React from 'react';
import * as THREE from 'three';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePerformanceOptimization } from '@/hooks/usePerformanceOptimization';
import { Activity, Zap, AlertTriangle } from 'lucide-react';

interface PerformanceMonitorProps {
  scene: THREE.Scene | null;
  camera: THREE.Camera | null;
  renderer: THREE.WebGLRenderer | null;
  className?: string;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({ 
  scene, 
  camera, 
  renderer, 
  className 
}) => {
  const { fps, isLowPerformance, qualitySettings } = usePerformanceOptimization(scene, camera, renderer);

  return (
    <Card className={`w-64 ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          {isLowPerformance ? (
            <AlertTriangle className="h-4 w-4 text-warning" />
          ) : (
            <Activity className="h-4 w-4 text-success" />
          )}
          Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs">FPS:</span>
            <Badge variant={fps < 30 ? "destructive" : fps < 45 ? "secondary" : "default"}>
              {fps}
            </Badge>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-xs">Qualität:</span>
            <Badge variant={isLowPerformance ? "secondary" : "default"}>
              {isLowPerformance ? "Niedrig" : "Hoch"}
            </Badge>
          </div>
          
          <div className="space-y-1 text-xs text-muted-foreground">
            <div>Pixel Ratio: {qualitySettings.pixelRatio}</div>
            <div>Schatten: {qualitySettings.shadowMapSize}px</div>
            <div>Render-Distanz: {qualitySettings.renderDistance}m</div>
          </div>
          
          {isLowPerformance && (
            <div className="text-xs text-warning mt-2">
              <Zap className="h-3 w-3 inline mr-1" />
              Performance-Optimierungen aktiv
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};