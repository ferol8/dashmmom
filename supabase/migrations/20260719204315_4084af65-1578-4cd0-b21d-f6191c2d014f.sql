-- =========================================================
-- Dashboard de análisis Instagram — schema completo
-- Todas las tablas con user_id + RLS scoped a auth.uid()
-- =========================================================

-- Helper: updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ---------- meta (config key/value) ----------
CREATE TABLE public.meta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meta TO authenticated;
GRANT ALL ON public.meta TO service_role;
ALTER TABLE public.meta ENABLE ROW LEVEL SECURITY;
CREATE POLICY "meta_owner_all" ON public.meta FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER meta_updated_at BEFORE UPDATE ON public.meta
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------- account_snapshot ----------
CREATE TABLE public.account_snapshot (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id TEXT,
  username TEXT,
  display_name TEXT,
  profile_picture_url TEXT,
  followers_count BIGINT,
  following_count BIGINT,
  media_count BIGINT,
  biography TEXT,
  raw JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.account_snapshot TO authenticated;
GRANT ALL ON public.account_snapshot TO service_role;
ALTER TABLE public.account_snapshot ENABLE ROW LEVEL SECURITY;
CREATE POLICY "account_snapshot_owner_all" ON public.account_snapshot FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------- account_health ----------
CREATE TABLE public.account_health (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT,
  score NUMERIC,
  issues JSONB,
  raw JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.account_health TO authenticated;
GRANT ALL ON public.account_health TO service_role;
ALTER TABLE public.account_health ENABLE ROW LEVEL SECURITY;
CREATE POLICY "account_health_owner_all" ON public.account_health FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------- account_insights_30d ----------
CREATE TABLE public.account_insights_30d (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  reach BIGINT,
  views BIGINT,
  engaged BIGINT,
  interactions BIGINT,
  likes BIGINT,
  comments_count BIGINT,
  saves BIGINT,
  shares BIGINT,
  engagement_rate NUMERIC,
  raw JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.account_insights_30d TO authenticated;
GRANT ALL ON public.account_insights_30d TO service_role;
ALTER TABLE public.account_insights_30d ENABLE ROW LEVEL SECURITY;
CREATE POLICY "insights_owner_all" ON public.account_insights_30d FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------- daily_metrics (180 días) ----------
CREATE TABLE public.daily_metrics (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  reach BIGINT,
  views BIGINT,
  engaged BIGINT,
  interactions BIGINT,
  likes BIGINT,
  comments_count BIGINT,
  saves BIGINT,
  shares BIGINT,
  posts_count INTEGER,
  raw JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_metrics TO authenticated;
GRANT ALL ON public.daily_metrics TO service_role;
ALTER TABLE public.daily_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "daily_metrics_owner_all" ON public.daily_metrics FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------- demographics_* ----------
CREATE TABLE public.demographics_age (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bucket TEXT NOT NULL,
  percentage NUMERIC,
  count BIGINT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, bucket)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.demographics_age TO authenticated;
GRANT ALL ON public.demographics_age TO service_role;
ALTER TABLE public.demographics_age ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demo_age_owner_all" ON public.demographics_age FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.demographics_gender (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bucket TEXT NOT NULL,
  percentage NUMERIC,
  count BIGINT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, bucket)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.demographics_gender TO authenticated;
GRANT ALL ON public.demographics_gender TO service_role;
ALTER TABLE public.demographics_gender ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demo_gender_owner_all" ON public.demographics_gender FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.demographics_country (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bucket TEXT NOT NULL,
  percentage NUMERIC,
  count BIGINT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, bucket)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.demographics_country TO authenticated;
GRANT ALL ON public.demographics_country TO service_role;
ALTER TABLE public.demographics_country ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demo_country_owner_all" ON public.demographics_country FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.demographics_city (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bucket TEXT NOT NULL,
  percentage NUMERIC,
  count BIGINT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, bucket)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.demographics_city TO authenticated;
GRANT ALL ON public.demographics_city TO service_role;
ALTER TABLE public.demographics_city ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demo_city_owner_all" ON public.demographics_city FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------- posts ----------
CREATE TABLE public.posts (
  id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_type TEXT,
  caption TEXT,
  permalink TEXT,
  thumbnail_url TEXT,
  media_url TEXT,
  published_at TIMESTAMPTZ,
  likes BIGINT,
  comments_count BIGINT,
  shares BIGINT,
  saves BIGINT,
  views BIGINT,
  impressions BIGINT,
  reach BIGINT,
  interactions BIGINT,
  engagement_rate NUMERIC,
  raw JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT ALL ON public.posts TO service_role;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "posts_owner_all" ON public.posts FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX posts_user_published_idx ON public.posts(user_id, published_at DESC);

-- ---------- comments (90d) ----------
CREATE TABLE public.comments (
  id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id TEXT,
  author_username TEXT,
  author_id TEXT,
  text TEXT,
  created_at TIMESTAMPTZ,
  like_count INTEGER,
  is_reply BOOLEAN DEFAULT false,
  parent_comment_id TEXT,
  raw JSONB,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO authenticated;
GRANT ALL ON public.comments TO service_role;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments_owner_all" ON public.comments FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX comments_user_post_idx ON public.comments(user_id, post_id);
CREATE INDEX comments_user_created_idx ON public.comments(user_id, created_at DESC);

-- ---------- conversations ----------
CREATE TABLE public.conversations (
  id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  participant_username TEXT,
  participant_id TEXT,
  last_message_at TIMESTAMPTZ,
  message_count INTEGER,
  raw JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conv_owner_all" ON public.conversations FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------- messages (DMs, 30d) ----------
CREATE TABLE public.messages (
  id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id TEXT,
  sender_id TEXT,
  sender_username TEXT,
  is_from_me BOOLEAN DEFAULT false,
  text TEXT,
  created_at TIMESTAMPTZ,
  raw JSONB,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "msg_owner_all" ON public.messages FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX messages_user_created_idx ON public.messages(user_id, created_at DESC);

-- ---------- best_time ----------
CREATE TABLE public.best_time (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL,
  hour INTEGER NOT NULL,
  score NUMERIC,
  engagement NUMERIC,
  posts_count INTEGER,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, day_of_week, hour)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.best_time TO authenticated;
GRANT ALL ON public.best_time TO service_role;
ALTER TABLE public.best_time ENABLE ROW LEVEL SECURITY;
CREATE POLICY "best_time_owner_all" ON public.best_time FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------- posting_frequency ----------
CREATE TABLE public.posting_frequency (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  posts_per_week NUMERIC NOT NULL,
  avg_engagement NUMERIC,
  weeks_count INTEGER,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, posts_per_week)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.posting_frequency TO authenticated;
GRANT ALL ON public.posting_frequency TO service_role;
ALTER TABLE public.posting_frequency ENABLE ROW LEVEL SECURITY;
CREATE POLICY "posting_freq_owner_all" ON public.posting_frequency FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------- content_decay ----------
CREATE TABLE public.content_decay (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bucket_order INTEGER NOT NULL,
  bucket_label TEXT,
  cumulative_pct NUMERIC,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, bucket_order)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_decay TO authenticated;
GRANT ALL ON public.content_decay TO service_role;
ALTER TABLE public.content_decay ENABLE ROW LEVEL SECURITY;
CREATE POLICY "content_decay_owner_all" ON public.content_decay FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------- follower_history ----------
CREATE TABLE public.follower_history (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  followers_count BIGINT,
  following_count BIGINT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.follower_history TO authenticated;
GRANT ALL ON public.follower_history TO service_role;
ALTER TABLE public.follower_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "follower_hist_owner_all" ON public.follower_history FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------- ideas ----------
CREATE TABLE public.ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  batch_id TEXT,
  source_bucket TEXT NOT NULL DEFAULT 'top_content',
  angle TEXT,
  format TEXT,
  rationale TEXT,
  basis_post_ids JSONB,
  basis_comment_ids JSONB,
  basis_message_ids JSONB,
  evidence_quotes JSONB,
  why_good_idea TEXT,
  suggested_angle TEXT,
  discarded BOOLEAN NOT NULL DEFAULT false
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ideas TO authenticated;
GRANT ALL ON public.ideas TO service_role;
ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ideas_owner_all" ON public.ideas FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX ideas_user_bucket_idx ON public.ideas(user_id, source_bucket, discarded, generated_at DESC);

-- ---------- idea_discards ----------
CREATE TABLE public.idea_discards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  idea_id UUID REFERENCES public.ideas(id) ON DELETE SET NULL,
  angle TEXT,
  source_bucket TEXT,
  discarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason_quick TEXT,
  reason_text TEXT
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.idea_discards TO authenticated;
GRANT ALL ON public.idea_discards TO service_role;
ALTER TABLE public.idea_discards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "idea_discards_owner_all" ON public.idea_discards FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idea_discards_user_time_idx ON public.idea_discards(user_id, discarded_at DESC);

-- ---------- refresh_log ----------
CREATE TABLE public.refresh_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status TEXT,
  steps JSONB,
  error TEXT
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.refresh_log TO authenticated;
GRANT ALL ON public.refresh_log TO service_role;
ALTER TABLE public.refresh_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "refresh_log_owner_all" ON public.refresh_log FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX refresh_log_user_time_idx ON public.refresh_log(user_id, started_at DESC);

-- ---------- transcriptions (opcional) ----------
CREATE TABLE public.transcriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id TEXT,
  language TEXT,
  text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transcriptions TO authenticated;
GRANT ALL ON public.transcriptions TO service_role;
ALTER TABLE public.transcriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transcriptions_owner_all" ON public.transcriptions FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
