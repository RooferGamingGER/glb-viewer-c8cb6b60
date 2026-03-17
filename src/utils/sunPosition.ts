/**
 * Solar Position Algorithm (SPA) — simplified implementation
 * Based on NREL SPA (Reda & Andreas, 2004)
 * Calculates sun azimuth, elevation, sunrise/sunset for any location and date.
 * No external APIs — runs entirely client-side.
 */

import * as THREE from 'three';

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

// Astronomically important dates
export const SOLSTICE_SUMMER = { month: 6, day: 21, label: 'Sommersonnenwende' };
export const SOLSTICE_WINTER = { month: 12, day: 21, label: 'Wintersonnenwende' };
export const EQUINOX_SPRING = { month: 3, day: 21, label: 'Frühlingsäquinoktium' };
export const EQUINOX_AUTUMN = { month: 9, day: 23, label: 'Herbstäquinoktium' };

export const IMPORTANT_DATES = [EQUINOX_SPRING, SOLSTICE_SUMMER, EQUINOX_AUTUMN, SOLSTICE_WINTER];

export interface SolarPosition {
  azimuth: number;    // degrees from North, clockwise (0=N, 90=E, 180=S, 270=W)
  elevation: number;  // degrees above horizon (-90 to 90)
  sunrise: Date;      // sunrise time for that day
  sunset: Date;       // sunset time for that day
  solarNoon: Date;    // solar noon
  dayLengthHours: number;
}

/**
 * Julian Day Number from a Date
 */
function toJulianDay(date: Date): number {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d = date.getUTCDate();
  const h = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  
  let a = Math.floor((14 - m) / 12);
  let yy = y + 4800 - a;
  let mm = m + 12 * a - 3;
  
  let jdn = d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
  return jdn + (h - 12) / 24;
}

/**
 * Calculate solar position for a given date, latitude, longitude
 * Uses simplified SPA equations (accuracy ~0.01° for elevation, ~0.03° for azimuth)
 */
export function calculateSolarPosition(
  date: Date,
  latitude: number,
  longitude: number
): SolarPosition {
  const jd = toJulianDay(date);
  const n = jd - 2451545.0; // days since J2000.0
  
  // Mean solar longitude (degrees)
  const L = (280.460 + 0.9856474 * n) % 360;
  // Mean anomaly (degrees)
  const g = ((357.528 + 0.9856003 * n) % 360) * DEG2RAD;
  
  // Ecliptic longitude (degrees)
  const lambda = (L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * DEG2RAD;
  
  // Obliquity of ecliptic
  const epsilon = (23.439 - 0.0000004 * n) * DEG2RAD;
  
  // Right ascension
  const alpha = Math.atan2(Math.cos(epsilon) * Math.sin(lambda), Math.cos(lambda));
  
  // Declination
  const delta = Math.asin(Math.sin(epsilon) * Math.sin(lambda));
  
  // Greenwich Mean Sidereal Time (hours)
  const gmst = (6.697375 + 0.0657098242 * n + date.getUTCHours() + date.getUTCMinutes() / 60) % 24;
  
  // Local hour angle
  const lha = ((gmst * 15 + longitude) * DEG2RAD - alpha);
  
  const latRad = latitude * DEG2RAD;
  
  // Elevation (altitude)
  const sinElevation = Math.sin(latRad) * Math.sin(delta) + Math.cos(latRad) * Math.cos(delta) * Math.cos(lha);
  const elevation = Math.asin(Math.max(-1, Math.min(1, sinElevation))) * RAD2DEG;
  
  // Azimuth
  const cosAz = (Math.sin(delta) - Math.sin(latRad) * sinElevation) / (Math.cos(latRad) * Math.cos(elevation * DEG2RAD));
  let azimuth = Math.acos(Math.max(-1, Math.min(1, cosAz))) * RAD2DEG;
  if (Math.sin(lha) > 0) {
    azimuth = 360 - azimuth;
  }
  
  // Sunrise/sunset calculation using the hour angle at -0.833° (refraction corrected)
  const cosHourAngle = (Math.sin(-0.833 * DEG2RAD) - Math.sin(latRad) * Math.sin(delta)) / (Math.cos(latRad) * Math.cos(delta));
  
  let sunrise: Date;
  let sunset: Date;
  let solarNoon: Date;
  let dayLengthHours: number;
  
  if (cosHourAngle > 1) {
    // Sun never rises (polar night)
    sunrise = new Date(date);
    sunrise.setHours(0, 0, 0);
    sunset = new Date(date);
    sunset.setHours(0, 0, 0);
    solarNoon = new Date(date);
    solarNoon.setHours(12, 0, 0);
    dayLengthHours = 0;
  } else if (cosHourAngle < -1) {
    // Sun never sets (midnight sun)
    sunrise = new Date(date);
    sunrise.setHours(0, 0, 0);
    sunset = new Date(date);
    sunset.setHours(23, 59, 59);
    solarNoon = new Date(date);
    solarNoon.setHours(12, 0, 0);
    dayLengthHours = 24;
  } else {
    const hourAngle = Math.acos(cosHourAngle) * RAD2DEG;
    
    // Solar noon in UTC hours
    const noonUTC = (12 - (alpha * RAD2DEG - longitude) / 15 - (gmst * 15 - longitude * 0 + 0) * 0) ;
    // Simplified: use equation of time approach
    const eqTime = (L - alpha * RAD2DEG) * 4; // minutes (approximate)
    const noonMinutesUTC = 720 - 4 * longitude - eqTime;
    
    const sunriseMinutesUTC = noonMinutesUTC - hourAngle * 4;
    const sunsetMinutesUTC = noonMinutesUTC + hourAngle * 4;
    
    // Get local timezone offset
    const tzOffset = date.getTimezoneOffset(); // minutes behind UTC
    
    sunrise = new Date(date);
    sunrise.setHours(0, 0, 0, 0);
    sunrise.setMinutes(sunriseMinutesUTC - tzOffset);
    
    sunset = new Date(date);
    sunset.setHours(0, 0, 0, 0);
    sunset.setMinutes(sunsetMinutesUTC - tzOffset);
    
    solarNoon = new Date(date);
    solarNoon.setHours(0, 0, 0, 0);
    solarNoon.setMinutes(noonMinutesUTC - tzOffset);
    
    dayLengthHours = (hourAngle * 2) / 15;
  }
  
  return { azimuth, elevation, sunrise, sunset, solarNoon, dayLengthHours };
}

/**
 * Convert solar azimuth + elevation to a THREE.Vector3 light direction,
 * accounting for northAngle in the model coordinate system.
 * 
 * After -90° X rotation: UTM Y(Nord) → -Z(World), UTM Z(Up) → +Y(World)
 * So in world space: Nord = -Z, Süd = +Z, Ost = +X, West = -X
 * northAngle rotates the compass: 0° = default UTM orientation
 * 
 * Returns sun position vector (for DirectionalLight position)
 */
export function solarPositionToVector3(
  azimuth: number,
  elevation: number,
  northAngle: number = 0,
  distance: number = 50
): THREE.Vector3 {
  const elevRad = elevation * DEG2RAD;
  const azRad = (azimuth + northAngle) * DEG2RAD;
  
  // Y is up in Three.js
  // After -90° X-Rotation: Nord(UTM) = -Z(World)
  // Azimuth 0° (Nord) → z negativ (Licht aus Norden)
  // Azimuth 180° (Süd) → z positiv (Licht aus Süden)
  const x = Math.sin(azRad) * Math.cos(elevRad);
  const y = Math.sin(elevRad);
  const z = -Math.cos(azRad) * Math.cos(elevRad);
  
  return new THREE.Vector3(x, y, z).normalize().multiplyScalar(distance);
}

/**
 * Calculate sun intensity based on elevation
 * Returns 0 when below horizon, ramps up smoothly
 */
export function calculateSunIntensity(elevation: number): number {
  if (elevation <= 0) return 0;
  if (elevation >= 15) return 1.2;
  // Smooth ramp from 0 to 1.2 between 0° and 15° elevation
  const t = elevation / 15;
  return t * t * 1.2; // quadratic ease-in
}

/**
 * Calculate ambient light intensity based on elevation
 */
export function calculateAmbientIntensity(elevation: number): number {
  if (elevation <= -10) return 0.1;  // deep twilight
  if (elevation <= 0) return 0.2;    // civil twilight
  if (elevation >= 20) return 0.5;   // full daylight ambient
  // Smooth transition
  return 0.2 + (elevation / 20) * 0.3;
}

/**
 * Get hours as decimal from a Date (e.g., 14:30 → 14.5)
 */
export function getDecimalHours(date: Date): number {
  return date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
}

/**
 * Create a Date from a base date and decimal hours
 */
export function dateFromDecimalHours(baseDate: Date, hours: number): Date {
  const d = new Date(baseDate);
  d.setHours(0, 0, 0, 0);
  d.setMinutes(Math.round(hours * 60));
  return d;
}

/**
 * Format time as HH:MM
 */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Format azimuth as compass direction
 */
export function azimuthToCompass(azimuth: number): string {
  const dirs = ['N', 'NNO', 'NO', 'ONO', 'O', 'OSO', 'SO', 'SSO', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const idx = Math.round(azimuth / 22.5) % 16;
  return dirs[idx];
}
