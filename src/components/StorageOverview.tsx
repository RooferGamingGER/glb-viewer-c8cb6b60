import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { HardDrive, Database, Loader2 } from "lucide-react";
import { getProjects, getProjectTasks, formatFileSize, type Task } from "@/lib/webodm";
import { listSavedMeasurements } from "@/utils/measurementStorage";

interface StorageOverviewProps {
  token: string;
  username?: string;
}

const MAX_MEASUREMENTS = 100;

const StorageOverview: React.FC<StorageOverviewProps> = ({ token, username }) => {
  const [serverStorageMB, setServerStorageMB] = useState<number | null>(null);
  const [measurementCount, setMeasurementCount] = useState<number | null>(null);
  const [loadingServer, setLoadingServer] = useState(true);
  const [loadingMeasurements, setLoadingMeasurements] = useState(true);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    // Fetch all projects → all tasks → sum sizes
    (async () => {
      try {
        const projects = await getProjects(token);
        let totalMB = 0;
        const taskPromises = projects.map((p) => getProjectTasks(token, p.id));
        const taskArrays = await Promise.all(taskPromises);
        for (const tasks of taskArrays) {
          for (const t of tasks) {
            totalMB += t.size || 0;
          }
        }
        if (!cancelled) setServerStorageMB(totalMB);
      } catch {
        if (!cancelled) setServerStorageMB(0);
      } finally {
        if (!cancelled) setLoadingServer(false);
      }
    })();

    // Fetch saved measurements count
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
      {/* Server Storage */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <HardDrive className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Server-Speicher</p>
              <p className="text-xs text-muted-foreground">Gesamter Speicherverbrauch aller Tasks</p>
            </div>
          </div>
          {loadingServer ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Wird berechnet…
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-2xl font-bold tracking-tight">
                {formatFileSize(serverStorageMB ?? 0)}
              </p>
              <p className="text-xs text-muted-foreground">
                über alle Projekte und Tasks
              </p>
            </div>
          )}
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
