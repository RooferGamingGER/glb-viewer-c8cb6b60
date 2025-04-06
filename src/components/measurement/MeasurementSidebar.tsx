
import React from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Measurement } from '@/hooks/useMeasurements'; 
import MeasurementList from './MeasurementList';
import MeasurementTable from './MeasurementTable';
import { Button } from '@/components/ui/button';
import { Trash2, Eye, EyeOff } from 'lucide-react';
import * as THREE from 'three';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { Separator } from "@/components/ui/separator";

interface MeasurementSidebarProps {
  measurements: Measurement[];
  toggleMeasurementVisibility: (id: string) => void;
  toggleLabelVisibility?: (id: string) => void; 
  handleStartPointEdit: (id: string) => void;
  handleDeleteMeasurement: (id: string) => void;
  handleDeletePoint?: (measurementId: string, pointIndex: number) => void;
  updateMeasurement: (id: string, data: Partial<Measurement>) => void;
  editMeasurementId: string | null;
  segmentsOpen: Record<string, boolean>;
  toggleSegments: (id: string) => void;
  onEditSegment: (id: string | null) => void;
  movingPointInfo?: { measurementId: string; pointIndex: number } | null;
  showTable: boolean;
  handleClearMeasurements: () => void;
  toggleAllLabelsVisibility?: () => void;
  allLabelsVisible?: boolean;
  activeMode?: string;
  handleMoveMeasurementUp?: (id: string) => void;
  handleMoveMeasurementDown?: (id: string) => void;
  measurementGroups?: THREE.Group[];
}

// This component is deprecated since its functionality has been
// integrated into MeasurementToolControls. This stub is provided
// for backward compatibility.
const MeasurementSidebar: React.FC<MeasurementSidebarProps> = (props) => {
  return null;
};

export default MeasurementSidebar;
