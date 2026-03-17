
-- Nutzerdefinierte Montagesysteme
CREATE TABLE public.user_mounting_systems (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  system_key TEXT NOT NULL,
  manufacturer TEXT NOT NULL,
  system_name TEXT NOT NULL,
  roof_type TEXT NOT NULL,
  description TEXT,
  created_by TEXT NOT NULL,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_mounting_systems ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read user_mounting_systems" ON public.user_mounting_systems FOR SELECT USING (true);
CREATE POLICY "Anyone can insert user_mounting_systems" ON public.user_mounting_systems FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete user_mounting_systems" ON public.user_mounting_systems FOR DELETE USING (true);

-- Nutzerdefinierte Wechselrichter
CREATE TABLE public.user_inverters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  inverter_key TEXT NOT NULL,
  manufacturer TEXT NOT NULL,
  model TEXT NOT NULL,
  nominal_power_ac NUMERIC NOT NULL,
  phases INTEGER NOT NULL,
  has_battery_input BOOLEAN DEFAULT false,
  description TEXT,
  created_by TEXT NOT NULL,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_inverters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read user_inverters" ON public.user_inverters FOR SELECT USING (true);
CREATE POLICY "Anyone can insert user_inverters" ON public.user_inverters FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete user_inverters" ON public.user_inverters FOR DELETE USING (true);
