
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
import {
  createMeasurementLabel,
  updateLabelScale,
  formatMeasurementLabel,
  calculateMidpoint,
  calculateCentroid,
  calculateInclination
} from '@/utils/textSprite';

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
  const editPointsRef = useRef<THREE.Group | null>(null);
  const labelsRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    // Ensure sidebar is open when measurements are enabled
    if (enabled && !open) {
      setOpen(true);
    }
  }, [enabled, open, setOpen]);

  // Create measurement groups in the scene
  useEffect(() => {
    if (!scene || !enabled) return;

    // Create groups to hold points, lines, measurements, and labels if they don't exist
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
      if (editPointsRef.current) {
        scene.remove(editPointsRef.current);
        editPointsRef.current = null;
      }
      if (labelsRef.current) {
        scene.remove(labelsRef.current);
        labelsRef.current = null;
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
      // Use a dashed line material
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
    
    // Create preview label if we have enough points for a complete measurement
    if (labelsRef.current && currentPoints.length >= 2) {
      // Clear existing preview labels
      labelsRef.current.children.forEach(child => {
        if (child.userData.isPreview) {
          labelsRef.current?.remove(child);
        }
      });
      
      if (activeMode === 'length' && currentPoints.length >= 2) {
        // For length measurement preview
        const p1 = new THREE.Vector3(currentPoints[0].x, currentPoints[0].y, currentPoints[0].z);
        const p2 = new THREE.Vector3(currentPoints[1].x, currentPoints[1].y, currentPoints[1].z);
        
        // Calculate distance
        const distance = p1.distanceTo(p2);
        
        // Calculate inclination
        const inclination = calculateInclination(p1, p2);
        
        // Format label text
        const labelText = formatMeasurementLabel(distance, 'length', inclination);
        
        // Create label at midpoint
        const midpoint = calculateMidpoint(p1, p2);
        const label = createMeasurementLabel(labelText, midpoint, true);
        label.userData.isPreview = true;
        
        labelsRef.current.add(label);
      }
      else if (activeMode === 'height' && currentPoints.length >= 2) {
        // For height measurement preview
        const p1 = new THREE.Vector3(currentPoints[0].x, currentPoints[0].y, currentPoints[0].z);
        const p2 = new THREE.Vector3(currentPoints[1].x, currentPoints[1].y, currentPoints[1].z);
        
        // Height is specifically the Y-axis difference
        const height = Math.abs(p2.y - p1.y);
        
        // Format label text
        const labelText = formatMeasurementLabel(height, 'height');
        
        // Create label positioned beside the vertical line
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
        // For area measurement preview, create a temporary polygon
        const points3D = currentPoints.map(p => new THREE.Vector3(p.x, p.y, p.z));
        
        // Calculate area (simplified - for preview only)
        // Note: This is a simplification and may not be accurate for all 3D polygons
        let area = 0;
        const n = points3D.length;
        for (let i = 0; i < n; i++) {
          const j = (i + 1) % n;
          area += points3D[i].x * points3D[j].z;
          area -= points3D[j].x * points3D[i].z;
        }
        area = Math.abs(area) / 2;
        
        // Format label text
        const labelText = formatMeasurementLabel(area, 'area');
        
        // Create label at centroid
        const centroid = calculateCentroid(points3D);
        const label = createMeasurementLabel(labelText, centroid, true);
        label.userData.isPreview = true;
        
        labelsRef.current.add(label);
      }
    }

  }, [currentPoints, visible, activeMode]);

  // Update visual representation of completed measurements
  useEffect(() => {
    if (!measurementsRef.current || !visible || !labelsRef.current) return;
    
    // Clear existing measurement labels
    while (measurementsRef.current.children.length > 0) {
      measurementsRef.current.remove(measurementsRef.current.children[0]);
    }
    
    // Clear existing text labels (except preview labels)
    labelsRef.current.children.forEach(child => {
      if (!child.userData.isPreview) {
        labelsRef.current?.remove(child);
      }
    });
    
    // Add visual representation for each finalized measurement
    measurements.forEach((measurement) => {
      // Skip measurements that are explicitly marked as not visible
      if (measurement.visible === false) return;
      
      // Create different visualizations based on measurement type
      if (measurement.type === 'length') {
        // For length, draw line between the two points
        const [p1, p2] = measurement.points;
        
        // Convert to THREE.Vector3
        const point1 = new THREE.Vector3(p1.x, p1.y, p1.z);
        const point2 = new THREE.Vector3(p2.x, p2.y, p2.z);
        
        // Draw the line
        const linePoints = [point1, point2];
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
        
        // Calculate inclination
        const inclination = calculateInclination(point1, point2);
        
        // Add text label at midpoint
        const midpoint = calculateMidpoint(point1, point2);
        const labelText = formatMeasurementLabel(measurement.value, 'length', inclination);
        const label = createMeasurementLabel(labelText, midpoint);
        
        // Store measurement ID in user data for reference
        label.userData.measurementId = measurement.id;
        
        // Add to labels group
        labelsRef.current?.add(label);
      } 
      else if (measurement.type === 'height') {
        // For height, draw a vertical line to show the height difference
        const [p1, p2] = measurement.points;
        
        // Convert to THREE.Vector3
        const point1 = new THREE.Vector3(p1.x, p1.y, p1.z);
        const point2 = new THREE.Vector3(p2.x, p2.y, p2.z);
        
        // Determine which point is higher
        const higherPoint = point1.y > point2.y ? point1 : point2;
        const lowerPoint = point1.y > point2.y ? point2 : point1;
        
        // Create a vertical projection point below/above the higher point
        const verticalPoint = new THREE.Vector3(
          higherPoint.x,
          lowerPoint.y,
          higherPoint.z
        );
        
        // Draw the main line between the two points
        const mainLinePoints = [point1, point2];
        const mainLineGeometry = new THREE.BufferGeometry().setFromPoints(mainLinePoints);
        const mainLineMaterial = new THREE.LineBasicMaterial({ 
          color: 0x0000ff,
          linewidth: 2
        });
        const mainLine = new THREE.Line(mainLineGeometry, mainLineMaterial);
        measurementsRef.current?.add(mainLine);
        
        // Draw the vertical line
        const verticalLinePoints = [higherPoint, verticalPoint];
        const verticalLineGeometry = new THREE.BufferGeometry().setFromPoints(verticalLinePoints);
        const verticalLineMaterial = new THREE.LineBasicMaterial({ 
          color: 0x0000ff,
          linewidth: 3
        });
        const verticalLine = new THREE.Line(verticalLineGeometry, verticalLineMaterial);
        measurementsRef.current?.add(verticalLine);
        
        // Optional: Draw horizontal reference line
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
        
        // Add small spheres at all points
        const sphereGeometry = new THREE.SphereGeometry(0.04, 16, 16);
        const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
        
        [point1, point2, verticalPoint].forEach(point => {
          const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
          sphere.position.copy(point);
          measurementsRef.current?.add(sphere);
        });
        
        // Add text label at midpoint of vertical line
        const labelPos = new THREE.Vector3(
          verticalPoint.x + 0.2, // Slightly offset from vertical line
          (higherPoint.y + verticalPoint.y) / 2,
          verticalPoint.z
        );
        
        const labelText = formatMeasurementLabel(measurement.value, 'height');
        const label = createMeasurementLabel(labelText, labelPos);
        
        // Store measurement ID in user data for reference
        label.userData.measurementId = measurement.id;
        
        // Add to labels group
        labelsRef.current?.add(label);
      } 
      else if (measurement.type === 'area') {
        // For area, draw filled polygon
        const points3D = measurement.points.map(p => new THREE.Vector3(p.x, p.y, p.z));
        
        // Create outline from points
        for (let i = 0; i < points3D.length; i++) {
          const p1 = points3D[i];
          const p2 = points3D[(i + 1) % points3D.length]; // Connect back to first point
          
          // Draw the line segment
          const linePoints = [p1, p2];
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
          sphere.position.copy(p1);
          measurementsRef.current?.add(sphere);
        }
        
        // Add a semi-transparent fill
        if (points3D.length >= 3) {
          // Calculate centroid for label placement
          const centroid = calculateCentroid(points3D);
          
          // Create label
          const labelText = formatMeasurementLabel(measurement.value, 'area');
          const label = createMeasurementLabel(labelText, centroid);
          
          // Store measurement ID in user data for reference
          label.userData.measurementId = measurement.id;
          
          // Add to labels group
          labelsRef.current?.add(label);
        }
      }
    });
  }, [measurements, visible]);

  // Update label scales based on camera distance
  useEffect(() => {
    if (!camera || !labelsRef.current) return;
    
    // Update function for animation loop
    const updateLabels = () => {
      if (labelsRef.current && camera) {
        labelsRef.current.children.forEach(child => {
          if (child instanceof THREE.Sprite) {
            updateLabelScale(child, camera);
          }
        });
      }
    };
    
    // Setup animation loop
    const animate = () => {
      updateLabels();
      animationId = requestAnimationFrame(animate);
    };
    
    // Start animation
    let animationId = requestAnimationFrame(animate);
    
    // Cleanup
    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [camera]);

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
            currentObj.name === "editPoints"
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
              onClick={toggleVisibility}
              className="flex-1 flex items-center justify-center gap-2"
            >
              {visible ? <EyeOff size={16} /> : <Eye size={16} />}
              {visible ? "Ausblenden" : "Einblenden"}
            </Button>
            
            {measurements.length > 0 && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={toggleAllMeasurementsVisibility}
                className="flex-1 flex items-center justify-center gap-2"
              >
                {allMeasurementsVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                {allMeasurementsVisible ? "Alle aus" : "Alle ein"}
              </Button>
            )}
            
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
              <ScrollArea className={measurements.length > 3 ? "h-[200px]" : "max-h-full"}>
                <div className="space-y-2 p-2 bg-muted/50 rounded-md">
                  {measurements.map((m) => (
                    <div key={m.id} className="flex flex-col gap-1 bg-background/40 p-2 rounded">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${
                            m.type === 'length' ? 'bg-green-500' : 
                            m.type === 'height' ? 'bg-blue-500' : 'bg-amber-500'
                          }`} />
                          <div>
                            <span className="text-sm font-medium">
                              {m.type === 'length' ? 'Länge' : 
                              m.type === 'height' ? 'Höhe' : 'Fläche'}
                            </span>
                            <div className="text-xs text-muted-foreground">
                              {m.label}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleMeasurementVisibility(m.id)}
                            className="h-6 w-6"
                          >
                            {m.visible === false ? <Eye size={14} /> : <EyeOff size={14} />}
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleStartPointEdit(m.id)}
                            className={`h-6 w-6 ${m.editMode ? 'bg-primary text-primary-foreground' : ''}`}
                            title="Punkte bearbeiten"
                          >
                            <Move size={14} />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => editingId === m.id ? handleEditSave(m.id) : handleEditStart(m.id, m.description)}
                            className="h-6 w-6"
                          >
                            {editingId === m.id ? <Save size={14} /> : <Pencil size={14} />}
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteMeasurement(m.id)}
                            className="h-6 w-6 text-destructive hover:text-destructive"
                          >
                            <X size={14} />
                          </Button>
                        </div>
                      </div>
                      
                      {editingId === m.id ? (
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          placeholder="Beschreibung hinzufügen"
                          className="h-7 text-xs mt-1"
                          autoFocus
                        />
                      ) : (
                        m.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {m.description}
                          </p>
                        )
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
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
