import React, { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useWebODMAuth, SERVERS } from "@/lib/auth-context";
import { authenticate, prefetchProjects } from "@/lib/webodm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, LogIn, ArrowLeft, Server } from "lucide-react";
import { toast } from "sonner";

const ServerLogin = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { replaceSessions, setActiveServer } = useWebODMAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Determine target server from URL param (?server=0 or ?server=1)
  const targetServer = useMemo(() => {
    const idx = parseInt(searchParams.get("server") || "0", 10);
    return SERVERS[idx] || SERVERS[0];
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;

    setLoading(true);
    try {
      const timeoutMs = 12000;
      const token = await Promise.race([
        authenticate(username.trim(), password, targetServer.url),
        new Promise<string>((_, reject) =>
          setTimeout(() => reject(new Error("Login-Timeout. Bitte erneut versuchen.")), timeoutMs)
        ),
      ]);

      replaceSessions([
        {
          server: targetServer.url,
          token,
          username: username.trim(),
          label: targetServer.label,
        },
      ]);
      setActiveServer(targetServer.url);

      toast.success(`Angemeldet bei ${targetServer.label}`);
      // Prefetch projects while navigating – they'll be cached for instant display
      prefetchProjects(token, targetServer.url);
      navigate("/server-projects", { replace: true });
    } catch (err: any) {
      toast.error(err.message || "Anmeldung fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-svh flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-secondary/40 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Server className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-xl font-bold">Server-Anmeldung</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {targetServer.label}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Benutzername</Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Benutzername"
              autoComplete="username"
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Passwort</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Passwort"
              autoComplete="current-password"
              disabled={loading}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading || !username.trim() || !password.trim()}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <LogIn className="mr-2 h-4 w-4" />
            )}
            Anmelden
          </Button>
        </form>

        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-4"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zurück zur Startseite
        </Button>
      </div>
    </div>
  );
};

export default ServerLogin;
