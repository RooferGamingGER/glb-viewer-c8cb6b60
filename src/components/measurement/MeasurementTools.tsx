
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { 
  Ruler, Maximize2, Square, SunDim, Grid3X3, 
  Home, Minimize2, Layers, Grid, Move, X
} from 'lucide-react';
import MeasurementToolControls from './MeasurementToolControls';
import { MeasurementMode } from '@/types/measurements';
import { useMeasurementInteraction } from '@/hooks/useMeasurementInteraction';
import { useMeasurementToolToggle } from '@/hooks/useMeasurementToolToggle';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Toggle } from '@/components/ui/toggle';
import { Separator } from "@/components/ui/separator";
import { cn } from '@/lib/utils';
import { useThreeJs } from '@/contexts/ThreeJsContext';
import ActiveMeasurement from './ActiveMeasurement';
