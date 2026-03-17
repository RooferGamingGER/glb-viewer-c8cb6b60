/**
 * MaterialListPanel.tsx
 * UI-Komponente für die Materialliste nach Dachtyp (ohne Preise)
 * + Community-Materialdatenbank: vorschlagen, melden, Admin-Löschung
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DialogFooter } from '@/components/ui/dialog';
import { Download, Package, ChevronDown, ChevronRight, Info, Plus, AlertTriangle, Trash2, Database, Flag } from 'lucide-react';
import { toast } from 'sonner';
import {
  RoofType,
  PitchedRoofSystem,
  FlatRoofSystem,
  GreenRoofSystem,
  MaterialItem,
  CompleteMaterialList,
} from '@/types/pvPlanning';
import { formatMaterialListAsText } from '@/utils/pvMaterialCalculator';

// ============================================================================
// Edge Function helper
// ============================================================================
const callPvMaterials = async (body: Record<string, unknown>) => {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const res = await fetch(`https://${projectId}.supabase.co/functions/v1/pv-materials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: anonKey },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Fehler bei pv-materials');
  return data;
};

// ============================================================================
// Types
// ============================================================================
interface DbMaterial {
  id: string;
  category: string;
  manufacturer: string;
  product_name: string;
  article_number: string | null;
  unit: string;
  notes: string | null;
  created_by: string;
  created_at: string;
}

interface DbReport {
  id: string;
  material_id: string;
  reported_by: string;
  reason: string;
  created_at: string;
  pv_materials: DbMaterial | null;
}

// ============================================================================
// Props
// ============================================================================
interface MaterialListPanelProps {
  materialList: CompleteMaterialList | null;
  roofType: RoofType;
  mountingSystem: PitchedRoofSystem | FlatRoofSystem | GreenRoofSystem;
  greenRoofAreaM2: number;
  onRoofTypeChange: (type: RoofType) => void;
  onMountingSystemChange: (system: PitchedRoofSystem | FlatRoofSystem | GreenRoofSystem) => void;
  onGreenRoofAreaChange: (area: number) => void;
  onRecalculate: () => void;
  isCalculating: boolean;
  username?: string | null;
}

// ============================================================================
// Constants
// ============================================================================
const CATEGORY_LABELS: Record<string, string> = {
  module: 'PV-Modul',
  mounting: 'Montage',
  electrical: 'Elektrik',
  roofing: 'Dachaufbau',
  safety: 'Sicherheit',
  misc: 'Sonstiges',
};

const PITCHED_SYSTEMS: { value: PitchedRoofSystem; label: string; manufacturer: string }[] = [
  { value: 'braas_rapid2plus', label: 'Rapid² Plus', manufacturer: 'Braas' },
  { value: 'braas_clickfit_evo', label: 'ClickFit Evo', manufacturer: 'Braas' },
  { value: 'bmi_ecobase', label: 'Ecobase', manufacturer: 'BMI' },
  { value: 'bmi_klober_twist', label: 'Klöber Twist', manufacturer: 'BMI' },
  { value: 'k2_systems_base', label: 'BASE System', manufacturer: 'K2 Systems' },
  { value: 'k2_systems_cross', label: 'Cross-Roof', manufacturer: 'K2 Systems' },
  { value: 'mounting_systems_msr', label: 'MSR', manufacturer: 'Mounting Systems' },
  { value: 'schletter_fm_ez', label: 'FM EZ', manufacturer: 'Schletter' },
  { value: 'generic_hook_rail', label: 'Generisch (Haken+Schiene)', manufacturer: 'Generisch' },
];

const FLAT_SYSTEMS: { value: FlatRoofSystem; label: string; manufacturer: string }[] = [
  { value: 'k2_flat_evo_one', label: 'FlatFix EVO One', manufacturer: 'K2 Systems' },
  { value: 'k2_flat_ground', label: 'FlatFix Ground', manufacturer: 'K2 Systems' },
  { value: 'esdec_flatfix_wave', label: 'FlatFix Wave', manufacturer: 'Esdec' },
  { value: 'renusol_cs60', label: 'CS60', manufacturer: 'Renusol' },
  { value: 'schletter_freeform', label: 'FreeForm', manufacturer: 'Schletter' },
  { value: 'mounting_systems_mpk', label: 'MPK', manufacturer: 'Mounting Systems' },
  { value: 'conergy_ts', label: 'Top System', manufacturer: 'Conergy' },
  { value: 'generic_ballast', label: 'Generisch (Ballast)', manufacturer: 'Generisch' },
];

const GREEN_SYSTEMS: { value: GreenRoofSystem; label: string; manufacturer: string }[] = [
  { value: 'bauder_thermofin', label: 'Thermofin TE', manufacturer: 'Bauder' },
  { value: 'soprema_soprasolar', label: 'Soprasolar Ballast', manufacturer: 'Soprema' },
  { value: 'vedag_vedagreen', label: 'VedaGreen Solar', manufacturer: 'Vedag' },
  { value: 'icopal_solarbase', label: 'SolarBase Ballast', manufacturer: 'Icopal' },
  { value: 'optigruen_type_f', label: 'Typ F + PV', manufacturer: 'Optigrün' },
  { value: 'laumanns_greenroof', label: 'Gründach-Solar', manufacturer: 'Laumanns' },
  { value: 'soprema_pavatex', label: 'Pavatex integriert', manufacturer: 'Soprema' },
  { value: 'generic_green_ballast', label: 'Generisch (Gründach)', manufacturer: 'Generisch' },
];

// ============================================================================
// Sub-Components
// ============================================================================
const MaterialItemRow: React.FC<{ item: MaterialItem; index: number }> = ({ item, index }) => (
  <div className="grid grid-cols-10 gap-1 py-1.5 text-xs border-b last:border-b-0 items-start">
    <div className="col-span-1 text-muted-foreground text-right">{index + 1}.</div>
    <div className="col-span-6">
      <div className="font-medium">{item.description}</div>
      {item.manufacturer && (
        <div className="text-muted-foreground text-[10px]">{item.manufacturer}{item.articleNumber ? ` · ${item.articleNumber}` : ''}</div>
      )}
      {item.notes && (
        <div className="text-muted-foreground text-[10px] flex items-start gap-0.5 mt-0.5">
          <Info className="w-2.5 h-2.5 mt-0.5 flex-shrink-0" />
          <span>{item.notes}</span>
        </div>
      )}
    </div>
    <div className="col-span-1 text-center text-muted-foreground">{item.unit}</div>
    <div className="col-span-2 text-right font-mono font-medium">{item.quantity}</div>
  </div>
);

const SectionCollapsible: React.FC<{
  title: string;
  items: MaterialItem[];
  defaultOpen?: boolean;
}> = ({ title, items, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border rounded-md overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-2.5 bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          <span className="text-sm font-medium">{title}</span>
          <Badge variant="secondary" className="text-[10px] h-4">{items.length} Pos.</Badge>
        </div>
      </button>
      {open && (
        <div className="px-3 py-1">
          <div className="grid grid-cols-10 gap-1 py-1 text-[10px] text-muted-foreground border-b">
            <div className="col-span-1 text-right">Pos.</div>
            <div className="col-span-6">Bezeichnung</div>
            <div className="col-span-1 text-center">Einh.</div>
            <div className="col-span-2 text-right">Menge</div>
          </div>
          {items.map((item, i) => (
            <MaterialItemRow key={item.id} item={item} index={i} />
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Material suggest dialog
// ============================================================================
const SuggestMaterialDialog: React.FC<{ username: string; onCreated: () => void }> = ({ username, onCreated }) => {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState('mounting');
  const [manufacturer, setManufacturer] = useState('');
  const [productName, setProductName] = useState('');
  const [articleNumber, setArticleNumber] = useState('');
  const [unit, setUnit] = useState('Stk.');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!manufacturer.trim() || !productName.trim()) {
      toast.error('Hersteller und Produktname sind Pflichtfelder');
      return;
    }
    setSaving(true);
    try {
      await callPvMaterials({
        action: 'create',
        username,
        category,
        manufacturer: manufacturer.trim(),
        product_name: productName.trim(),
        article_number: articleNumber.trim() || null,
        unit: unit.trim() || 'Stk.',
        notes: notes.trim() || null,
      });
      toast.success('Material erfolgreich vorgeschlagen');
      setOpen(false);
      setManufacturer(''); setProductName(''); setArticleNumber(''); setNotes('');
      onCreated();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
          <Plus className="w-3 h-3" /> Material vorschlagen
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm">Material zur Datenbank hinzufügen</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Kategorie</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Hersteller *</Label>
            <Input className="h-8 text-xs mt-1" value={manufacturer} onChange={e => setManufacturer(e.target.value)} placeholder="z.B. Braas, K2 Systems" />
          </div>
          <div>
            <Label className="text-xs">Produktname *</Label>
            <Input className="h-8 text-xs mt-1" value={productName} onChange={e => setProductName(e.target.value)} placeholder="z.B. Rapid² Universaldachhaken" />
          </div>
          <div>
            <Label className="text-xs">Artikelnummer</Label>
            <Input className="h-8 text-xs mt-1" value={articleNumber} onChange={e => setArticleNumber(e.target.value)} placeholder="Optional" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Einheit</Label>
              <Input className="h-8 text-xs mt-1" value={unit} onChange={e => setUnit(e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Hinweise</Label>
            <Textarea className="text-xs mt-1 min-h-[60px]" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Zusätzliche Infos..." />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="ghost" size="sm" className="text-xs">Abbrechen</Button></DialogClose>
          <Button size="sm" className="text-xs" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Speichern...' : 'Speichern'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ============================================================================
// Report dialog
// ============================================================================
const ReportMaterialDialog: React.FC<{ material: DbMaterial; username: string; onReported: () => void }> = ({ material, username, onReported }) => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) { toast.error('Bitte einen Grund angeben'); return; }
    setSaving(true);
    try {
      await callPvMaterials({ action: 'report', username, material_id: material.id, reason: reason.trim() });
      toast.success('Meldung gesendet');
      setOpen(false); setReason('');
      onReported();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Fehler');
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-destructive hover:text-destructive">
          <Flag className="w-3 h-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm">Material melden</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          <strong>{material.manufacturer}</strong> – {material.product_name}
        </p>
        <div>
          <Label className="text-xs">Grund der Meldung</Label>
          <Textarea className="text-xs mt-1 min-h-[80px]" value={reason} onChange={e => setReason(e.target.value)} placeholder="z.B. Falsche Artikelnummer, Produkt existiert nicht, ..." />
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="ghost" size="sm" className="text-xs">Abbrechen</Button></DialogClose>
          <Button size="sm" variant="destructive" className="text-xs" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Senden...' : 'Meldung senden'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ============================================================================
// Community DB Section
// ============================================================================
const CommunityMaterialDB: React.FC<{ username: string | null }> = ({ username }) => {
  const [materials, setMaterials] = useState<DbMaterial[]>([]);
  const [reports, setReports] = useState<DbReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDB, setShowDB] = useState(false);
  const isAdmin = username === 'RooferGaming';

  const loadMaterials = useCallback(async () => {
    setLoading(true);
    try {
      const data = await callPvMaterials({ action: 'list' });
      setMaterials(data.materials || []);
      if (isAdmin) {
        const reportData = await callPvMaterials({ action: 'list_reports', username });
        setReports(reportData.reports || []);
      }
    } catch (e: unknown) {
      console.error('Failed to load materials:', e);
    } finally { setLoading(false); }
  }, [isAdmin, username]);

  useEffect(() => {
    if (showDB) loadMaterials();
  }, [showDB, loadMaterials]);

  const handleDelete = async (materialId: string) => {
    if (!confirm('Material wirklich aus der Datenbank löschen?')) return;
    try {
      await callPvMaterials({ action: 'delete', username, material_id: materialId });
      toast.success('Material gelöscht');
      loadMaterials();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Fehler');
    }
  };

  // Group by category then sort by manufacturer
  const grouped = materials.reduce<Record<string, DbMaterial[]>>((acc, m) => {
    (acc[m.category] = acc[m.category] || []).push(m);
    return acc;
  }, {});
  Object.values(grouped).forEach(arr => arr.sort((a, b) => a.manufacturer.localeCompare(b.manufacturer)));

  const reportsForMaterial = (id: string) => reports.filter(r => r.material_id === id);

  return (
    <Card>
      <CardHeader className="pb-2 pt-3">
        <button onClick={() => setShowDB(!showDB)} className="flex items-center gap-2 w-full text-left">
          {showDB ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          <CardTitle className="text-sm flex items-center gap-2">
            <Database className="w-4 h-4" />
            Material-Datenbank
          </CardTitle>
          <Badge variant="secondary" className="text-[10px] h-4 ml-auto">{materials.length}</Badge>
        </button>
      </CardHeader>
      {showDB && (
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            {username && <SuggestMaterialDialog username={username} onCreated={loadMaterials} />}
            {!username && <p className="text-[10px] text-muted-foreground">Anmeldung erforderlich zum Bearbeiten</p>}
          </div>

          {loading ? (
            <p className="text-xs text-muted-foreground text-center py-4">Laden...</p>
          ) : materials.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Noch keine Materialien in der Datenbank.</p>
          ) : (
            <ScrollArea className="max-h-[40vh]">
              <div className="space-y-3">
                {Object.entries(grouped).map(([cat, items]) => (
                  <div key={cat}>
                    <div className="text-xs font-medium text-muted-foreground mb-1">
                      {CATEGORY_LABELS[cat] || cat} ({items.length})
                    </div>
                    <div className="space-y-1">
                      {items.map(m => {
                        const mReports = reportsForMaterial(m.id);
                        return (
                          <div key={m.id} className="flex items-start gap-2 py-1.5 px-2 border rounded text-xs group">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{m.product_name}</div>
                              <div className="text-muted-foreground text-[10px]">
                                {m.manufacturer}{m.article_number ? ` · ${m.article_number}` : ''} · {m.unit}
                              </div>
                              {m.notes && <div className="text-muted-foreground text-[10px] mt-0.5">{m.notes}</div>}
                              <div className="text-muted-foreground text-[10px] mt-0.5">von {m.created_by}</div>
                              {isAdmin && mReports.length > 0 && (
                                <div className="mt-1 space-y-0.5">
                                  {mReports.map(r => (
                                    <div key={r.id} className="text-[10px] text-destructive flex items-start gap-1">
                                      <AlertTriangle className="w-2.5 h-2.5 mt-0.5 flex-shrink-0" />
                                      <span><strong>{r.reported_by}:</strong> {r.reason}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-0.5 flex-shrink-0">
                              {username && <ReportMaterialDialog material={m} username={username} onReported={loadMaterials} />}
                              {isAdmin && (
                                <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-destructive hover:text-destructive" onClick={() => handleDelete(m.id)}>
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {isAdmin && reports.length > 0 && (
            <>
              <Separator />
              <div>
                <div className="text-xs font-medium flex items-center gap-1 mb-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                  Offene Meldungen ({reports.length})
                </div>
                <div className="space-y-1">
                  {reports.map(r => (
                    <div key={r.id} className="border rounded p-2 text-xs">
                      <div className="font-medium">{r.pv_materials?.product_name || r.material_id}</div>
                      <div className="text-muted-foreground text-[10px]">{r.pv_materials?.manufacturer}</div>
                      <div className="text-destructive text-[10px] mt-1">{r.reported_by}: {r.reason}</div>
                      <Button size="sm" variant="destructive" className="h-5 text-[10px] mt-1" onClick={() => handleDelete(r.material_id)}>
                        Material löschen
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
};

// ============================================================================
// Main Component
// ============================================================================
export const MaterialListPanel: React.FC<MaterialListPanelProps> = ({
  materialList,
  roofType,
  mountingSystem,
  greenRoofAreaM2,
  onRoofTypeChange,
  onMountingSystemChange,
  onGreenRoofAreaChange,
  onRecalculate,
  isCalculating,
  username,
}) => {
  const currentSystems = roofType === 'pitched' ? PITCHED_SYSTEMS : roofType === 'flat' ? FLAT_SYSTEMS : GREEN_SYSTEMS;

  const downloadList = () => {
    if (!materialList) return;
    const text = formatMaterialListAsText(materialList);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'materialliste_pv.txt'; a.click();
    URL.revokeObjectURL(url);
  };

  const downloadCSV = () => {
    if (!materialList) return;
    const lines = ['Pos;Kategorie;Bezeichnung;Hersteller;Artikelnummer;Einheit;Menge;Hinweise'];
    let pos = 1;
    materialList.sections.forEach(section => {
      section.items.forEach(item => {
        lines.push([pos++, section.title, `"${item.description}"`, item.manufacturer || '', item.articleNumber || '', item.unit, item.quantity, `"${item.notes || ''}"`].join(';'));
      });
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'materialliste_pv.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Konfiguration */}
      <Card>
        <CardHeader className="pb-2 pt-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Package className="w-4 h-4" />
            Montagesystem
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">Dachtyp</Label>
            <div className="grid grid-cols-3 gap-1 mt-1">
              {(['pitched', 'flat', 'green'] as RoofType[]).map(rt => (
                <button
                  key={rt}
                  onClick={() => {
                    onRoofTypeChange(rt);
                    const firstSystem = rt === 'pitched' ? PITCHED_SYSTEMS[0].value :
                                        rt === 'flat' ? FLAT_SYSTEMS[0].value : GREEN_SYSTEMS[0].value;
                    onMountingSystemChange(firstSystem);
                  }}
                  className={`py-1.5 px-2 rounded text-xs border transition-colors ${
                    roofType === rt
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  {rt === 'pitched' ? 'Steildach' : rt === 'flat' ? 'Flachdach' : 'Gründach'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs">Montagesystem</Label>
            <Select value={mountingSystem} onValueChange={v => onMountingSystemChange(v as typeof mountingSystem)}>
              <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {currentSystems.map(sys => (
                  <SelectItem key={sys.value} value={sys.value} className="text-xs">
                    <span className="font-medium">{sys.manufacturer}</span> · {sys.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {roofType === 'green' && (
            <div>
              <Label className="text-xs">Begrünte Fläche (m²)</Label>
              <Input
                type="number" value={greenRoofAreaM2}
                onChange={e => onGreenRoofAreaChange(parseFloat(e.target.value) || 0)}
                className="h-8 text-xs mt-1 w-24" min={0} step={1}
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Fläche des extensiven Gründachs rund um die PV-Module
              </p>
            </div>
          )}

          <Button onClick={onRecalculate} size="sm" variant="outline" className="w-full h-7 text-xs" disabled={isCalculating}>
            {isCalculating ? 'Berechne...' : 'Materialliste neu berechnen'}
          </Button>
        </CardContent>
      </Card>

      {/* Materialliste */}
      {materialList ? (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-7 text-xs flex-1" onClick={downloadCSV}>
              <Download className="w-3 h-3 mr-1" /> CSV-Export
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs flex-1" onClick={downloadList}>
              <Download className="w-3 h-3 mr-1" /> Text-Export
            </Button>
          </div>

          <ScrollArea className="max-h-[55vh] pr-1">
            <div className="space-y-2">
              {materialList.sections.map(section => (
                <SectionCollapsible
                  key={section.title} title={section.title} items={section.items}
                  defaultOpen={section.title === 'PV-Module' || section.title === 'Montagesystem'}
                />
              ))}
            </div>
          </ScrollArea>

          <p className="text-[10px] text-muted-foreground mt-2 italic">
            Hinweis: Materialliste dient als Orientierung und kann Fehler enthalten. Mengen und Kompatibilität durch Fachbetrieb prüfen lassen.
          </p>
        </div>
      ) : (
        <div className="text-center py-6 text-muted-foreground text-sm">
          <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p>Keine Materialliste vorhanden.</p>
          <p className="text-xs mt-1">Wähle Dachtyp und Montagesystem, dann berechnen.</p>
        </div>
      )}

      <Separator />

      {/* Community Material-Datenbank */}
      <CommunityMaterialDB username={username ?? null} />
    </div>
  );
};

export default MaterialListPanel;
