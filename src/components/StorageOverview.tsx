import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { HardDrive, Database, Loader2, Folder } from "lucide-react";
import { listSavedMeasurements } from "@/utils/measurementStorage";
import { type Project } from "@/lib/webodm";

interface StorageOverviewProps {
  token: string;
  username?: string;
  projects: Project[];
}

const MAX_MEASUREMENTS = 100;

const StorageOverview: React.FC<StorageOverviewProps> = ({ token, username, projects }) => {
  const [measurementCount, setMeasurementCount] = useState<number | null>(null);
  const [loadingMeasurements, setLoadingMeasurements] = useState(true);

  const totalTasks = projects.reduce((sum, p) => sum + (p.tasks?.length || 0), 0);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    (async () => {
      try {
        const result = await listSavedMeasurements(token, username);
        if (!cancelled) setMeasurementCount(result.count);
      } catch {
        if (!cancelled) setMeasurementCount(0);
      } finally {
        if (!cancelled) setLoadingMeasurements(false);
      }
    })();

    return () => { cancelled = true; };
  }, [token, username]);

  const measurementPct = measurementCount != null
    ? Math.round((measurementCount / MAX_MEASUREMENTS) * 100)
    : 0;

  return (
    <div className="grid gap-4 sm:grid-cols-2 mb-6">
      {/* Server Overview */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <HardDrive className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Server-Übersicht</p>
              <p className="text-xs text-muted-foreground">Projekte & Tasks auf dem Server</p>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-2xl font-bold tracking-tight">{projects.length}</p>
                <p className="text-xs text-muted-foreground">Projekte</p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div>
                <p className="text-2xl font-bold tracking-tight">{totalTasks}</p>
                <p className="text-xs text-muted-foreground">Tasks</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Saved Measurements */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Database className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Gespeicherte Messungen</p>
              <p className="text-xs text-muted-foreground">
                {measurementCount ?? 0} von {MAX_MEASUREMENTS} Slots belegt
              </p>
            </div>
          </div>
          {loadingMeasurements ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Wird geladen…
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-end justify-between">
                <p className="text-2xl font-bold tracking-tight">
                  {measurementCount}
                  <span className="text-sm font-normal text-muted-foreground ml-1">
                    / {MAX_MEASUREMENTS}
                  </span>
                </p>
                <span className="text-xs text-muted-foreground">{measurementPct}%</span>
              </div>
              <Progress
                value={measurementPct}
                className={`h-2 ${measurementPct > 80 ? "[&>div]:bg-destructive" : ""}`}
              />
              {measurementPct > 80 && (
                <p className="text-xs text-destructive">
                  Speicher fast voll – ältere Messungen löschen empfohlen
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StorageOverview;
