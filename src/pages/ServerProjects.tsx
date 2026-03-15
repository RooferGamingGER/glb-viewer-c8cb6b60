import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useWebODMAuth } from "@/lib/auth-context";
import {
  getProjects,
  getProjectTasks,
  downloadGlbAsBlob,
  downloadAssetAsFile,
  getTaskImages,
  loadThumbnailBlob,
  downloadImageAsFile,
  findGlbAsset,
  getFilteredAssets,
  formatFileSize,
  TASK_STATUS,
  type Project,
  type Task,
  type TaskImage,
} from "@/lib/webodm";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Box,
  ChevronRight,
  Folder,
  Image,
  Loader2,
  LogOut,
  Download,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  FileDown,
  Camera,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

type View = "projects" | "tasks";

const statusIcon = (status: number) => {
  switch (status) {
    case 40: return <CheckCircle2 className="w-4 h-4 text-primary" />;
    case 30: return <XCircle className="w-4 h-4 text-destructive" />;
    case 20: return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
    case 10: return <Clock className="w-4 h-4 text-muted-foreground" />;
    default: return <AlertTriangle className="w-4 h-4 text-muted-foreground" />;
  }
};

const ServerProjects = () => {
  const navigate = useNavigate();
  const { token, username, logout, isAuthenticated } = useWebODMAuth();

  const [view, setView] = useState<View>("projects");
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) navigate("/server-login", { replace: true });
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    getProjects(token)
      .then(setProjects)
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  const openProject = async (project: Project) => {
    if (!token) return;
    setSelectedProject(project);
    setView("tasks");
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

  const goBack = () => {
    if (view === "tasks") {
      setView("projects");
      setSelectedProject(null);
      setTasks([]);
    } else {
      navigate("/");
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  const openGlbInViewer = async (task: Task) => {
    if (!token || !selectedProject) return;

    // Only allow completed tasks
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
      const blobUrl = await downloadGlbAsBlob(
        token,
        selectedProject.id,
        task.id,
        glbAsset,
        (pct) => setDownloadProgress(pct)
      );

      const taskName = task.name || `Task ${task.id.slice(0, 8)}`;
      const projectName = selectedProject.name || `Projekt ${selectedProject.id}`;
      const fileName = `${projectName} – ${taskName}`;

      navigate(`/viewer?fileUrl=${encodeURIComponent(blobUrl)}&fileName=${encodeURIComponent(fileName)}&rotateModel=true`);
    } catch (err: any) {
      toast.error(err.message || "GLB-Download fehlgeschlagen");
    } finally {
      setDownloading(null);
      setDownloadProgress(0);
    }
  };

  return (
    <div className="min-h-svh flex flex-col bg-gradient-to-br from-background via-background to-secondary/40">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={goBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-sm font-semibold">
              {view === "projects" ? "Projekte" : selectedProject?.name || "Tasks"}
            </h1>
            <p className="text-xs text-muted-foreground">
              Angemeldet als {username}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Abmelden
        </Button>
      </header>

      <main className="flex-1 p-4 max-w-4xl mx-auto w-full">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : view === "projects" ? (
          <ProjectList projects={projects} onOpen={openProject} />
        ) : (
          <TaskList
            tasks={tasks}
            downloading={downloading}
            downloadProgress={downloadProgress}
            onOpenGlb={openGlbInViewer}
            token={token!}
            projectId={selectedProject!.id}
          />
        )}
      </main>
    </div>
  );
};

// --- Sub-Components ---

function ProjectList({ projects, onOpen }: { projects: Project[]; onOpen: (p: Project) => void }) {
  if (projects.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <Folder className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>Keine Projekte gefunden</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {projects.map((p) => (
        <button
          key={p.id}
          onClick={() => onOpen(p)}
          className="w-full text-left p-4 rounded-lg border border-border/50 bg-card hover:bg-accent/50 transition-colors flex items-center justify-between group"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
              <Folder className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{p.name || `Projekt ${p.id}`}</p>
              <p className="text-xs text-muted-foreground">
                {p.tasks.length} Task{p.tasks.length !== 1 ? "s" : ""} •{" "}
                {new Date(p.created_at).toLocaleDateString("de-DE")}
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
        </button>
      ))}
    </div>
  );
}

function TaskList({
  tasks,
  downloading,
  downloadProgress,
  onOpenGlb,
  token,
  projectId,
}: {
  tasks: Task[];
  downloading: string | null;
  downloadProgress: number;
  onOpenGlb: (t: Task) => void;
  token: string;
  projectId: number;
}) {
  if (tasks.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <Box className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>Keine Tasks in diesem Projekt</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {tasks.map((t) => (
        <TaskCard
          key={t.id}
          task={t}
          downloading={downloading}
          downloadProgress={downloadProgress}
          onOpenGlb={onOpenGlb}
          token={token}
          projectId={projectId}
        />
      ))}
    </div>
  );
}

function TaskCard({
  task,
  downloading,
  downloadProgress,
  onOpenGlb,
  token,
  projectId,
}: {
  task: Task;
  downloading: string | null;
  downloadProgress: number;
  onOpenGlb: (t: Task) => void;
  token: string;
  projectId: number;
}) {
  const status = TASK_STATUS[task.status] || { label: "Unbekannt", color: "muted" };
  const hasGlb = task.status === 40 && !!findGlbAsset(task.available_assets);
  const isDownloading = downloading === task.id;
  const filteredAssets = task.status === 40 ? getFilteredAssets(task.available_assets) : [];

  return (
    <div className="p-4 rounded-lg border border-border/50 bg-card">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          {statusIcon(task.status)}
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">
              {task.name || `Task ${task.id.slice(0, 8)}`}
            </p>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
              <span>{status.label}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Image className="w-3 h-3" />
                {task.images_count} Bilder
              </span>
              {task.size > 0 && (
                <>
                  <span>•</span>
                  <span>{formatFileSize(task.size)}</span>
                </>
              )}
              <span>•</span>
              <span>{new Date(task.created_at).toLocaleDateString("de-DE")}</span>
            </div>
          </div>
        </div>

        {hasGlb && (
          <Button
            size="sm"
            disabled={isDownloading}
            onClick={() => onOpenGlb(task)}
            className="shrink-0"
          >
            {isDownloading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {isDownloading ? "Lade…" : "Im Viewer öffnen"}
          </Button>
        )}
      </div>

      {/* Download progress */}
      {isDownloading && (
        <div className="mt-3">
          <Progress value={downloadProgress} className="h-1.5" />
          <p className="text-xs text-muted-foreground mt-1 text-right">{downloadProgress}%</p>
        </div>
      )}

      {/* Assets section */}
      {filteredAssets.length > 0 && (
        <AssetsList
          assets={filteredAssets}
          token={token}
          projectId={projectId}
          taskId={task.id}
        />
      )}

      {/* Drone images section */}
      {task.status === 40 && task.images_count > 0 && (
        <DroneImagesSection
          token={token}
          projectId={projectId}
          taskId={task.id}
          imageCount={task.images_count}
        />
      )}
    </div>
  );
}

function AssetsList({
  assets,
  token,
  projectId,
  taskId,
}: {
  assets: string[];
  token: string;
  projectId: number;
  taskId: string;
}) {
  const [downloadingAsset, setDownloadingAsset] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const handleDownload = async (asset: string) => {
    setDownloadingAsset(asset);
    try {
      await downloadAssetAsFile(token, projectId, taskId, asset);
      toast.success(`${asset} heruntergeladen`);
    } catch (err: any) {
      toast.error(err.message || "Download fehlgeschlagen");
    } finally {
      setDownloadingAsset(null);
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-3">
      <CollapsibleTrigger className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors w-full">
        <ChevronDown className={cn("h-3 w-3 transition-transform", isOpen && "rotate-180")} />
        <FileDown className="h-3 w-3" />
        <span>Verfügbare Dateien ({assets.length})</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        <div className="space-y-1.5 pl-5">
          {assets.map((asset) => (
            <div
              key={asset}
              className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <span className="text-xs truncate font-mono">{asset}</span>
              <Button
                variant="ghost"
                size="sm"
                disabled={downloadingAsset === asset}
                onClick={() => handleDownload(asset)}
                className="shrink-0 h-7 px-2"
              >
                {downloadingAsset === asset ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Download className="h-3 w-3" />
                )}
              </Button>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function DroneImagesSection({
  token,
  projectId,
  taskId,
  imageCount,
}: {
  token: string;
  projectId: number;
  taskId: string;
  imageCount: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [images, setImages] = useState<TaskImage[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const loadImages = useCallback(async () => {
    if (loaded) return;
    setLoadingImages(true);
    try {
      const imgs = await getTaskImages(token, projectId, taskId);
      setImages(imgs);
      setLoaded(true);
    } catch (err: any) {
      toast.error(err.message || "Bilder konnten nicht geladen werden");
    } finally {
      setLoadingImages(false);
    }
  }, [token, projectId, taskId, loaded]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && !loaded) {
      loadImages();
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={handleOpenChange} className="mt-3">
      <CollapsibleTrigger className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors w-full">
        <ChevronDown className={cn("h-3 w-3 transition-transform", isOpen && "rotate-180")} />
        <Camera className="h-3 w-3" />
        <span>Drohnenaufnahmen ({imageCount})</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        {loadingImages ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : images.length === 0 && loaded ? (
          <p className="text-xs text-muted-foreground pl-5">Keine Bilder gefunden.</p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 pl-5">
            {images.map((img) => (
              <ThumbnailCard
                key={img.id}
                image={img}
                token={token}
                projectId={projectId}
                taskId={taskId}
              />
            ))}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

function ThumbnailCard({
  image,
  token,
  projectId,
  taskId,
}: {
  image: TaskImage;
  token: string;
  projectId: number;
  taskId: string;
}) {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [loadingThumb, setLoadingThumb] = useState(true);
  const [downloadingImg, setDownloadingImg] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadThumbnailBlob(token, projectId, taskId, image.filename)
      .then((url) => {
        if (!cancelled) setThumbUrl(url);
      })
      .catch(() => {
        if (!cancelled) setThumbUrl(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingThumb(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, projectId, taskId, image.filename]);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setDownloadingImg(true);
    try {
      await downloadImageAsFile(token, projectId, taskId, image.filename);
    } catch (err: any) {
      toast.error(err.message || "Download fehlgeschlagen");
    } finally {
      setDownloadingImg(false);
    }
  };

  return (
    <div className="relative group rounded-md overflow-hidden border border-border/30 bg-muted/20 aspect-square">
      {loadingThumb ? (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : thumbUrl ? (
        <img
          src={thumbUrl}
          alt={image.filename}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex items-center justify-center h-full">
          <Image className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
      <button
        onClick={handleDownload}
        disabled={downloadingImg}
        className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
      >
        {downloadingImg ? (
          <Loader2 className="h-4 w-4 animate-spin text-foreground" />
        ) : (
          <Download className="h-4 w-4 text-foreground" />
        )}
      </button>
      <p className="absolute bottom-0 left-0 right-0 text-[9px] text-center bg-background/70 text-foreground px-1 truncate">
        {image.filename}
      </p>
    </div>
  );
}

export default ServerProjects;
