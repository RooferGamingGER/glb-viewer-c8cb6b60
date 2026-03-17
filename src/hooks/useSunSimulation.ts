/**
 * useSunSimulation — State & animation logic for sun simulation
 * Manages daily/yearly modes, playback, and light parameters
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import {
  calculateSolarPosition,
  solarPositionToVector3,
  calculateSunIntensity,
  calculateAmbientIntensity,
  getDecimalHours,
  dateFromDecimalHours,
  SolarPosition
} from '@/utils/sunPosition';

export type SunSimulationMode = 'off' | 'day' | 'year';

export interface SunSimulationState {
  mode: SunSimulationMode;
  setMode: (mode: SunSimulationMode) => void;
  
  // Location
  latitude: number;
  longitude: number;
  setLatitude: (lat: number) => void;
  setLongitude: (lng: number) => void;
  
  // Day mode
  date: Date;
  setDate: (date: Date) => void;
  timeOfDay: number; // decimal hours (e.g., 14.5 = 14:30)
  setTimeOfDay: (hours: number) => void;
  
  // Year mode
  month: number; // 0-11
  setMonth: (month: number) => void;
  
  // Playback
  isPlaying: boolean;
  togglePlay: () => void;
  playbackSpeed: number;
  setPlaybackSpeed: (speed: number) => void;
  
  // Computed
  solarPosition: SolarPosition | null;
  sunLightPosition: THREE.Vector3;
  sunIntensity: number;
  ambientIntensity: number;
  sunriseHours: number;
  sunsetHours: number;
  sunElevation: number;
  
  // North angle from model
  northAngle: number;
  setNorthAngle: (angle: number) => void;
}

export function useSunSimulation(): SunSimulationState {
  const [mode, setMode] = useState<SunSimulationMode>('off');
  const [latitude, setLatitude] = useState(51.1); // Default: Germany center
  const [longitude, setLongitude] = useState(10.4);
  const [date, setDate] = useState(() => new Date());
  const [timeOfDay, setTimeOfDay] = useState(12.0);
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [northAngle, setNorthAngle] = useState(0);
  
  const animationRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);

  // Calculate the current date+time for the simulation
  const simulationDate = useMemo(() => {
    if (mode === 'year') {
      // Year mode: use selected month, day 21, at 12:00
      const d = new Date(date.getFullYear(), month, 21, 12, 0, 0);
      return d;
    }
    // Day mode: use selected date + timeOfDay
    return dateFromDecimalHours(date, timeOfDay);
  }, [mode, date, timeOfDay, month]);

  // Solar position calculation
  const solarPosition = useMemo(() => {
    if (mode === 'off') return null;
    return calculateSolarPosition(simulationDate, latitude, longitude);
  }, [mode, simulationDate, latitude, longitude]);

  // Sunrise/sunset decimal hours
  const sunriseHours = useMemo(() => {
    if (!solarPosition) return 6;
    return getDecimalHours(solarPosition.sunrise);
  }, [solarPosition]);

  const sunsetHours = useMemo(() => {
    if (!solarPosition) return 20;
    return getDecimalHours(solarPosition.sunset);
  }, [solarPosition]);

  // 3D light position
  const sunLightPosition = useMemo(() => {
    if (!solarPosition || mode === 'off') {
      return new THREE.Vector3(10, 10, 5);
    }
    return solarPositionToVector3(solarPosition.azimuth, solarPosition.elevation, northAngle, 50);
  }, [solarPosition, northAngle, mode]);

  // Light intensities
  const sunIntensity = useMemo(() => {
    if (!solarPosition || mode === 'off') return 1.2;
    return calculateSunIntensity(solarPosition.elevation);
  }, [solarPosition, mode]);

  const ambientIntensity = useMemo(() => {
    if (!solarPosition || mode === 'off') return 0.7;
    return calculateAmbientIntensity(solarPosition.elevation);
  }, [solarPosition, mode]);

  // Playback animation
  const togglePlay = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  useEffect(() => {
    if (!isPlaying || mode === 'off') {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    lastFrameTimeRef.current = performance.now();

    const animate = (now: number) => {
      const dt = (now - lastFrameTimeRef.current) / 1000; // seconds
      lastFrameTimeRef.current = now;

      if (mode === 'day') {
        // Advance time: playbackSpeed=1 → 1 hour per second
        setTimeOfDay(prev => {
          const next = prev + dt * playbackSpeed;
          if (next > sunsetHours + 0.5) {
            return sunriseHours - 0.5;
          }
          return next;
        });
      } else if (mode === 'year') {
        // Advance month: playbackSpeed=1 → 1 month per 2 seconds
        setMonth(prev => {
          const increment = dt * playbackSpeed * 0.5;
          const next = prev + increment;
          return next >= 12 ? next - 12 : next;
        });
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, mode, playbackSpeed, sunriseHours, sunsetHours]);

  // Stop playback when mode changes to off
  useEffect(() => {
    if (mode === 'off') {
      setIsPlaying(false);
    }
  }, [mode]);

  const sunElevation = solarPosition?.elevation ?? 45;

  return {
    mode, setMode,
    latitude, longitude, setLatitude, setLongitude,
    date, setDate,
    timeOfDay, setTimeOfDay,
    month, setMonth,
    isPlaying, togglePlay,
    playbackSpeed, setPlaybackSpeed,
    solarPosition,
    sunLightPosition,
    sunIntensity,
    ambientIntensity,
    sunriseHours, sunsetHours,
    sunElevation,
    northAngle, setNorthAngle
  };
}
