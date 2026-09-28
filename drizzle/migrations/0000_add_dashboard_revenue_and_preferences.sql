CREATE TABLE public.revenue_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  concept text NOT NULL,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT revenue_entries_status_check CHECK (status IN ('pending', 'paid')),
  CONSTRAINT revenue_entries_amount_check CHECK (amount >= 0)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.revenue_entries TO authenticated;
GRANT ALL ON public.revenue_entries TO service_role;
ALTER TABLE public.revenue_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY revenue_entries_owner_all ON public.revenue_entries FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX revenue_entries_user_date_idx ON public.revenue_entries (user_id, entry_date DESC);
CREATE TRIGGER revenue_entries_updated_at BEFORE UPDATE ON public.revenue_entries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.dashboard_preferences (
  user_id uuid PRIMARY KEY,
  timezone text NOT NULL DEFAULT 'America/Mexico_City',
  default_period integer NOT NULL DEFAULT 28,
  currency text NOT NULL DEFAULT 'MXN',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dashboard_preferences_period_check CHECK (default_period IN (7, 28, 90)),
  CONSTRAINT dashboard_preferences_currency_check CHECK (currency IN ('MXN', 'USD', 'EUR'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dashboard_preferences TO authenticated;
GRANT ALL ON public.dashboard_preferences TO service_role;
ALTER TABLE public.dashboard_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY dashboard_preferences_owner_all ON public.dashboard_preferences FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER dashboard_preferences_updated_at BEFORE UPDATE ON public.dashboard_preferences FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();