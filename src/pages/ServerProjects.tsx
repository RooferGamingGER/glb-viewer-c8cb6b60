import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWebODMAuth } from "@/lib/auth-context";
import {
  getProjects,
  getProjectTasks,
  downloadGlbAsBlob,
  findGlbAsset,
  formatFileSize,
  TASK_STATUS,
  type Project,
  type Task,
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
} from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

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

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) navigate("/server-login", { replace: true });
  }, [isAuthenticated, navigate]);

  // Load projects
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

    const glbAsset = findGlbAsset(task.available_assets);
    if (!glbAsset) {
      toast.error("Kein GLB-Modell für diesen Task verfügbar");
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
      {/* Header */}
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

      {/* Content */}
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
}: {
  tasks: Task[];
  downloading: string | null;
  downloadProgress: number;
  onOpenGlb: (t: Task) => void;
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
      {tasks.map((t) => {
        const status = TASK_STATUS[t.status] || { label: "Unbekannt", color: "muted" };
        const hasGlb = !!findGlbAsset(t.available_assets);
        const isDownloading = downloading === t.id;

        return (
          <div
            key={t.id}
            className="p-4 rounded-lg border border-border/50 bg-card"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                {statusIcon(t.status)}
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">
                    {t.name || `Task ${t.id.slice(0, 8)}`}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                    <span>{status.label}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Image className="w-3 h-3" />
                      {t.images_count} Bilder
                    </span>
                    {t.size > 0 && (
                      <>
                        <span>•</span>
                        <span>{formatFileSize(t.size)}</span>
                      </>
                    )}
                    <span>•</span>
                    <span>{new Date(t.created_at).toLocaleDateString("de-DE")}</span>
                  </div>
                </div>
              </div>

              {hasGlb && (
                <Button
                  size="sm"
                  disabled={isDownloading}
                  onClick={() => onOpenGlb(t)}
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

            {isDownloading && (
              <div className="mt-3">
                <Progress value={downloadProgress} className="h-1.5" />
                <p className="text-xs text-muted-foreground mt-1 text-right">{downloadProgress}%</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default ServerProjects;
