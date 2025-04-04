
/**
 * Constants for PV module calculations
 */
export const DEFAULT_EDGE_DISTANCE = 0.5; // Default edge distance in meters
export const DEFAULT_MODULE_SPACING = 0.02; // Default spacing between modules in meters

/**
 * PV module templates with standard specifications
 */
export const PV_MODULE_TEMPLATES = [
  {
    name: "Standard 425Wp",
    power: 425,
    width: 1.134, // Width in meters
    height: 1.722, // Height in meters
    weight: 21.9, // Weight in kg
    efficiency: 21.3, // Efficiency in percent
    warranty: 25, // Warranty in years
    type: "Monokristallin",
    manufacturer: "Standard"
  },
  {
    name: "Premium 450Wp",
    power: 450,
    width: 1.134,
    height: 1.722,
    weight: 22.5,
    efficiency: 22.6,
    warranty: 30,
    type: "Monokristallin",
    manufacturer: "Premium"
  },
  {
    name: "Eco 380Wp",
    power: 380,
    width: 1.096,
    height: 1.677,
    weight: 19.8,
    efficiency: 20.1,
    warranty: 20,
    type: "Polykristallin",
    manufacturer: "Eco"
  }
];

/**
 * Calculates the total power output in kWp for a given number of PV modules
 * @param moduleCount - Number of PV modules
 * @param modulePower - Power per module in Wp (default 390Wp)
 * @returns Total power in kWp
 */
export const calculatePVPower = (moduleCount: number, modulePower: number = 390): number => {
  // Convert module power from Wp to kWp (divide by 1000)
  const powerPerModuleKW = modulePower / 1000;
  
  // Calculate total power
  return moduleCount * powerPerModuleKW;
};

/**
 * Calculates the estimated annual energy yield for a PV system
 * @param powerKWp - System power in kWp
 * @param yieldFactor - Location-specific yield factor in kWh/kWp per year (default 950 for Germany)
 * @returns Annual energy yield in kWh
 */
export const calculateAnnualYield = (powerKWp: number, yieldFactor: number = 950): number => {
  return powerKWp * yieldFactor;
};

/**
 * Calculates the estimated CO2 savings per year
 * @param annualYieldKWh - Annual energy yield in kWh
 * @param co2Factor - CO2 emission factor in kg/kWh (default 0.42 for Germany)
 * @returns Annual CO2 savings in kg
 */
export const calculateCO2Savings = (annualYieldKWh: number, co2Factor: number = 0.42): number => {
  return annualYieldKWh * co2Factor;
};

/**
 * Determines the optimal orientation for PV modules based on roof direction
 * @param roofDirection - Direction the roof faces (cardinal direction)
 * @returns 'portrait' or 'landscape' based on optimization
 */
export const getOptimalModuleOrientation = (roofDirection: string): 'portrait' | 'landscape' => {
  // For east, west, or flat roofs, landscape is often preferred
  if (['E', 'W', 'NE', 'NW', 'flat'].includes(roofDirection)) {
    return 'landscape';
  }
  
  // For south-facing roofs, portrait is often preferred
  return 'portrait';
};

/**
 * Calculates the number of rows and columns of modules that can fit on a roof surface
 * @param availableWidth - Width available for modules (m)
 * @param availableLength - Length available for modules (m)
 * @param moduleWidth - Width of a single module (m)
 * @param moduleHeight - Height of a single module (m)
 * @param orientation - Module orientation ('portrait' or 'landscape')
 * @param spacing - Spacing between modules (m)
 * @returns Object containing rows, columns, and total module count
 */
export const calculateModuleLayout = (
  availableWidth: number,
  availableLength: number,
  moduleWidth: number = 1.0,
  moduleHeight: number = 1.7,
  orientation: 'portrait' | 'landscape' = 'portrait',
  spacing: number = 0.02
): { rows: number; columns: number; totalCount: number } => {
  // Adjust dimensions based on orientation
  const [effectiveWidth, effectiveHeight] = orientation === 'portrait' 
    ? [moduleWidth, moduleHeight] 
    : [moduleHeight, moduleWidth];
  
  // Calculate how many modules can fit in each direction
  const columns = Math.floor(availableWidth / (effectiveWidth + spacing));
  const rows = Math.floor(availableLength / (effectiveHeight + spacing));
  
  // Calculate total modules
  const totalCount = rows * columns;
  
  return {
    rows,
    columns,
    totalCount
  };
};

/**
 * Calculates the placement of PV modules on a roof surface
 * @param points - Array of points defining the roof surface or roof shape
 * @param moduleWidth - Width of a single module (m)
 * @param moduleHeight - Height of a single module (m)
 * @param edgeDistance - Distance from edge of roof (m)
 * @param moduleSpacing - Spacing between modules (m)
 * @param manualDimensions - Optional manual dimensions for the area
 * @param pvModuleSpec - Optional module specification
 * @param useOptimalRectangle - Whether to use optimal rectangle for irregular shapes
 * @returns PV module placement information
 */
export const calculatePVModulePlacement = (
  points: any[],
  moduleWidth: number = 1.0,
  moduleHeight: number = 1.7,
  edgeDistance: number = DEFAULT_EDGE_DISTANCE,
  moduleSpacing: number = DEFAULT_MODULE_SPACING,
  manualDimensions?: { width: number, length: number },
  pvModuleSpec?: any,
  useOptimalRectangle: boolean = true
): any => {
  // Implementation for calculating module placement
  // This is a placeholder implementation
  const boundingWidth = manualDimensions?.width || 10;
  const boundingLength = manualDimensions?.length || 15;
  
  // Calculate available area after accounting for edge distance
  const availableWidth = boundingWidth - (2 * edgeDistance);
  const availableLength = boundingLength - (2 * edgeDistance);
  
  // Try both orientations and pick the one that fits more modules
  const portraitLayout = calculateModuleLayout(
    availableWidth,
    availableLength,
    moduleWidth,
    moduleHeight,
    'portrait',
    moduleSpacing
  );
  
  const landscapeLayout = calculateModuleLayout(
    availableWidth,
    availableLength,
    moduleWidth,
    moduleHeight,
    'landscape',
    moduleSpacing
  );
  
  // Choose the orientation that fits more modules
  const usePortrait = portraitLayout.totalCount >= landscapeLayout.totalCount;
  const layout = usePortrait ? portraitLayout : landscapeLayout;
  const orientation = usePortrait ? 'portrait' : 'landscape';
  
  // Calculate coverage percentage
  const moduleArea = moduleWidth * moduleHeight;
  const totalModuleArea = layout.totalCount * moduleArea;
  const roofArea = boundingWidth * boundingLength;
  const coveragePercent = (totalModuleArea / roofArea) * 100;
  
  return {
    moduleWidth,
    moduleHeight,
    moduleCount: layout.totalCount,
    rows: layout.rows,
    columns: layout.columns,
    orientation,
    edgeDistance,
    moduleSpacing,
    boundingWidth,
    boundingLength,
    availableWidth,
    availableLength,
    coveragePercent,
    manualDimensions: !!manualDimensions,
    userDefinedWidth: manualDimensions?.width,
    userDefinedLength: manualDimensions?.length,
    pvModuleSpec: pvModuleSpec || PV_MODULE_TEMPLATES[0]
  };
};

/**
 * Formats PV module information for display
 * @param pvModuleInfo - PV module information
 * @returns Formatted string
 */
export const formatPVModuleInfo = (pvModuleInfo: any): string => {
  if (!pvModuleInfo) return "Keine PV-Informationen verfügbar";
  
  return `${pvModuleInfo.moduleCount} Module (${pvModuleInfo.orientation === 'portrait' ? 'Hochformat' : 'Querformat'}, ${pvModuleInfo.coveragePercent.toFixed(1)}% Abdeckung)`;
};

/**
 * Calculates roof orientation based on measurements
 * @param measurement - Measurement object containing points
 * @returns Roof orientation
 */
export const calculateRoofOrientation = (measurement: any): string => {
  // Placeholder implementation
  return "Süd";
};

/**
 * Calculates annual yield considering roof orientation
 * @param powerKWp - System power in kWp
 * @param orientation - Module orientation ('portrait' or 'landscape') or the PVModuleInfo object
 * @returns Annual energy yield in kWh
 */
export const calculateAnnualYieldWithOrientation = (powerKWp: number, orientation: string | any): number => {
  // Different yield factors based on orientation
  const yieldFactors: Record<string, number> = {
    'hochformat': 950,
    'querformat': 920,
    'portrait': 950,
    'landscape': 920
  };
  
  // If orientation is an object (PVModuleInfo), use its yieldfactor if available
  if (typeof orientation === 'object' && orientation !== null) {
    if (orientation.yieldFactor) {
      return powerKWp * orientation.yieldFactor;
    } else {
      // Default to orientation value
      const orientationString = orientation.orientation || 'portrait';
      const yieldFactor = yieldFactors[orientationString.toLowerCase()] || 950;
      return powerKWp * yieldFactor;
    }
  } else {
    // Handle the case where orientation is a string
    const yieldFactor = yieldFactors[orientation.toLowerCase()] || 950;
    return powerKWp * yieldFactor;
  }
};

/**
 * Updates PV module information with orientation data
 * @param pvModuleInfo - PV module information
 * @param points - Array of points or measurement orientation data
 * @returns Updated PV module information
 */
export const updatePVModuleInfoWithOrientation = (pvModuleInfo: any, points: any): any => {
  // Placeholder implementation that now accepts points array
  return pvModuleInfo;
};

/**
 * Extracts roof edge measurements from measurements array
 * @param measurements - Array of measurements
 * @returns Roof edge information
 */
export const extractRoofEdgeMeasurements = (measurements: any[]): any => {
  // Placeholder implementation
  return {
    roofEdges: [],
    totalLength: 0
  };
};

/**
 * Calculates PV materials needed based on module information
 * @param pvModuleInfo - PV module information
 * @param inverterDistance - Distance to inverter (m)
 * @returns PV materials list
 */
export const calculatePVMaterials = (pvModuleInfo: any, inverterDistance: number = 10): any => {
  // Placeholder implementation
  return {
    modules: {
      count: pvModuleInfo.moduleCount,
      type: pvModuleInfo.pvModuleSpec?.name || "Standard"
    },
    mountingSystem: {
      rails: Math.ceil(pvModuleInfo.columns * 2),
      clamps: pvModuleInfo.moduleCount * 4,
      hooks: Math.ceil(pvModuleInfo.columns * 1.5)
    },
    electrical: {
      dcCableLength: Math.ceil(pvModuleInfo.moduleCount * 2 + inverterDistance * 2),
      connectors: Math.ceil(pvModuleInfo.moduleCount / 2),
      inverter: pvModuleInfo.moduleCount > 10 ? "15kW" : "10kW"
    }
  };
};

/**
 * Formats PV materials for display
 * @param materials - PV materials
 * @returns Formatted materials
 */
export const formatPVMaterials = (materials: any): any => {
  // Placeholder implementation
  return materials;
};

/**
 * Generates a grid of PV modules for visualization
 * @param pvModuleInfo - PV module information
 * @returns Grid for visualization
 */
export const generatePVModuleGrid = (pvModuleInfo: any): any[] => {
  // Placeholder implementation to generate module positions for visualization
  const modules = [];
  const { rows, columns, moduleWidth, moduleHeight, orientation, edgeDistance, moduleSpacing } = pvModuleInfo;
  
  const actualWidth = orientation === 'portrait' ? moduleWidth : moduleHeight;
  const actualHeight = orientation === 'portrait' ? moduleHeight : moduleWidth;
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      modules.push({
        x: edgeDistance + col * (actualWidth + moduleSpacing),
        y: edgeDistance + row * (actualHeight + moduleSpacing),
        width: actualWidth,
        height: actualHeight
      });
    }
  }
  
  return modules;
};
