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
import { Upload, X, Loader2, CheckCircle2, AlertCircle, Server } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  projectName: string;
  onTaskCreated: () => void;
}

type UploadState = "idle" | "uploading" | "done" | "error";

export default function CreateTaskDialog({ open, onOpenChange, projectId, projectName, onTaskCreated }: Props) {
  const { token } = useWebODMAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [state, setState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [nodes, setNodes] = useState<ProcessingNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<string>("auto");
  const [nodesLoading, setNodesLoading] = useState(false);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string>("default");
  const [presetsLoading, setPresetsLoading] = useState(false);

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
    setState("idle");
    setProgress(0);
    setErrorMsg("");
  }, []);

  const handleClose = useCallback((val: boolean) => {
    if (state === "uploading") return;
    if (!val) reset();
    onOpenChange(val);
  }, [state, reset, onOpenChange]);

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

  const handleSubmit = useCallback(async () => {
    if (!token || files.length < 2) return;

    setState("uploading");
    setProgress(0);
    setErrorMsg("");

    try {
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
        if (preset) options = preset.options;
      }

      const nodeId = selectedNode !== "auto" ? Number(selectedNode) : null;
      await createTask(token, projectId, name || `Task ${new Date().toLocaleDateString("de")}`, files, options, (pct) => {
        setProgress(pct);
      }, nodeId);
      setState("done");
      toast.success("Task erstellt – die Verarbeitung wurde gestartet.");
      onTaskCreated();
      setTimeout(() => handleClose(false), 1500);
    } catch (err) {
      setState("error");
      setErrorMsg(err instanceof Error ? err.message : "Unbekannter Fehler");
    }
  }, [token, files, name, projectId, selectedPreset, presets, selectedNode, onTaskCreated, handleClose]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg bg-card border-border max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Neuer Task</DialogTitle>
          <DialogDescription>
            Drohnenaufnahmen in <span className="font-medium text-foreground">{projectName}</span> hochladen und verarbeiten lassen.
          </DialogDescription>
        </DialogHeader>

        {state === "done" ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <CheckCircle2 className="h-12 w-12 text-emerald-500" />
            <p className="text-sm font-medium">Task erfolgreich erstellt!</p>
            <p className="text-xs text-muted-foreground">Die Verarbeitung wird automatisch gestartet.</p>
          </div>
        ) : state === "error" ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <p className="text-sm font-medium text-destructive">Fehler bei der Erstellung</p>
            <p className="text-xs text-muted-foreground max-w-sm text-center">{errorMsg}</p>
            <Button variant="outline" size="sm" onClick={() => setState("idle")}>
              Erneut versuchen
            </Button>
          </div>
        ) : (
          <div className="space-y-4 overflow-y-auto flex-1 min-h-0 pr-1">
            {/* Task name */}
            <div className="space-y-2">
              <Label htmlFor="task-name">Bezeichnung</Label>
              <Input
                id="task-name"
                placeholder="z.B. Dachvermessung Hauptgebäude"
                value={name}
                onChange={e => setName(e.target.value)}
                disabled={state === "uploading"}
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
                <Select value={selectedNode} onValueChange={setSelectedNode} disabled={state === "uploading"}>
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
                <Select value={selectedPreset} onValueChange={setSelectedPreset} disabled={state === "uploading"}>
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
                    {state !== "uploading" && (
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
                  onClick={() => state !== "uploading" && fileInputRef.current?.click()}
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
                  className={`rounded-lg border-2 border-dashed border-primary/30 p-2 transition-colors ${state === "uploading" ? "pointer-events-none opacity-60" : ""}`}
                >
                  <div className="grid grid-cols-5 sm:grid-cols-6 gap-1.5 max-h-36 overflow-y-auto pr-0.5">
                    {thumbnails.map(({ file, url }, i) => (
                      <div key={`${file.name}-${i}`} className="group relative aspect-square rounded-md overflow-hidden bg-secondary/30">
                        <img src={url} alt={file.name} className="h-full w-full object-cover" />
                        {state !== "uploading" && (
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
                    {state !== "uploading" && (
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

            {/* Upload progress */}
            {state === "uploading" && (
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

        {state !== "done" && state !== "error" && (
          <DialogFooter>
            <Button variant="ghost" onClick={() => handleClose(false)} disabled={state === "uploading"}>
              Abbrechen
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={files.length < 2 || state === "uploading"}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {state === "uploading" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Hochladen…
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Task erstellen
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
