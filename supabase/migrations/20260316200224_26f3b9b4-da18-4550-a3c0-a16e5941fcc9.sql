
CREATE TABLE public.saved_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL,
  project_id integer NOT NULL,
  task_id text NOT NULL,
  task_name text,
  project_name text,
  measurements jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(username, project_id, task_id)
);

-- Index for fast user lookups
CREATE INDEX idx_saved_measurements_username ON public.saved_measurements(username);

-- Enable RLS (no policies for anon - access only via edge function with service_role)
ALTER TABLE public.saved_measurements ENABLE ROW LEVEL SECURITY;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_saved_measurements_updated_at
BEFORE UPDATE ON public.saved_measurements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
