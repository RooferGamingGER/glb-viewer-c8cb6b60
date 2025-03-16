
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
  ArrowLeft, // Added for undo functionality
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
    undoLastPoint, // Add the new undoLastPoint function
    // New editing functionality
    editMeasurementId,
    editingPointIndex,
    startPointEdit,
    cancelEditing,
    getNearestPointIndex,
    calculateSegmentLength
  } = useMeasurements();

  // Points display reference for updating visual indicators
  const pointsRef = useRef<THREE.Group | null>(null);
  const linesRef = useRef<THREE.Group | null>(null);
  const measurementsRef = useRef<THREE.Group | null>(null);
  const editPointsRef = useRef<THREE.Group | null>(null);
  const labelsRef = useRef<THREE.Group | null>(null);
  const segmentLabelsRef = useRef<THREE.Group | null>(null); // New ref for segment labels

  useEffect(() => {
    // Just ensure sidebar is open when measurements are enabled
    // but don't activate any tool by default
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

    if (!segmentLabelsRef.current) {
      segmentLabelsRef.current = new THREE.Group();
      segmentLabelsRef.current.name = "segmentLabels";
      scene.add(segmentLabelsRef.current);
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
      
      if (segmentLabelsRef.current) {
        scene.remove(segmentLabelsRef.current);
        segmentLabelsRef.current = null;
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
    if (!measurementsRef.current || !visible || !labelsRef.current || !segmentLabelsRef.current) return;
    
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

    // Clear segment labels
    while (segmentLabelsRef.current.children.length > 0) {
      segmentLabelsRef.current.remove(segmentLabelsRef.current.children[0]);
    }
    
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

          // Add segment labels (for the line measurements)
          if (measurement.segments) {
            const segment = measurement.segments[i];
            const midpoint = calculateMidpoint(p1, p2);
            
            // Offset midpoint slightly to avoid overlap with lines
            midpoint.y += 0.05;
            
            // Create label with smaller size
            const segmentLabel = createMeasurementLabel(segment.label || "", midpoint);
            
            // Adjust the scale to make it slightly smaller than area labels
            segmentLabel.scale.multiplyScalar(0.75);
            
            // Store measurement ID and segment ID in user data for reference
            segmentLabel.userData.measurementId = measurement.id;
            segmentLabel.userData.segmentId = segment.id;
            
            // Add to segment labels group
            segmentLabelsRef.current?.add(segmentLabel);
          }
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
    if (!camera || !labelsRef.current || !segmentLabelsRef.current) return;
    
    // Update function for animation loop
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
            // Make segment labels slightly smaller
            updateLabelScale(child, camera, 0.4);
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
      
      // Check if we're clicking on a segment label (for segment editing)
      if (segmentLabelsRef.current) {
        const labelIntersects = raycaster.intersectObjects(segmentLabelsRef.current.children, false);
        
        if (labelIntersects.length > 0) {
          const intersect = labelIntersects[0];
          const userData = intersect.object.userData;
          
          if (userData.measurementId && userData.segmentId) {
            setEditingSegmentId(userData.segmentId);
            toast.info("Segment wird bearbeitet. Klicken Sie an eine Position, um es zu verschieben.");
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
        
        // If we're editing a segment, update it
        if (editingSegmentId !== null) {
          // Find the measurement containing this segment
          const measurement = measurements.find(m => 
            m.segments?.some(s => s.id === editingSegmentId)
          );
          
          if (measurement && measurement.segments) {
            // Find the segment
            const segmentIndex = measurement.segments.findIndex(s => s.id === editingSegmentId);
            
            if (segmentIndex >= 0) {
              // Update the points for this segment in the measurement
              // This requires updating both the segment and the measurement point it's connected to
              const updatedSegments = [...measurement.segments];
              const updatedPoints = [...measurement.points];
              
              // Update the point at the given index
              updatedPoints[segmentIndex] = point;
              
              // Update the measurement
              updateMeasurement(measurement.id, { 
                points: updatedPoints 
              });
              
              setEditingSegmentId(null);
              toast.success("Segment wurde verschoben.");
              return;
            }
          }
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
  }, [enabled, scene, camera, activeMode, currentPoints, editMeasurementId, editingPointIndex, editingSegmentId, open, addPoint, startPointEdit, measurements, updateMeasurement]);

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
    // Before deleting, make sure to remove all associated visual elements
    if (labelsRef.current) {
      // Remove main measurement labels
      labelsRef.current.children.forEach(child => {
        if (child.userData.measurementId === id) {
          labelsRef.current?.remove(child);
        }
      });
    }
    
    if (segmentLabelsRef.current) {
      // Remove segment labels
      segmentLabelsRef.current.children.forEach(child => {
        if (child.userData.measurementId === id) {
          segmentLabelsRef.current?.remove(child);
        }
      });
    }
    
    // Now delete the measurement
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
    setEditingSegmentId(null);
    toast.info('Bearbeitung abgebrochen');
  };

  // Toggle segment list for a measurement
  const toggleSegments = (id: string) => {
    setSegmentsOpen(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // If measurements are not enabled, don't render the sidebar
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
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Zurück
                </Button>
                
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={clearCurrentPoints}
                >
                  <X className="h-4 w-4 mr-2" />
                  Abbrechen
                </Button>
              </div>
              
              <div className="mt-3">
                <p className="text-xs text-muted-foreground mb-1">Messpunkte ({currentPoints.length}):</p>
                <div className="space-y-1 max-h-32 overflow-y-auto pl-2 pr-1">
                  {currentPoints.map((point, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs border border-border p-1 rounded">
                      <span>
                        Punkt {idx + 1}: ({point.x.toFixed(2)}, {point.y.toFixed(2)}, {point.z.toFixed(2)})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {(measurements.length > 0 || editingSegmentId) && (
          <SidebarGroup>
            <div className="flex justify-between items-center">
              <SidebarGroupLabel>Messungen</SidebarGroupLabel>
              <div className="flex space-x-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7"
                  onClick={toggleVisibility}
                  title={visible ? "Messungen ausblenden" : "Messungen einblenden"}
                >
                  {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7"
                  onClick={handleClearMeasurements}
                  title="Alle Messungen löschen"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <SidebarGroupContent>
              {(editMeasurementId || editingSegmentId) && (
                <Alert variant="default" className="mb-3">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Bearbeitungsmodus</AlertTitle>
                  <AlertDescription>
                    {editMeasurementId && "Klicken Sie einen Punkt an, um ihn zu bearbeiten."}
                    {editingSegmentId && "Klicken Sie auf eine Position, um das Segment zu verschieben."}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full mt-2"
                      onClick={handleCancelEditing}
                    >
                      Bearbeitung beenden
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
              
              <ScrollArea className="h-[200px]">
                {measurements.map((measurement) => (
                  <div 
                    key={measurement.id} 
                    className={`mb-3 p-2 rounded-md border ${
                      measurement.editMode ? 'border-primary bg-secondary/20' : 'border-border'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <div className="font-medium">
                        {measurement.type === 'length' && "Länge"}
                        {measurement.type === 'height' && "Höhe"}
                        {measurement.type === 'area' && "Fläche"}
                      </div>
                      <div className="flex space-x-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6" 
                          onClick={() => toggleMeasurementVisibility(measurement.id)}
                          title={measurement.visible === false ? "Einblenden" : "Ausblenden"}
                        >
                          {measurement.visible === false ? (
                            <Eye className="h-3 w-3" />
                          ) : (
                            <EyeOff className="h-3 w-3" />
                          )}
                        </Button>
                        
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6" 
                          onClick={() => handleStartPointEdit(measurement.id)}
                          title="Punkte bearbeiten"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6" 
                          onClick={() => handleDeleteMeasurement(measurement.id)}
                          title="Löschen"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="text-sm mb-1">
                      <strong>Wert:</strong> {measurement.label}
                      {measurement.type === 'length' && measurement.inclination !== undefined && (
                        <span className="ml-2">
                          <strong>Neigung:</strong> {measurement.inclination.toFixed(1)}°
                        </span>
                      )}
                    </div>
                    
                    {editingId === measurement.id ? (
                      <div className="flex flex-col space-y-2 mt-2">
                        <Input
                          placeholder="Beschreibung hinzufügen"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                        />
                        <div className="flex space-x-2">
                          <Button 
                            variant="default" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => handleEditSave(measurement.id)}
                          >
                            <Save className="h-3 w-3 mr-1" />
                            Speichern
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => setEditingId(null)}
                          >
                            <X className="h-3 w-3 mr-1" />
                            Abbrechen
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex mt-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-xs h-7 px-2"
                          onClick={() => handleEditStart(measurement.id, measurement.description)}
                        >
                          {measurement.description ? 
                            measurement.description : 
                            "Beschreibung hinzufügen..."
                          }
                        </Button>
                      </div>
                    )}
                    
                    {/* Segment management for area measurements */}
                    {measurement.type === 'area' && measurement.segments && measurement.segments.length > 0 && (
                      <Collapsible 
                        open={segmentsOpen[measurement.id]} 
                        onOpenChange={() => toggleSegments(measurement.id)}
                        className="mt-2"
                      >
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="w-full flex justify-between items-center px-2 h-7">
                            <span>Segmente ({measurement.segments.length})</span>
                            {segmentsOpen[measurement.id] ? (
                              <ChevronDown className="h-3 w-3 ml-1" />
                            ) : (
                              <ChevronRight className="h-3 w-3 ml-1" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="space-y-2 mt-2 pl-2">
                            {measurement.segments.map((segment, index) => (
                              <div key={segment.id} className="flex items-center justify-between text-xs border border-border p-2 rounded-md">
                                <div>
                                  <span className="font-medium">Segment {index + 1}:</span> {segment.label}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => {
                                    setEditingSegmentId(segment.id);
                                    toast.info(`Segment ${index + 1} wird bearbeitet. Klicken Sie an eine neue Position.`);
                                  }}
                                  title="Segment verschieben"
                                >
                                  <Move className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </div>
                ))}
              </ScrollArea>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      
      <SidebarFooter>
        <div className="p-4 text-xs text-muted-foreground">
          <p>Messungswerkzeuge v1.0</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};

export default MeasurementTools;
