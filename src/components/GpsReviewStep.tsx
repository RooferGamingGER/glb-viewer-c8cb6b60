import { AlertTriangle, MapPin, ImageOff, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { GpsValidationResult } from "@/utils/exifGps";

interface Props {
  validation: GpsValidationResult;
  totalFiles: number;
  onRemoveFlagged: () => void;
  onContinue: () => void;
}

function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

export default function GpsReviewStep({ validation, totalFiles, onRemoveFlagged, onContinue }: Props) {
  const { noGps, outliers } = validation;
  const flaggedCount = noGps.length + outliers.length;

  // Check if first two files are among flagged
  const firstTwoFlagged = noGps.length >= 1 || outliers.some((o, _i) => {
    const name = o.file.name;
    // Crude check: DJI naming convention often starts with DJI_0001, etc.
    return /^(DJI_0{0,3}[12]|IMG_0{0,3}[12]|DSC_0{0,3}[12])/i.test(name);
  });

  return (
    <div className="space-y-4">
      <Card className="border-amber-500/50 bg-amber-500/5">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-foreground">
                {flaggedCount} von {totalFiles} Bildern auffällig
              </p>
              <p className="text-xs text-muted-foreground">
                Bilder ohne GPS-Daten oder mit stark abweichenden Positionen können zu Verarbeitungsfehlern führen.
              </p>
              {firstTwoFlagged && (
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-1">
                  💡 Die ersten Aufnahmen einer Drohnenflug-Session haben häufig fehlerhafte GPS-Daten. Wir empfehlen, diese zu entfernen.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <ScrollArea className="max-h-48">
        <div className="space-y-1.5 pr-2">
          {noGps.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <ImageOff className="h-3.5 w-3.5" />
                Ohne GPS-Daten ({noGps.length})
              </p>
              {noGps.map((file, i) => (
                <div
                  key={`no-gps-${i}`}
                  className="flex items-center justify-between rounded-md bg-secondary/40 px-3 py-1.5 text-xs"
                >
                  <span className="truncate max-w-[250px]">{file.name}</span>
                  <span className="text-destructive font-medium shrink-0 ml-2">Kein GPS</span>
                </div>
              ))}
            </div>
          )}

          {outliers.length > 0 && (
            <div className="space-y-1 mt-2">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                GPS-Ausreißer ({outliers.length})
              </p>
              {outliers.map((o, i) => (
                <div
                  key={`outlier-${i}`}
                  className="flex items-center justify-between rounded-md bg-secondary/40 px-3 py-1.5 text-xs"
                >
                  <span className="truncate max-w-[200px]">{o.file.name}</span>
                  <span className="text-amber-600 dark:text-amber-400 font-medium shrink-0 ml-2">
                    {formatDistance(o.distanceMeters)} entfernt
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="flex gap-2 pt-1">
        <Button
          variant="destructive"
          size="sm"
          className="flex-1"
          onClick={onRemoveFlagged}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {flaggedCount} Bilder entfernen
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={onContinue}
        >
          Trotzdem fortfahren
        </Button>
      </div>
    </div>
  );
}
