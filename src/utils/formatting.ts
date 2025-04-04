
/**
 * Formats a number as a fixed decimal with the specified number of digits
 * @param value The number to format
 * @param digits The number of decimal places
 * @param unit Optional unit to append to the formatted number
 * @returns The formatted string
 */
export const formatDecimal = (value: number, digits: number = 2, unit?: string): string => {
  const formatted = value.toFixed(digits);
  return unit ? `${formatted}${unit}` : formatted;
};

/**
 * Formats a number as a percentage
 * @param value The number to format (0-100)
 * @param digits The number of decimal places
 * @returns The formatted percentage string
 */
export const formatPercentage = (value: number, digits: number = 1): string => {
  return `${value.toFixed(digits)}%`;
};

/**
 * Formats a number as a measurement in meters
 * @param value The number to format
 * @param digits The number of decimal places
 * @returns The formatted measurement string
 */
export const formatMeter = (value: number, digits: number = 2): string => {
  return `${value.toFixed(digits)}m`;
};

/**
 * Formats a power value in watts to an appropriate unit (W, kW)
 * @param watts The power in watts
 * @returns The formatted power string
 */
export const formatPower = (watts: number): string => {
  if (watts >= 1000) {
    return `${(watts / 1000).toFixed(2)} kW`;
  }
  return `${watts.toFixed(0)} W`;
};

/**
 * Formats an energy value in kWh
 * @param kWh The energy in kilowatt-hours
 * @returns The formatted energy string
 */
export const formatEnergy = (kWh: number): string => {
  return `${kWh.toFixed(0)} kWh`;
};
