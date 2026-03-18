import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useWebODMAuth, SERVERS } from "@/lib/auth-context";
import {
  getProcessingNodes,
  getAllTasksForServer,
  getAdminUsers,
  getProjects,
  TASK_STATUS,
  formatFileSize,
  type ProcessingNode,
  type AdminUser,
  type EnrichedTask,
  type Project,
} from "@/lib/webodm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Camera,
  Calendar,
  Cpu,
  Loader2,
  Search,
  Server,
  Shield,
  User,
  Users,
  Wifi,
  WifiOff,
  FolderOpen,
  Box,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { de } from "date-fns/locale";

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

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { isAuthenticated, sessions, username } = useWebODMAuth();

  const isAdminAccount = (username ?? "").trim().toLowerCase() === "roofergaming";

  useEffect(() => {
    if (!isAuthenticated || !isAdminAccount) navigate("/server-projects", { replace: true });
  }, [isAuthenticated, isAdminAccount, navigate]);

  if (!isAuthenticated || !isAdminAccount) return null;

  return (
    <div className="min-h-svh flex flex-col bg-background">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/server-projects")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-sm font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Administration
            </h1>
            <p className="text-xs text-muted-foreground">Angemeldet als {username}</p>
          </div>
        </div>
      </header>

      <main className="flex-1 container py-8">
        <Tabs defaultValue="tasks" className="space-y-6">
          <TabsList className="bg-secondary/50 flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="tasks" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Box className="mr-1.5 h-4 w-4" />
              Tasks
            </TabsTrigger>
            <TabsTrigger value="accounts" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Users className="mr-1.5 h-4 w-4" />
              Accounts
            </TabsTrigger>
            <TabsTrigger value="nodes" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Cpu className="mr-1.5 h-4 w-4" />
              Nodes
            </TabsTrigger>
            <TabsTrigger value="search" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Search className="mr-1.5 h-4 w-4" />
              Suche
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tasks">
            <TasksOverviewTab sessions={sessions} />
          </TabsContent>
          <TabsContent value="accounts">
            <AccountsTab sessions={sessions} />
          </TabsContent>
          <TabsContent value="nodes">
            <NodesTab sessions={sessions} />
          </TabsContent>
          <TabsContent value="search">
            <SearchTab sessions={sessions} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

// --- Tasks Overview Tab ---
function TasksOverviewTab({ sessions }: { sessions: { server: string; token: string; label: string }[] }) {
  const [tasks, setTasks] = useState<EnrichedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<"date" | "status">("date");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all(
      sessions.map((s) => {
        const serverCfg = SERVERS.find((srv) => s.server.includes(srv.url.replace("https://", "")));
        return getAllTasksForServer(s.token, s.server, serverCfg?.shortLabel || s.label);
      })
    )
      .then((results) => {
        if (cancelled) return;
        const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
        setTasks(results.flat().filter((t) => new Date(t.created_at).getTime() >= cutoff));
      })
      .catch((err) => toast.error(err.message))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [sessions]);

  const sorted = useMemo(() => {
    const copy = [...tasks];
    if (sortField === "status") {
      copy.sort((a, b) => a.status - b.status || new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return copy;
  }, [tasks, sortField]);

  if (loading) return <LoadingState text="Tasks werden geladen…" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Alle Tasks ({tasks.length})</h2>
        <div className="flex items-center gap-2">
          <Button
            variant={sortField === "date" ? "default" : "outline"}
            size="sm"
            onClick={() => setSortField("date")}
          >
            <Calendar className="mr-1.5 h-3.5 w-3.5" />
            Datum
          </Button>
          <Button
            variant={sortField === "status" ? "default" : "outline"}
            size="sm"
            onClick={() => setSortField("status")}
          >
            Status
          </Button>
        </div>
      </div>

      <div className="rounded-md border border-border/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/30">
              <TableHead>Task</TableHead>
              <TableHead>Projekt</TableHead>
              <TableHead>Server</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Erstellt</TableHead>
              <TableHead className="text-right">Bilder</TableHead>
              <TableHead className="text-right">Größe</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((t) => {
              const status = TASK_STATUS[t.status] || { label: "Unbekannt", color: "muted" };
              return (
                <TableRow key={`${t.serverLabel}-${t.id}`} className="hover:bg-secondary/20">
                  <TableCell className="font-medium">
                    {t.name || `Task ${t.id.slice(0, 8)}`}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{t.projectName}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      <Server className="mr-1 h-3 w-3" />
                      {t.serverLabel}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${statusColorClass(status.color)}`}>
                      {status.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(t.created_at), "dd.MM.yyyy HH:mm", { locale: de })}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    <span className="flex items-center justify-end gap-1">
                      <Camera className="h-3 w-3" />
                      {t.images_count}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {t.size > 0 ? formatFileSize(t.size) : "–"}
                  </TableCell>
                </TableRow>
              );
            })}
            {tasks.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  Keine Tasks gefunden
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// --- Accounts Tab ---
function AccountsTab({ sessions }: { sessions: { server: string; token: string; label: string }[] }) {
  const [usersByServer, setUsersByServer] = useState<Record<string, AdminUser[] | "no_permission" | null>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all(
      sessions.map(async (s) => {
        const serverCfg = SERVERS.find((srv) => s.server.includes(srv.url.replace("https://", "")));
        const label = serverCfg?.shortLabel || s.label;
        try {
          const users = await getAdminUsers(s.token, s.server);
          return { label, users: users as AdminUser[] | "no_permission" };
        } catch (err: any) {
          if (err.message === "NO_PERMISSION") {
            return { label, users: "no_permission" as const };
          }
          return { label, users: null };
        }
      })
    )
      .then((results) => {
        if (cancelled) return;
        const map: Record<string, AdminUser[] | "no_permission" | null> = {};
        for (const r of results) map[r.label] = r.users;
        setUsersByServer(map);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [sessions]);

  if (loading) return <LoadingState text="Benutzer werden geladen…" />;

  return (
    <div className="space-y-6">
      {Object.entries(usersByServer).map(([label, users]) => (
        <div key={label} className="space-y-3">
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Server className="h-4 w-4 text-primary" />
            {label}
          </h3>

          {users === "no_permission" ? (
            <Card className="bg-amber-500/5 border-amber-500/20">
              <CardContent className="py-6 text-center text-sm text-muted-foreground">
                <Shield className="h-8 w-8 mx-auto mb-2 text-amber-400 opacity-60" />
                Keine Admin-Berechtigung auf diesem Server. Nur Superuser können die Benutzerliste einsehen.
              </CardContent>
            </Card>
          ) : users === null ? (
            <Card className="bg-destructive/5 border-destructive/20">
              <CardContent className="py-6 text-center text-sm text-muted-foreground">
                Fehler beim Laden der Benutzerliste.
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-md border border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/30">
                    <TableHead>Benutzer</TableHead>
                    <TableHead>E-Mail</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Rolle</TableHead>
                    <TableHead>Registriert</TableHead>
                    <TableHead>Letzter Login</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium flex items-center gap-2">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        {u.username}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{u.email || "–"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={u.is_active
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                          : "bg-muted text-muted-foreground border-border"
                        }>
                          {u.is_active ? "Aktiv" : "Inaktiv"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {u.is_superuser ? (
                          <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30">Admin</Badge>
                        ) : u.is_staff ? (
                          <Badge variant="outline" className="bg-sky-500/20 text-sky-400 border-sky-500/30">Staff</Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">Benutzer</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(u.date_joined), "dd.MM.yyyy", { locale: de })}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {u.last_login ? format(new Date(u.last_login), "dd.MM.yyyy HH:mm", { locale: de }) : "–"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {users.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                        Keine Benutzer gefunden
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// --- Nodes Tab ---
function NodesTab({ sessions }: { sessions: { server: string; token: string; label: string }[] }) {
  const [nodesByServer, setNodesByServer] = useState<Record<string, ProcessingNode[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all(
      sessions.map(async (s) => {
        const serverCfg = SERVERS.find((srv) => s.server.includes(srv.url.replace("https://", "")));
        const label = serverCfg?.shortLabel || s.label;
        try {
          const nodes = await getProcessingNodes(s.token);
          return { label, nodes };
        } catch {
          return { label, nodes: [] };
        }
      })
    )
      .then((results) => {
        if (cancelled) return;
        const map: Record<string, ProcessingNode[]> = {};
        for (const r of results) map[r.label] = r.nodes;
        setNodesByServer(map);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [sessions]);

  if (loading) return <LoadingState text="Processing Nodes werden geladen…" />;

  return (
    <div className="space-y-6">
      {Object.entries(nodesByServer).map(([label, nodes]) => (
        <div key={label} className="space-y-3">
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Server className="h-4 w-4 text-primary" />
            {label}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {nodes.map((node) => (
              <Card key={node.id} className={`border-border/50 ${node.online ? "bg-emerald-500/5 border-emerald-500/20" : "bg-destructive/5 border-destructive/20"}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Cpu className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">{node.label || node.hostname}</span>
                    </div>
                    <Badge variant="outline" className={node.online
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                      : "bg-destructive/20 text-destructive border-destructive/30"
                    }>
                      {node.online ? (
                        <><Wifi className="mr-1 h-3 w-3" /> Online</>
                      ) : (
                        <><WifiOff className="mr-1 h-3 w-3" /> Offline</>
                      )}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Hostname: {node.hostname}</p>
                    <p>Port: {node.port}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
            {nodes.length === 0 && (
              <div className="col-span-full text-center py-10 text-muted-foreground">
                <Cpu className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Keine Processing Nodes gefunden</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Search Tab ---
function SearchTab({ sessions }: { sessions: { server: string; token: string; label: string }[] }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [allTasks, setAllTasks] = useState<EnrichedTask[]>([]);
  const [allProjects, setAllProjects] = useState<(Project & { serverLabel: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all(
      sessions.map(async (s) => {
        const serverCfg = SERVERS.find((srv) => s.server.includes(srv.url.replace("https://", "")));
        const label = serverCfg?.shortLabel || s.label;
        try {
          const [tasks, projects] = await Promise.all([
            getAllTasksForServer(s.token, s.server, label),
            getProjects(s.token, s.server),
          ]);
          return { tasks, projects: projects.map((p) => ({ ...p, serverLabel: label })) };
        } catch {
          return { tasks: [], projects: [] };
        }
      })
    )
      .then((results) => {
        if (cancelled) return;
        setAllTasks(results.flatMap((r) => r.tasks));
        setAllProjects(results.flatMap((r) => r.projects));
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [sessions]);

  const q = query.toLowerCase().trim();

  const filteredProjects = useMemo(
    () => q ? allProjects.filter((p) => p.name.toLowerCase().includes(q) || String(p.id).includes(q)) : [],
    [allProjects, q]
  );

  const filteredTasks = useMemo(
    () => q ? allTasks.filter((t) =>
      (t.name || "").toLowerCase().includes(q) ||
      t.id.toLowerCase().includes(q) ||
      t.projectName.toLowerCase().includes(q)
    ) : [],
    [allTasks, q]
  );

  if (loading) return <LoadingState text="Daten werden geladen…" />;

  return (
    <div className="space-y-6">
      <div className="relative max-w-lg">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Projekte und Tasks durchsuchen…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10"
          autoFocus
        />
      </div>

      {q && (
        <div className="space-y-6">
          {/* Projects */}
          {filteredProjects.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                Projekte ({filteredProjects.length})
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredProjects.map((p) => (
                  <Card
                    key={`${p.serverLabel}-${p.id}`}
                    className="cursor-pointer border-border/50 hover:border-primary/30 transition-colors"
                    onClick={() => navigate("/server-projects")}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{p.name}</span>
                        <Badge variant="outline" className="text-xs">
                          <Server className="mr-1 h-3 w-3" />
                          {p.serverLabel}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {p.tasks.length} Tasks · {format(new Date(p.created_at), "dd.MM.yyyy", { locale: de })}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Tasks */}
          {filteredTasks.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Box className="h-4 w-4" />
                Tasks ({filteredTasks.length})
              </h3>
              <div className="rounded-md border border-border/50 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary/30">
                      <TableHead>Task</TableHead>
                      <TableHead>Projekt</TableHead>
                      <TableHead>Server</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Erstellt</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTasks.map((t) => {
                      const status = TASK_STATUS[t.status] || { label: "Unbekannt", color: "muted" };
                      return (
                        <TableRow key={`${t.serverLabel}-${t.id}`} className="hover:bg-secondary/20">
                          <TableCell className="font-medium">{t.name || `Task ${t.id.slice(0, 8)}`}</TableCell>
                          <TableCell className="text-muted-foreground">{t.projectName}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              <Server className="mr-1 h-3 w-3" />
                              {t.serverLabel}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-xs ${statusColorClass(status.color)}`}>
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(t.created_at), "dd.MM.yyyy HH:mm", { locale: de })}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {filteredProjects.length === 0 && filteredTasks.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <Search className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Keine Ergebnisse für „{query}"</p>
            </div>
          )}
        </div>
      )}

      {!q && (
        <div className="text-center py-16 text-muted-foreground">
          <Search className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Geben Sie einen Suchbegriff ein, um Projekte und Tasks zu finden.</p>
          <p className="text-xs mt-1">{allProjects.length} Projekte · {allTasks.length} Tasks verfügbar</p>
        </div>
      )}
    </div>
  );
}

// --- Loading State ---
function LoadingState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

export default AdminDashboard;
