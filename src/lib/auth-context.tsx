import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface AuthContextType {
  token: string | null;
  username: string | null;
  login: (token: string, username: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function WebODMAuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem("webodm_token"));
  const [username, setUsername] = useState<string | null>(() => sessionStorage.getItem("webodm_user"));

  const login = useCallback((t: string, u: string) => {
    sessionStorage.setItem("webodm_token", t);
    sessionStorage.setItem("webodm_user", u);
    setToken(t);
    setUsername(u);
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem("webodm_token");
    sessionStorage.removeItem("webodm_user");
    setToken(null);
    setUsername(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, username, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useWebODMAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useWebODMAuth must be used within WebODMAuthProvider");
  return ctx;
}
