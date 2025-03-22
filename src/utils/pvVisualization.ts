
import * as THREE from 'three';
import { Point, PVModuleInfo } from '@/types/measurements';
import { calculateYieldFactorFromOrientation } from './pvCalculations';

// Farbpalette für Effizienzkategorien (von hoher zu niedriger Effizienz)
export const EFFICIENCY_COLORS = {
  high: new THREE.Color('#1EAEDB'),   // Kräftiges Blau für hohe Effizienz
  medium: new THREE.Color('#33C3F0'), // Helles Blau für mittlere Effizienz
  low: new THREE.Color('#ea384c')     // Rot für niedrige Effizienz
};

/**
 * Erstellt eine 3D-Darstellung eines PV-Moduls mit korrekter Ausrichtung
 * basierend auf der Dachneigung und -ausrichtung
 * 
 * @param moduleWidth - Breite des Moduls in Metern
 * @param moduleHeight - Höhe des Moduls in Metern
 * @param position - Position des Moduls (X, Y, Z)
 * @param azimuth - Azimutwinkel des Dachs in Grad (0=Nord, 90=Ost, 180=Süd, 270=West)
 * @param inclination - Dachneigung in Grad
 * @param yieldFactor - Ertragsfaktor (optional, für Farbcodierung)
 * @returns Mesh-Objekt, das das PV-Modul repräsentiert
 */
export const createPVModuleMesh = (
  moduleWidth: number,
  moduleHeight: number,
  position: { x: number, y: number, z: number },
  azimuth: number = 180,
  inclination: number = 30,
  yieldFactor?: number
): THREE.Mesh => {
  // Erstelle die Geometrie für das Modul (dünne Box)
  const moduleThickness = 0.04; // 4cm Dicke
  const geometry = new THREE.BoxGeometry(moduleWidth, moduleThickness, moduleHeight);
  
  // Bestimme die Farbe basierend auf dem Ertragsfaktor
  let color = EFFICIENCY_COLORS.medium; // Standardfarbe
  
  if (yieldFactor !== undefined) {
    if (yieldFactor >= 950) {
      color = EFFICIENCY_COLORS.high;
    } else if (yieldFactor >= 850) {
      color = EFFICIENCY_COLORS.medium;
    } else {
      color = EFFICIENCY_COLORS.low;
    }
  }
  
  // Erstelle das Material mit der entsprechenden Farbe und leichter Transparenz
  const material = new THREE.MeshPhongMaterial({
    color: color,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
    shininess: 100
  });
  
  // Erstelle das Mesh
  const moduleMesh = new THREE.Mesh(geometry, material);
  
  // Positioniere das Modul
  moduleMesh.position.set(position.x, position.y, position.z);
  
  // Wende Rotationen an, um das Modul entsprechend der Dachneigung und -ausrichtung auszurichten
  
  // 1. Rotiere um die X-Achse für die Dachneigung
  moduleMesh.rotation.x = THREE.MathUtils.degToRad(inclination);
  
  // 2. Rotiere um die Y-Achse für die Dachausrichtung (Azimut)
  // Wir müssen den Azimutwinkel in eine THREE.js-Rotation umrechnen
  // Da in unserem System Süd = 180° ist, und wir dies als "gerade" betrachten
  const azimuthOffset = 180;
  const azimuthRotation = THREE.MathUtils.degToRad(azimuth - azimuthOffset);
  moduleMesh.rotation.y = azimuthRotation;
  
  return moduleMesh;
};

/**
 * Generiert ein komplettes PV-Modul-Array als 3D-Objekt mit korrekter Ausrichtung und Farbcodierung
 * 
 * @param pvInfo - PV-Modul-Informationen mit Layout-Details
 * @param baseY - Y-Koordinate (Höhe) für die Platzierung der Module
 * @returns Ein THREE.Group-Objekt, das alle Module enthält
 */
export const generatePVModuleArray = (
  pvInfo: PVModuleInfo,
  baseY: number
): THREE.Group => {
  const moduleGroup = new THREE.Group();
  moduleGroup.name = "PVModuleArray";
  
  // Bestimme Modulmaße basierend auf der Ausrichtung
  const moduleWidth = pvInfo.orientation === 'landscape' ? pvInfo.moduleWidth : pvInfo.moduleHeight;
  const moduleHeight = pvInfo.orientation === 'landscape' ? pvInfo.moduleHeight : pvInfo.moduleWidth;
  
  // Bestimme den Startpunkt (füge Randabstand zu den Minimalkoordinaten hinzu)
  const startX = pvInfo.startX || (pvInfo.minX! + pvInfo.edgeDistance!);
  const startZ = pvInfo.startZ || (pvInfo.minZ! + pvInfo.edgeDistance!);
  
  // Erfasse Dachneigung und -ausrichtung
  const azimuth = pvInfo.roofAzimuth ?? 180; // Standard: Süden
  const inclination = pvInfo.roofInclination ?? 30; // Standard: 30 Grad Neigung
  const yieldFactor = pvInfo.yieldFactor;
  
  // Generiere Modulplatzierungsraster
  for (let row = 0; row < pvInfo.rows!; row++) {
    for (let col = 0; col < pvInfo.columns!; col++) {
      // Berechne Position dieses Moduls
      const x = startX + col * (moduleWidth + pvInfo.moduleSpacing!);
      const z = startZ + row * (moduleHeight + pvInfo.moduleSpacing!);
      
      // Berechne individuelle Ertragseffizienz für jedes Modul
      // In Zukunft könnten hier Verschattungsanalysen einbezogen werden
      const moduleYieldFactor = yieldFactor;
      
      // Erstelle das Modul-Mesh mit der richtigen Ausrichtung und Farbcodierung
      const moduleMesh = createPVModuleMesh(
        moduleWidth,
        moduleHeight,
        { x, y: baseY + 0.02, z },
        azimuth,
        inclination,
        moduleYieldFactor
      );
      
      // Füge dem Modul Metadaten hinzu
      moduleMesh.userData = {
        type: 'pvModule',
        row,
        col,
        efficiency: moduleYieldFactor,
        power: pvInfo.pvModuleSpec?.power || 425,
      };
      
      // Füge das Modul zur Gruppe hinzu
      moduleGroup.add(moduleMesh);
    }
  }
  
  // Erstelle einen Grenzrahmen als visueller Hinweis für die belegte Fläche
  const boundaryBox = createBoundaryBox(pvInfo, baseY, azimuth, inclination);
  moduleGroup.add(boundaryBox);
  
  return moduleGroup;
};

/**
 * Erstellt einen visuellen Rahmen um die PV-Modulfläche
 */
const createBoundaryBox = (
  pvInfo: PVModuleInfo,
  baseY: number,
  azimuth: number,
  inclination: number
): THREE.LineSegments => {
  // Erstelle ein Rechteck, das die Fläche umrahmt
  const boundaryWidth = pvInfo.availableWidth + (pvInfo.edgeDistance! * 2);
  const boundaryHeight = pvInfo.availableLength + (pvInfo.edgeDistance! * 2);
  
  // Erstelle die Kontur
  const boundaryGeometry = new THREE.BufferGeometry();
  const points = [
    new THREE.Vector3(pvInfo.minX!, baseY + 0.01, pvInfo.minZ!),
    new THREE.Vector3(pvInfo.maxX!, baseY + 0.01, pvInfo.minZ!),
    new THREE.Vector3(pvInfo.maxX!, baseY + 0.01, pvInfo.maxZ!),
    new THREE.Vector3(pvInfo.minX!, baseY + 0.01, pvInfo.maxZ!),
    new THREE.Vector3(pvInfo.minX!, baseY + 0.01, pvInfo.minZ!)
  ];
  
  const indices: number[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    indices.push(i, i + 1);
  }
  
  const positionArray = new Float32Array(points.length * 3);
  points.forEach((point, i) => {
    positionArray[i * 3] = point.x;
    positionArray[i * 3 + 1] = point.y;
    positionArray[i * 3 + 2] = point.z;
  });
  
  boundaryGeometry.setAttribute('position', new THREE.BufferAttribute(positionArray, 3));
  boundaryGeometry.setIndex(indices);
  
  // Erstelle ein Material für die Kontur
  const boundaryMaterial = new THREE.LineBasicMaterial({ color: 0xffff00, linewidth: 2 });
  
  // Erstelle das LineSegments-Objekt
  const boundaryLines = new THREE.LineSegments(boundaryGeometry, boundaryMaterial);
  
  return boundaryLines;
};

/**
 * Erstellt eine Legende für die Effizienzfarbcodierung
 * @returns HTML-Element mit der Legende
 */
export const createEfficiencyLegend = (): HTMLDivElement => {
  const legendDiv = document.createElement('div');
  legendDiv.className = 'pv-efficiency-legend';
  legendDiv.style.position = 'absolute';
  legendDiv.style.bottom = '20px';
  legendDiv.style.right = '20px';
  legendDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  legendDiv.style.color = 'white';
  legendDiv.style.padding = '10px';
  legendDiv.style.borderRadius = '5px';
  legendDiv.style.fontSize = '14px';
  
  legendDiv.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 5px;">PV-Modul Effizienz</div>
    <div style="display: flex; align-items: center; margin-bottom: 5px;">
      <div style="width: 15px; height: 15px; background-color: #1EAEDB; margin-right: 5px;"></div>
      <div>Hohe Effizienz (>950 kWh/kWp)</div>
    </div>
    <div style="display: flex; align-items: center; margin-bottom: 5px;">
      <div style="width: 15px; height: 15px; background-color: #33C3F0; margin-right: 5px;"></div>
      <div>Mittlere Effizienz (850-950 kWh/kWp)</div>
    </div>
    <div style="display: flex; align-items: center;">
      <div style="width: 15px; height: 15px; background-color: #ea384c; margin-right: 5px;"></div>
      <div>Niedrige Effizienz (<850 kWh/kWp)</div>
    </div>
  `;
  
  return legendDiv;
};
