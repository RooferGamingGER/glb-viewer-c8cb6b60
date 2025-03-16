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
  Save,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  X as CloseIcon
} from 'lucide-react';
import { MeasurementMode, useMeasurements, Segment } from '@/hooks/useMeasurements';
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
import {
  createMeasurementLabel,
  updateLabelScale,
  formatMeasurementLabel,
  calculateMidpoint,
  calculateCentroid,
  calculateInclination
} from '@/utils/textSprite';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [segmentsOpen, setSegmentsOpen] = useState<Record<string, boolean>>({});
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);

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
    undoLastPoint,
    editMeasurementId,
    editingPointIndex,
    startPointEdit,
    cancelEditing,
    getNearestPointIndex,
    calculateSegmentLength
  } = useMeasurements();

  const pointsRef = useRef<THREE.Group | null>(null);
  const linesRef = useRef<THREE.Group | null>(null);
  const measurementsRef = useRef<THREE.Group | null>(null);
  const editPointsRef = useRef<THREE.Group | null>(null);
  const labelsRef = useRef<THREE.Group | null>(null);
  const segmentLabelsRef = useRef<THREE.Group | null>(null);
  
  const [movingPointInfo, setMovingPointInfo] = useState<{
    measurementId: string;
    pointIndex: number;
  } | null>(null);

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

    if (!editPointsRef.current) {
      editPointsRef.current = new THREE.Group();
      editPointsRef.current.name = "editPoints";
      scene.add(editPointsRef.current);
    }
    
    if (!labelsRef.current) {
      labelsRef.current = new THREE.Group();
      labelsRef.current.name = "textLabels";
      scene.add(labelsRef.current);
    }

    if (!segmentLabelsRef.current) {
      segmentLabelsRef.current = new THREE.Group();
      segmentLabelsRef.current.name = "segmentLabels";
      scene.add(segmentLabelsRef.current);
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
      if (editPointsRef.current) {
        scene.remove(editPointsRef.current);
        editPointsRef.current = null;
      }
      if (labelsRef.current) {
        scene.remove(labelsRef.current);
        labelsRef.current = null;
      }
      
      if (segmentLabelsRef.current) {
        scene.remove(segmentLabelsRef.current);
        segmentLabelsRef.current = null;
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
    
    if (labelsRef.current && currentPoints.length >= 2) {
      labelsRef.current.children.forEach(child => {
        if (child.userData.isPreview) {
          labelsRef.current?.remove(child);
        }
      });
      
      if (activeMode === 'length' && currentPoints.length >= 2) {
        const p1 = new THREE.Vector3(currentPoints[0].x, currentPoints[0].y, currentPoints[0].z);
        const p2 = new THREE.Vector3(currentPoints[1].x, currentPoints[1].y, currentPoints[1].z);
        
        const distance = p1.distanceTo(p2);
        
        const inclination = calculateInclination(p1, p2);
        
        const labelText = formatMeasurementLabel(distance, 'length', inclination);
        
        const midpoint = calculateMidpoint(p1, p2);
        const label = createMeasurementLabel(labelText, midpoint, true);
        label.userData.isPreview = true;
        
        labelsRef.current.add(label);
      }
      else if (activeMode === 'height' && currentPoints.length >= 2) {
        const p1 = new THREE.Vector3(currentPoints[0].x, currentPoints[0].y, currentPoints[0].z);
        const p2 = new THREE.Vector3(currentPoints[1].x, currentPoints[1].y, currentPoints[1].z);
        
        const height = Math.abs(p2.y - p1.y);
        
        const labelText = formatMeasurementLabel(height, 'height');
        
        const higher = p1.y > p2.y ? p1 : p2;
        const lower = p1.y > p2.y ? p2 : p1;
        const labelPos = new THREE.Vector3(
          higher.x + 0.2, 
          (higher.y + lower.y) / 2, 
          higher.z
        );
        
        const label = createMeasurementLabel(labelText, labelPos, true);
        label.userData.isPreview = true;
        
        labelsRef.current.add(label);
      }
      else if (activeMode === 'area' && currentPoints.length >= 3) {
        const points3D = currentPoints.map(p => new THREE.Vector3(p.x, p.y, p.z));
        
        let area = 0;
        const n = points3D.length;
        for (let i = 0; i < n; i++) {
          const j = (i + 1) % n;
          area += points3D[i].x * points3D[j].z;
          area -= points3D[j].x * points3D[i].z;
        }
        area = Math.abs(area) / 2;
        
        const labelText = formatMeasurementLabel(area, 'area');
        
        const centroid = calculateCentroid(points3D);
        const label = createMeasurementLabel(labelText, centroid, true);
        label.userData.isPreview = true;
        
        labelsRef.current.add(label);
      }
    }

  }, [currentPoints, visible, activeMode]);

  useEffect(() => {
    if (!measurementsRef.current || !visible || !labelsRef.current || !segmentLabelsRef.current) return;
    
    while (measurementsRef.current.children.length > 0) {
      measurementsRef.current.remove(measurementsRef.current.children[0]);
    }
    
    labelsRef.current.children.forEach(child => {
      if (!child.userData.isPreview) {
        labelsRef.current?.remove(child);
      }
    });

    while (segmentLabelsRef.current.children.length > 0) {
      segmentLabelsRef.current.remove(segmentLabelsRef.current.children[0]);
    }
    
    measurements.forEach((measurement) => {
      if (measurement.visible === false) return;
      
      if (measurement.type === 'length') {
        const [p1, p2] = measurement.points;
        
        const point1 = new THREE.Vector3(p1.x, p1.y, p1.z);
        const point2 = new THREE.Vector3(p2.x, p2.y, p2.z);
        
        const linePoints = [point1, point2];
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
        
        const inclination = Math.abs(calculateInclination(point1, point2));
        
        const midpoint = calculateMidpoint(point1, point2);
        const labelText = formatMeasurementLabel(measurement.value, 'length', inclination);
        const label = createMeasurementLabel(labelText, midpoint);
        
        label.userData.measurementId = measurement.id;
        
        labelsRef.current?.add(label);
      } 
      else if (measurement.type === 'height') {
        const [p1, p2] = measurement.points;
        
        const point1 = new THREE.Vector3(p1.x, p1.y, p1.z);
        const point2 = new THREE.Vector3(p2.x, p2.y, p2.z);
        
        const higherPoint = point1.y > point2.y ? point1 : point2;
        const lowerPoint = point1.y > point2.y ? point2 : point1;
        
        const verticalPoint = new THREE.Vector3(
          higherPoint.x,
          lowerPoint.y,
          higherPoint.z
        );
        
        const verticalLinePoints = [higherPoint, verticalPoint];
        const verticalLineGeometry = new THREE.BufferGeometry().setFromPoints(verticalLinePoints);
        const verticalLineMaterial = new THREE.LineBasicMaterial({ 
          color: 0x0000ff,
          linewidth: 3
        });
        const verticalLine = new THREE.Line(verticalLineGeometry, verticalLineMaterial);
        measurementsRef.current?.add(verticalLine);
        
        const horizontalLinePoints = [verticalPoint, lowerPoint];
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
        
        [point1, point2].forEach(point => {
          const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
          sphere.position.copy(point);
          measurementsRef.current?.add(sphere);
        });
        
        const labelPos = new THREE.Vector3(
          verticalPoint.x + 0.2,
          (higherPoint.y + verticalPoint.y) / 2,
          verticalPoint.z
        );
        
        const labelText = formatMeasurementLabel(measurement.value, 'height');
        const label = createMeasurementLabel(labelText, labelPos);
        
        label.userData.measurementId = measurement.id;
        
        labelsRef.current?.add(label);
      } 
      else if (measurement.type === 'area') {
        const points3D = measurement.points.map(p => new THREE.Vector3(p.x, p.y, p.z));
        
        for (let i = 0; i < points3D.length; i++) {
          const p1 = points3D[i];
          const p2 = points3D[(i + 1) % points3D.length];
          
          const linePoints = [p1, p2];
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
          sphere.position.copy(p1);
          
          sphere.userData = {
            isAreaPoint: true,
            measurementId: measurement.id,
            pointIndex: i,
            segmentIndex: i
          };
          
          measurementsRef.current?.add(sphere);

          if (measurement.segments) {
            const segment = measurement.segments[i];
            const midpoint = calculateMidpoint(p1, p2);
            
            midpoint.y += 0.05;
            
            const segmentLabel = createMeasurementLabel(segment.label || "", midpoint);
            
            segmentLabel.scale.multiplyScalar(0.75);
            
            segmentLabel.userData = {
              measurementId: measurement.id,
              segmentId: segment.id,
              startPointIndex: i,
              endPointIndex: (i + 1) % points3D.length
            };
            
            segmentLabelsRef.current?.add(segmentLabel);
          }
        }
        
        if (points3D.length >= 3) {
          const centroid = calculateCentroid(points3D);
          
          const labelText = formatMeasurementLabel(measurement.value, 'area');
          const label = createMeasurementLabel(labelText, centroid);
          
          label.userData.measurementId = measurement.id;
          
          labelsRef.current?.add(label);
        }
      }
    });
  }, [measurements, visible]);

  useEffect(() => {
    if (!camera || !labelsRef.current || !segmentLabelsRef.current) return;
    
    const updateLabels = () => {
      if (labelsRef.current && camera) {
        labelsRef.current.children.forEach(child => {
          if (child instanceof THREE.Sprite) {
            updateLabelScale(child, camera);
          }
        });
      }
      
      if (segmentLabelsRef.current && camera) {
        segmentLabelsRef.current.children.forEach(child => {
          if (child instanceof THREE.Sprite) {
            updateLabelScale(child, camera, 0.4);
          }
        });
      }
    };
    
    const animate = () => {
      updateLabels();
      animationId = requestAnimationFrame(animate);
    };
    
    let animationId = requestAnimationFrame(animate);
    
    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [camera]);

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
      
      if (movingPointInfo) {
        const intersects = raycaster.intersectObjects(scene.children, true);
        
        const validIntersects = intersects.filter(intersect => {
          let currentObj = intersect.object;
          while (currentObj) {
            if (
              currentObj.name === "measurementPoints" || 
              currentObj.name === "measurementLines" ||
              currentObj.name === "measurementLabels" ||
              currentObj.name === "editPoints" ||
              currentObj.name === "textLabels" ||
              currentObj.name === "segmentLabels"
            ) {
              return false;
            }
            // @ts-ignore - parent property exists on THREE.Object3D
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
          
          updateMeasurementPoint(
            movingPointInfo.measurementId, 
            movingPointInfo.pointIndex, 
            point
          );
          
          setMovingPointInfo(null);
          toast.success(`Punkt ${movingPointInfo.pointIndex + 1} wurde verschoben`);
          return;
        }
      }
      
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
      
      const allSceneIntersects = raycaster.intersectObjects(scene.children, true);
      for (const intersect of allSceneIntersects) {
        if (
          intersect.object.userData && 
          intersect.object.userData.isAreaPoint
        ) {
          const userData = intersect.object.userData;
          
          setMovingPointInfo({
            measurementId: userData.measurementId,
            pointIndex: userData.pointIndex
          });
          
          toast.info(`Punkt ${userData.pointIndex + 1} wird verschoben. Klicken Sie an die neue Position.`);
          return;
        }
      }
      
      if (segmentLabelsRef.current) {
        const labelIntersects = raycaster.intersectObjects(segmentLabelsRef.current.children, false);
        
        if (labelIntersects.length > 0) {
          const intersect = labelIntersects[0];
          const userData = intersect.object.userData;
          
          if (userData.measurementId && userData.startPointIndex !== undefined) {
            const measurement = measurements.find(m => m.id === userData.measurementId);
            if (measurement) {
              toast.info(`Klicken Sie auf Punkt ${userData.startPointIndex + 1} oder ${userData.endPointIndex + 1}, um das Segment zu verschieben.`);
            }
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
            currentObj.name === "textLabels" ||
            currentObj.name === "segmentLabels"
          ) {
            return false;
          }
          // @ts-ignore - parent property exists on THREE.Object3D
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
  }, [enabled, scene, camera, activeMode, currentPoints, editMeasurementId, editingPointIndex, open, addPoint, startPointEdit, measurements, updateMeasurementPoint, movingPointInfo]);

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

  const handleUndoLastPoint = () => {
    if (undoLastPoint()) {
      toast.info('Letzter Messpunkt entfernt');
    } else {
      toast.error('Keine Messpunkte zum Entfernen vorhanden');
    }
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
    if (labelsRef.current) {
      labelsRef.current.children.forEach(child => {
        if (child.userData.measurementId === id) {
          labelsRef.current?.remove(child);
        }
      });
    }
    
    if (segmentLabelsRef.current) {
      segmentLabelsRef.current.children.forEach(child => {
        if (child.userData.measurementId === id) {
          segmentLabelsRef.current?.remove(child);
        }
      });
    }
    
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
    setEditingSegmentId(null);
    setMovingPointInfo(null);
    toast.info('Bearbeitung abgebrochen');
  };

  const toggleSegments = (id: string) => {
    setSegmentsOpen(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  if (!enabled) return null;

  return (
    <Sidebar side="right" variant="floating" className="z-20">
      <SidebarRail />
      <SidebarHeader>
        <div className="flex justify-between items-center px-4 py-2">
          <h3 className="text-lg font-semibold">Messwerkzeuge</h3>
          <SidebarTrigger className="h-7 w-7" />
        </div>
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
        
        {activeMode !== 'none' && currentPoints.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Aktive Messung</SidebarGroupLabel>
            <SidebarGroupContent>
              {activeMode === 'area' && currentPoints.length >= 3 && (
                <Button 
                  variant="default" 
                  className="w-full mb-2"
                  onClick={handleFinalizeMeasurement}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Messung abschließen ({currentPoints.length} Punkte)
                </Button>
              )}
              
              <div className="flex gap-2 w-full">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={handleUndoLastPoint}
                  disabled={currentPoints.length === 0}
