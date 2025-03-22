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
  Info
} from 'lucide-react';
import { Measurement } from '@/types/measurements';
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
  DEFAULT_MODULE_SPACING
} from '@/utils/pvCalculations';

interface MeasurementItemProps {
  measurement: Measurement;
  toggleMeasurementVisibility: (id: string) => void;
  toggleLabelVisibility?: (id: string) => void;
  handleStartPointEdit: (id: string) => void;
  handleDeleteMeasurement: (id: string) => void;
  handleDeletePoint?: (measurementId: string, pointIndex: number) => void;
  updateMeasurement: (id: string, data: Partial<Measurement>) => void;
  editMeasurementId: string | null;
  segmentsOpen: Record<string, boolean>;
  toggleSegments: (id: string) => void;
  onEditSegment: (segmentId: string) => void;
  movingPointInfo?: { measurementId: string; pointIndex: number } | null;
  handleMoveMeasurementUp?: (id: string) => void;
  handleMoveMeasurementDown?: (id: string) => void;
}

const MeasurementItem: React.FC<MeasurementItemProps> = ({
  measurement,
  toggleMeasurementVisibility,
  handleStartPointEdit,
  handleDeleteMeasurement,
  handleDeletePoint,
  updateMeasurement,
  editMeasurementId,
  segmentsOpen,
  toggleSegments,
  onEditSegment,
  movingPointInfo,
  handleMoveMeasurementUp,
  handleMoveMeasurementDown
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [screenshotsOpen, setScreenshotsOpen] = useState(false);
  const [showPVDetails, setShowPVDetails] = useState(false);

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
    if (measurement.type !== 'area') return;
    
    const pvModuleInfo = calculatePVModulePlacement(
      measurement.points,
      undefined,
      undefined,
      DEFAULT_EDGE_DISTANCE,
      DEFAULT_MODULE_SPACING
    );
    updateMeasurement(measurement.id, { pvModuleInfo });
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
  const isAreaMeasurement = measurement.type === 'area';

  const getBoundingBoxDimensions = () => {
    if (!measurement.points || measurement.points.length < 3) {
      return null;
    }
    
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    
    measurement.points.forEach(point => {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minZ = Math.min(minZ, point.z);
      maxZ = Math.max(maxZ, point.z);
    });
    
    const boundingWidth = maxX - minX;
    const boundingLength = maxZ - minZ;
    
    return {
      width: boundingWidth,
      length: boundingLength,
      area: boundingWidth * boundingLength
    };
  };

  const getAvailableArea = () => {
    if (!measurement.pvModuleInfo || !getBoundingBoxDimensions()) return null;
    
    const edgeDistance = measurement.pvModuleInfo.edgeDistance || DEFAULT_EDGE_DISTANCE;
    const boundingBox = getBoundingBoxDimensions()!;
    
    const availableWidth = Math.max(0, boundingBox.width - (2 * edgeDistance));
    const availableLength = Math.max(0, boundingBox.length - (2 * edgeDistance));
    
    return {
      width: availableWidth,
      length: availableLength,
      area: availableWidth * availableLength
    };
  };

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
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6" 
                onClick={() => setShowPVDetails(!showPVDetails)}
              >
                <Info className="h-3 w-3" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
              <div><strong>Module:</strong> {measurement.pvModuleInfo!.moduleCount} Stück</div>
              <div><strong>Abdeckung:</strong> {measurement.pvModuleInfo!.coveragePercent.toFixed(1)}%</div>
              <div><strong>Ausrichtung:</strong> {measurement.pvModuleInfo!.orientation === 'portrait' ? 'Hochformat' : 'Querformat'}</div>
              <div><strong>Leistung:</strong> {calculatePVPower(measurement.pvModuleInfo!.moduleCount, measurement.pvModuleInfo!.pvModuleSpec?.power || 380).toFixed(2)} kWp</div>
              <div><strong>Spalten × Reihen:</strong> {measurement.pvModuleInfo!.columns || '?'} × {measurement.pvModuleInfo!.rows || '?'}</div>
              <div className="col-span-2"><strong>Modulgröße:</strong> {measurement.pvModuleInfo!.moduleWidth.toFixed(3)}m × {measurement.pvModuleInfo!.moduleHeight.toFixed(3)}m</div>
              {measurement.pvModuleInfo!.edgeDistance !== undefined && (
                <div><strong>Randabstand:</strong> {measurement.pvModuleInfo!.edgeDistance.toFixed(2)}m</div>
              )}
              {measurement.pvModuleInfo!.moduleSpacing !== undefined && (
                <div><strong>Modulabstand:</strong> {measurement.pvModuleInfo!.moduleSpacing.toFixed(2)}m</div>
              )}
            </div>
            
            {showPVDetails && (
              <div className="mt-2 border-t border-blue-200/30 pt-2 text-xs">
                <h4 className="font-medium mb-1">Berechnungsdetails:</h4>
                
                {getBoundingBoxDimensions() && (
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                    <div><strong>Begrenzung Breite:</strong> {getBoundingBoxDimensions()!.width.toFixed(3)}m</div>
                    <div><strong>Begrenzung Länge:</strong> {getBoundingBoxDimensions()!.length.toFixed(3)}m</div>
                    <div className="col-span-2"><strong>Begrenzungsfläche:</strong> {getBoundingBoxDimensions()!.area.toFixed(3)}m²</div>
                    
                    <div className="col-span-2 mt-1"><strong>Verfügbare Breite:</strong> {(getBoundingBoxDimensions()!.width - 2 * (measurement.pvModuleInfo!.edgeDistance || DEFAULT_EDGE_DISTANCE)).toFixed(3)}m</div>
                    <div className="col-span-2"><strong>Verfügbare Länge:</strong> {(getBoundingBoxDimensions()!.length - 2 * (measurement.pvModuleInfo!.edgeDistance || DEFAULT_EDGE_DISTANCE)).toFixed(3)}m</div>
                    
                    {measurement.pvModuleInfo!.orientation === 'portrait' ? (
                      <>
                        <div className="col-span-2 mt-1 text-blue-700 font-semibold">Hochformat-Berechnung:</div>
                        <div className="col-span-2"><strong>Berechnung Module pro Breite:</strong> 
                          <span className="text-blue-600"> floor(verfügbare Breite / (Modulbreite + Modulabstand))</span>
                        </div>
                        <div className="col-span-2"><strong>Formel:</strong> 
                          <span className="text-blue-600"> floor(
                            {(getBoundingBoxDimensions()!.width - 2 * (measurement.pvModuleInfo!.edgeDistance || DEFAULT_EDGE_DISTANCE)).toFixed(3)} / (
                            {measurement.pvModuleInfo!.moduleWidth.toFixed(3)} + 
                            {(measurement.pvModuleInfo!.moduleSpacing || DEFAULT_MODULE_SPACING).toFixed(3)})) = 
                            {Math.floor(
                              (getBoundingBoxDimensions()!.width - 2 * (measurement.pvModuleInfo!.edgeDistance || DEFAULT_EDGE_DISTANCE)) / 
                              (measurement.pvModuleInfo!.moduleWidth + (measurement.pvModuleInfo!.moduleSpacing || DEFAULT_MODULE_SPACING))
                            )}
                          </span>
                        </div>
                        <div className="col-span-2"><strong>Berechnung Reihen:</strong> 
                          <span className="text-blue-600"> floor(verfügbare Länge / (Modulhöhe + Modulabstand))</span>
                        </div>
                        <div className="col-span-2"><strong>Formel:</strong> 
                          <span className="text-blue-600"> floor(
                            {(getBoundingBoxDimensions()!.length - 2 * (measurement.pvModuleInfo!.edgeDistance || DEFAULT_EDGE_DISTANCE)).toFixed(3)} / (
                            {measurement.pvModuleInfo!.moduleHeight.toFixed(3)} + 
                            {(measurement.pvModuleInfo!.moduleSpacing || DEFAULT_MODULE_SPACING).toFixed(3)})) = 
                            {Math.floor(
                              (getBoundingBoxDimensions()!.length - 2 * (measurement.pvModuleInfo!.edgeDistance || DEFAULT_EDGE_DISTANCE)) / 
                              (measurement.pvModuleInfo!.moduleHeight + (measurement.pvModuleInfo!.moduleSpacing || DEFAULT_MODULE_SPACING))
                            )}
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="col-span-2 mt-1 text-blue-700 font-semibold">Querformat-Berechnung:</div>
                        <div className="col-span-2"><strong>Berechnung Module pro Breite:</strong> 
                          <span className="text-blue-600"> floor(verfügbare Breite / (Modulhöhe + Modulabstand))</span>
                        </div>
                        <div className="col-span-2"><strong>Formel:</strong> 
                          <span className="text-blue-600"> floor(
                            {(getBoundingBoxDimensions()!.width - 2 * (measurement.pvModuleInfo!.edgeDistance || DEFAULT_EDGE_DISTANCE)).toFixed(3)} / (
                            {measurement.pvModuleInfo!.moduleHeight.toFixed(3)} + 
                            {(measurement.pvModuleInfo!.moduleSpacing || DEFAULT_MODULE_SPACING).toFixed(3)})) = 
                            {Math.floor(
                              (getBoundingBoxDimensions()!.width - 2 * (measurement.pvModuleInfo!.edgeDistance || DEFAULT_EDGE_DISTANCE)) / 
                              (measurement.pvModuleInfo!.moduleHeight + (measurement.pvModuleInfo!.moduleSpacing || DEFAULT_MODULE_SPACING))
                            )}
                          </span>
                        </div>
                        <div className="col-span-2"><strong>Berechnung Reihen:</strong> 
                          <span className="text-blue-600"> floor(verfügbare Länge / (Modulbreite + Modulabstand))</span>
                        </div>
                        <div className="col-span-2"><strong>Formel:</strong> 
                          <span className="text-blue-600"> floor(
                            {(getBoundingBoxDimensions()!.length - 2 * (measurement.pvModuleInfo!.edgeDistance || DEFAULT_EDGE_DISTANCE)).toFixed(3)} / (
                            {measurement.pvModuleInfo!.moduleWidth.toFixed(3)} + 
                            {(measurement.pvModuleInfo!.moduleSpacing || DEFAULT_MODULE_SPACING).toFixed(3)})) = 
                            {Math.floor(
                              (getBoundingBoxDimensions()!.length - 2 * (measurement.pvModuleInfo!.edgeDistance || DEFAULT_EDGE_DISTANCE)) / 
                              (measurement.pvModuleInfo!.moduleWidth + (measurement.pvModuleInfo!.moduleSpacing || DEFAULT_MODULE_SPACING))
                            )}
                          </span>
                        </div>
                      </>
                    )}
                    <div className="col-span-2 mt-2 text-blue-700 font-semibold">Modulanzahl: {measurement.pvModuleInfo!.columns || '?'} × {measurement.pvModuleInfo!.rows || '?'} = {measurement.pvModuleInfo!.moduleCount} Module</div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      
      {isAreaMeasurement && !hasPVInfo && (
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
      
      {(isRoofElement || isPenetration) && handleMoveMeasurementUp && handleMoveMeasurementDown && (
        <div className="flex justify-end space-x-1 mt-1 mb-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => handleMoveMeasurementUp(measurement.id)}
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
                  onClick={() => handleMoveMeasurementDown(measurement.id)}
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
          isOpen={segmentsOpen[measurement.id] || false}
          toggleSegments={toggleSegments}
          onEditSegment={onEditSegment}
        />
      )}
    </div>
  );
};

export default MeasurementItem;
