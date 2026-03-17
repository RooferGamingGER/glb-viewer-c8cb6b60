
CREATE TABLE public.shared_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  share_token text UNIQUE NOT NULL,
  webodm_server_url text NOT NULL,
  webodm_token text NOT NULL,
  project_id integer NOT NULL,
  task_id text NOT NULL,
  file_name text NOT NULL,
  measurements jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '30 days')
);

ALTER TABLE public.shared_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read shared_views by token"
ON public.shared_views
FOR SELECT
TO public
USING (true);

CREATE POLICY "Anyone can insert shared_views"
ON public.shared_views
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Anyone can delete shared_views"
ON public.shared_views
FOR DELETE
TO public
USING (true);
