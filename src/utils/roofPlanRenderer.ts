import * as THREE from 'three';
import { SVGRenderer } from 'three/examples/jsm/renderers/SVGRenderer';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer';
import { calculateSegmentLength } from './measurementCalculations';
import { generatePVModuleGrid } from './pvCalculations';

// Function to convert a color string to a THREE.Color
const colorToThreeJS = (color: string): THREE.Color => {
  return new THREE.Color(color);
};

// Function to create a dashed line material
const createDashedLineMaterial = (color: string, dashSize: number = 0.1, gapSize: number = 0.1): THREE.LineDashedMaterial => {
  return new THREE.LineDashedMaterial({
    color: colorToThreeJS(color),
    dashSize: dashSize,
    gapSize: gapSize,
    scale: 1,
  });
};

// Function to create a text label
const createTextLabel = (text: string, color: string = 'black', fontSize: string = '12px'): CSS2DObject => {
  const labelDiv = document.createElement('div');
  labelDiv.className = 'label';
  labelDiv.style.color = color;
  labelDiv.style.fontSize = fontSize;
  labelDiv.textContent = text;

  const label = new CSS2DObject(labelDiv);
  label.position.set(0, 0, 0); // Position will be set later
  return label;
};

// Function to create a 2D rectangle
const createRectangle = (width: number, height: number, color: string): THREE.Mesh => {
  const geometry = new THREE.PlaneGeometry(width, height);
  const material = new THREE.MeshBasicMaterial({ color: colorToThreeJS(color), side: THREE.DoubleSide });
  const rectangle = new THREE.Mesh(geometry, material);
  rectangle.rotation.x = -Math.PI / 2; // Lay it flat
  return rectangle;
};

// Function to create a circle
const createCircle = (radius: number, color: string): THREE.Mesh => {
  const geometry = new THREE.CircleGeometry(radius, 32);
  const material = new THREE.MeshBasicMaterial({ color: colorToThreeJS(color), side: THREE.DoubleSide });
  const circle = new THREE.Mesh(geometry, material);
  circle.rotation.x = -Math.PI / 2; // Lay it flat
  return circle;
};

// Function to create a line
const createLine = (points: THREE.Vector3[], color: string = 'black', dashed: boolean = false): THREE.Line => {
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  
  let material;
  if (dashed) {
    material = createDashedLineMaterial(color);
  } else {
    material = new THREE.LineBasicMaterial({ color: colorToThreeJS(color) });
  }
  
  const line = new THREE.Line(geometry, material);
  return line;
};

// Function to create a polygon
const createPolygon = (points: THREE.Vector3[], color: string = 'rgba(255, 0, 0, 0.2)'): THREE.Mesh => {
  const shape = new THREE.Shape();
  shape.moveTo(points[0].x, points[0].z); // Use x and z for 2D plane

  for (let i = 1; i < points.length; i++) {
    shape.lineTo(points[i].x, points[i].z); // Use x and z for 2D plane
  }

  shape.closePath();

  const geometry = new THREE.ShapeGeometry(shape);
  geometry.rotateX(-Math.PI / 2); // Lay it flat

  const material = new THREE.MeshBasicMaterial({
    color: colorToThreeJS(color),
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.6
  });

  const polygon = new THREE.Mesh(geometry, material);
  return polygon;
};

// Function to create a segment with a specific type
const createSegment = (segment: any, startPoint: THREE.Vector3, endPoint: THREE.Vector3, scene: THREE.Scene) => {
  const segmentLength = calculateSegmentLength(startPoint, endPoint);
  const segmentMidpoint = new THREE.Vector3(
    (startPoint.x + endPoint.x) / 2,
    (startPoint.y + endPoint.y) / 2,
    (startPoint.z + endPoint.z) / 2
  );
  
  // Create dashed line
  const line = createLine([startPoint, endPoint], 'gray', true);
  scene.add(line);
  
  // Create label for segment length
  const segmentLengthLabel = createTextLabel(`${segmentLength.toFixed(2)} m`, 'black', '10px');
  segmentLengthLabel.position.copy(segmentMidpoint);
  scene.add(segmentLengthLabel);
  
  // Create label for segment type
  if (segment.type) {
    const segmentTypeLabel = createTextLabel(segment.type, 'blue', '10px');
    segmentTypeLabel.position.set(segmentMidpoint.x, segmentMidpoint.y + 0.1, segmentMidpoint.z);
    scene.add(segmentTypeLabel);
  }
};

// Function to create a roof plan from measurements
export const createRoofPlan = (measurements: any[], width: number = 2000, height: number = 1600, scaleFactor: number = 0.1, renderLabels: boolean = true): string => {
  // Scene setup
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(
    -width * scaleFactor / 2,
    width * scaleFactor / 2,
    height * scaleFactor / 2,
    -height * scaleFactor / 2,
    1,
    1000
  );
  camera.position.set(0, 5, 0);
  camera.lookAt(0, 0, 0);

  // CSS2DRenderer for labels
  const labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(width, height);
  labelRenderer.domElement.style.position = 'absolute';
  labelRenderer.domElement.style.top = '0px';
  labelRenderer.domElement.style.left = '0px';

  // Group to hold all 3D objects
  const roofGroup = new THREE.Group();
  scene.add(roofGroup);

  // Iterate through measurements and create objects
  measurements.forEach(measurement => {
    if (!measurement.visible) return;

    const points = measurement.points.map(p => new THREE.Vector3(p.x, p.y, p.z));

    switch (measurement.type) {
      case 'area':
      case 'solar':
        const polygon = createPolygon(points, 'rgba(255, 0, 0, 0.2)');
        roofGroup.add(polygon);

        // Add segments to the scene
        if (measurement.segments && points.length > 1) {
          for (let i = 0; i < measurement.segments.length; i++) {
            const segment = measurement.segments[i];
            const startIndex = segment.points[0].index;
            const endIndex = segment.points[1].index;
            
            if (startIndex !== undefined && endIndex !== undefined && startIndex < points.length && endIndex < points.length) {
              const startPoint = points[startIndex];
              const endPoint = points[endIndex];
              createSegment(segment, startPoint, endPoint, roofGroup);
            }
          }
        }
        
        if (measurement.type === 'solar' && measurement.pvModuleInfo) {
          const pvModules = generatePVModuleGrid(measurement.pvModuleInfo);
          pvModules.forEach(module => {
            const rect = createRectangle(module.width, module.height, 'rgba(0, 255, 0, 0.3)');
            rect.position.set(module.x, 0.01, module.y); // Slightly above the roof
            roofGroup.add(rect);
          });
        }
        break;
      case 'length':
      case 'height':
        if (points.length === 2) {
          const line = createLine(points);
          roofGroup.add(line);
          
          // Calculate midpoint for label
          const midpoint = new THREE.Vector3(
            (points[0].x + points[1].x) / 2,
            (points[0].y + points[1].y) / 2,
            (points[0].z + points[1].z) / 2
          );
          
          // Add label for length
          if (measurement.label && renderLabels) {
            const lengthLabel = createTextLabel(measurement.label);
            lengthLabel.position.copy(midpoint);
            roofGroup.add(lengthLabel);
          }
        }
        break;
      case 'dormer':
      case 'chimney':
      case 'skylight':
      case 'vent':
      case 'hook':
      case 'other':
        // Create a circle to represent the element
        const radius = 0.5; // Adjust as needed
        const circle = createCircle(radius, 'gray');
        circle.position.set(points[0].x, 0.01, points[0].z); // Use the first point as the center
        roofGroup.add(circle);
        
        // Add label for the element
        if (measurement.label && renderLabels) {
          const elementLabel = createTextLabel(measurement.label);
          elementLabel.position.set(points[0].x, 0.1, points[0].z);
          roofGroup.add(elementLabel);
        }
        break;
    }
  });

  // Calculate bounding box
  const boundingBox = new THREE.Box3().setFromObject(roofGroup);
  const center = boundingBox.getCenter(new THREE.Vector3());

  // Adjust camera and label renderer position
  roofGroup.position.set(-center.x, -center.y, -center.z);
  labelRenderer.domElement.style.transform = `translate(-${width / 2}px, -${height / 2}px)`;

  // Render the scene to SVG
  const svgRenderer = new SVGRenderer();
  svgRenderer.setSize(width, height);
  svgRenderer.render(scene, camera);

  const svgData = svgRenderer.domElement.outerHTML;
  return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
};

// Function to combine multiple roof plans into one
export const createCombinedRoofPlan = (measurements: any[], width: number = 3000, height: number = 2400, scaleFactor: number = 0.1, renderLabels: boolean = true): string => {
  // Scene setup
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(
    -width * scaleFactor / 2,
    width * scaleFactor / 2,
    height * scaleFactor / 2,
    -height * scaleFactor / 2,
    1,
    1000
  );
  camera.position.set(0, 5, 0);
  camera.lookAt(0, 0, 0);

  // CSS2DRenderer for labels
  const labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(width, height);
  labelRenderer.domElement.style.position = 'absolute';
  labelRenderer.domElement.style.top = '0px';
  labelRenderer.domElement.style.left = '0px';

  // Group to hold all 3D objects
  const roofGroup = new THREE.Group();
  scene.add(roofGroup);

  // Iterate through measurements and create objects
  measurements.forEach(measurement => {
    if (!measurement.visible) return;

    const points = measurement.points.map(p => new THREE.Vector3(p.x, p.y, p.z));

    switch (measurement.type) {
      case 'area':
      case 'solar':
        const polygon = createPolygon(points, 'rgba(255, 0, 0, 0.2)');
        roofGroup.add(polygon);

        // Add segments to the scene
        if (measurement.segments && points.length > 1) {
          for (let i = 0; i < measurement.segments.length; i++) {
            const segment = measurement.segments[i];
            const startIndex = segment.points[0].index;
            const endIndex = segment.points[1].index;
            
            if (startIndex !== undefined && endIndex !== undefined && startIndex < points.length && endIndex < points.length) {
              const startPoint = points[startIndex];
              const endPoint = points[endIndex];
              createSegment(segment, startPoint, endPoint, roofGroup);
            }
          }
        }
        
        if (measurement.type === 'solar' && measurement.pvModuleInfo) {
          const pvModules = generatePVModuleGrid(measurement.pvModuleInfo);
          pvModules.forEach(module => {
            const rect = createRectangle(module.width, module.height, 'rgba(0, 255, 0, 0.3)');
            rect.position.set(module.x, 0.01, module.y); // Slightly above the roof
            roofGroup.add(rect);
          });
        }
        break;
      case 'length':
      case 'height':
        if (points.length === 2) {
          const line = createLine(points);
          roofGroup.add(line);
          
          // Calculate midpoint for label
          const midpoint = new THREE.Vector3(
            (points[0].x + points[1].x) / 2,
            (points[0].y + points[1].y) / 2,
            (points[0].z + points[1].z) / 2
          );
          
          // Add label for length
          if (measurement.label && renderLabels) {
            const lengthLabel = createTextLabel(measurement.label);
            lengthLabel.position.copy(midpoint);
            roofGroup.add(lengthLabel);
          }
        }
        break;
      case 'dormer':
      case 'chimney':
      case 'skylight':
      case 'vent':
      case 'hook':
      case 'other':
        // Create a circle to represent the element
        const radius = 0.5; // Adjust as needed
        const circle = createCircle(radius, 'gray');
        circle.position.set(points[0].x, 0.01, points[0].z); // Use the first point as the center
        roofGroup.add(circle);
        
        // Add label for the element
        if (measurement.label && renderLabels) {
          const elementLabel = createTextLabel(measurement.label);
          elementLabel.position.set(points[0].x, 0.1, points[0].z);
          roofGroup.add(elementLabel);
        }
        break;
    }
  });

  // Calculate bounding box
  const boundingBox = new THREE.Box3().setFromObject(roofGroup);
  const center = boundingBox.getCenter(new THREE.Vector3());

  // Adjust camera and label renderer position
  roofGroup.position.set(-center.x, -center.y, -center.z);
  labelRenderer.domElement.style.transform = `translate(-${width / 2}px, -${height / 2}px)`;

  // Render the scene to a canvas
  const canvasRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  canvasRenderer.setSize(width, height);
  canvasRenderer.setClearColor(0xffffff, 0); // Transparent background
  canvasRenderer.render(scene, camera);

  const canvas = canvasRenderer.domElement;

  // Convert the canvas to a data URL
  const imageDataURL = canvas.toDataURL('image/png');

  // Clean up resources
  canvasRenderer.dispose();

  return imageDataURL;
};
