/**
 * SunSimulationPanel — UI for daily & yearly sun simulation
 */

import React, { useCallback } from 'react';
import { Sun, Play, Pause, SkipForward, Calendar as CalendarIcon, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  formatTime,
  azimuthToCompass,
  dateFromDecimalHours,
  IMPORTANT_DATES
} from '@/utils/sunPosition';
import { SunSimulationState, SunSimulationMode } from '@/hooks/useSunSimulation';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface SunSimulationPanelProps {
  simulation: SunSimulationState;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
const SPEED_OPTIONS = [0.5, 1, 2, 4];

const SunSimulationPanel: React.FC<SunSimulationPanelProps> = ({ simulation }) => {
  const {
    mode, setMode,
    latitude, longitude, setLatitude, setLongitude,
    date, setDate,
    timeOfDay, setTimeOfDay,
    month, setMonth,
    isPlaying, togglePlay,
    playbackSpeed, setPlaybackSpeed,
    solarPosition,
    sunriseHours, sunsetHours,
    northAngle
  } = simulation;

  const handleModeChange = useCallback((newMode: string) => {
    setMode(newMode as SunSimulationMode);
  }, [setMode]);

  const handleDateSelect = useCallback((d: Date | undefined) => {
    if (d) setDate(d);
  }, [setDate]);

  const handleQuickDate = useCallback((m: number, d: number) => {
    const newDate = new Date(date.getFullYear(), m - 1, d);
    setDate(newDate);
  }, [date, setDate]);

  const currentTime = dateFromDecimalHours(date, timeOfDay);
  const isActive = mode !== 'off';

  return (
    <div className="p-3 space-y-3">
      {/* Header with on/off toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sun className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Sonnensimulation</span>
        </div>
        <Button
          variant={isActive ? "default" : "outline"}
          size="sm"
          className="h-7 text-xs"
          onClick={() => setMode(isActive ? 'off' : 'day')}
        >
          {isActive ? 'Aktiv' : 'Aus'}
        </Button>
      </div>

      {isActive && (
        <>
          {/* Mode tabs */}
          <Tabs value={mode} onValueChange={handleModeChange}>
            <TabsList className="w-full h-8">
              <TabsTrigger value="day" className="flex-1 text-xs h-7">Tagesverlauf</TabsTrigger>
              <TabsTrigger value="year" className="flex-1 text-xs h-7">Jahresverlauf</TabsTrigger>
            </TabsList>

            {/* Day mode */}
            <TabsContent value="day" className="space-y-3 mt-2">
              {/* Date picker */}
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 text-xs flex-1 justify-start">
                      <CalendarIcon className="h-3 w-3 mr-1" />
                      {format(date, 'dd.MM.yyyy', { locale: de })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-50" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={handleDateSelect}
                      className={cn("p-3 pointer-events-auto")}
                      locale={de}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Quick date buttons */}
              <div className="flex flex-wrap gap-1">
                {IMPORTANT_DATES.map(d => (
                  <Button
                    key={d.label}
                    variant="outline"
                    size="sm"
                    className="h-6 text-[10px] px-2"
                    onClick={() => handleQuickDate(d.month, d.day)}
                    title={d.label}
                  >
                    {d.day}.{d.month}.
                  </Button>
                ))}
              </div>

              {/* Time slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{formatTime(dateFromDecimalHours(date, sunriseHours))} ↑</span>
                  <span className="font-medium text-foreground text-xs">
                    {formatTime(currentTime)}
                  </span>
                  <span>{formatTime(dateFromDecimalHours(date, sunsetHours))} ↓</span>
                </div>
                <Slider
                  min={Math.max(0, sunriseHours - 0.5)}
                  max={Math.min(24, sunsetHours + 0.5)}
                  step={0.05}
                  value={[timeOfDay]}
                  onValueChange={([val]) => setTimeOfDay(val)}
                  className="w-full"
                />
              </div>

              {/* Playback controls */}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={togglePlay}>
                  {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                </Button>
                <div className="flex gap-1">
                  {SPEED_OPTIONS.map(s => (
                    <Button
                      key={s}
                      variant={playbackSpeed === s ? "default" : "outline"}
                      size="sm"
                      className="h-6 text-[10px] px-2"
                      onClick={() => setPlaybackSpeed(s)}
                    >
                      {s}×
                    </Button>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Year mode */}
            <TabsContent value="year" className="space-y-3 mt-2">
              {/* Month slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Monat</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {MONTH_NAMES[Math.floor(month)]} — 12:00 Uhr
                  </Badge>
                </div>
                <Slider
                  min={0}
                  max={11.99}
                  step={0.1}
                  value={[month]}
                  onValueChange={([val]) => setMonth(val)}
                  className="w-full"
                />
                <div className="flex justify-between text-[9px] text-muted-foreground">
                  <span>Jan</span>
                  <span>Apr</span>
                  <span>Jul</span>
                  <span>Okt</span>
                  <span>Dez</span>
                </div>
              </div>

              {/* Quick month buttons (equinox/solstice) */}
              <div className="flex flex-wrap gap-1">
                {IMPORTANT_DATES.map(d => (
                  <Button
                    key={d.label}
                    variant="outline"
                    size="sm"
                    className="h-6 text-[10px] px-2"
                    onClick={() => setMonth(d.month - 1)}
                    title={d.label}
                  >
                    {d.label.split(' ')[0].slice(0, 6)}
                  </Button>
                ))}
              </div>

              {/* Playback */}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={togglePlay}>
                  {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                </Button>
                <div className="flex gap-1">
                  {SPEED_OPTIONS.map(s => (
                    <Button
                      key={s}
                      variant={playbackSpeed === s ? "default" : "outline"}
                      size="sm"
                      className="h-6 text-[10px] px-2"
                      onClick={() => setPlaybackSpeed(s)}
                    >
                      {s}×
                    </Button>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Solar position info */}
          {solarPosition && (
            <div className="bg-muted/50 rounded-md p-2 space-y-1">
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px]">
                <div className="text-muted-foreground">Azimut</div>
                <div className="font-mono">{solarPosition.azimuth.toFixed(1)}° ({azimuthToCompass(solarPosition.azimuth)})</div>
                <div className="text-muted-foreground">Elevation</div>
                <div className="font-mono">{solarPosition.elevation.toFixed(1)}°</div>
                <div className="text-muted-foreground">Tageslänge</div>
                <div className="font-mono">{solarPosition.dayLengthHours.toFixed(1)} h</div>
              </div>
              {solarPosition.elevation <= 0 && (
                <div className="text-[10px] text-amber-500 font-medium mt-1">
                  ☽ Sonne unter dem Horizont
                </div>
              )}
            </div>
          )}

          {/* Location */}
          <div className="space-y-2">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span>Standort</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">Breitengrad</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={latitude}
                  onChange={e => setLatitude(parseFloat(e.target.value) || 0)}
                  className="h-7 text-xs"
                />
              </div>
              <div>
                <Label className="text-[10px]">Längengrad</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={longitude}
                  onChange={e => setLongitude(parseFloat(e.target.value) || 0)}
                  className="h-7 text-xs"
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SunSimulationPanel;
