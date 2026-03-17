import React, { useState } from 'react';
import { Copy, Check, Share2, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { createShareLink, getShareUrl, type CreateShareParams } from '@/utils/shareView';

interface ShareDialogProps {
  getShareParams: () => CreateShareParams | null;
}

const ShareDialog: React.FC<ShareDialogProps> = ({ getShareParams }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreate = async () => {
    const params = getShareParams();
    if (!params) {
      toast.error('Keine Daten zum Teilen vorhanden');
      return;
    }

    setLoading(true);
    try {
      const result = await createShareLink(params);
      setShareUrl(getShareUrl(result.share_token));
      setExpiresAt(result.expires_at);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unbekannter Fehler';
      toast.error(`Teilen fehlgeschlagen: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link kopiert!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Kopieren fehlgeschlagen');
    }
  };

  const handleOpenChange = (open: boolean) => {
    setOpen(open);
    if (!open) {
      setShareUrl(null);
      setExpiresAt(null);
      setCopied(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="glass-button">
          <Share2 className="h-4 w-4 mr-2" />
          Teilen
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Modell teilen</DialogTitle>
          <DialogDescription>
            Erstelle einen Link, mit dem andere das 3D-Modell mit allen Messungen ansehen können – ohne Login.
          </DialogDescription>
        </DialogHeader>

        {!shareUrl ? (
          <div className="flex flex-col gap-4 py-4">
            <p className="text-sm text-muted-foreground">
              Der Link ist 30 Tage gültig. Das Modell wird direkt vom Server geladen (kein Speicherverbrauch).
            </p>
            <Button onClick={handleCreate} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Wird erstellt…
                </>
              ) : (
                <>
                  <Share2 className="h-4 w-4 mr-2" />
                  Link erstellen
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4 py-4">
            <div className="flex gap-2">
              <Input value={shareUrl} readOnly className="text-xs" />
              <Button variant="outline" size="icon" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            {expiresAt && (
              <p className="text-xs text-muted-foreground">
                Gültig bis: {new Date(expiresAt).toLocaleDateString('de-DE')}
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ShareDialog;
