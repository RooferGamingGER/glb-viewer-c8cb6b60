
import React, { useState } from 'react';
import { Measurement } from '@/types/measurements';
import MeasurementList from './MeasurementList';
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Trash2, Eye, EyeOff } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
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

interface EnhancedMeasurementSidebarProps {
  measurements: Measurement[];
  toggleMeasurementVisibility: (id: string) => void;
  toggleLabelVisibility: (id: string) => void;
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
  toggleAllLabelsVisibility: () => void;
  allLabelsVisible?: boolean;
  activeMode?: string;
  handleMoveMeasurementUp?: (id: string) => void;
  handleMoveMeasurementDown?: (id: string) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  className?: string;
}

function EnhancedMeasurementSidebar({
  measurements,
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
  showTable,
  handleClearMeasurements,
  toggleAllLabelsVisibility,
  allLabelsVisible = true,
  activeMode,
  handleMoveMeasurementUp,
  handleMoveMeasurementDown,
  isOpen,
  setIsOpen,
  className,
}: EnhancedMeasurementSidebarProps) {
  const isMobile = useIsMobile();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<'length' | 'area' | 'other'>('length');

  // Filter measurements by type
  const lengthMeasurements = measurements.filter(m => ['length', 'height'].includes(m.type));
  const areaMeasurements = measurements.filter(m => ['area', 'solar', 'skylight', 'chimney', 'pvmodule'].includes(m.type));
  const otherMeasurements = measurements.filter(m => !['length', 'height', 'area', 'solar', 'skylight', 'chimney', 'pvmodule'].includes(m.type));

  // Get counts for tab indicators
  const lengthCount = lengthMeasurements.length;
  const areaCount = areaMeasurements.length;
  const otherCount = otherMeasurements.length;

  // For mobile, use a full-screen sheet
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="left" className="w-full sm:w-[400px] p-0 overflow-hidden">
          <SheetHeader className="p-4 pb-2 border-b">
            <SheetTitle className="text-lg font-semibold flex items-center justify-between">
              <span>Messungen</span>
              <span className="text-sm font-normal text-muted-foreground">
                {measurements.length} {measurements.length === 1 ? 'Messung' : 'Messungen'}
              </span>
            </SheetTitle>
          </SheetHeader>

          <div className="p-4">
            <Tabs 
              defaultValue="length" 
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as 'length' | 'area' | 'other')}
              className="w-full"
            >
              <TabsList className="grid grid-cols-3">
                <TabsTrigger value="length" className="relative">
                  Längen
                  {lengthCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                      {lengthCount}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="area" className="relative">
                  Flächen
                  {areaCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                      {areaCount}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="other" className="relative">
                  Sonstiges
                  {otherCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                      {otherCount}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="h-[calc(100vh-180px)] mt-2">
                <TabsContent value="length">
                  {lengthMeasurements.length > 0 ? (
                    <MeasurementList
                      measurements={lengthMeasurements}
                      toggleMeasurementVisibility={toggleMeasurementVisibility}
                      toggleLabelVisibility={toggleLabelVisibility}
                      handleStartPointEdit={handleStartPointEdit}
                      handleDeleteMeasurement={handleDeleteMeasurement}
                      handleDeletePoint={handleDeletePoint}
                      updateMeasurement={updateMeasurement}
                      editMeasurementId={editMeasurementId}
                      segmentsOpen={segmentsOpen}
                      toggleSegments={toggleSegments}
                      onEditSegment={onEditSegment}
                      movingPointInfo={movingPointInfo}
                      handleMoveMeasurementUp={handleMoveMeasurementUp}
                      handleMoveMeasurementDown={handleMoveMeasurementDown}
                    />
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>Keine Längenmessungen vorhanden</p>
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="area">
                  {areaMeasurements.length > 0 ? (
                    <MeasurementList
                      measurements={areaMeasurements}
                      toggleMeasurementVisibility={toggleMeasurementVisibility}
                      toggleLabelVisibility={toggleLabelVisibility}
                      handleStartPointEdit={handleStartPointEdit}
                      handleDeleteMeasurement={handleDeleteMeasurement}
                      handleDeletePoint={handleDeletePoint}
                      updateMeasurement={updateMeasurement}
                      editMeasurementId={editMeasurementId}
                      segmentsOpen={segmentsOpen}
                      toggleSegments={toggleSegments}
                      onEditSegment={onEditSegment}
                      movingPointInfo={movingPointInfo}
                      handleMoveMeasurementUp={handleMoveMeasurementUp}
                      handleMoveMeasurementDown={handleMoveMeasurementDown}
                    />
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>Keine Flächenmessungen vorhanden</p>
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="other">
                  {otherMeasurements.length > 0 ? (
                    <MeasurementList
                      measurements={otherMeasurements}
                      toggleMeasurementVisibility={toggleMeasurementVisibility}
                      toggleLabelVisibility={toggleLabelVisibility}
                      handleStartPointEdit={handleStartPointEdit}
                      handleDeleteMeasurement={handleDeleteMeasurement}
                      handleDeletePoint={handleDeletePoint}
                      updateMeasurement={updateMeasurement}
                      editMeasurementId={editMeasurementId}
                      segmentsOpen={segmentsOpen}
                      toggleSegments={toggleSegments}
                      onEditSegment={onEditSegment}
                      movingPointInfo={movingPointInfo}
                      handleMoveMeasurementUp={handleMoveMeasurementUp}
                      handleMoveMeasurementDown={handleMoveMeasurementDown}
                    />
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>Keine sonstigen Messungen vorhanden</p>
                    </div>
                  )}
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </div>

          <div className="fixed bottom-0 left-0 w-full p-4 bg-background border-t flex justify-between items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleAllLabelsVisibility}
              title={allLabelsVisible ? 'Alle Beschriftungen ausblenden' : 'Alle Beschriftungen einblenden'}
            >
              {allLabelsVisible ? (
                <>
                  <EyeOff className="h-4 w-4 mr-2" />
                  <span>Beschriftungen ausblenden</span>
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  <span>Beschriftungen einblenden</span>
                </>
              )}
            </Button>

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  <span>Alle löschen</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Alle Messungen löschen</AlertDialogTitle>
                  <AlertDialogDescription>
                    Sind Sie sicher? Diese Aktion kann nicht rückgängig gemacht werden.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleClearMeasurements}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Löschen
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // For desktop, use a collapsible sidebar
  return (
    <div className={cn(
      "fixed left-0 top-0 z-40 h-screen transition-transform duration-300",
      isOpen ? "translate-x-0" : "-translate-x-[350px]",
      className
    )}>
      <div className="flex h-full">
        <div className="w-[350px] bg-background border-r border-border flex flex-col">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="text-lg font-semibold">Messungen</h2>
            <span className="text-sm text-muted-foreground">
              {measurements.length} {measurements.length === 1 ? 'Messung' : 'Messungen'}
            </span>
          </div>

          <div className="p-4">
            <Tabs 
              defaultValue="length" 
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as 'length' | 'area' | 'other')}
              className="w-full"
            >
              <TabsList className="grid grid-cols-3">
                <TabsTrigger value="length" className="relative">
                  Längen
                  {lengthCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                      {lengthCount}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="area" className="relative">
                  Flächen
                  {areaCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                      {areaCount}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="other" className="relative">
                  Sonstiges
                  {otherCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                      {otherCount}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="h-[calc(100vh-180px)] mt-2">
                <TabsContent value="length">
                  {lengthMeasurements.length > 0 ? (
                    <MeasurementList
                      measurements={lengthMeasurements}
                      toggleMeasurementVisibility={toggleMeasurementVisibility}
                      toggleLabelVisibility={toggleLabelVisibility}
                      handleStartPointEdit={handleStartPointEdit}
                      handleDeleteMeasurement={handleDeleteMeasurement}
                      handleDeletePoint={handleDeletePoint}
                      updateMeasurement={updateMeasurement}
                      editMeasurementId={editMeasurementId}
                      segmentsOpen={segmentsOpen}
                      toggleSegments={toggleSegments}
                      onEditSegment={onEditSegment}
                      movingPointInfo={movingPointInfo}
                      handleMoveMeasurementUp={handleMoveMeasurementUp}
                      handleMoveMeasurementDown={handleMoveMeasurementDown}
                    />
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>Keine Längenmessungen vorhanden</p>
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="area">
                  {areaMeasurements.length > 0 ? (
                    <MeasurementList
                      measurements={areaMeasurements}
                      toggleMeasurementVisibility={toggleMeasurementVisibility}
                      toggleLabelVisibility={toggleLabelVisibility}
                      handleStartPointEdit={handleStartPointEdit}
                      handleDeleteMeasurement={handleDeleteMeasurement}
                      handleDeletePoint={handleDeletePoint}
                      updateMeasurement={updateMeasurement}
                      editMeasurementId={editMeasurementId}
                      segmentsOpen={segmentsOpen}
                      toggleSegments={toggleSegments}
                      onEditSegment={onEditSegment}
                      movingPointInfo={movingPointInfo}
                      handleMoveMeasurementUp={handleMoveMeasurementUp}
                      handleMoveMeasurementDown={handleMoveMeasurementDown}
                    />
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>Keine Flächenmessungen vorhanden</p>
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="other">
                  {otherMeasurements.length > 0 ? (
                    <MeasurementList
                      measurements={otherMeasurements}
                      toggleMeasurementVisibility={toggleMeasurementVisibility}
                      toggleLabelVisibility={toggleLabelVisibility}
                      handleStartPointEdit={handleStartPointEdit}
                      handleDeleteMeasurement={handleDeleteMeasurement}
                      handleDeletePoint={handleDeletePoint}
                      updateMeasurement={updateMeasurement}
                      editMeasurementId={editMeasurementId}
                      segmentsOpen={segmentsOpen}
                      toggleSegments={toggleSegments}
                      onEditSegment={onEditSegment}
                      movingPointInfo={movingPointInfo}
                      handleMoveMeasurementUp={handleMoveMeasurementUp}
                      handleMoveMeasurementDown={handleMoveMeasurementDown}
                    />
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>Keine sonstigen Messungen vorhanden</p>
                    </div>
                  )}
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </div>

          <div className="mt-auto p-4 border-t flex justify-between items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleAllLabelsVisibility}
              title={allLabelsVisible ? 'Alle Beschriftungen ausblenden' : 'Alle Beschriftungen einblenden'}
            >
              {allLabelsVisible ? (
                <>
                  <EyeOff className="h-4 w-4 mr-2" />
                  <span>Beschriftungen ausblenden</span>
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  <span>Beschriftungen einblenden</span>
                </>
              )}
            </Button>

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  <span>Alle löschen</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Alle Messungen löschen</AlertDialogTitle>
                  <AlertDialogDescription>
                    Sind Sie sicher? Diese Aktion kann nicht rückgängig gemacht werden.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleClearMeasurements}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Löschen
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <button
          className="h-12 w-8 bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center rounded-r-md mt-16"
          onClick={() => setIsOpen(!isOpen)}
          title={isOpen ? 'Seitenleiste schließen' : 'Seitenleiste öffnen'}
        >
          {isOpen ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
}

export default EnhancedMeasurementSidebar;
