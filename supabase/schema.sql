-- ============================================================
-- AtlasOps – Complete Supabase Database Schema
-- AI Content Operations Platform
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. AUTHENTICATION / PROFILES
-- ============================================================
-- Supabase Auth handles auth.users automatically.
-- This table extends it with app-specific profile data.

CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT,
  avatar_url    TEXT,
  role          TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create a profile row whenever a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 2. ORGANIZATIONS (multi-tenant support)
-- ============================================================

CREATE TABLE public.organizations (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  logo_url      TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.organization_members (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role            TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, user_id)
);

-- ============================================================
-- 3. JOBS / PIPELINE  (maps to PipelineBoard + JobDetailPanel)
-- ============================================================
-- Statuses match the Kanban columns:
--   Drafting → Compliance → Localization → Pending → Publishing → Published

CREATE TYPE public.job_status AS ENUM (
  'Drafting',
  'Compliance',
  'Localization',
  'Pending',
  'Publishing',
  'Published'
);

CREATE TABLE public.jobs (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id   UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  display_id        TEXT NOT NULL,                        -- e.g. "JOB-001"
  topic             TEXT NOT NULL,                        -- mission topic / abstract
  audience          TEXT NOT NULL,                        -- target demographics
  languages         TEXT[] NOT NULL DEFAULT '{EN}',       -- L10N target vectors
  status            public.job_status NOT NULL DEFAULT 'Drafting',
  progress          INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  compliance_issues INTEGER NOT NULL DEFAULT 0,
  created_by        UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- For fast Kanban column queries
CREATE INDEX idx_jobs_status ON public.jobs(organization_id, status);
CREATE INDEX idx_jobs_created ON public.jobs(organization_id, created_at DESC);

-- Generated draft content buffer per job (shown in JobDetailPanel → Overview)
CREATE TABLE public.job_content (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id      UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  version     INTEGER NOT NULL DEFAULT 1,
  body        TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (job_id, version)
);

-- File attachments for context sources (NewJobModal file upload)
CREATE TABLE public.job_attachments (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id        UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  file_name     TEXT NOT NULL,
  file_type     TEXT,                               -- MIME type
  file_size     INTEGER,                            -- bytes
  storage_path  TEXT NOT NULL,                       -- Supabase Storage path
  uploaded_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 4. AGENTS  (maps to AgentConstellation)
-- ============================================================

CREATE TYPE public.agent_status AS ENUM ('BUSY', 'IDLE', 'ERROR', 'OFFLINE');

CREATE TABLE public.agents (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id   UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,                       -- e.g. "Drafting Protocol"
  role              TEXT NOT NULL,                       -- e.g. "Initial Generation"
  agent_type        TEXT NOT NULL,                       -- e.g. "drafting", "compliance", "localization", "approval", "publishing"
  status            public.agent_status NOT NULL DEFAULT 'IDLE',
  load_percent      INTEGER NOT NULL DEFAULT 0 CHECK (load_percent >= 0 AND load_percent <= 100),
  last_heartbeat    TIMESTAMPTZ DEFAULT NOW(),
  config            JSONB DEFAULT '{}',                  -- agent-specific configuration
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 5. AGENT LOGS / TELEMETRY  (Global Swarm Output + Live Telemetry)
-- ============================================================

CREATE TABLE public.agent_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  job_id          UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  agent_id        UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  agent_name      TEXT NOT NULL,                         -- denormalized for fast display
  message         TEXT NOT NULL,
  severity        TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('debug', 'info', 'warn', 'error', 'critical')),
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- For chronological feed and per-job filtering
CREATE INDEX idx_agent_logs_org_time ON public.agent_logs(organization_id, created_at DESC);
CREATE INDEX idx_agent_logs_job ON public.agent_logs(job_id, created_at DESC);

-- ============================================================
-- 6. ANALYTICS / KPIs  (maps to AnalyticsView)
-- ============================================================

CREATE TABLE public.analytics_snapshots (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id   UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  avg_turnaround_ms BIGINT,                              -- average job completion time in ms
  compliance_rating NUMERIC(5,2),                        -- percentage, e.g. 98.20
  cost_reduction    NUMERIC(12,2),                       -- dollar amount saved
  period_start      TIMESTAMPTZ NOT NULL,
  period_end        TIMESTAMPTZ NOT NULL,
  metadata          JSONB DEFAULT '{}',                  -- extra KPIs, trends, etc.
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_analytics_org_period ON public.analytics_snapshots(organization_id, period_end DESC);

-- Phase completion durations per stage (for the bar chart)
CREATE TABLE public.phase_durations (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id   UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  job_id            UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  stage             TEXT NOT NULL,                        -- e.g. "Drafting", "Compliance", "Localization", "Approval", "Publishing"
  duration_ms       BIGINT NOT NULL,                      -- time spent in this phase
  completed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_phase_durations_org ON public.phase_durations(organization_id, completed_at DESC);

-- AI-generated executive insights
CREATE TABLE public.insights (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id   UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  insight_type      TEXT NOT NULL CHECK (insight_type IN ('bottleneck', 'optimization', 'anomaly', 'recommendation')),
  title             TEXT NOT NULL,
  description       TEXT NOT NULL,
  severity          TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical', 'success')),
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 7. COMPLIANCE / RULES  (maps to ComplianceRules)
-- ============================================================

CREATE TABLE public.compliance_policies (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id   UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,                        -- e.g. "Strict_FSI_v1.4.2"
  schema_json       JSONB NOT NULL DEFAULT '{}',          -- the editable policy JSON
  flag_threshold    NUMERIC(3,2) NOT NULL DEFAULT 0.85,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_by        UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Blocked / forbidden terms
CREATE TABLE public.blocked_terms (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  policy_id         UUID NOT NULL REFERENCES public.compliance_policies(id) ON DELETE CASCADE,
  term              TEXT NOT NULL,
  is_regex          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_blocked_terms_policy ON public.blocked_terms(policy_id);

-- Required disclaimer declarations
CREATE TABLE public.required_disclaimers (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  policy_id         UUID NOT NULL REFERENCES public.compliance_policies(id) ON DELETE CASCADE,
  text              TEXT NOT NULL,
  is_mandatory      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Compliance validation runs (sandbox dry-run results)
CREATE TABLE public.compliance_runs (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id   UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  policy_id         UUID NOT NULL REFERENCES public.compliance_policies(id) ON DELETE CASCADE,
  job_id            UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  input_text        TEXT NOT NULL,
  result            TEXT NOT NULL CHECK (result IN ('pass', 'fail')),
  violations        TEXT[] DEFAULT '{}',
  run_by            UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_compliance_runs_org ON public.compliance_runs(organization_id, created_at DESC);

-- ============================================================
-- 8. AUDIT TRAIL  (maps to AuditTrail)
-- ============================================================

CREATE TABLE public.audit_logs (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id   UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  job_id            UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  job_display_id    TEXT,                                  -- denormalized for display
  topic             TEXT,                                  -- denormalized for display
  action            TEXT NOT NULL,                         -- e.g. "INITIATED", "BLOCK_TRIGGER", "GATE_PASSED", "DEPLOYED_EDGE", "REVIEW_REQ"
  actor             TEXT NOT NULL,                         -- e.g. "SYSTEM_ROUTER", "HUMAN_APPROVER", "AGENT_COMPLIANCE"
  actor_user_id     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status            TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'fail', 'warning')),
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_org_time ON public.audit_logs(organization_id, created_at DESC);
CREATE INDEX idx_audit_logs_job ON public.audit_logs(job_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(organization_id, action);

-- ============================================================
-- 9. LOCALIZATION  (L10N data for jobs)
-- ============================================================

CREATE TABLE public.localizations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id          UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  language_code   TEXT NOT NULL,                          -- e.g. "EN", "ES", "FR", "DE", "JA"
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'review', 'completed')),
  translated_body TEXT DEFAULT '',
  translator_agent UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (job_id, language_code)
);

-- ============================================================
-- 10. UPDATED_AT TRIGGER (auto-update timestamps)
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER trg_profiles_updated       BEFORE UPDATE ON public.profiles            FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_organizations_updated  BEFORE UPDATE ON public.organizations       FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_jobs_updated           BEFORE UPDATE ON public.jobs                FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_agents_updated         BEFORE UPDATE ON public.agents              FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_policies_updated       BEFORE UPDATE ON public.compliance_policies FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_localizations_updated  BEFORE UPDATE ON public.localizations       FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 11. ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_content           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_attachments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_logs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_snapshots   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phase_durations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insights              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_policies   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_terms         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.required_disclaimers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_runs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.localizations         ENABLE ROW LEVEL SECURITY;

-- Profiles: users can see and edit their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Organization members: users can view their own memberships
CREATE POLICY "Members can view own memberships"
  ON public.organization_members FOR SELECT
  USING (user_id = auth.uid());

-- Helper function: check if user belongs to an org
CREATE OR REPLACE FUNCTION public.user_belongs_to_org(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = org_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Organizations: members can view their organizations
CREATE POLICY "Members can view organizations"
  ON public.organizations FOR SELECT
  USING (public.user_belongs_to_org(id));

-- Jobs: members can CRUD jobs within their org
CREATE POLICY "Members can view org jobs"
  ON public.jobs FOR SELECT
  USING (public.user_belongs_to_org(organization_id));

CREATE POLICY "Members can insert org jobs"
  ON public.jobs FOR INSERT
  WITH CHECK (public.user_belongs_to_org(organization_id));

CREATE POLICY "Members can update org jobs"
  ON public.jobs FOR UPDATE
  USING (public.user_belongs_to_org(organization_id));

-- Job content, attachments: inherit job org access
CREATE POLICY "Members can view job content"
  ON public.job_content FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND public.user_belongs_to_org(j.organization_id)));

CREATE POLICY "Members can view attachments"
  ON public.job_attachments FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND public.user_belongs_to_org(j.organization_id)));

-- Agents: org members can view
CREATE POLICY "Members can view agents"
  ON public.agents FOR SELECT
  USING (public.user_belongs_to_org(organization_id));

-- Agent logs: org members can view
CREATE POLICY "Members can view agent logs"
  ON public.agent_logs FOR SELECT
  USING (public.user_belongs_to_org(organization_id));

-- Analytics: org members can view
CREATE POLICY "Members can view analytics"
  ON public.analytics_snapshots FOR SELECT
  USING (public.user_belongs_to_org(organization_id));

CREATE POLICY "Members can view phase durations"
  ON public.phase_durations FOR SELECT
  USING (public.user_belongs_to_org(organization_id));

CREATE POLICY "Members can view insights"
  ON public.insights FOR SELECT
  USING (public.user_belongs_to_org(organization_id));

-- Compliance: org members can CRUD
CREATE POLICY "Members can view policies"
  ON public.compliance_policies FOR SELECT
  USING (public.user_belongs_to_org(organization_id));

CREATE POLICY "Members can insert policies"
  ON public.compliance_policies FOR INSERT
  WITH CHECK (public.user_belongs_to_org(organization_id));

CREATE POLICY "Members can update policies"
  ON public.compliance_policies FOR UPDATE
  USING (public.user_belongs_to_org(organization_id));

CREATE POLICY "Members can view blocked terms"
  ON public.blocked_terms FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.compliance_policies p WHERE p.id = policy_id AND public.user_belongs_to_org(p.organization_id)));

CREATE POLICY "Members can view disclaimers"
  ON public.required_disclaimers FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.compliance_policies p WHERE p.id = policy_id AND public.user_belongs_to_org(p.organization_id)));

CREATE POLICY "Members can view compliance runs"
  ON public.compliance_runs FOR SELECT
  USING (public.user_belongs_to_org(organization_id));

CREATE POLICY "Members can insert compliance runs"
  ON public.compliance_runs FOR INSERT
  WITH CHECK (public.user_belongs_to_org(organization_id));

-- Audit logs: org members can view (read-only, system-written)
CREATE POLICY "Members can view audit logs"
  ON public.audit_logs FOR SELECT
  USING (public.user_belongs_to_org(organization_id));

-- Localizations: org members can view via job
CREATE POLICY "Members can view localizations"
  ON public.localizations FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND public.user_belongs_to_org(j.organization_id)));

-- ============================================================
-- 12. REALTIME SUBSCRIPTIONS
-- ============================================================
-- Enable Supabase Realtime on key tables for live UI updates

ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agents;
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.compliance_runs;

-- ============================================================
-- 13. STORAGE BUCKETS (run via Supabase Dashboard or API)
-- ============================================================
-- These statements create storage buckets for file uploads.
-- Note: Storage bucket creation may need to be done via the
-- Supabase Dashboard if SQL storage APIs aren't available.

-- INSERT INTO storage.buckets (id, name, public) VALUES
--   ('job-attachments', 'job-attachments', FALSE);

-- Storage RLS policy (example):
-- CREATE POLICY "Authenticated users can upload"
--   ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'job-attachments' AND auth.role() = 'authenticated');
