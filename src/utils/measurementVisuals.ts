import * as THREE from 'three';
import { Point, Measurement, MeasurementMode, PVModuleInfo } from '@/types/measurements';
import { generatePVModuleGrid } from './pvCalculations';
import { generatePVModuleArray } from './pvVisualization';

// Farben für verschiedene Messungstypen
const COLORS = {
  length: 0x2196f3,   // Blau
  height: 0x9c27b0,   // Lila
  area: 0x4caf50,     // Grün
  solar: 0xffc107,    // Gold
  chimney: 0xff5722,  // Orange
  skylight: 0x00bcd4, // Türkis
  vent: 0xf44336,     // Rot
  hook: 0x9e9e9e,     // Grau
  other: 0x795548,    // Braun
  pvmodule: 0x3f51b5, // Indigo
  ridge: 0x607d8b,    // Blau-Grau
  eave: 0x8bc34a,     // Hellgrün
  verge: 0xff9800,    // Orange
  valley: 0xe91e63,   // Pink
  hip: 0x673ab7      // Lila
};

// Grundfarbe für Punkte und Linien
const LINE_COLOR = 0xff0000;
const POINT_COLOR = 0xffffff;
const HIGHLIGHT_COLOR = 0xffff00;

/**
 * Erstellt eine Kugel für einen Punkt
 * @param point - Der Punkt
 * @param color - Farbe der Kugel
 * @param size - Größe der Kugel
 * @returns Mesh-Objekt, das den Punkt repräsentiert
 */
const createPoint = (point: Point, color: number = POINT_COLOR, size: number = 0.05): THREE.Mesh => {
  const geometry = new THREE.SphereGeometry(size, 32, 32);
  const material = new THREE.MeshBasicMaterial({ color });
  const sphere = new THREE.Mesh(geometry, material);
  sphere.position.set(point.x, point.y, point.z);
  return sphere;
};

/**
 * Erstellt eine Linie zwischen zwei Punkten
 * @param p1 - Erster Punkt
 * @param p2 - Zweiter Punkt
 * @param color - Farbe der Linie
 * @returns Line-Objekt, das die Linie repräsentiert
 */
const createLine = (p1: Point, p2: Point, color: number = LINE_COLOR): THREE.Line => {
  const material = new THREE.LineBasicMaterial({ color });
  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(p1.x, p1.y, p1.z),
    new THREE.Vector3(p2.x, p2.y, p2.z)
  ]);
  return new THREE.Line(geometry, material);
};

/**
 * Erstellt eine Beschriftung für einen Punkt
 * @param text - Der Beschriftungstext
 * @param position - Die Position der Beschriftung
 * @param measurementId - Die ID der Messung
 * @param isPreview - Ob dies eine Vorschau ist
 * @returns Sprite-Objekt, das die Beschriftung repräsentiert
 */
const createLabel = (
  text: string,
  position: Point,
  measurementId: string,
  isPreview: boolean = false
): THREE.Sprite => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  
  // Setze Schriftgröße und -art
  const fontSize = 24;
  context!.font = `${fontSize}px Arial`;
  
  // Miss den Text, um die Canvas-Größe anzupassen
  const textWidth = context!.measureText(text).width;
  canvas.width = textWidth + 10;  // Füge etwas Padding hinzu
  canvas.height = fontSize + 10;
  
  // Zeichne den Text erneut, nachdem die Größe angepasst wurde
  context!.font = `${fontSize}px Arial`;
  context!.fillStyle = 'rgba(255,255,255,1)';
  context!.textAlign = 'center';
  context!.textBaseline = 'middle';
  context!.fillText(text, canvas.width / 2, canvas.height / 2);
  
  // Erstelle eine Textur aus dem Canvas
  const texture = new THREE.Texture(canvas);
  texture.needsUpdate = true;
  
  // Erstelle ein Sprite-Material
  const material = new THREE.SpriteMaterial({ map: texture, color: 0xffffff });
  
  // Erstelle das Sprite und positioniere es
  const sprite = new THREE.Sprite(material);
  sprite.position.set(position.x, position.y, position.z);
  sprite.scale.set(2, 1, 1);
  
  // Füge benutzerdefinierte Daten hinzu, um die Messungs-ID zu speichern
  sprite.userData = {
    measurementId: measurementId,
    type: 'label',
    isPreview: isPreview
  };
  
  return sprite;
};

/**
 * Erstellt eine Beschriftung für ein Segment
 */
const createSegmentLabel = (
  text: string,
  position: Point,
  measurementId: string,
  isPreview: boolean = false
): THREE.Sprite => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  
  // Setze Schriftgröße und -art
  const fontSize = 18;
  context!.font = `${fontSize}px Arial`;
  
  // Miss den Text, um die Canvas-Größe anzupassen
  const textWidth = context!.measureText(text).width;
  canvas.width = textWidth + 10;  // Füge etwas Padding hinzu
  canvas.height = fontSize + 10;
  
  // Zeichne den Text erneut, nachdem die Größe angepasst wurde
  context!.font = `${fontSize}px Arial`;
  context!.fillStyle = 'rgba(255,255,255,1)';
  context!.textAlign = 'center';
  context!.textBaseline = 'middle';
  context!.fillText(text, canvas.width / 2, canvas.height / 2);
  
  // Erstelle eine Textur aus dem Canvas
  const texture = new THREE.Texture(canvas);
  texture.needsUpdate = true;
  
  // Erstelle ein Sprite-Material
  const material = new THREE.SpriteMaterial({ map: texture, color: 0xffffff });
  
  // Erstelle das Sprite und positioniere es
  const sprite = new THREE.Sprite(material);
  sprite.position.set(position.x, position.y, position.z);
  sprite.scale.set(1.5, 0.75, 1);
  
  // Füge benutzerdefinierte Daten hinzu, um die Messungs-ID zu speichern
  sprite.userData = {
    measurementId: measurementId,
    type: 'segmentLabel',
    isPreview: isPreview
  };
  
  return sprite;
};

/**
 * Rendert die PV-Module auf dem Dach mit realistischer Darstellung
 * 
 * @param group - Die THREE.Group für die PV-Module
 * @param measurement - Die Messung, die die PV-Module enthält
 * @param isPreview - Ob dies eine Vorschau ist (standardmäßig false)
 */
const renderPVModules = (
  group: THREE.Group,
  measurement: Measurement,
  isPreview = false
): void => {
  // Lösche vorhandene Module
  while (group.children.length > 0) {
    const child = group.children[0];
    if (child instanceof THREE.Mesh) {
      if (child.geometry) child.geometry.dispose();
      if (child.material instanceof THREE.Material) child.material.dispose();
      else if (Array.isArray(child.material)) {
        child.material.forEach(material => material.dispose());
      }
    }
    group.remove(child);
  }
  
  // Prüfe, ob pvModuleInfo existiert
  if (!measurement.pvModuleInfo) return;
  
  // Berechne die durchschnittliche Y-Koordinate (Höhe) der Messpunkte
  const avgY = measurement.points.reduce((sum, p) => sum + p.y, 0) / measurement.points.length;
  
  // Erstelle die PV-Modulgruppe mit der verbesserten Visualisierung
  // Die Module werden entsprechend der Dachneigung und -ausrichtung angezeigt
  const moduleArray = generatePVModuleArray(measurement.pvModuleInfo, avgY);
  
  // Stelle sicher, dass die Gruppe sichtbar ist, es sei denn, die Messung ist ausgeblendet
  moduleArray.visible = measurement.visible !== false;
  
  // Füge die Module der Gruppe hinzu
  group.add(moduleArray);
  
  // Füge Metadaten zur Unterstützung von Interaktionen hinzu
  group.userData = {
    measurementId: measurement.id,
    type: 'pvModules',
    isPreview
  };
};

/**
 * Rendert die aktuellen Punkte während der Messungserstellung
 * @param group - Die THREE.Group für die Punkte
 * @param linesGroup - Die THREE.Group für die Linien
 * @param labelsGroup - Die THREE.Group für die Beschriftungen
 * @param points - Die Punktedaten
 * @param activeMode - Der aktive Messmodus
 */
export const renderCurrentPoints = (
  group: THREE.Group | null,
  linesGroup: THREE.Group | null,
  labelsGroup: THREE.Group | null,
  points: Point[],
  activeMode: MeasurementMode
): void => {
  if (!group || !linesGroup || !labelsGroup) return;
  
  // Lösche vorherige Punkte und Linien
  clearGroup(group);
  clearGroup(linesGroup);
  clearGroup(labelsGroup);
  
  // Erstelle Punkte und Linien
  points.forEach((point, index) => {
    // Erstelle Punkt
    const sphere = createPoint(point, POINT_COLOR, 0.075);
    sphere.userData = { type: 'currentPoint', index: index };
    group.add(sphere);
    
    // Erstelle Beschriftung
    const label = createLabel(
      `Punkt ${index + 1}`,
      { x: point.x, y: point.y + 0.1, z: point.z },
      'current',
      true
    );
    labelsGroup.add(label);
    
    // Wenn es mehr als einen Punkt gibt, erstelle eine Linie
    if (index > 0) {
      const line = createLine(points[index - 1], point);
      linesGroup.add(line);
    }
  });
};

/**
 * Rendert die Bearbeitungspunkte
 * @param group - Die THREE.Group für die Punkte
 * @param measurements - Die Messungsdaten
 * @param editMeasurementId - Die ID der Messung, die bearbeitet wird
 * @param editingPointIndex - Der Index des Punktes, der bearbeitet wird
 * @param isPreview - Ob dies eine Vorschau ist
 */
export const renderEditPoints = (
  group: THREE.Group | null,
  measurements: Measurement[],
  editMeasurementId: string | null,
  editingPointIndex: number | null,
  isPreview: boolean = false
): void => {
  if (!group) return;
  
  // Lösche vorherige Punkte
  clearGroup(group);
  
  if (editMeasurementId) {
    const measurement = measurements.find(m => m.id === editMeasurementId);
    if (measurement) {
      measurement.points.forEach((point, index) => {
        // Erstelle Punkt
        let color = POINT_COLOR;
        if (index === editingPointIndex) {
          color = HIGHLIGHT_COLOR;
        }
        const sphere = createPoint(point, color, 0.1);
        sphere.userData = {
          type: 'editPoint',
          measurementId: editMeasurementId,
          index: index,
          isPreview: isPreview
        };
        group.add(sphere);
      });
    }
  }
};

/**
 * Aktualisiert die Sichtbarkeit einer Messung
 * @param group - Die THREE.Group für die Messungen
 * @param measurement - Die Messungsdaten
 */
const updateMeasurementVisibility = (
  group: THREE.Group,
  measurement: Measurement
): void => {
  group.children.forEach(child => {
    if (child.userData && child.userData.measurementId === measurement.id) {
      child.visible = measurement.visible !== false;
    }
  });
};

/**
 * Rendert eine einzelne Längenmessung
 * @param group - Die THREE.Group, zu der die Messung hinzugefügt wird
 * @param measurement - Die Messungsdaten
 */
const renderLengthMeasurement = (group: THREE.Group, measurement: Measurement): void => {
  if (measurement.points.length !== 2) return;
  
  // Erstelle Linie
  const line = createLine(measurement.points[0], measurement.points[1], COLORS.length);
  line.userData = {
    measurementId: measurement.id,
    type: 'line'
  };
  group.add(line);
  
  // Erstelle Punkte
  measurement.points.forEach(point => {
    const sphere = createPoint(point, COLORS.length);
    sphere.userData = {
      measurementId: measurement.id,
      type: 'point'
    };
    group.add(sphere);
  });
};

/**
 * Rendert eine einzelne Höhenmessung
 * @param group - Die THREE.Group, zu der die Messung hinzugefügt wird
 * @param measurement - Die Messungsdaten
 */
const renderHeightMeasurement = (group: THREE.Group, measurement: Measurement): void => {
  if (measurement.points.length !== 2) return;
  
  // Erstelle Linie
  const line = createLine(measurement.points[0], measurement.points[1], COLORS.height);
  line.userData = {
    measurementId: measurement.id,
    type: 'line'
  };
  group.add(line);
  
  // Erstelle Punkte
  measurement.points.forEach(point => {
    const sphere = createPoint(point, COLORS.height);
    sphere.userData = {
      measurementId: measurement.id,
      type: 'point'
    };
    group.add(sphere);
  });
};

/**
 * Rendert eine einzelne Flächenmessung
 * @param group - Die THREE.Group, zu der die Messung hinzugefügt wird
 * @param measurement - Die Messungsdaten
 */
const renderAreaMeasurement = (group: THREE.Group, measurement: Measurement): void => {
  if (measurement.points.length < 3) return;
  
  // Erstelle Linien
  for (let i = 0; i < measurement.points.length; i++) {
    const p1 = measurement.points[i];
    const p2 = measurement.points[(i + 1) % measurement.points.length];
    const line = createLine(p1, p2, COLORS.area);
    line.userData = {
      measurementId: measurement.id,
      type: 'line'
    };
    group.add(line);
  }
  
  // Erstelle Punkte
  measurement.points.forEach(point => {
    const sphere = createPoint(point, COLORS.area);
    sphere.userData = {
      measurementId: measurement.id,
      type: 'point'
    };
    group.add(sphere);
  });
};

/**
 * Rendert eine einzelne PV-Modul-Messung (individuell gezeichnet)
 * @param group - Die THREE.Group, zu der die Messung hinzugefügt wird
 * @param measurement - Die Messungsdaten
 */
const renderPVModuleMeasurement = (group: THREE.Group, measurement: Measurement): void => {
  if (measurement.points.length !== 4) return;
  
  // Erstelle Linien
  for (let i = 0; i < measurement.points.length; i++) {
    const p1 = measurement.points[i];
    const p2 = measurement.points[(i + 1) % measurement.points.length];
    const line = createLine(p1, p2, COLORS.pvmodule);
    line.userData = {
      measurementId: measurement.id,
      type: 'line'
    };
    group.add(line);
  }
  
  // Erstelle Punkte
  measurement.points.forEach(point => {
    const sphere = createPoint(point, COLORS.pvmodule);
    sphere.userData = {
      measurementId: measurement.id,
      type: 'point'
    };
    group.add(sphere);
  });
};

/**
 * Rendert eine einzelne Firstmessung
 * @param group - Die THREE.Group, zu der die Messung hinzugefügt wird
 * @param measurement - Die Messungsdaten
 */
const renderRidgeMeasurement = (group: THREE.Group, measurement: Measurement): void => {
  if (measurement.points.length !== 2) return;
  
  // Erstelle Linie
  const line = createLine(measurement.points[0], measurement.points[1], COLORS.ridge);
  line.userData = {
    measurementId: measurement.id,
    type: 'line'
  };
  group.add(line);
  
  // Erstelle Punkte
  measurement.points.forEach(point => {
    const sphere = createPoint(point, COLORS.ridge);
    sphere.userData = {
      measurementId: measurement.id,
      type: 'point'
    };
    group.add(sphere);
  });
};

/**
 * Rendert eine einzelne Traufmessung
 * @param group - Die THREE.Group, zu der die Messung hinzugefügt wird
 * @param measurement - Die Messungsdaten
 */
const renderEaveMeasurement = (group: THREE.Group, measurement: Measurement): void => {
  if (measurement.points.length !== 2) return;
  
  // Erstelle Linie
  const line = createLine(measurement.points[0], measurement.points[1], COLORS.eave);
  line.userData = {
    measurementId: measurement.id,
    type: 'line'
  };
  group.add(line);
  
  // Erstelle Punkte
  measurement.points.forEach(point => {
    const sphere = createPoint(point, COLORS.eave);
    sphere.userData = {
      measurementId: measurement.id,
      type: 'point'
    };
    group.add(sphere);
  });
};

/**
 * Rendert eine einzelne Ortgangmessung
 * @param group - Die THREE.Group, zu der die Messung hinzugefügt wird
 * @param measurement - Die Messungsdaten
 */
const renderVergeMeasurement = (group: THREE.Group, measurement: Measurement): void => {
  if (measurement.points.length !== 2) return;
  
  // Erstelle Linie
  const line = createLine(measurement.points[0], measurement.points[1], COLORS.verge);
  line.userData = {
    measurementId: measurement.id,
    type: 'line'
  };
  group.add(line);
  
  // Erstelle Punkte
  measurement.points.forEach(point => {
    const sphere = createPoint(point, COLORS.verge);
    sphere.userData = {
      measurementId: measurement.id,
      type: 'point'
    };
    group.add(sphere);
  });
};

/**
 * Rendert eine einzelne Kehlmessung
 * @param group - Die THREE.Group, zu der die Messung hinzugefügt wird
 * @param measurement - Die Messungsdaten
 */
const renderValleyMeasurement = (group: THREE.Group, measurement: Measurement): void => {
  if (measurement.points.length !== 2) return;
  
  // Erstelle Linie
  const line = createLine(measurement.points[0], measurement.points[1], COLORS.valley);
  line.userData = {
    measurementId: measurement.id,
    type: 'line'
  };
  group.add(line);
  
  // Erstelle Punkte
  measurement.points.forEach(point => {
    const sphere = createPoint(point, COLORS.valley);
    sphere.userData = {
      measurementId: measurement.id,
      type: 'point'
    };
    group.add(sphere);
  });
};

/**
 * Rendert eine einzelne Gratmessung
 * @param group - Die THREE.Group, zu der die Messung hinzugefügt wird
 * @param measurement - Die Messungsdaten
 */
const renderHipMeasurement = (group: THREE.Group, measurement: Measurement): void => {
  if (measurement.points.length !== 2) return;
  
  // Erstelle Linie
  const line = createLine(measurement.points[0], measurement.points[1], COLORS.hip);
  line.userData = {
    measurementId: measurement.id,
    type: 'line'
  };
  group.add(line);
  
  // Erstelle Punkte
  measurement.points.forEach(point => {
    const sphere = createPoint(point, COLORS.hip);
    sphere.userData = {
      measurementId: measurement.id,
      type: 'point'
    };
    group.add(sphere);
  });
};

/**
 * Rendert die Beschriftungen für eine Messung
 * @param labelsGroup - Die THREE.Group für die Beschriftungen
 * @param segmentLabelsGroup - Die THREE.Group für die Segmentbeschriftungen
 * @param measurement - Die Messungsdaten
 */
const renderLabels = (
  labelsGroup: THREE.Group,
  segmentLabelsGroup: THREE.Group,
  measurement: Measurement
): void => {
  if (!measurement.label) return;
  
  // Berechne den Schwerpunkt der Punkte
  let centroid = { x: 0, y: 0, z: 0 };
  measurement.points.forEach(point => {
    centroid.x += point.x;
    centroid.y += point.y;
    centroid.z += point.z;
  });
  centroid.x /= measurement.points.length;
  centroid.y /= measurement.points.length;
  centroid.z /= measurement.points.length;
  
  // Erstelle Beschriftung
  const label = createLabel(
    `${measurement.label}: ${measurement.value?.toFixed(2)} ${measurement.unit || 'm'}`,
    centroid,
    measurement.id
  );
  labelsGroup.add(label);
  
  // Wenn Segmente vorhanden sind, erstelle Segmentbeschriftungen
  if (measurement.segments) {
    measurement.segments.forEach(segment => {
      if (!segment.label) return;
      
      // Berechne den Mittelpunkt des Segments
      const midPoint = {
        x: (segment.points[0].x + segment.points[1].x) / 2,
        y: (segment.points[0].y + segment.points[1].y) / 2,
        z: (segment.points[0].z + segment.points[1].z) / 2
      };
      
      // Erstelle Segmentbeschriftung
      const segmentLabel = createSegmentLabel(
        segment.label,
        midPoint,
        measurement.id
      );
      segmentLabelsGroup.add(segmentLabel);
    });
  }
};

/**
 * Rendert alle Messungen in der Szene
 * 
 * @param group - Die THREE.Group für die Messungen
 * @param labelsGroup - Die THREE.Group für die Beschriftungen
 * @param segmentLabelsGroup - Die THREE.Group für die Segmentbeschriftungen
 * @param measurements - Die Messungsdaten
 * @param recreateAll - Ob alle Messungen neu erstellt werden sollen
 */
export const renderMeasurements = (
  group: THREE.Group | null,
  labelsGroup: THREE.Group | null,
  segmentLabelsGroup: THREE.Group | null,
  measurements: Measurement[],
  recreateAll = false
): void => {
  if (!group || !labelsGroup || !segmentLabelsGroup) return;
  
  // Wenn recreateAll true ist, entferne alle Messungen und erstelle sie neu
  if (recreateAll) {
    clearGroup(group);
    clearGroup(labelsGroup);
    clearGroup(segmentLabelsGroup);
  }
  
  // Verwalte bestehende Messungs-IDs
  const existingIds = new Set<string>();
  group.children.forEach(child => {
    if (child.userData && child.userData.measurementId) {
      existingIds.add(child.userData.measurementId);
    }
  });
  
  // Rendere jede Messung
  measurements.forEach(measurement => {
    const measurementExists = existingIds.has(measurement.id);
    
    // Überspringe Messungen, die bereits existieren, wenn recreateAll nicht true ist
    if (!recreateAll && measurementExists) {
      // Aktualisiere nur die Sichtbarkeit der bestehenden Messung
      updateMeasurementVisibility(group, measurement);
      return;
    }
    
    // Lösche vorherige Instanzen dieser Messung, wenn sie existieren
    if (measurementExists) {
      // Entferne Kinder mit dieser Messungs-ID
      const childrenToRemove: THREE.Object3D[] = [];
      group.children.forEach(child => {
        if (child.userData && child.userData.measurementId === measurement.id) {
          childrenToRemove.push(child);
        }
      });
      
      childrenToRemove.forEach(child => {
        group.remove(child);
      });
      
      // Entferne auch Beschriftungen mit dieser Messungs-ID
      const labelsToRemove: THREE.Object3D[] = [];
      labelsGroup.children.forEach(label => {
        if (label.userData && label.userData.measurementId === measurement.id) {
          labelsToRemove.push(label);
        }
      });
      
      labelsToRemove.forEach(label => {
        labelsGroup.remove(label);
      });
      
      // Entferne Segmentbeschriftungen mit dieser Messungs-ID
      const segmentLabelsToRemove: THREE.Object3D[] = [];
      segmentLabelsGroup.children.forEach(label => {
        if (label.userData && label.userData.measurementId === measurement.id) {
          segmentLabelsToRemove.push(label);
        }
      });
      
      segmentLabelsToRemove.forEach(label => {
        segmentLabelsGroup.remove(label);
      });
    }
    
    // Erstelle neue Gruppe für diese Messung
    const measurementGroup = new THREE.Group();
    measurementGroup.name = `Measurement_${measurement.id}`;
    measurementGroup.userData = {
      measurementId: measurement.id,
      type: measurement.type
    };
    
    // Setze Sichtbarkeit basierend auf Messung
    measurementGroup.visible = measurement.visible !== false;
    
    // Spezialfall für PV-Module: verwende die neue verbesserte Visualisierung
    if (measurement.type === 'solar' && measurement.pvModuleInfo) {
      renderPVModules(measurementGroup, measurement);
      group.add(measurementGroup);
      return;
    }
    
    // Rendere die Messung basierend auf dem Typ
    switch (measurement.type) {
      case 'length':
        renderLengthMeasurement(measurementGroup, measurement);
        break;
      case 'height':
        renderHeightMeasurement(measurementGroup, measurement);
        break;
      case 'area':
        renderAreaMeasurement(measurementGroup, measurement);
        break;
      case 'pvmodule':
        renderPVModuleMeasurement(measurementGroup, measurement);
        break;
      case 'ridge':
        renderRidgeMeasurement(measurementGroup, measurement);
        break;
      case 'eave':
        renderEaveMeasurement(measurementGroup, measurement);
        break;
      case 'verge':
        renderVergeMeasurement(measurementGroup, measurement);
        break;
      case 'valley':
        renderValleyMeasurement(measurementGroup, measurement);
        break;
      case 'hip':
        renderHipMeasurement(measurementGroup, measurement);
        break;
      default:
        console.warn(`Unbekannter Messungstyp: ${measurement.type}`);
    }
    
    // Rendere Beschriftungen
    renderLabels(labelsGroup, segmentLabelsGroup, measurement);
    
    // Füge die Messungsgruppe zur Hauptgruppe hinzu
    group.add(measurementGroup);
  });
  
  // Entferne Messungen, die nicht mehr existieren
  const currentIds = new Set<string>(measurements.map(m => m.id));
  const groupsToRemove: THREE.Object3D[] = [];
  group.children.forEach(child => {
    if (child.userData && child.userData.measurementId && !currentIds.has(child.userData.measurementId)) {
      groupsToRemove.push(child);
    }
  });
  
  // Entferne nicht mehr benötigte Messungsgruppen
  groupsToRemove.forEach(childGroup => {
    group.remove(childGroup);
  });
  
  // Entferne nicht mehr benötigte Beschriftungen
  const labelsToRemove: THREE.Object3D[] = [];
  labelsGroup.children.forEach(label => {
    if (label.userData && label.userData.measurementId && !currentIds.has(label.userData.measurementId)) {
      labelsToRemove.push(label);
    }
  });
  
  labelsToRemove.forEach(label => {
    labelsGroup.remove(label);
  });
  
  // Entferne nicht mehr benötigte Segmentbeschriftungen
  const segmentLabelsToRemove: THREE.Object3D[] = [];
  segmentLabelsGroup.children.forEach(label => {
    if (label.userData && label.userData.measurementId && !currentIds.has(label.userData.measurementId)) {
      segmentLabelsToRemove.push(label);
    }
  });
  
  segmentLabelsToRemove.forEach(label => {
    segmentLabelsGroup.remove(label);
  });
};

/**
 * Entfernt alle Kinder aus einer Gruppe
 * @param group - Die THREE.Group, aus der die Kinder entfernt werden sollen
 */
export const clearGroup = (group: THREE.Group): void => {
  while (group.children.length > 0) {
    const child = group.children[0];
    group.remove(child);
    
    // Dispose Geometrie und Material, falls vorhanden
    if (child instanceof THREE.Mesh) {
      if (child.geometry) child.geometry.dispose();
      if (child.material instanceof THREE.Material) child.material.dispose();
      else if (Array.isArray(child.material)) {
        child.material.forEach(material => material.dispose());
      }
    }
  }
};

/**
 * Löscht alle Visualisierungen
 * @param pointsGroup - Die THREE.Group für die Punkte
 * @param linesGroup - Die THREE.Group für die Linien
 * @param measurementsGroup - Die THREE.Group für die Messungen
 * @param editPointsGroup - Die THREE.Group für die Bearbeitungspunkte
 * @param labelsGroup - Die THREE.Group für die Beschriftungen
 * @param segmentLabelsGroup - Die THREE.Group für die Segmentbeschriftungen
 */
export const clearAllVisuals = (
  pointsGroup: THREE.Group,
  linesGroup: THREE.Group,
  measurementsGroup: THREE.Group,
  editPointsGroup: THREE.Group,
  labelsGroup: THREE.Group,
  segmentLabelsGroup: THREE.Group
): void => {
  clearGroup(pointsGroup);
  clearGroup(linesGroup);
  clearGroup(measurementsGroup);
  clearGroup(editPointsGroup);
  clearGroup(labelsGroup);
  clearGroup(segmentLabelsGroup);
};
