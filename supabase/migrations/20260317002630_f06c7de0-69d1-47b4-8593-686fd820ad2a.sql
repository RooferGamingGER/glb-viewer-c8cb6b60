
-- Tabelle: pv_materials (Community-Materialdatenbank)
CREATE TABLE public.pv_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  manufacturer TEXT NOT NULL,
  product_name TEXT NOT NULL,
  article_number TEXT,
  unit TEXT NOT NULL DEFAULT 'Stk.',
  notes TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabelle: pv_material_reports (Meldungen falscher Daten)
CREATE TABLE public.pv_material_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid REFERENCES public.pv_materials(id) ON DELETE CASCADE NOT NULL,
  reported_by TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS aktivieren
ALTER TABLE public.pv_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pv_material_reports ENABLE ROW LEVEL SECURITY;

-- Jeder kann lesen (keine Supabase Auth, Edge Function managed)
CREATE POLICY "Anyone can read pv_materials"
ON public.pv_materials FOR SELECT USING (true);

CREATE POLICY "Anyone can insert pv_materials"
ON public.pv_materials FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can read pv_material_reports"
ON public.pv_material_reports FOR SELECT USING (true);

CREATE POLICY "Anyone can insert pv_material_reports"
ON public.pv_material_reports FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can delete pv_materials"
ON public.pv_materials FOR DELETE USING (true);

CREATE POLICY "Anyone can delete pv_material_reports"
ON public.pv_material_reports FOR DELETE USING (true);

-- Trigger für updated_at
CREATE TRIGGER update_pv_materials_updated_at
BEFORE UPDATE ON public.pv_materials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
