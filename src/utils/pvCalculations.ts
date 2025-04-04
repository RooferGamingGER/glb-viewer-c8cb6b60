
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
