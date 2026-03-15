import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWebODMAuth } from "@/lib/auth-context";
import { authenticate } from "@/lib/webodm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, LogIn, ArrowLeft, Server } from "lucide-react";
import { toast } from "sonner";

const ServerLogin = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useWebODMAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) navigate("/server-projects", { replace: true });
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;

    setLoading(true);
    try {
      const token = await authenticate(username.trim(), password);
      login(token, username.trim());
      toast.success("Erfolgreich angemeldet");
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
            Melden Sie sich bei drohnenvermessung-server.de an
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
