import * as THREE from 'three';
import { Point, PVModuleInfo, PVModuleGridLine, PVModulePoint, PVModuleRenderData } from '@/types/measurements';

// Function to calculate the corners of a PV module
export const calculateModuleCorners = (
  moduleWidth: number,
  moduleHeight: number,
  moduleSpacing: number,
  edgeDistance: number,
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number,
  orientation: 'portrait' | 'landscape',
  startX: number,
  startZ: number,
  rowIndex: number,
  colIndex: number
): Point[] => {
  const x = startX + colIndex * (moduleWidth + moduleSpacing);
  const z = startZ + rowIndex * (moduleHeight + moduleSpacing);

  let corners: Point[];

  if (orientation === 'portrait') {
    corners = [
      { x: x, y: 0, z: z },
      { x: x + moduleWidth, y: 0, z: z },
      { x: x + moduleWidth, y: 0, z: z + moduleHeight },
      { x: x, y: 0, z: z + moduleHeight }
    ];
  } else {
    corners = [
      { x: x, y: 0, z: z },
      { x: x + moduleHeight, y: 0, z: z },
      { x: x + moduleHeight, y: 0, z: z + moduleWidth },
      { x: x, y: 0, z: z + moduleWidth }
    ];
  }

  return corners;
};

// Function to generate grid lines for PV modules
export const generatePVModuleGrid = (pvModuleInfo: PVModuleInfo): PVModuleGridLine[] => {
  const {
    moduleWidth,
    moduleHeight,
    moduleSpacing,
    edgeDistance,
    minX,
    maxX,
    minZ,
    maxZ,
    orientation,
    columns,
    rows,
    startX,
    startZ
  } = pvModuleInfo;

  const gridLines: PVModuleGridLine[] = [];

  if (!pvModuleInfo.columns || !pvModuleInfo.rows) {
    return [];
  }

  // Vertical grid lines
  for (let i = 0; i <= columns; i++) {
    const x = startX + i * (moduleWidth + moduleSpacing);
    const fromZ = startZ;
    const toZ = startZ + rows * (moduleHeight + moduleSpacing);

    gridLines.push({
      from: { x: x, y: 0, z: fromZ },
      to: { x: x, y: 0, z: toZ },
      type: 'module'
    });
  }

  // Horizontal grid lines
  for (let j = 0; j <= rows; j++) {
    const z = startZ + j * (moduleHeight + moduleSpacing);
    const fromX = startX;
    const toX = startX + columns * (moduleWidth + moduleSpacing);

    gridLines.push({
      from: { x: fromX, y: 0, z: z },
      to: { x: toX, y: 0, z: z },
      type: 'module'
    });
  }

  return gridLines;
};

// Function to generate PV module data for rendering
export const generatePVModuleRenderData = (pvModuleInfo: PVModuleInfo): PVModuleRenderData => {
  const {
    moduleWidth,
    moduleHeight,
    moduleSpacing,
    edgeDistance,
    minX,
    maxX,
    minZ,
    maxZ,
    orientation,
    columns,
    rows,
    startX,
    startZ
  } = pvModuleInfo;

  const modules = [];
  const gridLines = generatePVModuleGrid(pvModuleInfo);
  const boundaryPoints: Point[] = [
    { x: minX, y: 0, z: minZ },
    { x: maxX, y: 0, z: minZ },
    { x: maxX, y: 0, z: maxZ },
    { x: minX, y: 0, z: maxZ }
  ];
  const availableAreaPoints: Point[] = [
    { x: startX - moduleSpacing, y: 0, z: startZ - moduleSpacing },
    { x: startX + columns * (moduleWidth + moduleSpacing), y: 0, z: startZ - moduleSpacing },
    { x: startX + columns * (moduleWidth + moduleSpacing), y: 0, z: startZ + rows * (moduleHeight + moduleSpacing) },
    { x: startX - moduleSpacing, y: 0, z: startZ + rows * (moduleHeight + moduleSpacing) }
  ];

  if (!pvModuleInfo.columns || !pvModuleInfo.rows) {
    return { modules: [], gridLines: [], boundaryPoints: [], availableAreaPoints: [] };
  }

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const moduleCorners = calculateModuleCorners(
        moduleWidth,
        moduleHeight,
        moduleSpacing,
        edgeDistance,
        minX,
        maxX,
        minZ,
        maxZ,
        orientation,
        startX,
        startZ,
        row,
        col
      );

      modules.push({
        corners: [moduleCorners],
        index: row * columns + col,
        row: row,
        column: col,
        power: pvModuleInfo.pvModuleSpec?.power || 300
      });
    }
  }

  return { modules, gridLines, boundaryPoints, availableAreaPoints };
};

// Function to generate PV module points
export const generatePVModulePoints = (pvModuleInfo: PVModuleInfo): PVModulePoint[] => {
  const {
    moduleWidth,
    moduleHeight,
    moduleSpacing,
    edgeDistance,
    minX,
    maxX,
    minZ,
    maxZ,
    orientation,
    columns,
    rows,
    startX,
    startZ
  } = pvModuleInfo;

  const points: PVModulePoint[] = [];

  if (!pvModuleInfo.columns || !pvModuleInfo.rows) {
    return [];
  }

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const x = startX + col * (moduleWidth + moduleSpacing);
      const z = startZ + row * (moduleHeight + moduleSpacing);

      points.push({
        position: { x: x, y: 0, z: z },
        index: row * columns + col,
        row: row,
        column: col
      });
    }
  }

  return points;
};
