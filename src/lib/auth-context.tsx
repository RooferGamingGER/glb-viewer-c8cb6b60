import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export interface ServerSession {
  server: string;
  token: string;
  username: string;
  label: string;
}

export const SERVERS = [
  { url: "https://drohnenvermessung-server.de", label: "Server 1" },
  { url: "https://drohnenvermessung-digitab.de", label: "Server 2" },
] as const;

interface AuthContextType {
  token: string | null;
  username: string | null;
  sessions: ServerSession[];
  activeServer: string | null;
  setActiveServer: (server: string) => void;
  addSession: (session: ServerSession) => void;
  /** Replace all sessions at once */
  replaceSessions: (sessions: ServerSession[]) => void;
  login: (token: string, username: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

function loadSessions(): ServerSession[] {
  try {
    const raw = sessionStorage.getItem("webodm_sessions");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSessions(sessions: ServerSession[]) {
  sessionStorage.setItem("webodm_sessions", JSON.stringify(sessions));
}

export function WebODMAuthProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<ServerSession[]>(loadSessions);
  const [activeServer, setActiveServerState] = useState<string | null>(
    () => sessionStorage.getItem("webodm_active_server")
  );

  const activeSession = sessions.find((s) => s.server === activeServer) || sessions[0] || null;

  const setActiveServer = useCallback((server: string) => {
    sessionStorage.setItem("webodm_active_server", server);
    setActiveServerState(server);
  }, []);

  const addSession = useCallback((session: ServerSession) => {
    setSessions((prev) => {
      const filtered = prev.filter((s) => s.server !== session.server);
      const next = [...filtered, session];
      saveSessions(next);
      return next;
    });
  }, []);

  const login = useCallback((token: string, username: string) => {
    // Legacy compat: use first server
    const server = SERVERS[0].url;
    const session: ServerSession = { server, token, username, label: SERVERS[0].label };
    setSessions([session]);
    saveSessions([session]);
    sessionStorage.setItem("webodm_active_server", server);
    setActiveServerState(server);
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem("webodm_sessions");
    sessionStorage.removeItem("webodm_active_server");
    setSessions([]);
    setActiveServerState(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        token: activeSession?.token || null,
        username: activeSession?.username || null,
        sessions,
        activeServer: activeSession?.server || null,
        setActiveServer,
        addSession,
        login,
        logout,
        isAuthenticated: sessions.length > 0,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useWebODMAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useWebODMAuth must be used within WebODMAuthProvider");
  return ctx;
}
