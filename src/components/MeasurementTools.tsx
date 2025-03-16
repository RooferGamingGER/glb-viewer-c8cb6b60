
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { 
  Ruler, 
  ArrowUpDown, 
  Square, 
  Trash2, 
  Eye, 
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Save
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
  SidebarRail,
  useSidebar
} from "@/components/ui/sidebar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from 'sonner';
import * as THREE from 'three';

interface MeasurementToolsProps {
  enabled: boolean;
  scene: THREE.Scene;
  camera: THREE.Camera;
}

const MeasurementTools: React.FC<MeasurementToolsProps> = ({ 
  enabled,
  scene,
  camera
}) => {
  const { open, setOpen } = useSidebar();
  const [visible, setVisible] = useState(true);
  const { 
    measurements,
    currentPoints,
    setCurrentPoints,
    activeMode,
    setActiveMode,
    clearMeasurements,
    clearCurrentPoints,
    finalizeMeasurement
  } = useMeasurements();

  // Points display reference for updating visual indicators
  const pointsRef = useRef<THREE.Group | null>(null);
  const linesRef = useRef<THREE.Group | null>(null);
  const measurementsRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    // Ensure sidebar is open when measurements are enabled
    if (enabled && !open) {
      setOpen(true);
    }
  }, [enabled, open, setOpen]);

  // Create measurement groups in the scene
  useEffect(() => {
    if (!scene || !enabled) return;

    // Create groups to hold points, lines, and measurements if they don't exist
    if (!pointsRef.current) {
      pointsRef.current = new THREE.Group();
      pointsRef.current.name = "measurementPoints";
      scene.add(pointsRef.current);
    }

    if (!linesRef.current) {
      linesRef.current = new THREE.Group();
      linesRef.current.name = "measurementLines";
      scene.add(linesRef.current);
    }
    
    if (!measurementsRef.current) {
      measurementsRef.current = new THREE.Group();
      measurementsRef.current.name = "measurementLabels";
      scene.add(measurementsRef.current);
    }

    // Clean up scene when unmounting or when disabled
    return () => {
      if (pointsRef.current) {
        scene.remove(pointsRef.current);
        pointsRef.current = null;
      }
      if (linesRef.current) {
        scene.remove(linesRef.current);
        linesRef.current = null;
      }
      if (measurementsRef.current) {
        scene.remove(measurementsRef.current);
        measurementsRef.current = null;
      }
    };
  }, [scene, enabled]);

  // Update visual representation of points when currentPoints changes
  useEffect(() => {
    if (!pointsRef.current || !linesRef.current || !visible) return;

    // Clear existing points
    while (pointsRef.current.children.length > 0) {
      pointsRef.current.remove(pointsRef.current.children[0]);
    }

    // Clear existing lines
    while (linesRef.current.children.length > 0) {
      linesRef.current.remove(linesRef.current.children[0]);
    }

    // Add current points as spheres
    currentPoints.forEach((point, index) => {
      const sphereGeometry = new THREE.SphereGeometry(0.05, 16, 16);
      const sphereMaterial = new THREE.MeshBasicMaterial({ 
        color: activeMode === 'length' ? 0x00ff00 : 
               activeMode === 'height' ? 0x0000ff : 0xffaa00 
      });
      const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
      sphere.position.set(point.x, point.y, point.z);
      pointsRef.current?.add(sphere);

      // Add connecting lines between points
      if (index > 0) {
        const prevPoint = currentPoints[index - 1];
        const points = [
          new THREE.Vector3(prevPoint.x, prevPoint.y, prevPoint.z),
          new THREE.Vector3(point.x, point.y, point.z)
        ];
        const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
        const lineMaterial = new THREE.LineBasicMaterial({ 
          color: activeMode === 'length' ? 0x00ff00 : 
                 activeMode === 'height' ? 0x0000ff : 0xffaa00,
          linewidth: 2
        });
        const line = new THREE.Line(lineGeometry, lineMaterial);
        linesRef.current?.add(line);
      }
    });

    // Add special final connecting line for area measurement to close the shape
    if (activeMode === 'area' && currentPoints.length >= 3) {
      const firstPoint = currentPoints[0];
      const lastPoint = currentPoints[currentPoints.length - 1];
      const closingPoints = [
        new THREE.Vector3(lastPoint.x, lastPoint.y, lastPoint.z),
        new THREE.Vector3(firstPoint.x, firstPoint.y, firstPoint.z)
      ];
      const closingGeometry = new THREE.BufferGeometry().setFromPoints(closingPoints);
      // Use a dashed line material instead of LineBasicMaterial with invalid properties
      const closingMaterial = new THREE.LineDashedMaterial({ 
        color: 0xffaa00,
        linewidth: 2,
        scale: 1,
        dashSize: 0.1,
        gapSize: 0.1
      });
      const closingLine = new THREE.Line(closingGeometry, closingMaterial);
      // Must call computeLineDistances for the dashed line to work
      closingLine.computeLineDistances();
      linesRef.current?.add(closingLine);
    }

  }, [currentPoints, visible, activeMode]);

  // Update visual representation of completed measurements
  useEffect(() => {
    if (!measurementsRef.current || !visible) return;
    
    // Clear existing measurement labels
    while (measurementsRef.current.children.length > 0) {
      measurementsRef.current.remove(measurementsRef.current.children[0]);
    }
    
    // Add visual representation for each finalized measurement
    measurements.forEach((measurement) => {
      // Create different visualizations based on measurement type
      if (measurement.type === 'length' || measurement.type === 'height') {
        // For length and height, draw line between the two points
        const [p1, p2] = measurement.points;
        
        // Draw the line
        const linePoints = [
          new THREE.Vector3(p1.x, p1.y, p1.z),
          new THREE.Vector3(p2.x, p2.y, p2.z)
        ];
        const lineGeometry = new THREE.BufferGeometry().setFromPoints(linePoints);
        const lineMaterial = new THREE.LineBasicMaterial({ 
          color: measurement.type === 'length' ? 0x00ff00 : 0x0000ff,
          linewidth: 3
        });
        const line = new THREE.Line(lineGeometry, lineMaterial);
        measurementsRef.current?.add(line);
        
        // Add small spheres at endpoints
        const sphereGeometry = new THREE.SphereGeometry(0.04, 16, 16);
        const sphereMaterial = new THREE.MeshBasicMaterial({ 
          color: measurement.type === 'length' ? 0x00ff00 : 0x0000ff
        });
        
        measurement.points.forEach(point => {
          const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
          sphere.position.set(point.x, point.y, point.z);
          measurementsRef.current?.add(sphere);
        });
        
        // Add text label at midpoint
        if (measurement.label) {
          const midpoint = new THREE.Vector3(
            (p1.x + p2.x) / 2,
            (p1.y + p2.y) / 2 + 0.1, // Slightly above the line
            (p1.z + p2.z) / 2
          );
          
          // Create a custom HTML element for the label in drei
          // Since we can't use HTML directly in this context, we'll use a simple sphere marker
          const labelMarker = new THREE.Mesh(
            new THREE.SphereGeometry(0.03, 8, 8),
            new THREE.MeshBasicMaterial({ 
              color: measurement.type === 'length' ? 0x00ff00 : 0x0000ff 
            })
          );
          labelMarker.position.copy(midpoint);
          measurementsRef.current?.add(labelMarker);
        }
      } 
      else if (measurement.type === 'area') {
        // For area, draw filled polygon
        // Create triangulated mesh from points
        const points = measurement.points;
        
        // Create outline from points
        for (let i = 0; i < points.length; i++) {
          const p1 = points[i];
          const p2 = points[(i + 1) % points.length]; // Connect back to first point
          
          // Draw the line segment
          const linePoints = [
            new THREE.Vector3(p1.x, p1.y, p1.z),
            new THREE.Vector3(p2.x, p2.y, p2.z)
          ];
          const lineGeometry = new THREE.BufferGeometry().setFromPoints(linePoints);
          const lineMaterial = new THREE.LineBasicMaterial({ 
            color: 0xffaa00,
            linewidth: 3
          });
          const line = new THREE.Line(lineGeometry, lineMaterial);
          measurementsRef.current?.add(line);
          
          // Add small sphere at each vertex
          const sphereGeometry = new THREE.SphereGeometry(0.04, 16, 16);
          const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
          const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
          sphere.position.set(p1.x, p1.y, p1.z);
          measurementsRef.current?.add(sphere);
        }
        
        // Add a semi-transparent fill
        if (points.length >= 3) {
          // Find centroid for label placement
          const centroid = new THREE.Vector3(0, 0, 0);
          points.forEach(p => {
            centroid.x += p.x;
            centroid.y += p.y;
            centroid.z += p.z;
          });
          centroid.divideScalar(points.length);
          
          // Add a marker at centroid
          const labelMarker = new THREE.Mesh(
            new THREE.SphereGeometry(0.03, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0xffaa00 })
          );
          labelMarker.position.copy(centroid);
          measurementsRef.current?.add(labelMarker);
        }
      }
    });
  }, [measurements, visible]);

  // Setup the event listener for clicks on the canvas
  useEffect(() => {
    if (!enabled || !scene || !camera) return;
    
    // Find canvas element
    const canvasElement = document.querySelector('canvas');
    if (!canvasElement) return;
    
    const handleClick = (event: MouseEvent) => {
      // Only handle clicks if enabled and sidebar is open
      if (!enabled || !open) return;
      
      // Calculate mouse position in normalized device coordinates (-1 to +1)
      const canvasRect = canvasElement.getBoundingClientRect();
      const mouseX = ((event.clientX - canvasRect.left) / canvasRect.width) * 2 - 1;
      const mouseY = -((event.clientY - canvasRect.top) / canvasRect.height) * 2 + 1;
      
      // Create raycaster
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2(mouseX, mouseY);
      
      // Set raycaster from camera and mouse position
      raycaster.setFromCamera(mouse, camera);
      
      // Get all intersected objects
      const intersects = raycaster.intersectObjects(scene.children, true);
      
      // Filter out measurement points/lines from intersections
      const validIntersects = intersects.filter(intersect => {
        // Check if the object or any of its parents are measurement points/lines
        let currentObj = intersect.object;
        while (currentObj) {
          if (
            currentObj.name === "measurementPoints" || 
            currentObj.name === "measurementLines" ||
            currentObj.name === "measurementLabels"
          ) {
            return false;
          }
          // @ts-ignore - parent property exists on THREE.Object3D
          currentObj = currentObj.parent;
        }
        return true;
      });
      
      // If there are valid intersections, use the closest one
      if (validIntersects.length > 0) {
        const intersect = validIntersects[0];
        const point = {
          x: intersect.point.x,
          y: intersect.point.y,
          z: intersect.point.z
        };
        
        // Add point to current points array
        setCurrentPoints(prev => [...prev, point]);
        
        // Auto-finalize for length and height after 2 points
        if ((activeMode === 'length' || activeMode === 'height') && currentPoints.length === 1) {
          // Use setTimeout to ensure the point is added before finalization
          setTimeout(() => {
            finalizeMeasurement();
            toast.success(`${activeMode === 'length' ? 'Längen' : 'Höhen'}messung abgeschlossen`);
          }, 100);
        }
      }
    };
    
    // Add click event listener to canvas
    canvasElement.addEventListener('click', handleClick);
    
    // Clean up event listener when component unmounts or when disabled
    return () => {
      canvasElement.removeEventListener('click', handleClick);
    };
  }, [enabled, scene, camera, activeMode, currentPoints.length, finalizeMeasurement, setCurrentPoints, open]);

  const selectTool = (mode: MeasurementMode) => {
    setActiveMode(mode);
    clearCurrentPoints(); // Clear current points when changing tools
    toast.info(`${mode === 'length' ? 'Längen' : mode === 'height' ? 'Höhen' : 'Flächen'}messung ausgewählt`);
  };

  const toggleVisibility = () => {
    setVisible(!visible);
    toast.info(visible ? 'Messungen ausgeblendet' : 'Messungen eingeblendet');
  };

  const handleFinalizeMeasurement = () => {
    if (currentPoints.length >= 3) {
      finalizeMeasurement();
      toast.success('Flächenmessung abgeschlossen');
    } else {
      toast.error('Mindestens 3 Punkte für eine Flächenmessung erforderlich');
    }
  };

  const handleClearMeasurements = () => {
    clearMeasurements();
    toast.info('Alle Messungen gelöscht');
  };

  // If measurements are not enabled, don't render the sidebar
  if (!enabled) return null;

  return (
    <Sidebar side="right" variant="floating" className="z-20">
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
                onClick={handleFinalizeMeasurement}
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
                {activeMode === 'height' && " Zwei Punkte für eine Höhenmessung (Y-Achse)."}
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
              onClick={handleClearMeasurements}
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
                  <div key={m.id} className="flex items-center gap-2 text-sm border-b border-muted-foreground/20 pb-2 last:border-0 last:pb-0">
                    <div className={`w-3 h-3 rounded-full ${
                      m.type === 'length' ? 'bg-green-500' : 
                      m.type === 'height' ? 'bg-blue-500' : 'bg-amber-500'
                    }`} />
                    <div className="flex-1">
                      <div className="font-medium">
                        {m.type === 'length' ? 'Länge' : 
                         m.type === 'height' ? 'Höhe' : 'Fläche'}
                      </div>
                      <div className="text-muted-foreground">
                        {m.label}
                      </div>
                    </div>
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
