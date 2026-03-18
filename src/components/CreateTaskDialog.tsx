import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useWebODMAuth } from "@/lib/auth-context";
import { createTask, getProcessingNodes, getPresets, type ProcessingNode, type Preset } from "@/lib/webodm";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, X, Loader2, CheckCircle2, AlertCircle, Server, Map, ArrowLeft, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { extractGpsFromImages, validateGpsData, type PhotoGps, type GpsValidationResult } from "@/utils/exifGps";
import { lazy, Suspense } from "react";
import GpsReviewStep from "@/components/GpsReviewStep";

const TaskBoundaryMap = lazy(() => import("@/components/TaskBoundaryMap"));

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  projectName: string;
  onTaskCreated: () => void;
}

type DialogStep = "config" | "extracting_gps" | "gps_review" | "boundary" | "uploading" | "done" | "error";

export default function CreateTaskDialog({ open, onOpenChange, projectId, projectName, onTaskCreated }: Props) {
  const { token } = useWebODMAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [step, setStep] = useState<DialogStep>("config");
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [nodes, setNodes] = useState<ProcessingNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<string>("auto");
  const [nodesLoading, setNodesLoading] = useState(false);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string>("default");
  const [presetsLoading, setPresetsLoading] = useState(false);

  // Boundary & GPS validation state
  const [gpsPhotos, setGpsPhotos] = useState<PhotoGps[]>([]);
  const [boundary, setBoundary] = useState<string | null>(null);
  const [gpsValidation, setGpsValidation] = useState<GpsValidationResult | null>(null);

  useEffect(() => {
    if (!open || !token) return;

    setNodesLoading(true);
    getProcessingNodes(token)
      .then(n => {
        setNodes(n);
        const online = n.find(nd => nd.online);
        if (online) setSelectedNode(String(online.id));
      })
      .catch(() => {})
      .finally(() => setNodesLoading(false));

    setPresetsLoading(true);
    getPresets(token)
      .then(p => setPresets(p))
      .catch(() => {})
      .finally(() => setPresetsLoading(false));
  }, [open, token]);

  const reset = useCallback(() => {
    setName("");
    setFiles([]);
    setStep("config");
    setProgress(0);
    setErrorMsg("");
    setGpsPhotos([]);
    setBoundary(null);
    setGpsValidation(null);
  }, []);

  const handleClose = useCallback((val: boolean) => {
    if (step === "uploading" || step === "extracting_gps") return;
    if (!val) reset();
    onOpenChange(val);
  }, [step, reset, onOpenChange]);

  const proceedToBoundary = useCallback((photosToUse: PhotoGps[]) => {
    setGpsPhotos(photosToUse);
    if (photosToUse.length === 0) {
      toast.info("Keine GPS-Daten in den Bildern gefunden. Karte wird übersprungen.");
      handleStartUpload();
      return;
    }
    setStep("boundary");
  }, []);

  const handleFiles = useCallback((newFiles: FileList | null) => {
    if (!newFiles) return;
    const imageFiles = Array.from(newFiles).filter(f =>
      /\.(jpg|jpeg)$/i.test(f.name) || f.type === "image/jpeg"
    );
    setFiles(prev => [...prev, ...imageFiles]);
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const totalSizeMB = files.reduce((sum, f) => sum + f.size, 0) / (1024 * 1024);

  const MAX_THUMBNAILS = 23;
  const thumbnails = useMemo(() => {
    const subset = files.slice(0, MAX_THUMBNAILS);
    return subset.map(file => ({ file, url: URL.createObjectURL(file) }));
  }, [files]);

  useEffect(() => {
    return () => { thumbnails.forEach(t => URL.revokeObjectURL(t.url)); };
  }, [thumbnails]);

  // Step: Extract GPS, validate, then proceed
  const handleNextToBoundary = useCallback(async () => {
    if (files.length < 2) return;
    setStep("extracting_gps");

    try {
      const photos = await extractGpsFromImages(files);
      setGpsPhotos(photos);

      const validation = validateGpsData(files, photos);
      setGpsValidation(validation);

      const hasProblems = validation.noGps.length > 0 || validation.outliers.length > 0;

      if (hasProblems) {
        setStep("gps_review");
        return;
      }

      // No problems → proceed directly
      if (photos.length === 0) {
        toast.info("Keine GPS-Daten in den Bildern gefunden. Karte wird übersprungen.");
        setStep("config");
        return;
      }

      setStep("boundary");
    } catch {
      toast.error("Fehler beim Lesen der GPS-Daten.");
      setStep("config");
    }
  }, [files]);

  const handleRemoveFlagged = useCallback(() => {
    if (!gpsValidation) return;
    const flaggedFiles = new Set([
      ...gpsValidation.noGps,
      ...gpsValidation.outliers.map((o) => o.file),
    ]);
    const cleanedFiles = files.filter((f) => !flaggedFiles.has(f));
    setFiles(cleanedFiles);
    setGpsPhotos(gpsValidation.valid);
    setGpsValidation(null);

    if (cleanedFiles.length < 2) {
      toast.warning("Nach dem Entfernen sind weniger als 2 Bilder übrig.");
      setStep("config");
      return;
    }

    proceedToBoundary(gpsValidation.valid);
  }, [gpsValidation, files, proceedToBoundary]);

  const handleContinueDespiteGps = useCallback(() => {
    setGpsValidation(null);
    proceedToBoundary(gpsPhotos);
  }, [gpsPhotos, proceedToBoundary]);

  const buildOptions = useCallback(() => {
    const fallbackOptions = [
      { name: "auto-boundary", value: "true" },
      { name: "auto-boundary-distance", value: "5" },
      { name: "dem-gapfill-steps", value: "3" },
      { name: "dsm", value: "true" },
      { name: "dtm", value: "true" },
      { name: "mesh-octree-depth", value: "11" },
      { name: "mesh-size", value: "200000" },
      { name: "min-num-features", value: "10000" },
      { name: "optimize-disk-space", value: "true" },
      { name: "pc-classify", value: "true" },
      { name: "pc-quality", value: "high" },
      { name: "skip-report", value: "true" },
    ];

    let options = fallbackOptions;
    if (selectedPreset !== "default") {
      const preset = presets.find(p => String(p.id) === selectedPreset);
      if (preset) options = [...preset.options];
    }

    // If user drew a boundary, replace auto-boundary with explicit boundary
    if (boundary) {
      options = options.filter(o => o.name !== "auto-boundary" && o.name !== "auto-boundary-distance");
      options.push({ name: "boundary", value: boundary });
    }

    return options;
  }, [selectedPreset, presets, boundary]);

  const handleStartUpload = useCallback(async () => {
    if (!token || files.length < 2) return;

    setStep("uploading");
    setProgress(0);
    setErrorMsg("");

    try {
      const options = buildOptions();
      const nodeId = selectedNode !== "auto" ? Number(selectedNode) : null;
      await createTask(token, projectId, name || `Task ${new Date().toLocaleDateString("de")}`, files, options, (pct) => {
        setProgress(pct);
      }, nodeId);
      setStep("done");
      toast.success("Task erstellt – die Verarbeitung wurde gestartet.");
      onTaskCreated();
      setTimeout(() => handleClose(false), 1500);
    } catch (err) {
      setStep("error");
      setErrorMsg(err instanceof Error ? err.message : "Unbekannter Fehler");
    }
  }, [token, files, name, projectId, selectedNode, buildOptions, onTaskCreated, handleClose]);

  const handleBoundaryChange = useCallback((geojson: string | null) => {
    setBoundary(geojson);
  }, []);

  const isUploading = step === "uploading";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={`bg-card border-border max-h-[85vh] flex flex-col ${step === "boundary" ? "sm:max-w-2xl" : "sm:max-w-lg"}`}>
        <DialogHeader>
          <DialogTitle>
            {step === "boundary" ? "Verarbeitungsbereich" : step === "gps_review" ? "GPS-Prüfung" : "Neuer Task"}
          </DialogTitle>
          <DialogDescription>
            {step === "boundary" ? (
              <>
                {gpsPhotos.length} Foto-Positionen auf der Karte. Optional einen Zuschnittbereich zeichnen.
              </>
            ) : (
              <>
                Drohnenaufnahmen in <span className="font-medium text-foreground">{projectName}</span> hochladen und verarbeiten lassen.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {step === "done" ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <CheckCircle2 className="h-12 w-12 text-emerald-500" />
            <p className="text-sm font-medium">Task erfolgreich erstellt!</p>
            <p className="text-xs text-muted-foreground">Die Verarbeitung wird automatisch gestartet.</p>
          </div>
        ) : step === "error" ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <p className="text-sm font-medium text-destructive">Fehler bei der Erstellung</p>
            <p className="text-xs text-muted-foreground max-w-sm text-center">{errorMsg}</p>
            <Button variant="outline" size="sm" onClick={() => setStep("config")}>
              Erneut versuchen
            </Button>
          </div>
        ) : step === "extracting_gps" ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">GPS-Daten werden aus {files.length} Bildern gelesen…</p>
          </div>
        ) : step === "boundary" ? (
          <div className="flex-1 min-h-0 overflow-y-auto">
            <Suspense fallback={
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            }>
              <TaskBoundaryMap photos={gpsPhotos} onBoundaryChange={handleBoundaryChange} />
            </Suspense>
          </div>
        ) : (
          /* step === "config" */
          <div className="space-y-4 overflow-y-auto flex-1 min-h-0 pr-1">
            {/* Task name */}
            <div className="space-y-2">
              <Label htmlFor="task-name">Bezeichnung</Label>
              <Input
                id="task-name"
                placeholder="z.B. Dachvermessung Hauptgebäude"
                value={name}
                onChange={e => setName(e.target.value)}
                disabled={isUploading}
              />
            </div>

            {/* Processing node */}
            <div className="space-y-2">
              <Label>Verarbeitungsknoten</Label>
              {nodesLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Knoten werden geladen…
                </div>
              ) : nodes.length > 0 ? (
                <Select value={selectedNode} onValueChange={setSelectedNode} disabled={isUploading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Knoten wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Automatisch</SelectItem>
                    {nodes.map(node => (
                      <SelectItem key={node.id} value={String(node.id)}>
                        <span className="flex items-center gap-2">
                          <span className={`inline-block h-2 w-2 rounded-full ${node.online ? "bg-emerald-500" : "bg-destructive"}`} />
                          {node.label || `${node.hostname}:${node.port}`}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Server className="h-3.5 w-3.5" />
                  Kein Verarbeitungsknoten verfügbar
                </p>
              )}
            </div>

            {/* Preset */}
            <div className="space-y-2">
              <Label>Verarbeitungsprofil</Label>
              {presetsLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Profile werden geladen…
                </div>
              ) : (
                <Select value={selectedPreset} onValueChange={setSelectedPreset} disabled={isUploading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Profil wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Standard (Vermessung)</SelectItem>
                    {presets.map(preset => (
                      <SelectItem key={preset.id} value={String(preset.id)}>
                        {preset.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* File upload area */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Drohnenaufnahmen</Label>
                {files.length > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">
                      {files.length} Bilder · {totalSizeMB.toFixed(0)} MB
                    </span>
                    {!isUploading && (
                      <Button variant="ghost" size="sm" onClick={() => setFiles([])} className="text-xs text-muted-foreground h-6 px-1.5">
                        Alle entfernen
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {files.length === 0 ? (
                <div
                  onDrop={handleDrop}
                  onDragOver={e => e.preventDefault()}
                  onClick={() => !isUploading && fileInputRef.current?.click()}
                  className="relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-6 cursor-pointer transition-colors hover:border-primary/50 hover:bg-primary/5"
                >
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground text-center">
                    Bilder hierher ziehen oder <span className="text-primary font-medium">durchsuchen</span>
                  </p>
                  <p className="text-xs text-muted-foreground text-center">Nur JPEG-Dateien</p>
                  <p className="text-xs text-muted-foreground/70 text-center max-w-xs mt-1">
                    Bitte nur die originalen Drohnenaufnahmen verwenden. Für ein Einfamilienhaus empfehlen wir ca. 60–80 Fotos.
                  </p>
                </div>
              ) : (
                <div
                  onDrop={handleDrop}
                  onDragOver={e => e.preventDefault()}
                  className={`rounded-lg border-2 border-dashed border-primary/30 p-2 transition-colors ${isUploading ? "pointer-events-none opacity-60" : ""}`}
                >
                  <div className="grid grid-cols-5 sm:grid-cols-6 gap-1.5 max-h-36 overflow-y-auto pr-0.5">
                    {thumbnails.map(({ file, url }, i) => (
                      <div key={`${file.name}-${i}`} className="group relative aspect-square rounded-md overflow-hidden bg-secondary/30">
                        <img src={url} alt={file.name} className="h-full w-full object-cover" />
                        {!isUploading && (
                          <button
                            onClick={() => removeFile(i)}
                            className="absolute top-0.5 right-0.5 rounded-full bg-background/80 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ))}
                    {files.length > MAX_THUMBNAILS && (
                      <div className="aspect-square rounded-md bg-secondary/40 flex items-center justify-center">
                        <span className="text-xs text-muted-foreground font-medium">+{files.length - MAX_THUMBNAILS}</span>
                      </div>
                    )}
                    {!isUploading && (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="aspect-square rounded-md border-2 border-dashed border-border flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-colors hover:border-primary/50 hover:bg-primary/5"
                      >
                        <Upload className="h-4 w-4 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">Mehr</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,image/jpeg"
                multiple
                className="hidden"
                onChange={e => handleFiles(e.target.files)}
              />
            </div>

            {/* Upload progress (shown when uploading without boundary step) */}
            {step === "uploading" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Wird hochgeladen…
                  </span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}
          </div>
        )}

        {/* Upload progress for boundary step */}
        {step === "uploading" && (
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Wird hochgeladen…
              </span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Footer buttons */}
        {step === "config" && (
          <DialogFooter>
            <Button variant="ghost" onClick={() => handleClose(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={handleNextToBoundary}
              disabled={files.length < 2}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Map className="mr-2 h-4 w-4" />
              Weiter – Bereich wählen
            </Button>
          </DialogFooter>
        )}

        {step === "boundary" && (
          <DialogFooter className="flex-row justify-between sm:justify-between">
            <Button variant="ghost" onClick={() => setStep("config")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Zurück
            </Button>
            <Button
              onClick={handleStartUpload}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Upload className="mr-2 h-4 w-4" />
              {boundary ? "Mit Zuschnitt starten" : "Ohne Zuschnitt starten"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
