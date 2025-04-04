import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { 
  Eye, 
  EyeOff, 
  Pencil, 
  Trash2, 
  Save, 
  X,
  House,
  Cylinder,
  SplitSquareVertical,
  Sun,
  Minus,
  ArrowDown,
  Wind,
  Square,
  Anchor,
  MoveUp,
  MoveDown,
  Camera,
  Image,
  Zap,
  Info,
  Ruler
} from 'lucide-react';
import { Measurement, Segment } from '@/types/measurements';
import { Input } from "@/components/ui/input";
import SegmentList from './SegmentList';
import PointEditList from './PointEditList';
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import CaptureScreenshotButton from './CaptureScreenshotButton';
import ScreenshotGallery from './ScreenshotGallery';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  calculatePVModulePlacement, 
  calculatePVPower, 
  formatPVModuleInfo,
  DEFAULT_EDGE_DISTANCE,
  DEFAULT_MODULE_SPACING,
  PV_MODULE_TEMPLATES,
  calculateAnnualYield
} from '@/utils/pvCalculations';
import PVModuleSelect from './PVModuleSelect';
import PVPlanningDisclaimer from '../pvplanning/PVPlanningDisclaimer';

interface MeasurementItemProps {
  measurement: Measurement;
  toggleMeasurementVisibility: (id: string) => void;
  toggleLabelVisibility: (id: string) => void;
  handleStartPointEdit: (id: string) => void;
  handleDeleteMeasurement: (id: string) => void;
  handleDeletePoint?: (measurementId: string, pointIndex: number) => void;
  updateMeasurement: (id: string, data: Partial<Measurement>) => void;
  editMeasurementId: string | null;
  segmentsOpen: boolean;
  toggleSegments: (id: string) => void;
  onEditSegment: (segmentId: string) => void;
  movingPointInfo?: { measurementId: string; pointIndex: number } | null;
  handleMoveUp?: (id: string) => void;
  handleMoveDown?: (id: string) => void;
}

const MeasurementItem: React.FC<MeasurementItemProps> = ({
  measurement,
  toggleMeasurementVisibility,
  toggleLabelVisibility,
  handleStartPointEdit,
  handleDeleteMeasurement,
  handleDeletePoint,
  updateMeasurement,
  editMeasurementId,
  segmentsOpen,
  toggleSegments,
  onEditSegment,
  movingPointInfo,
  handleMoveUp,
  handleMoveDown
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [screenshotsOpen, setScreenshotsOpen] = useState(false);
  const [showPVDetails, setShowPVDetails] = useState(false);
  const [showPVDisclaimer, setShowPVDisclaimer] = useState(false);

  const updateSegment = (measurementId: string, segmentId: string, data: Partial<Segment>) => {
    if (!measurement.segments) return;
    
    const updatedSegments = measurement.segments.map(segment => 
      segment.id === segmentId ? { ...segment, ...data } : segment
    );
    
    updateMeasurement(measurementId, { segments: updatedSegments });
  };

  const handleEditStart = (id: string, description: string = '') => {
    setEditingId(id);
    setEditValue(description || '');
  };

  const handleEditSave = (id: string) => {
    updateMeasurement(id, { description: editValue });
    setEditingId(null);
  };

  const handleScreenshotCaptured = (measurementId: string, screenshot: string) => {
    const currentScreenshots = measurement.customScreenshots || [];
    updateMeasurement(measurementId, {
      customScreenshots: [...currentScreenshots, screenshot]
    });
  };

  const handleDeleteScreenshot = (index: number) => {
    if (!measurement.customScreenshots) return;
    
    const newScreenshots = [...measurement.customScreenshots];
    newScreenshots.splice(index, 1);
    
    updateMeasurement(measurement.id, {
      customScreenshots: newScreenshots
    });
  };

  const handleMoveScreenshotUp = (index: number) => {
    if (!measurement.customScreenshots || index <= 0) return;
    
    const newScreenshots = [...measurement.customScreenshots];
    const temp = newScreenshots[index];
    newScreenshots[index] = newScreenshots[index - 1];
    newScreenshots[index - 1] = temp;
    
    updateMeasurement(measurement.id, {
      customScreenshots: newScreenshots
    });
  };

  const handleMoveScreenshotDown = (index: number) => {
    if (!measurement.customScreenshots || index >= measurement.customScreenshots.length - 1) return;
    
    const newScreenshots = [...measurement.customScreenshots];
    const temp = newScreenshots[index];
    newScreenshots[index] = newScreenshots[index + 1];
    newScreenshots[index + 1] = temp;
    
    updateMeasurement(measurement.id, {
      customScreenshots: newScreenshots
    });
  };

  const handleCalculatePV = () => {
    if (measurement.type !== 'solar') return;
    
    setShowPVDisclaimer(true);
  };

  const handlePVDisclaimerConfirm = () => {
    setShowPVDisclaimer(false);
    
    const pvModuleInfo = calculatePVModulePlacement(
      measurement.points,
      undefined,
      undefined,
      DEFAULT_EDGE_DISTANCE,
      DEFAULT_MODULE_SPACING
    );
    updateMeasurement(measurement.id, { pvModuleInfo });
  };

  const handlePVDisclaimerCancel = () => {
    setShowPVDisclaimer(false);
  };

  const handlePVDimensionsChange = (dimensions: { width: number, length: number }) => {
    if (measurement.pvModuleInfo) {
      const updatedInfo = calculatePVModulePlacement(
        measurement.points,
        measurement.pvModuleInfo.moduleWidth,
        measurement.pvModuleInfo.moduleHeight,
        measurement.pvModuleInfo.edgeDistance || DEFAULT_EDGE_DISTANCE,
        measurement.pvModuleInfo.moduleSpacing || DEFAULT_MODULE_SPACING,
        dimensions
      );
      
      updateMeasurement(measurement.id, { pvModuleInfo: updatedInfo });
    }
  };

  const handlePVSpacingChange = (spacing: { edgeDistance: number, moduleSpacing: number }) => {
    if (measurement.pvModuleInfo) {
      const updatedInfo = calculatePVModulePlacement(
        measurement.points,
        measurement.pvModuleInfo.moduleWidth,
        measurement.pvModuleInfo.moduleHeight,
        spacing.edgeDistance,
        spacing.moduleSpacing,
        measurement.pvModuleInfo.manualDimensions ? {
          width: measurement.pvModuleInfo.userDefinedWidth || 0,
          length: measurement.pvModuleInfo.userDefinedLength || 0
        } : undefined
      );
      
      updateMeasurement(measurement.id, { pvModuleInfo: updatedInfo });
    }
  };

  const getTypeIcon = (type: string) => {
    switch(type) {
      case 'dormer': return <House className="h-4 w-4 mr-1" />;
      case 'chimney': return <Cylinder className="h-4 w-4 mr-1" />;
      case 'skylight': return <SplitSquareVertical className="h-4 w-4 mr-1" />;
      case 'solar': return <Sun className="h-4 w-4 mr-1" />;
      case 'length': return <Minus className="h-4 w-4 mr-1" />;
      case 'height': return <ArrowDown className="h-4 w-4 mr-1" />;
      case 'area': return <Square className="h-4 w-4 mr-1" />;
      case 'vent': return <Wind className="h-4 w-4 mr-1" />;
      case 'hook': return <Anchor className="h-4 w-4 mr-1" />;
      case 'other': return <X className="h-4 w-4 mr-1" />;
      default: return null;
    }
  };

  const getTypeName = (type: string): string => {
    const typeNames: Record<string, string> = {
      'length': 'Länge',
      'height': 'Höhe',
      'area': 'Fläche',
      'dormer': 'Gaube',
      'chimney': 'Kamin',
      'skylight': 'Dachfenster',
      'solar': 'Solaranlage',
      'vent': 'Lüfter',
      'hook': 'Dachhaken',
      'other': 'Sonstige Einbauten'
    };
    
    return typeNames[type] || type;
  };

  const isRoofElement = [
    'chimney', 'skylight', 'solar'
  ].includes(measurement.type);

  const isPenetration = ['vent', 'hook', 'other'].includes(measurement.type);

  const hasCustomScreenshots = measurement.customScreenshots && measurement.customScreenshots.length > 0;
  
  const hasPVInfo = measurement.pvModuleInfo && measurement.pvModuleInfo.moduleCount > 0;
  const isSolarMeasurement = measurement.type === 'solar';

  return (
    <div 
      className={`mb-3 p-2 rounded-md border ${
        measurement.editMode ? 'border-primary bg-secondary/20' : 
        isPenetration ? 'border-orange-300/50 bg-orange-50/10' :  
        isRoofElement ? 'border-blue-300/50 bg-blue-50/10' : 
        measurement.type === 'solar' || measurement.type === 'pvmodule' ? 'border-blue-300/50 bg-blue-50/10' : 
        'border-border'
      }`}
    >
      <PVPlanningDisclaimer 
        open={showPVDisclaimer}
        onConfirm={handlePVDisclaimerConfirm}
        onCancel={handlePVDisclaimerCancel}
      />
      
      <div className="flex justify-between items-center mb-1">
        <div className="font-medium flex items-center">
          {getTypeIcon(measurement.type)}
          {getTypeName(measurement.type)}
          
          {isPenetration && (
            <Badge variant="outline" className="ml-2 text-xs bg-orange-50/30">
              Durchdringung
            </Badge>
          )}
          
          {measurement.subType && (
            <Badge variant="outline" className="ml-2 text-xs">
              {measurement.subType}
            </Badge>
          )}
          
          {measurement.count && measurement.count > 0 && (
            <Badge variant="secondary" className="ml-2">
              {measurement.count}
            </Badge>
          )}
          
          {hasCustomScreenshots && (
            <Badge variant="outline" className="ml-2 text-xs bg-blue-50/30">
              <Image className="h-3 w-3 mr-1" />
              {measurement.customScreenshots!.length}
            </Badge>
          )}
          
          {hasPVInfo && (
            <Badge variant="outline" className="ml-2 text-xs bg-green-50/30">
              <Zap className="h-3 w-3 mr-1" />
              {measurement.pvModuleInfo!.moduleCount}
            </Badge>
          )}
        </div>
        
        <div className="flex space-x-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6" 
                  onClick={() => toggleMeasurementVisibility(measurement.id)}
                  title={measurement.visible === false ? "Einblenden" : "Ausblenden"}
                >
                  {measurement.visible === false ? (
                    <Eye className="h-3 w-3" />
                  ) : (
                    <EyeOff className="h-3 w-3" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {measurement.visible === false ? "Messung einblenden" : "Messung ausblenden"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6" 
            onClick={() => handleStartPointEdit(measurement.id)}
            title="Punkte bearbeiten"
          >
            <Pencil className="h-3 w-3" />
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6" 
            onClick={() => handleDeleteMeasurement(measurement.id)}
            title="Löschen"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      
      <div className="text-sm mb-1">
        {!isPenetration && (
          <>
            <strong>Wert:</strong> {measurement.label}
          </>
        )}
        
        {measurement.dimensions && (
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-1 text-xs">
            {measurement.dimensions.length !== undefined && (
              <div><strong>Länge:</strong> {measurement.dimensions.length.toFixed(2)} m</div>
            )}
            {measurement.dimensions.width !== undefined && (
              <div><strong>Breite:</strong> {measurement.dimensions.width.toFixed(2)} m</div>
            )}
            {measurement.dimensions.height !== undefined && (
              <div><strong>Höhe:</strong> {measurement.dimensions.height.toFixed(2)} m</div>
            )}
            {measurement.dimensions.diameter !== undefined && (
              <div><strong>Durchmesser:</strong> {measurement.dimensions.diameter.toFixed(2)} m</div>
            )}
            {measurement.dimensions.area !== undefined && (
              <div><strong>Fläche:</strong> {measurement.dimensions.area.toFixed(2)} m²</div>
            )}
          </div>
        )}
        
        {(measurement.type === 'length' || ['valley', 'ridge', 'verge'].includes(measurement.type)) && 
         measurement.inclination !== undefined && (
          <span className="ml-2">
            <strong>Neigung:</strong> {Math.abs(measurement.inclination).toFixed(1)}°
          </span>
        )}
        
        {hasPVInfo && (
          <div className="mt-2 p-2 bg-blue-50/10 border border-blue-200/30 rounded-md">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center">
                <Zap className="h-4 w-4 mr-1 text-blue-600" />
                <span className="font-medium">PV-Planung</span>
              </div>
              <div className="flex items-center space-x-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6" 
                  onClick={() => setShowPVDetails(!showPVDetails)}
                >
                  <Info className="h-3 w-3" />
                </Button>
                
                <PVModuleSelect 
                  onModuleSelect={(moduleSpec) => {
                    if (measurement.pvModuleInfo) {
                      const updatedInfo = {
                        ...measurement.pvModuleInfo,
                        moduleWidth: moduleSpec.width,
                        moduleHeight: moduleSpec.height,
                        pvModuleSpec: moduleSpec
                      };
                      
                      const recalculatedInfo = calculatePVModulePlacement(
                        measurement.points,
                        moduleSpec.width,
                        moduleSpec.height,
                        updatedInfo.edgeDistance || DEFAULT_EDGE_DISTANCE,
                        updatedInfo.moduleSpacing || DEFAULT_MODULE_SPACING,
                        updatedInfo.manualDimensions ? {
                          width: updatedInfo.userDefinedWidth || 0,
                          length: updatedInfo.userDefinedLength || 0
                        } : undefined
                      );
                      
                      updateMeasurement(measurement.id, { 
                        pvModuleInfo: recalculatedInfo,
                        pvModuleSpec: moduleSpec
                      });
                    }
                  }}
                  currentModule={measurement.pvModuleSpec || PV_MODULE_TEMPLATES[0]}
                  onDimensionsChange={handlePVDimensionsChange}
                  pvModuleInfo={measurement.pvModuleInfo}
                  onSpacingChange={handlePVSpacingChange}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
              <div><strong>Module:</strong> {measurement.pvModuleInfo!.moduleCount} Stück</div>
              <div><strong>Abdeckung:</strong> {measurement.pvModuleInfo!.coveragePercent.toFixed(1)}%</div>
              <div><strong>Ausrichtung:</strong> {measurement.pvModuleInfo!.orientation === 'portrait' 
                ? 'Hochformat' 
                : 'Querformat'}</div>
              <div><strong>Leistung:</strong> {calculatePVPower(measurement.pvModuleInfo!.moduleCount, measurement.pvModuleInfo!.pvModuleSpec?.power || 425).toFixed(2)} kWp</div>
              <div className="col-span-2"><strong>Spalten × Reihen:</strong> {measurement.pvModuleInfo!.columns || '?'} × {measurement.pvModuleInfo!.rows || '?'}</div>
              <div className="col-span-2"><strong>Modulgröße:</strong> {measurement.pvModuleInfo!.moduleWidth.toFixed(3)}m × {measurement.pvModuleInfo!.moduleHeight.toFixed(3)}m</div>
              {measurement.pvModuleInfo!.edgeDistance !== undefined && (
                <div><strong>Randabstand:</strong> {measurement.pvModuleInfo!.edgeDistance.toFixed(2)}m</div>
              )}
              {measurement.pvModuleInfo!.moduleSpacing !== undefined && (
                <div><strong>Modulabstand:</strong> {measurement.pvModuleInfo!.moduleSpacing.toFixed(2)}m</div>
              )}
              <div className="col-span-2"><strong>Geschätzter Jahresertrag:</strong> {calculateAnnualYield(
                calculatePVPower(measurement.pvModuleInfo!.moduleCount, measurement.pvModuleInfo!.pvModuleSpec?.power || 425),
                measurement.pvModuleInfo!.orientation === 'portrait' ? 'hochformat' : 'querformat'
              ).toFixed(0)} kWh/Jahr</div>
            </div>
            
            {showPVDetails && (
              <div className="mt-2 border-t border-blue-200/30 pt-2 text-xs text-black">
                <h4 className="font-medium mb-1">Berechnungsdetails:</h4>
                
                {measurement.pvModuleInfo && (
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                    <div><strong>Begrenzungshöhe:</strong> {measurement.pvModuleInfo.boundingHeight?.toFixed(3)}m</div>
                    <div><strong>Begrenzungslänge:</strong> {measurement.pvModuleInfo.boundingLength.toFixed(3)}m</div>
                    <div className="col-span-2"><strong>Begrenzungsfl��che:</strong> {(measurement.pvModuleInfo.boundingHeight * measurement.pvModuleInfo.boundingLength).toFixed(3)}m²</div>
                    
                    <div className="col-span-2 mt-1"><strong>Verfügbare Breite:</strong> {measurement.pvModuleInfo.availableWidth.toFixed(3)}m</div>
                    <div className="col-span-2"><strong>Verfügbare Länge:</strong> {measurement.pvModuleInfo.availableLength.toFixed(3)}m</div>
                    
                    {measurement.pvModuleInfo.orientation === 'portrait' ? (
                      <>
                        <div className="col-span-2 mt-1 font-semibold">Hochformat-Berechnung:</div>
                        <div className="col-span-2"><strong>Modulanordnung:</strong> 
                          <span> Längere Modulseite ({measurement.pvModuleInfo.moduleHeight.toFixed(2)}m) parallel zum Ortgang</span>
                        </div>
                        <div className="col-span-2"><strong>Berechnung Module pro Breite:</strong> 
                          <span> floor(verfügbare Breite / (Modulhöhe + Modulabstand))</span>
                        </div>
                        <div className="col-span-2"><strong>Formel:</strong> 
                          <span> floor(
                            {measurement.pvModuleInfo.availableWidth.toFixed(3)} / (
                            {measurement.pvModuleInfo.moduleHeight.toFixed(3)} + 
                            {(measurement.pvModuleInfo.moduleSpacing || DEFAULT_MODULE_SPACING).toFixed(3)})) = 
                            {Math.floor(
                              measurement.pvModuleInfo.availableWidth / 
                              (measurement.pvModuleInfo.moduleHeight + (measurement.pvModuleInfo.moduleSpacing || DEFAULT_MODULE_SPACING))
                            )}
                          </span>
                        </div>
                        <div className="col-span-2"><strong>Berechnung Reihen:</strong> 
                          <span> floor(verfügbare Länge / (Modulbreite + Modulabstand))</span>
                        </div>
                        <div className="col-span-2"><strong>Formel:</strong> 
                          <span> floor(
                            {measurement.pvModuleInfo.availableLength.toFixed(3)} / (
                            {measurement.pvModuleInfo.moduleWidth.toFixed(3)} + 
                            {(measurement.pvModuleInfo.moduleSpacing || DEFAULT_MODULE_SPACING).toFixed(3)})) = 
                            {Math.floor(
                              measurement.pvModuleInfo.availableLength / 
                              (measurement.pvModuleInfo.moduleWidth + (measurement.pvModuleInfo.moduleSpacing || DEFAULT_MODULE_SPACING))
                            )}
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="col-span-2 mt-1 font-semibold">Querformat-Berechnung:</div>
                        <div className="col-span-2"><strong>Modulanordnung:</strong> 
                          <span> Längere Modulseite ({measurement.pvModuleInfo.moduleHeight.toFixed(2)}m) parallel zur Traufe</span>
                        </div>
                        <div className="col-span-2"><strong>Berechnung Module pro Breite:</strong> 
                          <span> floor(verfügbare Breite / (Modulbreite + Modulabstand))</span>
                        </div>
                        <div className="col-span-2"><strong>Formel:</strong> 
                          <span> floor(
                            {measurement.pvModuleInfo.availableWidth.toFixed(3)} / (
                            {measurement.pvModuleInfo.moduleWidth.toFixed(3)} + 
                            {(measurement.pvModuleInfo.moduleSpacing || DEFAULT_MODULE_SPACING).toFixed(3)})) = 
                            {Math.floor(
                              measurement.pvModuleInfo.availableWidth / 
                              (measurement.pvModuleInfo.moduleWidth + (measurement.pvModuleInfo.moduleSpacing || DEFAULT_MODULE_SPACING))
                            )}
                          </span>
                        </div>
                        <div className="col-span-2"><strong>Berechnung Reihen:</strong> 
                          <span> floor(verfügbare Länge / (Modulhöhe + Modulabstand))</span>
                        </div>
                        <div className="col-span-2"><strong>Formel:</strong>
                          <span> floor(
                            {measurement.pvModuleInfo.availableLength.toFixed(3)} / (
                            {measurement.pvModuleInfo.moduleHeight.toFixed(3)} + 
                            {(measurement.pvModuleInfo.moduleSpacing || DEFAULT_MODULE_SPACING).toFixed(3)})) = 
                            {Math.floor(
                              measurement.pvModuleInfo.availableLength / 
                              (measurement.pvModuleInfo.moduleHeight + (measurement.pvModuleInfo.moduleSpacing || DEFAULT_MODULE_SPACING))
                            )}
                          </span>
                        </div>
                      </>
                    )}
                    <div className="col-span-2 mt-2 font-semibold">Modulanzahl: {measurement.pvModuleInfo.columns || '?'} × {measurement.pvModuleInfo.rows || '?'} = {measurement.pvModuleInfo.moduleCount} Module</div>
                  </div>
                )}
              </div>
            )}
            
            {measurement.pvModuleInfo && measurement.pvModuleInfo.manualDimensions && (
              <div className="mt-1 p-1 bg-green-50/10 border border-green-200/30 rounded-md text-xs">
                <div className="flex items-center">
                  <Ruler className="h-3 w-3 mr-1 text-green-600" />
                  <span className="font-medium">Manuelle Abmessungen:</span>
                </div>
                <div className="grid grid-cols-2 gap-x-2 mt-1">
                  <div><strong>Breite:</strong> {measurement.pvModuleInfo.userDefinedWidth?.toFixed(2) || "-"} m</div>
                  <div><strong>Länge:</strong> {measurement.pvModuleInfo.userDefinedLength?.toFixed(2) || "-"} m</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {isSolarMeasurement && !hasPVInfo && (
        <Button 
          variant="outline" 
          size="sm" 
          className="mt-2 w-full"
          onClick={handleCalculatePV}
        >
          <Zap className="h-4 w-4 mr-2" />
          PV-Module berechnen
        </Button>
      )}
      
      {(isRoofElement || isPenetration) && handleMoveUp && handleMoveDown && (
        <div className="flex justify-end space-x-1 mt-1 mb-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => handleMoveUp(measurement.id)}
                >
                  <MoveUp className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Nach oben verschieben</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => handleMoveDown(measurement.id)}
                >
                  <MoveDown className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Nach unten verschieben</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
      
      {editingId === measurement.id ? (
        <div className="flex flex-col space-y-2 mt-2">
          <Input
            placeholder="Beschreibung hinzufügen"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
          />
          <div className="flex space-x-2">
            <Button 
              variant="default" 
              size="sm" 
              className="flex-1"
              onClick={() => handleEditSave(measurement.id)}
            >
              <Save className="h-3 w-3 mr-1" />
              Speichern
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={() => setEditingId(null)}
            >
              <X className="h-3 w-3 mr-1" />
              Abbrechen
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex mt-1">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs h-7 px-2"
            onClick={() => handleEditStart(measurement.id, measurement.description)}
          >
            {measurement.description ? 
              measurement.description : 
              "Beschreibung hinzufügen..."
            }
          </Button>
        </div>
      )}
      
      <div className="mt-2">
        <CaptureScreenshotButton 
          measurementId={measurement.id}
          onScreenshotCaptured={handleScreenshotCaptured}
        />
      </div>
      
      {hasCustomScreenshots && (
        <Collapsible
          open={screenshotsOpen}
          onOpenChange={setScreenshotsOpen}
          className="mt-2"
        >
          <CollapsibleTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full flex justify-between items-center"
            >
              <span>Screenshots ({measurement.customScreenshots!.length})</span>
              <span>{screenshotsOpen ? '▲' : '▼'}</span>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <ScreenshotGallery
              screenshots={measurement.customScreenshots!}
              onDelete={handleDeleteScreenshot}
              onMoveUp={handleMoveScreenshotUp}
              onMoveDown={handleMoveScreenshotDown}
            />
          </CollapsibleContent>
        </Collapsible>
      )}
      
      {measurement.editMode && handleDeletePoint && (
        <PointEditList 
          measurement={measurement}
          handleDeletePoint={handleDeletePoint}
          movingPointInfo={movingPointInfo}
        />
      )}
      
      {(measurement.type === 'area' || measurement.type === 'solar') && 
        measurement.segments && (
        <SegmentList 
          measurementId={measurement.id}
          segments={measurement.segments}
          isOpen={segmentsOpen}
          toggleSegments={toggleSegments}
          onEditSegment={onEditSegment}
          updateSegment={updateSegment}
        />
      )}
    </div>
  );
};

export default MeasurementItem;
