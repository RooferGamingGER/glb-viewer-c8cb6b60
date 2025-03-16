
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { 
  Ruler, 
  ArrowUpDown, 
  Square, 
  Trash2, 
  Eye, 
  EyeOff,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { MeasurementMode, useMeasurements } from '@/hooks/useMeasurements';
import { 
  Sidebar, 
  SidebarContent, 
  SidebarHeader, 
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu, 
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarRail
} from "@/components/ui/sidebar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import * as THREE from 'three';

interface MeasurementToolsProps {
  enabled: boolean;
  scene?: THREE.Scene | null;
  camera?: THREE.Camera | null;
}

const MeasurementTools: React.FC<MeasurementToolsProps> = ({ 
  enabled,
  scene,
  camera
}) => {
  const [visible, setVisible] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const { 
    measurements,
    currentPoints,
    activeMode,
    setActiveMode,
    clearMeasurements,
    clearCurrentPoints,
    handlePointerEvent,
    finalizeMeasurement
  } = useMeasurements();

  // Handle the toggling of the sidebar when the tool state changes
  useEffect(() => {
    if (!enabled && expanded) {
      setExpanded(false);
    } else if (enabled && !expanded) {
      setExpanded(true);
    }
  }, [enabled, expanded]);

  const selectTool = (mode: MeasurementMode) => {
    setActiveMode(mode);
    clearCurrentPoints(); // Clear current points when changing tools
  };

  const toggleVisibility = () => {
    setVisible(!visible);
  };

  // This will be called by the parent component to handle canvas clicks
  const handleCanvasClick = (event: React.MouseEvent) => {
    if (!enabled || !scene || !camera) return;
    handlePointerEvent(event, scene, camera);
  };

  // Returns JSX to render the measurement visuals in ThreeJS
  const renderMeasurementVisuals = () => {
    if (!visible || !enabled) return null;

    return (
      <>
        {/* Current measurement in progress */}
        {currentPoints.length > 0 && (
          <group>
            {currentPoints.map((point, index) => (
              <mesh key={`current-point-${index}`} position={[point.x, point.y, point.z]}>
                <sphereGeometry args={[0.05, 16, 16]} />
                <meshBasicMaterial color="#ff0000" />
              </mesh>
            ))}
            
            {/* Line connecting current points */}
            {currentPoints.length >= 2 && activeMode !== 'area' && (
              <line>
                <bufferGeometry attach="geometry">
                  <bufferAttribute
                    attach="attributes-position"
                    count={currentPoints.length}
                    array={Float32Array.from(currentPoints.flatMap(p => [p.x, p.y, p.z]))}
                    itemSize={3}
                  />
                </bufferGeometry>
                <lineBasicMaterial attach="material" color="#ff0000" linewidth={2} />
              </line>
            )}
            
            {/* Area polygon */}
            {currentPoints.length >= 3 && activeMode === 'area' && (
              <line>
                <bufferGeometry attach="geometry">
                  <bufferAttribute
                    attach="attributes-position"
                    count={currentPoints.length + 1}
                    array={Float32Array.from([
                      ...currentPoints.flatMap(p => [p.x, p.y, p.z]),
                      currentPoints[0].x, currentPoints[0].y, currentPoints[0].z
                    ])}
                    itemSize={3}
                  />
                </bufferGeometry>
                <lineBasicMaterial attach="material" color="#ff0000" linewidth={2} />
              </line>
            )}
          </group>
        )}
        
        {/* Completed measurements */}
        {measurements.map((measurement) => (
          <group key={measurement.id}>
            {/* Points for all measurement types */}
            {measurement.points.map((point, index) => (
              <mesh key={`point-${measurement.id}-${index}`} position={[point.x, point.y, point.z]}>
                <sphereGeometry args={[0.03, 16, 16]} />
                <meshBasicMaterial 
                  color={measurement.type === 'length' ? '#00ff00' : 
                         measurement.type === 'height' ? '#0000ff' : '#ffaa00'} 
                />
              </mesh>
            ))}
            
            {/* Lines for length and height measurements */}
            {(measurement.type === 'length' || measurement.type === 'height') && (
              <line>
                <bufferGeometry attach="geometry">
                  <bufferAttribute
                    attach="attributes-position"
                    count={measurement.points.length}
                    array={Float32Array.from(measurement.points.flatMap(p => [p.x, p.y, p.z]))}
                    itemSize={3}
                  />
                </bufferGeometry>
                <lineBasicMaterial 
                  attach="material" 
                  color={measurement.type === 'length' ? '#00ff00' : '#0000ff'} 
                  linewidth={2} 
                />
              </line>
            )}
            
            {/* Polygon for area measurements */}
            {measurement.type === 'area' && (
              <line>
                <bufferGeometry attach="geometry">
                  <bufferAttribute
                    attach="attributes-position"
                    count={measurement.points.length + 1}
                    array={Float32Array.from([
                      ...measurement.points.flatMap(p => [p.x, p.y, p.z]),
                      measurement.points[0].x, measurement.points[0].y, measurement.points[0].z
                    ])}
                    itemSize={3}
                  />
                </bufferGeometry>
                <lineBasicMaterial attach="material" color="#ffaa00" linewidth={2} />
              </line>
            )}
            
            {/* Labels */}
            {measurement.label && (
              <sprite
                position={[
                  measurement.points.reduce((sum, p) => sum + p.x, 0) / measurement.points.length,
                  measurement.points.reduce((sum, p) => sum + p.y, 0) / measurement.points.length + 0.2,
                  measurement.points.reduce((sum, p) => sum + p.z, 0) / measurement.points.length
                ]}
                scale={[0.5, 0.25, 1]}
              >
                <spriteMaterial
                  attach="material"
                  transparent
                  opacity={0.7}
                >
                  <canvasTexture
                    attach="map"
                    image={(() => {
                      const canvas = document.createElement('canvas');
                      canvas.width = 256;
                      canvas.height = 128;
                      const context = canvas.getContext('2d');
                      if (context) {
                        context.fillStyle = '#ffffff';
                        context.fillRect(0, 0, canvas.width, canvas.height);
                        context.font = 'Bold 24px Arial';
                        context.textAlign = 'center';
                        context.textBaseline = 'middle';
                        context.fillStyle = '#000000';
                        context.fillText(measurement.label, canvas.width / 2, canvas.height / 2);
                      }
                      return canvas;
                    })()}
                  />
                </spriteMaterial>
              </sprite>
            )}
          </group>
        ))}
      </>
    );
  };

  // If not enabled, return null
  if (!enabled) return null;

  return (
    <Sidebar side="right" variant="floating">
      <SidebarRail />
      <SidebarHeader>
        <h3 className="text-lg font-semibold px-4 py-2">Messwerkzeuge</h3>
        <SidebarTrigger className="absolute right-4 top-4" />
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Werkzeuge</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeMode === 'length'}
                  onClick={() => selectTool('length')}
                  tooltip="Länge messen"
                >
                  <Ruler />
                  <span>Länge</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeMode === 'height'}
                  onClick={() => selectTool('height')}
                  tooltip="Höhe messen"
                >
                  <ArrowUpDown />
                  <span>Höhe</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activeMode === 'area'}
                  onClick={() => selectTool('area')}
                  tooltip="Fläche messen"
                >
                  <Square />
                  <span>Fläche</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        {activeMode === 'area' && currentPoints.length >= 3 && (
          <SidebarGroup>
            <SidebarGroupContent>
              <Button 
                className="w-full flex items-center justify-center gap-2"
                onClick={finalizeMeasurement}
              >
                <CheckCircle2 size={16} />
                Fläche schließen
              </Button>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        
        <SidebarGroup>
          <SidebarGroupLabel>Anleitung</SidebarGroupLabel>
          <SidebarGroupContent>
            <Alert className="bg-muted/50 border-muted">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Messpunkte setzen</AlertTitle>
              <AlertDescription>
                Klicken Sie auf das Modell, um Messpunkte zu setzen. 
                {activeMode === 'length' && " Zwei Punkte für eine Längenmessung."}
                {activeMode === 'height' && " Zwei Punkte für eine Höhenmessung."}
                {activeMode === 'area' && " Mindestens drei Punkte für eine Flächenmessung."}
              </AlertDescription>
            </Alert>
          </SidebarGroupContent>
        </SidebarGroup>
        
        <SidebarGroup>
          <SidebarGroupLabel>Aktionen</SidebarGroupLabel>
          <SidebarGroupContent className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={toggleVisibility}
              className="flex-1 flex items-center justify-center gap-2"
            >
              {visible ? <EyeOff size={16} /> : <Eye size={16} />}
              {visible ? "Ausblenden" : "Einblenden"}
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={clearMeasurements}
              className="flex-1 flex items-center justify-center gap-2"
            >
              <Trash2 size={16} />
              Löschen
            </Button>
          </SidebarGroupContent>
        </SidebarGroup>
        
        {measurements.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Messungen</SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="space-y-2 p-2 bg-muted/50 rounded-md">
                {measurements.map((m) => (
                  <div key={m.id} className="flex items-center gap-2 text-sm">
                    <div className={`w-3 h-3 rounded-full ${
                      m.type === 'length' ? 'bg-green-500' : 
                      m.type === 'height' ? 'bg-blue-500' : 'bg-amber-500'
                    }`} />
                    <span>{m.type === 'length' ? 'Länge' : m.type === 'height' ? 'Höhe' : 'Fläche'}: 
                    {' '}{m.value.toFixed(2)} {m.type === 'area' ? 'Einh²' : 'Einh'}</span>
                  </div>
                ))}
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      
      <SidebarFooter>
        <div className="px-4 py-2 text-xs text-muted-foreground">
          Messwerkzeuge v1.0
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};

export default MeasurementTools;
