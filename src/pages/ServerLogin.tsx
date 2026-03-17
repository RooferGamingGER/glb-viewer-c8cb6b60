import React, { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useWebODMAuth, SERVERS } from "@/lib/auth-context";
import { authenticate, prefetchProjects } from "@/lib/webodm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, LogIn, ArrowLeft, AlertCircle, Mail, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const SERVER_CONTACT: Record<string, string> = {
  "https://drohnenvermessung-server.de": "info@drohnenvermessung-roofergaming.de",
  "https://drohnenvermessung-digitab.de": "info@drohnenvermessung-digitab.de",
};

const ServerLogin = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { replaceSessions, setActiveServer } = useWebODMAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);

  const targetServer = useMemo(() => {
    const idx = parseInt(searchParams.get("server") || "0", 10);
    return SERVERS[idx] || SERVERS[0];
  }, [searchParams]);

  const contactEmail = SERVER_CONTACT[targetServer.url] || "info@drohnenvermessung-roofergaming.de";

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

      toast.success(`Angemeldet bei ${targetServer.shortLabel}`);
      prefetchProjects(token, targetServer.url);
      navigate("/server-projects", { replace: true });
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.includes("Timeout")) {
        toast.error(msg);
      } else {
        setShowErrorDialog(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-svh flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-secondary/40 px-4">
      <div className="w-full max-w-sm">
        {/* Server branding header */}
        <div className="text-center mb-8">
          <div
            className="w-20 h-20 rounded-2xl mx-auto mb-4 overflow-hidden border-2 border-border/20 bg-background/80 flex items-center justify-center p-2 shadow-lg"
            style={{ borderColor: targetServer.accentColor + "40" }}
          >
            <img
              src={targetServer.logo}
              alt={targetServer.shortLabel}
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-xl font-bold">{targetServer.label}</h1>
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

          <Button
            type="submit"
            className="w-full"
            disabled={loading || !username.trim() || !password.trim()}
            style={{
              backgroundColor: loading ? undefined : targetServer.accentColor,
              borderColor: targetServer.accentColor,
            }}
          >
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

      {/* Login-Fehler Dialog */}
      <Dialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Anmeldung fehlgeschlagen
            </DialogTitle>
            <DialogDescription className="text-left pt-2 space-y-4">
              <p>
                Die eingegebenen Zugangsdaten wurden auf dem Server nicht gefunden. Bitte überprüfen Sie Benutzername und Passwort.
              </p>

              <div className="rounded-lg border border-border bg-muted/50 p-3 space-y-2">
                <p className="text-sm font-medium text-foreground">
                  Bereits Kunde?
                </p>
                <p className="text-sm text-muted-foreground">
                  Ihre Zugangsdaten können Sie gerne erneut anfragen:
                </p>
                <a
                  href={`mailto:${contactEmail}`}
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium"
                >
                  <Mail className="h-3.5 w-3.5" />
                  {contactEmail}
                </a>
              </div>

              <div className="rounded-lg border border-border bg-muted/50 p-3 space-y-2">
                <p className="text-sm font-medium text-foreground">
                  Noch kein Kunde?
                </p>
                <a
                  href="https://drohnenvermessung-roofergaming.de/shop/Abonnement-c179036259/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Jetzt Abo abschließen
                </a>
              </div>
            </DialogDescription>
          </DialogHeader>
          <Button variant="outline" className="w-full mt-2" onClick={() => setShowErrorDialog(false)}>
            Erneut versuchen
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ServerLogin;
