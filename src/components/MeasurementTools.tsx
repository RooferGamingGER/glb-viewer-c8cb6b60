import React, { useState, useEffect, useRef } from 'react';
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
  Pencil,
  X,
  Move,
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
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from 'sonner';
import * as THREE from 'three';
import { Html } from '@react-three/drei';

interface MeasurementToolsProps {
  enabled: boolean;
  scene: THREE.Scene;
  camera: THREE.Camera;
}

// Create a custom component for the 3D measurement labels
const MeasurementLabel = ({ position, value, color = 'white', visible = true }: 
  { position: THREE.Vector3, value: string, color?: string, visible?: boolean }) => {
  if (!visible) return null;
  
  return (
    <Html position={position} center>
      <div className="px-2 py-1 rounded-md bg-black/80 text-white text-xs font-medium 
        shadow-md whitespace-nowrap transform scale-[0.85] pointer-events-none">
        {value}
      </div>
    </Html>
  );
};

const MeasurementTools: React.FC<MeasurementToolsProps> = ({ 
  enabled,
  scene,
  camera
}) => {
  const { open, setOpen } = useSidebar();
  const [visible, setVisible] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const { 
    measurements,
    currentPoints,
    setCurrentPoints,
    addPoint,
    activeMode,
    setActiveMode,
    toggleMeasurementTool,
    clearMeasurements,
    clearCurrentPoints,
    finalizeMeasurement,
    toggleMeasurementVisibility,
    toggleAllMeasurementsVisibility,
    allMeasurementsVisible,
    toggleEditMode,
    updateMeasurement,
    deleteMeasurement,
    deletePoint,
    editMeasurementId,
    editingPointIndex,
    startPointEdit,
    cancelEditing,
    getNearestPointIndex
  } = useMeasurements();

  const pointsRef = useRef<THREE.Group | null>(null);
  const linesRef = useRef<THREE.Group | null>(null);
  const measurementsRef = useRef<THREE.Group | null>(null);
  const labelsRef = useRef<THREE.Group | null>(null);
  const editPointsRef = useRef<THREE.Group | null>(null);

  const [labels, setLabels] = useState<JSX.Element[]>([]);

  useEffect(() => {
    if (enabled && !open) {
      setOpen(true);
    }
  }, [enabled, open, setOpen]);

  useEffect(() => {
    if (!scene || !enabled) return;

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
    
    if (!labelsRef.current) {
      labelsRef.current = new THREE.Group();
      labelsRef.current.name = "measurementTextLabels";
      scene.add(labelsRef.current);
    }

    if (!editPointsRef.current) {
      editPointsRef.current = new THREE.Group();
      editPointsRef.current.name = "editPoints";
      scene.add(editPointsRef.current);
    }

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
      if (labelsRef.current) {
        scene.remove(labelsRef.current);
        labelsRef.current = null;
      }
      if (editPointsRef.current) {
        scene.remove(editPointsRef.current);
        editPointsRef.current = null;
      }
    };
  }, [scene, enabled]);

  useEffect(() => {
    if (!pointsRef.current || !linesRef.current || !visible) return;

    while (pointsRef.current.children.length > 0) {
      pointsRef.current.remove(pointsRef.current.children[0]);
    }

    while (linesRef.current.children.length > 0) {
      linesRef.current.remove(linesRef.current.children[0]);
    }

    currentPoints.forEach((point, index) => {
      const sphereGeometry = new THREE.SphereGeometry(0.05, 16, 16);
      const sphereMaterial = new THREE.MeshBasicMaterial({ 
        color: activeMode === 'length' ? 0x00ff00 : 
               activeMode === 'height' ? 0x0000ff : 0xffaa00 
      });
      const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
      sphere.position.set(point.x, point.y, point.z);
      pointsRef.current?.add(sphere);

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

    if (activeMode === 'area' && currentPoints.length >= 3) {
      const firstPoint = currentPoints[0];
      const lastPoint = currentPoints[currentPoints.length - 1];
      const closingPoints = [
        new THREE.Vector3(lastPoint.x, lastPoint.y, lastPoint.z),
        new THREE.Vector3(firstPoint.x, firstPoint.y, firstPoint.z)
      ];
      const closingGeometry = new THREE.BufferGeometry().setFromPoints(closingPoints);
      const closingMaterial = new THREE.LineDashedMaterial({ 
        color: 0xffaa00,
        linewidth: 2,
        scale: 1,
        dashSize: 0.1,
        gapSize: 0.1
      });
      const closingLine = new THREE.Line(closingGeometry, closingMaterial);
      closingLine.computeLineDistances();
      linesRef.current?.add(closingLine);
    }

  }, [currentPoints, visible, activeMode]);

  useEffect(() => {
    if (!measurementsRef.current || !labelsRef.current) return;
    
    while (measurementsRef.current.children.length > 0) {
      measurementsRef.current.remove(measurementsRef.current.children[0]);
    }
    
    while (labelsRef.current.children.length > 0) {
      labelsRef.current.remove(labelsRef.current.children[0]);
    }
    
    const htmlLabels: JSX.Element[] = [];
    
    measurements.forEach((measurement) => {
      if (measurement.visible === false || !visible) return;
      
      if (measurement.type === 'length') {
        const [p1, p2] = measurement.points;
        
        const linePoints = [
          new THREE.Vector3(p1.x, p1.y, p1.z),
          new THREE.Vector3(p2.x, p2.y, p2.z)
        ];
        const lineGeometry = new THREE.BufferGeometry().setFromPoints(linePoints);
        const lineMaterial = new THREE.LineBasicMaterial({ 
          color: 0x00ff00,
          linewidth: 3
        });
        const line = new THREE.Line(lineGeometry, lineMaterial);
        measurementsRef.current?.add(line);
        
        const sphereGeometry = new THREE.SphereGeometry(0.04, 16, 16);
        const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        
        measurement.points.forEach(point => {
          const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
          sphere.position.set(point.x, point.y, point.z);
          measurementsRef.current?.add(sphere);
        });
        
        if (measurement.label) {
          const midPoint = new THREE.Vector3(
            (p1.x + p2.x) / 2,
            (p1.y + p2.y) / 2,
            (p1.z + p2.z) / 2
          );
          
          const labelPlaceholder = new THREE.Object3D();
          labelPlaceholder.position.copy(midPoint);
          labelPlaceholder.userData = {
            type: 'length-label',
            value: measurement.label,
            measurementId: measurement.id
          };
          labelsRef.current?.add(labelPlaceholder);
          
          htmlLabels.push(
            <MeasurementLabel
              key={`length-${measurement.id}`}
              position={midPoint}
              value={measurement.label}
              color="rgb(34, 197, 94)" 
              visible={true}
            />
          );
        }
      } 
      else if (measurement.type === 'height') {
        const [p1, p2] = measurement.points;
        
        const higherPoint = p1.y > p2.y ? p1 : p2;
        const lowerPoint = p1.y > p2.y ? p2 : p1;
        
        const verticalPoint = {
          x: higherPoint.x,
          y: lowerPoint.y,
          z: higherPoint.z
        };
        
        const verticalLinePoints = [
          new THREE.Vector3(higherPoint.x, higherPoint.y, higherPoint.z),
          new THREE.Vector3(verticalPoint.x, verticalPoint.y, verticalPoint.z)
        ];
        const verticalLineGeometry = new THREE.BufferGeometry().setFromPoints(verticalLinePoints);
        const verticalLineMaterial = new THREE.LineBasicMaterial({ 
          color: 0x0000ff,
          linewidth: 3
        });
        const verticalLine = new THREE.Line(verticalLineGeometry, verticalLineMaterial);
        measurementsRef.current?.add(verticalLine);
        
        const horizontalLinePoints = [
          new THREE.Vector3(verticalPoint.x, verticalPoint.y, verticalPoint.z),
          new THREE.Vector3(lowerPoint.x, lowerPoint.y, lowerPoint.z)
        ];
        const horizontalLineGeometry = new THREE.BufferGeometry().setFromPoints(horizontalLinePoints);
        const horizontalLineMaterial = new THREE.LineDashedMaterial({ 
          color: 0x0000ff,
          linewidth: 2,
          dashSize: 0.1,
          gapSize: 0.05,
        });
        const horizontalLine = new THREE.Line(horizontalLineGeometry, horizontalLineMaterial);
        horizontalLine.computeLineDistances();
        measurementsRef.current?.add(horizontalLine);
        
        const sphereGeometry = new THREE.SphereGeometry(0.04, 16, 16);
        const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
        
        [higherPoint, lowerPoint, verticalPoint].forEach(point => {
          const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
          sphere.position.set(point.x, point.y, point.z);
          measurementsRef.current?.add(sphere);
        });
        
        if (measurement.label) {
          const midVertical = new THREE.Vector3(
            verticalPoint.x,
            (higherPoint.y + verticalPoint.y) / 2,
            verticalPoint.z
          );
          
          const labelPlaceholder = new THREE.Object3D();
          labelPlaceholder.position.copy(midVertical);
          labelPlaceholder.userData = {
            type: 'height-label',
            value: measurement.label,
            measurementId: measurement.id
          };
          labelsRef.current?.add(labelPlaceholder);
          
          const labelPosition = new THREE.Vector3(
            midVertical.x + 0.1,
            midVertical.y,
            midVertical.z
          );
          
          htmlLabels.push(
            <MeasurementLabel
              key={`height-${measurement.id}`}
              position={labelPosition}
              value={measurement.label}
              color="rgb(59, 130, 246)"
              visible={true}
            />
          );
        }
      } 
      else if (measurement.type === 'area') {
        const points = measurement.points;
        
        for (let i = 0; i < points.length; i++) {
          const p1 = points[i];
          const p2 = points[(i + 1) % points.length];
          
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
          
          const sphereGeometry = new THREE.SphereGeometry(0.04, 16, 16);
          const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
          const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
          sphere.position.set(p1.x, p1.y, p1.z);
          measurementsRef.current?.add(sphere);
          
          const midSegment = new THREE.Vector3(
            (p1.x + p2.x) / 2,
            (p1.y + p2.y) / 2,
            (p1.z + p2.z) / 2
          );
          
          const segmentLength = Math.sqrt(
            Math.pow(p2.x - p1.x, 2) +
            Math.pow(p2.y - p1.y, 2) +
            Math.pow(p2.z - p1.z, 2)
          );
          
          const segmentLengthStr = `${segmentLength.toFixed(2)} m`;
          
          const labelPlaceholder = new THREE.Object3D();
          labelPlaceholder.position.copy(midSegment);
          labelPlaceholder.userData = {
            type: 'segment-label',
            value: segmentLengthStr,
            measurementId: measurement.id,
            segmentIndex: i
          };
          labelsRef.current?.add(labelPlaceholder);
          
          htmlLabels.push(
            <MeasurementLabel
              key={`segment-${measurement.id}-${i}`}
              position={midSegment}
              value={segmentLengthStr}
              color="rgb(245, 158, 11)"
              visible={true}
            />
          );
        }
        
        const centroid = new THREE.Vector3(0, 0, 0);
        points.forEach(p => {
          centroid.x += p.x;
          centroid.y += p.y;
          centroid.z += p.z;
        });
        centroid.divideScalar(points.length);
        
        if (measurement.label) {
          const labelPlaceholder = new THREE.Object3D();
          labelPlaceholder.position.copy(centroid);
          labelPlaceholder.userData = {
            type: 'area-label',
            value: measurement.label,
            measurementId: measurement.id
          };
          labelsRef.current?.add(labelPlaceholder);
          
          const labelPosition = new THREE.Vector3(
            centroid.x, 
            centroid.y + 0.15, 
            centroid.z
          );
          
          htmlLabels.push(
            <MeasurementLabel
              key={`area-${measurement.id}`}
              position={labelPosition}
              value={`Fläche: ${measurement.label}`}
              color="rgb(245, 158, 11)"
              visible={true}
            />
          );
        }
      }
    });
    
    setLabels(htmlLabels);
  }, [measurements, visible]);

  useEffect(() => {
    if (!editPointsRef.current || !visible) return;
    
    while (editPointsRef.current.children.length > 0) {
      editPointsRef.current.remove(editPointsRef.current.children[0]);
    }
    
    if (!editMeasurementId) return;
    
    const measurement = measurements.find(m => m.id === editMeasurementId);
    if (!measurement) return;
    
    measurement.points.forEach((point, index) => {
      const isSelected = index === editingPointIndex;
      
      const size = isSelected ? 0.08 : 0.06;
      const sphereGeometry = new THREE.SphereGeometry(size, 16, 16);
      const color = isSelected ? 0xff00ff : 0xffff00;
      const sphereMaterial = new THREE.MeshBasicMaterial({ 
        color,
        opacity: 0.8,
        transparent: true
      });
      
      const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
      sphere.position.set(point.x, point.y, point.z);
      sphere.userData = {
        isEditPoint: true,
        measurementId: measurement.id,
        pointIndex: index
      };
      
      editPointsRef.current?.add(sphere);
    });
  }, [measurements, editMeasurementId, editingPointIndex, visible]);

  useEffect(() => {
    if (!enabled || !scene || !camera) return;
    
    const canvasElement = document.querySelector('canvas');
    if (!canvasElement) return;
    
    const handleClick = (event: MouseEvent) => {
      if (!enabled || !open) return;
      
      const canvasRect = canvasElement.getBoundingClientRect();
      const mouseX = ((event.clientX - canvasRect.left) / canvasRect.width) * 2 - 1;
      const mouseY = -((event.clientY - canvasRect.top) / canvasRect.height) * 2 + 1;
      
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2(mouseX, mouseY);
      
      raycaster.setFromCamera(mouse, camera);
      
      if (editMeasurementId && editPointsRef.current) {
        const editPointIntersects = raycaster.intersectObjects(editPointsRef.current.children, false);
        
        if (editPointIntersects.length > 0) {
          const intersect = editPointIntersects[0];
          const userData = intersect.object.userData;
          
          if (userData.isEditPoint) {
            startPointEdit(userData.measurementId, userData.pointIndex);
            toast.info(`Messpunkt ${userData.pointIndex + 1} wird bearbeitet. Klicken Sie an eine neue Position.`);
            return;
          }
        }
      }
      
      const intersects = raycaster.intersectObjects(scene.children, true);
      
      const validIntersects = intersects.filter(intersect => {
        let currentObj = intersect.object;
        while (currentObj) {
          if (
            currentObj.name === "measurementPoints" || 
            currentObj.name === "measurementLines" ||
            currentObj.name === "measurementLabels" ||
            currentObj.name === "editPoints" ||
            currentObj.name === "measurementTextLabels"
          ) {
            return false;
          }
          currentObj = currentObj.parent;
        }
        return true;
      });
      
      if (validIntersects.length > 0) {
        const intersect = validIntersects[0];
        const point = {
          x: intersect.point.x,
          y: intersect.point.y,
          z: intersect.point.z
        };
        
        if (editMeasurementId !== null && editingPointIndex !== null) {
          addPoint(point);
          toast.success(`Messpunkt ${editingPointIndex + 1} wurde aktualisiert.`);
          return;
        }
        
        if (activeMode !== 'none') {
          const currentCount = currentPoints.length;
          addPoint(point);
          
          if (activeMode === 'length' || activeMode === 'height') {
            if (currentCount === 0) {
              toast.info(`Ersten Punkt für ${activeMode === 'length' ? 'Längen' : 'Höhen'}messung gesetzt`);
            } else if (currentCount === 1) {
              toast.info(`Zweiten Punkt für ${activeMode === 'length' ? 'Längen' : 'Höhen'}messung gesetzt`);
              toast.success(`${activeMode === 'length' ? 'Längen' : 'Höhen'}messung abgeschlossen`);
            }
          } else if (activeMode === 'area') {
            if (currentCount === 0) {
              toast.info("Ersten Punkt für Flächenmessung gesetzt");
            } else {
              toast.info(`Punkt ${currentCount + 1} für Flächenmessung gesetzt`);
            }
          }
        }
      }
    };
    
    canvasElement.addEventListener('click', handleClick);
    
    return () => {
      canvasElement.removeEventListener('click', handleClick);
    };
  }, [enabled, scene, camera, activeMode, currentPoints, editMeasurementId, editingPointIndex, open, addPoint, startPointEdit]);

  const selectTool = (mode: MeasurementMode) => {
    toggleMeasurementTool(mode);
    
    if (activeMode === mode) {
      toast.info(`Messwerkzeug deaktiviert. Zurück zum Navigationsmodus.`);
    } else {
      toast.info(`${mode === 'length' ? 'Längen' : mode === 'height' ? 'Höhen' : mode === 'area' ? 'Flächen' : 'Navigations'}messung ausgewählt`);
    }
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

  const handleEditStart = (id: string, description: string = '') => {
    setEditingId(id);
    setEditValue(description || '');
  };

  const handleEditSave = (id: string) => {
    updateMeasurement(id, { description: editValue });
    setEditingId(null);
  };

  const handleDeleteMeasurement = (id: string) => {
    deleteMeasurement(id);
    toast.info('Messung gelöscht');
  };

  const handleStartPointEdit = (id: string) => {
    toggleEditMode(id);
    
    if (editMeasurementId === id) {
      toast.info('Punktbearbeitung beendet');
    } else {
      toast.info('Klicken Sie auf einen Punkt, um ihn zu bearbeiten');
    }
  };

  const handleCancelEditing = () => {
    cancelEditing();
    toast.info('Punktbearbeitung abgebrochen');
  };

  if (!enabled) return null;

  return (
    <>
      {visible && labels}
      
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
                    tooltip={activeMode === 'length' ? "Längenmessung deaktivieren" : "Länge messen"}
                  >
                    <Ruler />
                    <span>Länge</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={activeMode === 'height'}
                    onClick={() => selectTool('height')}
                    tooltip={activeMode === 'height' ? "Höhenmessung deaktivieren" : "Höhe messen"}
                  >
                    <ArrowUpDown />
                    <span>Höhe</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={activeMode === 'area'}
                    onClick={() => selectTool('area')}
                    tooltip={activeMode === 'area' ? "Flächenmessung deaktivieren" : "Fläche messen"}
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
          
          {editMeasurementId && (
            <SidebarGroup>
              <SidebarGroupLabel>Punktbearbeitung</SidebarGroupLabel>
              <SidebarGroupContent>
                <Alert className="bg-muted/50 border-muted">
                  <Move className="h-4 w-4" />
                  <AlertTitle>Punkt bearbeiten</AlertTitle>
                  <AlertDescription>
                    Klicken Sie auf einen Punkt (gelb markiert) und dann auf eine neue Position im Modell.
                  </AlertDescription>
                </Alert>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelEditing}
                  className="mt-2 w-full flex items-center justify-center gap-2"
                >
                  <X size={16} />
                  Bearbeitung abbrechen
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
                  {activeMode === 'none' ? (
                    "Wählen Sie ein Messwerkzeug, um Messpunkte zu setzen."
                  ) : (
                    <>
                      Klicken Sie auf das Modell, um Messpunkte zu setzen. 
                      {activeMode === 'length' && " Zwei Punkte für eine Längenmessung."}
                      {activeMode === 'height' && " Zwei Punkte für eine Höhenmessung (Y-Achse)."}
                      {activeMode === 'area' && " Mindestens drei Punkte für eine Flächenmessung."}
                    </>
                  )}
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
                className="flex-1 flex items-center justify-center gap-2"
                onClick={toggleVisibility}
              >
                {visible ? (
                  <>
                    <EyeOff size={16} />
                    Ausblenden
                  </>
                ) : (
                  <>
                    <Eye size={16} />
                    Einblenden
                  </>
                )}
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                className="flex-1 flex items-center justify-center gap-2 border-destructive/50 hover:bg-destructive/10 hover:text-destructive"
                onClick={handleClearMeasurements}
              >
                <Trash2 size={16} />
                Löschen
              </Button>
            </SidebarGroupContent>
          </SidebarGroup>
          
          {measurements.length > 0 && (
            <SidebarGroup>
              <SidebarGroupLabel>
                Messungen
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-1 absolute right-0 top-0.5"
                  onClick={toggleAllMeasurementsVisibility}
                >
                  {allMeasurementsVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                </Button>
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <ScrollArea className="h-[200px] pr-4">
                  {measurements.map((measurement) => (
                    <div 
                      key={measurement.id} 
                      className={`mb-2 p-2 rounded-md border ${
                        measurement.visible ? 'opacity-100' : 'opacity-50'
                      } ${
                        editMeasurementId === measurement.id ? 'bg-accent/50 border-accent' : 'bg-card border-border'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="flex items-center space-x-2">
                          {measurement.type === 'length' && <Ruler size={14} className="text-green-500" />}
                          {measurement.type === 'height' && <ArrowUpDown size={14} className="text-blue-500" />}
                          {measurement.type === 'area' && <Square size={14} className="text-amber-500" />}
                          <span className="font-medium text-sm">
                            {measurement.type === 'length' && 'Länge'}
                            {measurement.type === 'height' && 'Höhe'}
                            {measurement.type === 'area' && 'Fläche'}
                          </span>
                        </span>
                        
                        <div className="flex space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => toggleMeasurementVisibility(measurement.id)}
                          >
                            {measurement.visible ? <EyeOff size={14} /> : <Eye size={14} />}
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-blue-500"
                            onClick={() => handleStartPointEdit(measurement.id)}
                          >
                            <Pencil size={14} />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-destructive"
                            onClick={() => handleDeleteMeasurement(measurement.id)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="mt-1 text-sm font-mono">
                        {measurement.label}
                      </div>
                      
                      {editingId === measurement.id ? (
                        <div className="mt-2 flex gap-2">
                          <Input
                            size={1}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            placeholder="Beschreibung"
                            className="h-7 text-xs"
                          />
                          <Button
                            size="sm"
                            className="h-7 w-7 p-0 shrink-0"
                            onClick={() => handleEditSave(measurement.id)}
                          >
                            <Save size={14} />
                          </Button>
                        </div>
                      ) : (
                        <div 
                          className="mt-1 text-xs text-muted-foreground cursor-pointer hover:underline"
                          onClick={() => handleEditStart(measurement.id, measurement.description)}
                        >
                          {measurement.description || "Beschreibung hinzufügen..."}
                        </div>
                      )}
                    </div>
                  ))}
                </ScrollArea>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>
      </Sidebar>
    </>
  );
};

export default MeasurementTools;
