
/**
 * LOD (Level of Detail) Utility-Funktionen
 * Optimiert die Rendering-Performance basierend auf dem Abstand zur Kamera und der Geräteperformance
 */

import * as THREE from "three";

// Vermindert die Pixeldichte basierend auf der verfügbaren RAM
export const getOptimalPixelRatio = (): number => {
  const performanceMode = localStorage.getItem("performanceMode") || "auto";
  
  if (performanceMode === "low") {
    return Math.min(1.0, window.devicePixelRatio);
  } else if (performanceMode === "medium") {
    return Math.min(1.5, window.devicePixelRatio);
  } else if (performanceMode === "high") {
    return window.devicePixelRatio;
  }

  // Im Auto-Modus:
  // Prüfen auf Low-Memory-Geräte (< 4GB RAM in mobilen Geräten ist wahrscheinlich ein Problem)
  const lowMemoryDevice = 
    navigator.userAgent.includes("Mobile") && 
    navigator.deviceMemory !== undefined && 
    (navigator.deviceMemory as number) < 4;

  // Für Low-Memory-Geräte reduzieren wir die Pixeldichte stark
  if (lowMemoryDevice) {
    return Math.min(1.0, window.devicePixelRatio);
  }
  
  // Standard: max 2x Pixeldichte für die meisten Geräte
  return Math.min(2.0, window.devicePixelRatio);
};

// Funktion zur Anpassung der Geometriedetails basierend auf dem Abstand zur Kamera
export const getDetailLevel = (distance: number): number => {
  // Je weiter entfernt, desto weniger Details
  if (distance > 30) return 0.25; // 25% Details
  if (distance > 20) return 0.5;  // 50% Details
  if (distance > 10) return 0.75; // 75% Details
  return 1.0; // 100% Details für nahe Objekte
};

// Reduziert die Komplexität einer Geometrie basierend auf dem Detaillevel
export const simplifyGeometry = (
  geometry: THREE.BufferGeometry, 
  detailLevel: number
): THREE.BufferGeometry => {
  // Wenn bereits eine vereinfachte Version mit diesem Detaillevel existiert
  if (geometry.userData.simplifiedLevels && 
      geometry.userData.simplifiedLevels[detailLevel]) {
    return geometry.userData.simplifiedLevels[detailLevel];
  }
  
  // Erstelle eine Kopie der Originalgeometrie
  const simplified = geometry.clone();
  
  // Wenn wir maximale Details benötigen, einfach die Originalgeometrie zurückgeben
  if (detailLevel >= 0.99) {
    return simplified;
  }
  
  // Vereinfachungslogik: Reduziere die Anzahl der Indizes
  if (simplified.index) {
    const originalIndices = simplified.index.array;
    const count = Math.floor(originalIndices.length * detailLevel);
    
    // Erstelle ein neues, kleineres IndexBuffer
    const newIndices = new Uint32Array(count);
    for (let i = 0; i < count; i++) {
      newIndices[i] = originalIndices[i];
    }
    
    // Setze den neuen Index
    simplified.setIndex(new THREE.BufferAttribute(newIndices, 1));
  }
  
  // Speichere die vereinfachte Version in der Originalgeometrie
  if (!geometry.userData.simplifiedLevels) {
    geometry.userData.simplifiedLevels = {};
  }
  geometry.userData.simplifiedLevels[detailLevel] = simplified;
  
  return simplified;
};

// Optimiert Texturen basierend auf der Distanz und Geräteperformance
export const getOptimalTextureSize = (
  originalSize: number, 
  distance: number
): number => {
  const performanceMode = localStorage.getItem("performanceMode") || "auto";
  
  // Basis-Skalierungsfaktor
  let scaleFactor = 1.0;
  
  // Anpassung basierend auf Leistungsmodus
  if (performanceMode === "low") {
    scaleFactor = 0.5;
  } else if (performanceMode === "medium") {
    scaleFactor = 0.75;
  }
  
  // Distanzbasierte Skalierung
  if (distance > 30) scaleFactor *= 0.25;
  else if (distance > 20) scaleFactor *= 0.5;
  else if (distance > 10) scaleFactor *= 0.75;
  
  // Berechne die neue Größe, minimale Textur 64px
  return Math.max(64, Math.floor(originalSize * scaleFactor));
};
