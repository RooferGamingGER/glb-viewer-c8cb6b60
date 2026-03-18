import React, { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { useWebODMAuth, SERVERS } from "@/lib/auth-context";
import {
  getProjects,
  getProjectTasks,
  downloadGlbAsBlob,
  downloadAssetAsFile,
  getTaskShots,
  loadThumbnailBlob,
  downloadImageAsFile,
  findGlbAsset,
  getFilteredAssets,
  getAssetLabel,
  formatFileSize,
  getProcessingStage,
  getProcessingStageInfo,
  deleteTask,
  TASK_STATUS,
  PENDING_ACTION,
  ASSET_INFO,
  type Project,
  type Task,
  type ShotsGeoJSON,
} from "@/lib/webodm";
import CreateTaskDialog from "@/components/CreateTaskDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  ArrowLeft,
  Box,
  Camera,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Folder,
  FolderOpen,
  HardDrive,
  Hash,
  Image as ImageIcon,
  LayoutGrid,
  Loader2,
  LogOut,
  Mail,
  Map,
  MapPin,
  Database,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { de } from "date-fns/locale";

type View =
  | { type: "projects" }
  | { type: "tasks"; project: Project }
  | { type: "taskDetail"; project: Project; task: Task };

const statusColorClass = (color: string) =>
  color === "success"
    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
    : color === "warning"
      ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
      : color === "info"
        ? "bg-sky-500/20 text-sky-400 border-sky-500/30"
        : color === "destructive"
          ? "bg-destructive/20 text-destructive border-destructive/30"
          : "bg-muted text-muted-foreground border-border";

const categoryIcon = (cat: string) => {
  switch (cat) {
    case "map": return <Map className="h-4 w-4 text-primary" />;
    case "3d": return <Box className="h-4 w-4 text-primary" />;
    case "data": return <Database className="h-4 w-4 text-primary" />;
    default: return <FileText className="h-4 w-4 text-primary" />;
  }
};

const ServerProjects = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { token, username, logout, isAuthenticated, sessions, activeServer, setActiveServer } = useWebODMAuth();
  const hasMultipleServers = sessions.length > 1;

  const [view, setView] = useState<View>({ type: "projects" });
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const glbInputRef = useRef<HTMLInputElement>(null);

  const handleGlbUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = '';
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.glb')) {
      toast.error('Bitte eine gültige GLB-Datei auswählen.');
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      toast.error('Datei zu groß. Maximale Größe: 100 MB.');
      return;
    }
    try {
      const header = new Uint8Array(await file.slice(0, 4).arrayBuffer());
      if (header[0] !== 0x67 || header[1] !== 0x6C || header[2] !== 0x54 || header[3] !== 0x46) {
        toast.error('Ungültiges Dateiformat – keine gültige GLB-Datei.');
        return;
      }
    } catch {
      toast.error('Datei konnte nicht geprüft werden.');
      return;
    }
    const blobUrl = URL.createObjectURL(file);
    const params = new URLSearchParams({ fileUrl: blobUrl, fileName: file.name, rotateModel: 'true' });
    navigate(`/viewer?${params.toString()}`);
  };

  useEffect(() => {
    if (!isAuthenticated) navigate("/server-login", { replace: true });
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setView({ type: "projects" });
    setTasks([]);
    getProjects(token)
      .then((loadedProjects) => {
        setProjects(loadedProjects);
        
        // If returning from Viewer with returnToTask state, navigate to that task
        const state = location.state as { returnToTask?: { projectId: string; taskId: string } } | null;
        if (state?.returnToTask) {
          const { projectId, taskId } = state.returnToTask;
          const project = loadedProjects.find((p: Project) => String(p.id) === String(projectId));
          if (project) {
            // Clear the navigation state so it doesn't re-trigger
            navigate(location.pathname, { replace: true, state: {} });
            // Load tasks for this project and navigate to task detail
            getProjectTasks(token, project.id).then((loadedTasks) => {
              setTasks(loadedTasks);
              const task = loadedTasks.find((t: Task) => t.id === taskId);
              if (task) {
                setView({ type: "taskDetail", project, task });
              } else {
                setView({ type: "tasks", project });
              }
            }).catch(() => {
              setView({ type: "tasks", project });
            });
            return;
          }
        }
      })
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, [token, activeServer]);

  const openProject = async (project: Project) => {
    if (!token) return;
    setView({ type: "tasks", project });
    setLoading(true);
    try {
      const t = await getProjectTasks(token, project.id);
      setTasks(t);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openTaskDetail = (project: Project, task: Task) => {
    setView({ type: "taskDetail", project, task });
  };

  const goBack = () => {
    if (view.type === "taskDetail") {
      setView({ type: "tasks", project: view.project });
    } else if (view.type === "tasks") {
      setView({ type: "projects" });
      setTasks([]);
    } else {
      navigate("/");
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  const openGlbInViewer = async (task: Task, project: Project) => {
    if (!token) return;
    if (task.status !== 40) {
      toast.error("Nur abgeschlossene Tasks können im Viewer geöffnet werden.");
      return;
    }
    const glbAsset = findGlbAsset(task.available_assets);
    if (!glbAsset) {
      toast.error("Kein GLB-Modell für diesen Task verfügbar.");
      return;
    }
    setDownloading(task.id);
    setDownloadProgress(0);
    try {
      const blobUrl = await downloadGlbAsBlob(token, project.id, task.id, glbAsset, (pct) => setDownloadProgress(pct));
      const taskName = task.name || `Task ${task.id.slice(0, 8)}`;
      const projectName = project.name || `Projekt ${project.id}`;
      const fileName = `${projectName} – ${taskName}`;
      const params = new URLSearchParams({
        fileUrl: blobUrl,
        fileName,
        rotateModel: 'true',
        projectId: String(project.id),
        taskId: task.id,
        taskName,
        projectName,
      });
      navigate(`/viewer?${params.toString()}`);
    } catch (err: any) {
      toast.error(err.message || "GLB-Download fehlgeschlagen");
    } finally {
      setDownloading(null);
      setDownloadProgress(0);
    }
  };

  const headerTitle = view.type === "projects"
    ? "Projekte"
    : view.type === "tasks"
      ? view.project.name
      : (view.task.name || `Task ${view.task.id.slice(0, 8)}`);

  return (
    <div className="min-h-svh flex flex-col bg-background">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={goBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-sm font-semibold">{headerTitle}</h1>
            <p className="text-xs text-muted-foreground">
              Angemeldet als {username}
              {hasMultipleServers && activeServer && (
                <span className="ml-1">· {sessions.find(s => s.server === activeServer)?.label}</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasMultipleServers && view.type === "projects" && (
            <div className="flex rounded-md border border-border/50 overflow-hidden">
              {sessions.map((s) => (
                <button
                  key={s.server}
                  onClick={() => setActiveServer(s.server)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    s.server === activeServer
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Abmelden
          </Button>
        </div>
      </header>

      <main className="flex-1 container py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : view.type === "projects" ? (
          <div className="animate-fade-in">
            <div className="mb-6 flex items-center gap-3">
              <LayoutGrid className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Projekte</h2>
              <span className="text-sm text-muted-foreground">({projects.length})</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((p) => (
                <ProjectCard key={p.id} project={p} onClick={() => openProject(p)} />
              ))}
              {projects.length === 0 && (
                <div className="col-span-full flex flex-col items-center py-20 text-muted-foreground">
                  <FolderOpen className="mb-3 h-12 w-12 opacity-40" />
                  <p>Keine Projekte vorhanden</p>
                </div>
              )}
            </div>
          </div>
        ) : view.type === "tasks" ? (
          <div className="animate-fade-in">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Folder className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">{view.project.name}</h2>
                <span className="text-sm text-muted-foreground">({tasks.length} Tasks)</span>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={() => glbInputRef.current?.click()} size="sm" variant="outline">
                  <Upload className="mr-1.5 h-4 w-4" />
                  GLB hochladen
                </Button>
                <input
                  ref={glbInputRef}
                  type="file"
                  accept=".glb"
                  className="hidden"
                  onChange={handleGlbUpload}
                />
                <Button onClick={() => setCreateTaskOpen(true)} size="sm">
                  <Plus className="mr-1.5 h-4 w-4" />
                  Neuer Task
                </Button>
              </div>
            </div>
            <CreateTaskDialog
              open={createTaskOpen}
              onOpenChange={setCreateTaskOpen}
              projectId={view.project.id}
              projectName={view.project.name}
              onTaskCreated={async () => {
                if (!token) return;
                try {
                  const t = await getProjectTasks(token, view.project.id);
                  setTasks(t);
                } catch {}
              }}
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...tasks].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((t) => (
                <TaskCard
                  key={t.id}
                  task={t}
                  projectId={view.project.id}
                  token={token!}
                  onClick={() => openTaskDetail(view.project, t)}
                />
              ))}
              {tasks.length === 0 && (
                <div className="col-span-full flex flex-col items-center py-20 text-muted-foreground">
                  <Box className="mb-3 h-12 w-12 opacity-40" />
                  <p>Keine Tasks in diesem Projekt</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <TaskDetail
            task={view.task}
            projectId={view.project.id}
            projectName={view.project.name}
            onBack={() => setView({ type: "tasks", project: view.project })}
            onOpenGlb={() => openGlbInViewer(view.task, view.project)}
            downloading={downloading}
            downloadProgress={downloadProgress}
            token={token!}
          />
        )}
      </main>
    </div>
  );
};

// --- ProjectCard ---
function ProjectCard({ project, onClick }: { project: Project; onClick: () => void }) {
  return (
    <Card
      onClick={onClick}
      className="cursor-pointer border-border/50 shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5"
    >
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FolderOpen className="h-4 w-4 text-primary" />
          {project.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {project.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
        )}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {format(new Date(project.created_at), "dd. MMM yyyy", { locale: de })}
          </span>
          <span className="flex items-center gap-1">
            <Hash className="h-3 w-3" />
            {project.tasks.length} {project.tasks.length === 1 ? "Task" : "Tasks"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// --- TaskCard ---
function TaskCard({ task, projectId, token, onClick }: { task: Task; projectId: number; token: string; onClick: () => void }) {
  const status = TASK_STATUS[task.status] || { label: "Unbekannt", color: "muted" };
  const pendingLabel = task.pending_action != null ? PENDING_ACTION[task.pending_action] : null;
  const isProcessing = task.status === 20;
  const isQueued = task.status === 10;
  const isCompleted = task.status === 40;
  const progressPct = Math.round((task.running_progress ?? 0) * 100);
  const stageName = isProcessing ? getProcessingStage(task.running_progress ?? 0) : null;
  const filteredAssets = getFilteredAssets(task.available_assets);

  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!token || task.images_count === 0 || task.status !== 40) return;
    let revoked = false;
    (async () => {
      try {
        const shots = await getTaskShots(token, projectId, task.id);
        if (revoked) return;
        const filename = shots?.features?.[0]?.properties?.filename;
        if (!filename) return;
        const blobUrl = await loadThumbnailBlob(token, projectId, task.id, filename);
        if (revoked) return;
        setThumbnailUrl(blobUrl);
      } catch {
        // silently ignore — fallback to placeholder
      }
    })();
    return () => {
      revoked = true;
      setThumbnailUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
    };
  }, [token, projectId, task.id, task.images_count]);

  return (
    <Card
      onClick={onClick}
      className="cursor-pointer border-border/50 shadow-sm overflow-hidden transition-all duration-300 hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5 group"
    >
      <div className="relative h-32 overflow-hidden bg-muted flex items-center justify-center">
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt={task.name || 'Task'} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <Camera className="h-10 w-10 text-muted-foreground/30" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
      </div>

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-medium leading-tight">
            {task.name || `Task ${task.id.slice(0, 8)}`}
          </CardTitle>
          <div className="flex items-center gap-1.5 shrink-0">
            <Badge variant="outline" className={`text-xs ${statusColorClass(status.color)}`}>
              {status.label}
            </Badge>
            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Camera className="h-3 w-3" />
            {task.images_count} Bilder
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {format(new Date(task.created_at), "dd.MM.yyyy", { locale: de })}
          </span>
        </div>

        {(isProcessing || isQueued) && (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                {pendingLabel || stageName || status.label}
              </span>
              {isProcessing && <span className="font-medium text-sky-400">{progressPct}%</span>}
            </div>
            {isProcessing && <Progress value={progressPct} className="h-1.5" />}
          </div>
        )}

        {isCompleted && filteredAssets.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {filteredAssets.slice(0, 4).map((asset) => {
              const name = asset.split("/").pop() || asset;
              return (
                <span key={asset} className="inline-flex items-center gap-1 rounded bg-secondary px-2 py-0.5 text-[10px] text-secondary-foreground">
                  <Download className="h-2.5 w-2.5" />
                  {name.replace(/\.(tif|zip|glb|laz|json|geojson)$/i, "")}
                </span>
              );
            })}
            {filteredAssets.length > 4 && (
              <span className="text-[10px] text-muted-foreground px-1">+{filteredAssets.length - 4} weitere</span>
            )}
          </div>
        )}

        {task.last_error && task.status === 30 && (
          <p className="text-xs text-destructive line-clamp-2 mt-1">{task.last_error}</p>
        )}
      </CardContent>
    </Card>
  );
}

// --- TaskDetail ---
function TaskDetail({
  task,
  projectId,
  projectName,
  onBack,
  onOpenGlb,
  downloading,
  downloadProgress,
  token,
}: {
  task: Task;
  projectId: number;
  projectName: string;
  onBack: () => void;
  onOpenGlb: () => void;
  downloading: string | null;
  downloadProgress: number;
  token: string;
}) {
  const status = TASK_STATUS[task.status] || { label: "Unbekannt", color: "muted" };
  const filteredAssets = getFilteredAssets(task.available_assets);
  const isCompleted = task.status === 40;
  const hasGlb = isCompleted && !!findGlbAsset(task.available_assets);
  const isDownloading = downloading === task.id;
  const [downloadingAsset, setDownloadingAsset] = useState<string | null>(null);

  const stats = task.statistics as Record<string, unknown> | undefined;
  const gsd = stats?.gsd as number | undefined;
  const area = stats?.area as number | undefined;
  const pointcloud = stats?.pointcloud as { points: number } | undefined;

  const taskDisplayName = task.name || `Task ${task.id.slice(0, 8)}`;

  const handleDownload = async (assetPath: string) => {
    setDownloadingAsset(assetPath);
    try {
      await downloadAssetAsFile(token, projectId, task.id, assetPath);
    } catch (err: any) {
      toast.error(err.message || "Download fehlgeschlagen");
    } finally {
      setDownloadingAsset(null);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold">{taskDisplayName}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Camera className="h-3.5 w-3.5" />
                {task.images_count} Bilder
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {format(new Date(task.created_at), "dd. MMMM yyyy", { locale: de })}
              </span>
              {task.size > 0 && (
                <span className="flex items-center gap-1">
                  <HardDrive className="h-3.5 w-3.5" />
                  {formatFileSize(task.size)}
                </span>
              )}
            </div>
          </div>
          <Badge variant="outline" className={`shrink-0 ${statusColorClass(status.color)}`}>
            {status.label}
          </Badge>
        </div>

        {/* Stats cards */}
        {isCompleted && (gsd || area || pointcloud) && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {gsd && (
              <Card className="bg-secondary/30 border-border/30">
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">GSD</p>
                  <p className="text-lg font-semibold">{gsd.toFixed(2)} cm/px</p>
                </CardContent>
              </Card>
            )}
            {area && (
              <Card className="bg-secondary/30 border-border/30">
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Fläche</p>
                  <p className="text-lg font-semibold">{area.toFixed(0)} m²</p>
                </CardContent>
              </Card>
            )}
            {pointcloud && (
              <Card className="bg-secondary/30 border-border/30">
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Punkte</p>
                  <p className="text-lg font-semibold">{(pointcloud.points / 1_000_000).toFixed(1)}M</p>
                </CardContent>
              </Card>
            )}
            {task.images_count > 0 && (
              <Card className="bg-secondary/30 border-border/30">
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Bilder</p>
                  <p className="text-lg font-semibold">{task.images_count}</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* GLB Viewer button */}
        {hasGlb && (
          <div className="flex gap-2">
            <Button onClick={onOpenGlb} disabled={isDownloading} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {isDownloading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Box className="mr-2 h-4 w-4" />
              )}
              {isDownloading ? "Lade…" : "Im Viewer öffnen"}
            </Button>
          </div>
        )}
        {isDownloading && (
          <div>
            <Progress value={downloadProgress} className="h-1.5" />
            <p className="text-xs text-muted-foreground mt-1 text-right">{downloadProgress}%</p>
          </div>
        )}
      </div>

      {/* Tabs for completed tasks */}
      {isCompleted ? (
        <Tabs defaultValue="photos" className="space-y-4">
          <TabsList className="bg-secondary/50 flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="photos" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <ImageIcon className="mr-1.5 h-4 w-4" />
              Aufnahmen
            </TabsTrigger>
            <TabsTrigger value="downloads" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Download className="mr-1.5 h-4 w-4" />
              Downloads
            </TabsTrigger>
          </TabsList>

          <TabsContent value="photos">
            <DronePhotos token={token} projectId={projectId} taskId={task.id} />
          </TabsContent>

          <TabsContent value="downloads">
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredAssets.map((asset) => {
                const info = ASSET_INFO[asset];
                const label = getAssetLabel(asset);
                const isAssetDownloading = downloadingAsset === asset;
                return (
                  <Card key={asset} className="bg-secondary/20 border-border/30 hover:border-primary/30 transition-colors">
                    <CardContent className="flex items-center justify-between gap-3 p-4">
                      <div className="flex items-center gap-3">
                        {info ? categoryIcon(info.category) : <FileText className="h-4 w-4 text-primary" />}
                        <div>
                          <p className="text-sm font-medium">{label}</p>
                          <p className="text-xs text-muted-foreground">{info?.description || asset}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(asset)}
                        disabled={!!downloadingAsset}
                        className="border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground"
                      >
                        {isAssetDownloading ? (
                          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Download className="mr-1 h-3.5 w-3.5" />
                        )}
                        Download
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
              {filteredAssets.length === 0 && (
                <div className="col-span-full text-center py-10 text-muted-foreground">
                  <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Keine Dateien verfügbar</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      ) : task.status === 20 ? (
        <Card className="bg-secondary/20 border-border/30">
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <Loader2 className="h-10 w-10 animate-spin text-sky-400" />
            <p className="text-muted-foreground">Task wird verarbeitet...</p>
          </CardContent>
        </Card>
      ) : task.status === 30 ? (
        <Card className="bg-destructive/5 border-destructive/20">
          <CardContent className="py-8">
            <p className="text-sm text-destructive">{task.last_error || "Unbekannter Fehler"}</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

// --- DronePhotos (using shots.geojson) ---
function DronePhotos({ token, projectId, taskId }: { token: string; projectId: number; taskId: string }) {
  const [shots, setShots] = useState<ShotsGeoJSON | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<{ index: number; blobUrl: string | null; loading: boolean } | null>(null);

  useEffect(() => {
    let cancelled = false;
    getTaskShots(token, projectId, taskId)
      .then((data) => { if (!cancelled) setShots(data); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token, projectId, taskId]);

  const openPhoto = useCallback(async (index: number) => {
    if (!shots) return;
    const feature = shots.features[index];
    if (!feature) return;
    setLightbox({ index, blobUrl: null, loading: true });
    try {
      const blobUrl = await loadThumbnailBlob(token, projectId, taskId, feature.properties.filename);
      setLightbox((prev) => prev?.index === index ? { index, blobUrl, loading: false } : prev);
    } catch {
      setLightbox((prev) => prev?.index === index ? { ...prev, loading: false } : prev);
    }
  }, [shots, token, projectId, taskId]);

  const closeLightbox = useCallback(() => {
    if (lightbox?.blobUrl) URL.revokeObjectURL(lightbox.blobUrl);
    setLightbox(null);
  }, [lightbox]);

  const navigatePhoto = useCallback((dir: number) => {
    if (!shots || !lightbox) return;
    const newIndex = (lightbox.index + dir + shots.features.length) % shots.features.length;
    if (lightbox.blobUrl) URL.revokeObjectURL(lightbox.blobUrl);
    openPhoto(newIndex);
  }, [shots, lightbox, openPhoto]);

  const downloadPhoto = useCallback(() => {
    if (!lightbox?.blobUrl || !shots) return;
    const filename = shots.features[lightbox.index]?.properties.filename || "photo.jpg";
    const a = document.createElement("a");
    a.href = lightbox.blobUrl;
    a.download = filename;
    a.click();
  }, [lightbox, shots]);

  useEffect(() => {
    if (!lightbox) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      else if (e.key === "ArrowRight") navigatePhoto(1);
      else if (e.key === "ArrowLeft") navigatePhoto(-1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightbox, closeLightbox, navigatePhoto]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Aufnahmen werden geladen…</p>
      </div>
    );
  }

  if (!shots || shots.features.length === 0) {
    return (
      <Card className="bg-secondary/20 border-border/30">
        <div className="flex flex-col items-center gap-3 py-10">
          <ImageIcon className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Keine Aufnahmen verfügbar</p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2 mb-3">
        <ImageIcon className="h-4 w-4 text-primary" />
        <span className="text-sm text-muted-foreground">
          {shots.features.length} Aufnahmen · Klicke auf ein Bild für die Vollansicht
        </span>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
        {shots.features.map((feature, i) => (
          <AuthThumb
            key={feature.properties.filename}
            token={token}
            projectId={projectId}
            taskId={taskId}
            filename={feature.properties.filename}
            onClick={() => openPhoto(i)}
          />
        ))}
      </div>

      {lightbox && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-sm" onClick={closeLightbox}>
          <div className="relative flex flex-col items-center max-h-[95vh] max-w-[95vw]" onClick={(e) => e.stopPropagation()}>
            <div className="flex-1 flex items-center justify-center min-h-0">
              {lightbox.loading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Foto wird geladen…</p>
                </div>
              ) : lightbox.blobUrl ? (
                <img src={lightbox.blobUrl} alt="" className="max-h-[80vh] max-w-[90vw] rounded-lg object-contain" />
              ) : (
                <p className="text-sm text-muted-foreground">Foto konnte nicht geladen werden</p>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 w-full max-w-2xl bg-card/80 backdrop-blur-sm rounded-lg border border-border px-4 py-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">{shots.features[lightbox.index]?.properties.filename}</p>
                {(() => {
                  const coords = shots.features[lightbox.index]?.geometry.coordinates;
                  if (!coords) return null;
                  const [lng, lat, alt] = coords;
                  return (
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {lat.toFixed(6)}, {lng.toFixed(6)}
                      </span>
                      {alt != null && <span>Höhe: {alt.toFixed(1)} m</span>}
                    </div>
                  );
                })()}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{lightbox.index + 1} / {shots.features.length}</span>
                {lightbox.blobUrl && (
                  <Button variant="outline" size="sm" onClick={downloadPhoto} className="border-primary/30 text-primary">
                    <Download className="h-3.5 w-3.5 mr-1" />
                    Download
                  </Button>
                )}
              </div>
            </div>

            <Button variant="ghost" size="icon" className="absolute -top-2 -right-2 rounded-full bg-background/80 backdrop-blur-sm" onClick={closeLightbox}>
              <X className="h-5 w-5" />
            </Button>

            {shots.features.length > 1 && (
              <>
                <Button variant="ghost" size="icon" className="absolute left-[-50px] top-1/2 -translate-y-1/2 rounded-full bg-background/80 backdrop-blur-sm" onClick={() => navigatePhoto(-1)}>
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button variant="ghost" size="icon" className="absolute right-[-50px] top-1/2 -translate-y-1/2 rounded-full bg-background/80 backdrop-blur-sm" onClick={() => navigatePhoto(1)}>
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// --- AuthThumb ---
function AuthThumb({ token, projectId, taskId, filename, onClick }: { token: string; projectId: number; taskId: string; filename: string; onClick: () => void }) {
  const [src, setSrc] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    loadThumbnailBlob(token, projectId, taskId, filename)
      .then((url) => { if (!cancelled) setSrc(url); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token, projectId, taskId, filename]);

  return (
    <div
      onClick={onClick}
      className="relative aspect-[4/3] rounded-lg overflow-hidden cursor-pointer border border-border bg-muted hover:border-primary/50 transition-colors group"
    >
      {loading ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : src ? (
        <img src={src} alt={filename} className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/80 to-transparent px-2 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-[10px] text-foreground truncate">{filename}</p>
      </div>
    </div>
  );
}

export default ServerProjects;
