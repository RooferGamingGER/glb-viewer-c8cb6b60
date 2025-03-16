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
    // New editing functionality
    editMeasurementId,
    editingPointIndex,
    startPointEdit,
    cancelEditing,
    getNearestPointIndex
  } = useMeasurements();

  // Points display reference for updating visual indicators
  const pointsRef = useRef<THREE.Group | null>(null);
  const linesRef = useRef<THREE.Group | null>(null);
  const measurementsRef = useRef<THREE.Group | null>(null);
  const labelsRef = useRef<THREE.Group | null>(null);
  const editPointsRef = useRef<THREE.Group | null>(null);

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
    if (!measurementsRef.current || !labelsRef.current) return;
    
    // Clear existing measurement labels
    while (measurementsRef.current.children.length > 0) {
      measurementsRef.current.remove(measurementsRef.current.children[0]);
    }
    
    // Clear all HTML labels
    while (labelsRef.current.children.length > 0) {
      labelsRef.current.remove(labelsRef.current.children[0]);
    }
    
    // Add visual representation for each finalized measurement
    measurements.forEach((measurement) => {
      // Skip measurements that are explicitly marked as not visible
      if (measurement.visible === false || !visible) return;
      
      // Create different visualizations based on measurement type
      if (measurement.type === 'length') {
        // For length, draw line between the two points
        const [p1, p2] = measurement.points;
        
        // Draw the line
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
        
        // Add small spheres at endpoints
        const sphereGeometry = new THREE.SphereGeometry(0.04, 16, 16);
        const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        
        measurement.points.forEach(point => {
          const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
          sphere.position.set(point.x, point.y, point.z);
          measurementsRef.current?.add(sphere);
        });
        
        // Add measurement value label at midpoint
        if (measurement.label) {
          // Calculate midpoint for label placement
          const midPoint = new THREE.Vector3(
            (p1.x + p2.x) / 2,
            (p1.y + p2.y) / 2,
            (p1.z + p2.z) / 2
          );
          
          // Create a placeholder for the label
          const labelPlaceholder = new THREE.Object3D();
          labelPlaceholder.position.copy(midPoint);
          labelPlaceholder.userData = {
            type: 'length-label',
            value: measurement.label,
            measurementId: measurement.id
          };
          
          // Add to labels group
          labelsRef.current?.add(labelPlaceholder);
          
          // Create HTML label
          const labelObj = new MeasurementLabel({
            position: midPoint,
            value: measurement.label,
            color: 'rgb(34, 197, 94)', // Green color
            visible: true
          });
          
          if (labelObj) {
            labelObj.userData = { measurementId: measurement.id };
            labelPlaceholder.add(labelObj);
          }
        }
      } 
      else if (measurement.type === 'height') {
        // For height, draw a vertical line to show the height difference
        const [p1, p2] = measurement.points;
        
        // Determine which point is higher
        const higherPoint = p1.y > p2.y ? p1 : p2;
        const lowerPoint = p1.y > p2.y ? p2 : p1;
        
        // Create a vertical projection point below/above the higher point
        const verticalPoint = {
          x: higherPoint.x,
          y: lowerPoint.y,
          z: higherPoint.z
        };
        
        // Draw only the vertical line - no direct connection between points
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
        
        // Draw horizontal reference line
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
        
        // Add small spheres at all points
        const sphereGeometry = new THREE.SphereGeometry(0.04, 16, 16);
        const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
        
        [higherPoint, lowerPoint, verticalPoint].forEach(point => {
          const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
          sphere.position.set(point.x, point.y, point.z);
          measurementsRef.current?.add(sphere);
        });
        
        // Add height measurement label in the middle of the vertical line
        if (measurement.label) {
          const midVertical = new THREE.Vector3(
            verticalPoint.x,
            (higherPoint.y + verticalPoint.y) / 2,
            verticalPoint.z
          );
          
          // Create a placeholder for the label
          const labelPlaceholder = new THREE.Object3D();
          labelPlaceholder.position.copy(midVertical);
          labelPlaceholder.userData = {
            type: 'height-label',
            value: measurement.label,
            measurementId: measurement.id
          };
          
          // Add to labels group
          labelsRef.current?.add(labelPlaceholder);
          
          // Add label slightly offset from the vertical line
          const labelPosition = new THREE.Vector3(
            midVertical.x + 0.1, // Offset from the line
            midVertical.y,
            midVertical.z
          );
          
          // Create HTML label
          const labelObj = new MeasurementLabel({
            position: labelPosition,
            value: measurement.label,
            color: 'rgb(59, 130, 246)', // Blue color
            visible: true
          });
          
          if (labelObj) {
            labelObj.userData = { measurementId: measurement.id };
            labelPlaceholder.add(labelObj);
          }
        }
      } 
      else if (measurement.type === 'area') {
        // For area, draw filled polygon
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
          
          // Add length label for each segment
          const midSegment = new THREE.Vector3(
            (p1.x + p2.x) / 2,
            (p1.y + p2.y) / 2,
            (p1.z + p2.z) / 2
          );
          
          // Calculate length of this segment
          const segmentLength = Math.sqrt(
            Math.pow(p2.x - p1.x, 2) +
            Math.pow(p2.y - p1.y, 2) +
            Math.pow(p2.z - p1.z, 2)
          );
          
          // Format segment length as a string (2 decimal places)
          const segmentLengthStr = `${segmentLength.toFixed(2)} m`;
          
          // Create a placeholder for the label
          const labelPlaceholder = new THREE.Object3D();
          labelPlaceholder.position.copy(midSegment);
          labelPlaceholder.userData = {
            type: 'segment-label',
            value: segmentLengthStr,
            measurementId: measurement.id,
            segmentIndex: i
          };
          
          // Add to labels group
          labelsRef.current?.add(labelPlaceholder);
          
          // Create HTML label
          const labelObj = new MeasurementLabel({
            position: midSegment,
            value: segmentLengthStr,
            color: 'rgb(245, 158, 11)', // Amber color
            visible: true
          });
          
          if (labelObj) {
            labelObj.userData = { 
              measurementId: measurement.id,
              segmentIndex: i
            };
            labelPlaceholder.add(labelObj);
          }
        }
        
        // Find centroid for area label placement
        const centroid = new THREE.Vector3(0, 0, 0);
        points.forEach(p => {
          centroid.x += p.x;
          centroid.y += p.y;
          centroid.z += p.z;
        });
        centroid.divideScalar(points.length);
        
        // Add area value label at centroid
        if (measurement.label) {
          // Create a placeholder for the label
          const labelPlaceholder = new THREE.Object3D();
          labelPlaceholder.position.copy(centroid);
          labelPlaceholder.userData = {
            type: 'area-label',
            value: measurement.label,
            measurementId: measurement.id
          };
          
          // Add to labels group
          labelsRef.current?.add(labelPlaceholder);
          
          // Create HTML label
          const labelObj = new MeasurementLabel({
            position: new THREE.Vector3(centroid.x, centroid.y + 0.15, centroid.z), // Slightly above the centroid
            value: `Fläche: ${measurement.label}`,
            color: 'rgb(245, 158, 11)', // Amber color
            visible: true
          });
          
          if (labelObj) {
            labelObj.userData = { measurementId: measurement.id };
            labelPlaceholder.add(labelObj);
          }
        }
      }
    });
  }, [measurements, visible]);

  // Update the editable points visualizations
  useEffect(() => {
    if (!editPointsRef.current || !visible) return;
    
    // Clear existing edit points
    while (editPointsRef.current.children.length > 0) {
      editPointsRef.current.remove(editPointsRef.current.children[0]);
    }
    
    // If we're not in edit mode, we don't need to show edit points
    if (!editMeasurementId) return;
    
    // Find the measurement being edited
    const measurement = measurements.find(m => m.id === editMeasurementId);
    if (!measurement) return;
    
    // Add editable points with a different appearance
    measurement.points.forEach((point, index) => {
      const isSelected = index === editingPointIndex;
      
      // Create a larger, highlighted sphere for editable points
      const size = isSelected ? 0.08 : 0.06; // Selected point is bigger
      const sphereGeometry = new THREE.SphereGeometry(size, 16, 16);
      
      // Use a bright color for the selected point, different color for others
      const color = isSelected ? 0xff00ff : 0xffff00;
      const sphereMaterial = new THREE.MeshBasicMaterial({ 
        color,
        opacity: 0.8,
        transparent: true
      });
      
      const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
      sphere.position.set(point.x, point.y, point.z);
      
      // Add user data to the sphere for identification when clicking
      sphere.userData = {
        isEditPoint: true,
        measurementId: measurement.id,
        pointIndex: index
      };
      
      editPointsRef.current?.add(sphere);
    });
  }, [measurements, editMeasurementId, editingPointIndex, visible]);

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
      
      // First check if we're clicking on an edit point
      if (editMeasurementId && editPointsRef.current) {
        const editPointIntersects = raycaster.intersectObjects(editPointsRef.current.children, false);
        
        if (editPointIntersects.length > 0) {
          const intersect = editPointIntersects[0];
          const userData = intersect.object.userData;
          
          if (userData.isEditPoint) {
            // Start editing this point
            startPointEdit(userData.measurementId, userData.pointIndex);
            toast.info(`Messpunkt ${userData.pointIndex + 1} wird bearbeitet. Klicken Sie an eine neue Position.`);
            return; // Don't process further
          }
        }
      }
      
      // Get all other intersected objects (excluding measurement points/lines)
      const intersects = raycaster.intersectObjects(scene.children, true);
      
      // Filter out measurement points/lines from intersections
      const validIntersects = intersects.filter(intersect => {
        // Check if the object or any of its parents are measurement points/lines
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
        
        // If we're editing a point, update it
        if (editMeasurementId !== null && editingPointIndex !== null) {
          addPoint(point); // This will handle updating the point
          toast.success(`Messpunkt ${editingPointIndex + 1} wurde aktualisiert.`);
          return;
        }
        
        // If we're in normal measurement mode
        if (activeMode !== 'none') {
          // Current count before adding the new point
          const currentCount = currentPoints.length;
          
          // Add point using the addPoint method
          addPoint(point);
          
          // Show appropriate toast based on the measurement mode and point count
          if (activeMode === 'length' || activeMode === 'height') {
            if (currentCount === 0) {
              // First point for length/height
              toast.info(`Ersten Punkt für ${activeMode === 'length' ? 'Längen' : 'Höhen'}messung gesetzt`);
            } else if (currentCount === 1) {
              // Second point for length/height (will auto-finalize)
              toast.info(`Zweiten Punkt für ${activeMode === 'length' ? 'Längen' : 'Höhen'}messung gesetzt`);
              // The measurement is complete, so we'll show a success toast
              toast.success(`${activeMode === 'length' ? 'Längen' : 'Höhen'}messung abgeschlossen`);
            }
          } else if (activeMode === 'area') {
            if (currentCount === 0) {
              // First point for area
              toast.info("Ersten Punkt für Flächenmessung gesetzt");
            } else {
              // Additional area point
              toast.info(`Punkt ${currentCount + 1} für Flächenmessung gesetzt`);
            }
          }
        }
      }
    };
    
    // Add click event listener to canvas
    canvasElement.addEventListener('click', handleClick);
    
    // Clean up event listener when component unmounts or when disabled
    return () => {
      canvasElement.removeEventListener('click', handleClick);
    };
  }, [enabled, scene, camera, activeMode, currentPoints, editMeasurementId, editingPointIndex, open, addPoint, startPointEdit]);

  const selectTool = (mode: MeasurementMode) => {
    // Use the new toggle function instead of direct state setting
    toggleMeasurementTool(mode);
    
    // Show appropriate toast message based on whether the tool is being activated or deactivated
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
    // Toggle the edit mode for this measurement
    toggleEditMode(id);
    
    // If it was already in edit mode, it's now turned off
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
