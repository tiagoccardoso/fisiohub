-- ============================================================================
-- FisioSys - Schema completo para novo banco Neon PostgreSQL
-- Versão: 2026-05-28
-- Objetivo: criar um banco novo sem dependências do Supabase.
--
-- Como usar:
-- 1) Neon Console > SQL Editor.
-- 2) Cole e execute este arquivo inteiro.
-- 3) Configure no projeto: DATABASE_URL, NEON_AUTH_BASE_URL e NEON_AUTH_COOKIE_SECRET.
--
-- Observações:
-- - Este script NÃO cria schema auth.users do Supabase e NÃO depende dele.
-- - A tabela public.users é a tabela de perfis da aplicação.
-- - Para Neon Auth, grave o identificador do provedor em public.users.auth_user_id.
-- - password_hash fica disponível apenas se o projeto optar por autenticação própria.
-- - RLS não é habilitado aqui porque o acesso recomendado para Neon é via servidor/API usando DATABASE_URL.
-- ============================================================================

BEGIN;

SET search_path = public;

-- ----------------------------------------------------------------------------
-- 1. Extensões
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "citext";

-- ----------------------------------------------------------------------------
-- 2. Tipos / Enums idempotentes
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM (
    'admin', 'mentor', 'intern', 'guest', 'professional', 'therapist', 'receptionist', 'patient', 'student'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.project_status AS ENUM (
    'planning', 'active', 'on_hold', 'completed', 'cancelled', 'archived'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.task_status AS ENUM ('todo', 'in_progress', 'review', 'done');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Compatibilidade com códigos antigos que chamam o enum de priority.
DO $$ BEGIN
  CREATE TYPE public.priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.mentorship_status AS ENUM ('active', 'completed', 'paused', 'suspended');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.template_type AS ENUM (
    'evaluation', 'exercise', 'protocol', 'note', 'document', 'treatment_plan', 'progress_report', 'procedure', 'general'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.comment_target_type AS ENUM (
    'notebook', 'page', 'project', 'task', 'patient_record', 'document'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.activity_action AS ENUM (
    'create', 'read', 'update', 'delete', 'view', 'share', 'comment', 'login', 'logout', 'restore'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.resource_type AS ENUM (
    'user', 'notebook', 'page', 'project', 'task', 'comment', 'mentorship', 'patient', 'patient_record',
    'calendar_event', 'appointment', 'exercise', 'notification', 'setting'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Corrige o erro: ERROR: type "booking_status" already exists.
DO $$ BEGIN
  CREATE TYPE public.booking_status AS ENUM (
    'pending', 'scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.appointment_type AS ENUM (
    'appointment', 'evaluation', 'return', 'session', 'supervision', 'meeting', 'break', 'blocked'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.feedback_type AS ENUM ('positive', 'improvement', 'neutral');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.notification_type AS ENUM ('info', 'success', 'warning', 'error', 'event', 'system');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ----------------------------------------------------------------------------
-- 3. Funções utilitárias
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.safe_slug(input_text text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT trim(both '-' from regexp_replace(lower(coalesce(input_text, '')), '[^a-z0-9]+', '-', 'g'));
$$;

-- ----------------------------------------------------------------------------
-- 4. Usuários, autenticação da aplicação e perfis
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id text UNIQUE,
  email citext UNIQUE NOT NULL,
  full_name text NOT NULL,
  display_name text,
  avatar_url text,
  profile_image_url text,
  role public.user_role NOT NULL DEFAULT 'admin',
  phone text,
  crefito text,
  specialty text,
  university text,
  semester integer,
  is_active boolean NOT NULL DEFAULT true,
  last_login timestamptz,
  email_verified_at timestamptz,
  password_hash text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_semester_check CHECK (semester IS NULL OR semester BETWEEN 1 AND 20)
);

CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON public.users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_full_name_trgm ON public.users USING gin (full_name gin_trgm_ops);

-- Sessões próprias, caso o projeto implemente login direto via DATABASE_URL.
CREATE TABLE IF NOT EXISTS public.app_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  session_token_hash text UNIQUE NOT NULL,
  user_agent text,
  ip_address inet,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_sessions_user_id ON public.app_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_app_sessions_expires_at ON public.app_sessions(expires_at);

-- Compatibilidade: evita erro relation "public.admin_users" does not exist em consultas antigas.
CREATE OR REPLACE VIEW public.admin_users AS
SELECT *
FROM public.users
WHERE role = 'admin';

CREATE OR REPLACE VIEW public.professionals AS
SELECT
  id,
  auth_user_id,
  email,
  full_name,
  display_name,
  avatar_url,
  profile_image_url,
  role,
  phone,
  crefito,
  specialty,
  is_active,
  created_at,
  updated_at
FROM public.users
WHERE role IN ('admin', 'mentor', 'professional', 'therapist')
  AND is_active = true;

-- ----------------------------------------------------------------------------
-- 5. Pacientes e prontuários
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  birth_date date,
  gender text,
  cpf text UNIQUE,
  phone text,
  email citext,
  address text,
  emergency_contact_name text,
  emergency_contact_phone text,
  initial_medical_history text,
  notes text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_patients_full_name_trgm ON public.patients USING gin (full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_patients_created_by ON public.patients(created_by);
CREATE INDEX IF NOT EXISTS idx_patients_status ON public.patients(status);
CREATE INDEX IF NOT EXISTS idx_patients_cpf ON public.patients(cpf);

CREATE TABLE IF NOT EXISTS public.patient_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  session_date timestamptz NOT NULL DEFAULT now(),
  title text,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  record_type text NOT NULL DEFAULT 'evolution' CHECK (record_type IN ('evolution', 'evaluation', 'note', 'document', 'prescription')),
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_patient_records_patient_id ON public.patient_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_records_session_date ON public.patient_records(session_date DESC);
CREATE INDEX IF NOT EXISTS idx_patient_records_created_by ON public.patient_records(created_by);

-- ----------------------------------------------------------------------------
-- 6. Notebooks, páginas e colaboração documental
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notebooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  icon text NOT NULL DEFAULT '📁',
  color text NOT NULL DEFAULT 'default',
  category text NOT NULL DEFAULT 'geral',
  tags text[] NOT NULL DEFAULT '{}'::text[],
  template_type public.template_type NOT NULL DEFAULT 'note',
  owner_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  is_public boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notebooks_owner_id ON public.notebooks(owner_id);
CREATE INDEX IF NOT EXISTS idx_notebooks_created_by ON public.notebooks(created_by);
CREATE INDEX IF NOT EXISTS idx_notebooks_category ON public.notebooks(category);
CREATE INDEX IF NOT EXISTS idx_notebooks_title_trgm ON public.notebooks USING gin (title gin_trgm_ops);

CREATE TABLE IF NOT EXISTS public.pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id uuid NOT NULL REFERENCES public.notebooks(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.pages(id) ON DELETE CASCADE,
  parent_page_id uuid REFERENCES public.pages(id) ON DELETE CASCADE,
  title text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  slug text,
  template_type public.template_type NOT NULL DEFAULT 'document',
  order_index integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  last_edited_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  version integer NOT NULL DEFAULT 1,
  is_published boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (notebook_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_pages_notebook_id ON public.pages(notebook_id);
CREATE INDEX IF NOT EXISTS idx_pages_parent_id ON public.pages(parent_id);
CREATE INDEX IF NOT EXISTS idx_pages_created_by ON public.pages(created_by);

CREATE TABLE IF NOT EXISTS public.document_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL,
  document_type text NOT NULL DEFAULT 'notebook' CHECK (document_type IN ('notebook', 'page', 'project', 'patient_record')),
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  user_name text,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  content_preview text,
  changes_summary text,
  version_number integer NOT NULL DEFAULT 1,
  is_current boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_versions_document ON public.document_versions(document_id, document_type);
CREATE INDEX IF NOT EXISTS idx_document_versions_user_id ON public.document_versions(user_id);

-- ----------------------------------------------------------------------------
-- 7. Projetos, tarefas e colaboração
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  status public.project_status NOT NULL DEFAULT 'planning',
  priority public.task_priority NOT NULL DEFAULT 'medium',
  due_date date,
  start_date date,
  progress integer NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  completion_percentage integer NOT NULL DEFAULT 0 CHECK (completion_percentage BETWEEN 0 AND 100),
  budget numeric(14,2),
  category text NOT NULL DEFAULT 'clinical' CHECK (category IN ('clinical', 'research', 'education', 'administrative', 'other')),
  owner_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  tags text[] NOT NULL DEFAULT '{}'::text[],
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON public.projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON public.projects(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_due_date ON public.projects(due_date);
CREATE INDEX IF NOT EXISTS idx_projects_title_trgm ON public.projects USING gin (title gin_trgm_ops);

CREATE TABLE IF NOT EXISTS public.project_patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  UNIQUE (project_id, patient_id)
);

CREATE INDEX IF NOT EXISTS idx_project_patients_project_id ON public.project_patients(project_id);
CREATE INDEX IF NOT EXISTS idx_project_patients_patient_id ON public.project_patients(patient_id);

CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  parent_task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status public.task_status NOT NULL DEFAULT 'todo',
  priority public.task_priority NOT NULL DEFAULT 'medium',
  assigned_to uuid REFERENCES public.users(id) ON DELETE SET NULL,
  assignee_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  due_date timestamptz,
  completed_at timestamptz,
  estimated_hours integer,
  actual_hours integer NOT NULL DEFAULT 0,
  order_index integer NOT NULL DEFAULT 0,
  dependencies uuid[] NOT NULL DEFAULT '{}'::uuid[],
  checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON public.tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_patient_id ON public.tasks(patient_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);

CREATE TABLE IF NOT EXISTS public.project_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  permission text NOT NULL DEFAULT 'read' CHECK (permission IN ('read', 'write', 'admin')),
  role text NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_collaborators_project_id ON public.project_collaborators(project_id);
CREATE INDEX IF NOT EXISTS idx_project_collaborators_user_id ON public.project_collaborators(user_id);

CREATE TABLE IF NOT EXISTS public.notebook_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id uuid NOT NULL REFERENCES public.notebooks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  permission text NOT NULL DEFAULT 'read' CHECK (permission IN ('read', 'write', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (notebook_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_notebook_collaborators_notebook_id ON public.notebook_collaborators(notebook_id);
CREATE INDEX IF NOT EXISTS idx_notebook_collaborators_user_id ON public.notebook_collaborators(user_id);

CREATE TABLE IF NOT EXISTS public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  author_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  user_name text,
  user_avatar text,
  target_type public.comment_target_type,
  target_id uuid,
  document_id uuid,
  selection_text text,
  parent_comment_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,
  is_resolved boolean NOT NULL DEFAULT false,
  is_pinned boolean NOT NULL DEFAULT false,
  mentions uuid[] NOT NULL DEFAULT '{}'::uuid[],
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comments_target ON public.comments(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_comments_document_id ON public.comments(document_id);
CREATE INDEX IF NOT EXISTS idx_comments_author_id ON public.comments(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  action public.activity_action NOT NULL,
  resource_type public.resource_type NOT NULL,
  resource_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource ON public.activity_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);

-- ----------------------------------------------------------------------------
-- 8. Mentorias, progresso e competências
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mentorships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  mentee_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  intern_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  status public.mentorship_status NOT NULL DEFAULT 'active',
  start_date date NOT NULL DEFAULT current_date,
  end_date date,
  goals text[] NOT NULL DEFAULT '{}'::text[],
  competencies jsonb NOT NULL DEFAULT '[]'::jsonb,
  hours_completed integer NOT NULL DEFAULT 0,
  hours_required integer NOT NULL DEFAULT 0,
  notes text,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mentorships_mentor_id ON public.mentorships(mentor_id);
CREATE INDEX IF NOT EXISTS idx_mentorships_intern_id ON public.mentorships(intern_id);
CREATE INDEX IF NOT EXISTS idx_mentorships_status ON public.mentorships(status);

CREATE TABLE IF NOT EXISTS public.progress_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentorship_id uuid NOT NULL REFERENCES public.mentorships(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT current_date,
  content text NOT NULL,
  achievements text[] NOT NULL DEFAULT '{}'::text[],
  next_steps text[] NOT NULL DEFAULT '{}'::text[],
  feedback_type public.feedback_type NOT NULL DEFAULT 'neutral',
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_progress_notes_mentorship_id ON public.progress_notes(mentorship_id);
CREATE INDEX IF NOT EXISTS idx_progress_notes_created_by ON public.progress_notes(created_by);

CREATE TABLE IF NOT EXISTS public.competency_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentorship_id uuid NOT NULL REFERENCES public.mentorships(id) ON DELETE CASCADE,
  competency text NOT NULL,
  level integer NOT NULL CHECK (level BETWEEN 1 AND 5),
  evaluation_date date NOT NULL DEFAULT current_date,
  notes text,
  evaluated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_competency_evaluations_mentorship_id ON public.competency_evaluations(mentorship_id);

-- ----------------------------------------------------------------------------
-- 9. Agenda, calendário e agendamentos
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  event_type text NOT NULL DEFAULT 'appointment' CHECK (event_type IN ('appointment', 'evaluation', 'return', 'session', 'supervision', 'meeting', 'break', 'blocked')),
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  location text,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('pending', 'scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled')),
  patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  professional_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  attendees uuid[] NOT NULL DEFAULT '{}'::uuid[],
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT calendar_events_time_check CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON public.calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_end_time ON public.calendar_events(end_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_created_by ON public.calendar_events(created_by);
CREATE INDEX IF NOT EXISTS idx_calendar_events_patient_id ON public.calendar_events(patient_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_professional_id ON public.calendar_events(professional_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_attendees ON public.calendar_events USING gin(attendees);

CREATE TABLE IF NOT EXISTS public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  duration_minutes integer NOT NULL DEFAULT 60 CHECK (duration_minutes > 0),
  price numeric(12,2),
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_services_active ON public.services(is_active);

CREATE TABLE IF NOT EXISTS public.professional_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  custom_price numeric(12,2),
  custom_duration_minutes integer,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (professional_id, service_id)
);

CREATE INDEX IF NOT EXISTS idx_professional_services_professional ON public.professional_services(professional_id);
CREATE INDEX IF NOT EXISTS idx_professional_services_service ON public.professional_services(service_id);

CREATE TABLE IF NOT EXISTS public.professional_working_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  weekday integer NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  slot_minutes integer NOT NULL DEFAULT 30 CHECK (slot_minutes > 0),
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT professional_working_hours_time_check CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_working_hours_professional ON public.professional_working_hours(professional_id);
CREATE INDEX IF NOT EXISTS idx_working_hours_weekday ON public.professional_working_hours(weekday);

CREATE TABLE IF NOT EXISTS public.professional_time_off (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  reason text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT professional_time_off_time_check CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_time_off_professional ON public.professional_time_off(professional_id);
CREATE INDEX IF NOT EXISTS idx_time_off_period ON public.professional_time_off(start_time, end_time);

CREATE TABLE IF NOT EXISTS public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  professional_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  calendar_event_id uuid REFERENCES public.calendar_events(id) ON DELETE SET NULL,
  appointment_type public.appointment_type NOT NULL DEFAULT 'appointment',
  status public.booking_status NOT NULL DEFAULT 'scheduled',
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  patient_name text,
  patient_email citext,
  patient_phone text,
  notes text,
  cancellation_reason text,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT appointments_time_check CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_professional_id ON public.appointments(professional_id);
CREATE INDEX IF NOT EXISTS idx_appointments_starts_at ON public.appointments(starts_at);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);

-- Compatibilidade com nomes usados em alguns prompts/migrations antigos.
CREATE OR REPLACE VIEW public.bookings AS
SELECT
  id,
  patient_id,
  professional_id,
  service_id,
  calendar_event_id,
  appointment_type,
  status,
  starts_at,
  ends_at,
  patient_name,
  patient_email,
  patient_phone,
  notes,
  cancellation_reason,
  created_by,
  metadata,
  created_at,
  updated_at
FROM public.appointments;

-- ----------------------------------------------------------------------------
-- 10. Notificações
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error', 'event', 'system')),
  read boolean NOT NULL DEFAULT false,
  action_url text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_read ON public.notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

CREATE TABLE IF NOT EXISTS public.notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  email_notifications boolean NOT NULL DEFAULT true,
  push_notifications boolean NOT NULL DEFAULT true,
  calendar_reminders boolean NOT NULL DEFAULT true,
  project_updates boolean NOT NULL DEFAULT true,
  team_mentions boolean NOT NULL DEFAULT true,
  system_alerts boolean NOT NULL DEFAULT true,
  reminder_time integer NOT NULL DEFAULT 15,
  quiet_hours_start text NOT NULL DEFAULT '22:00',
  quiet_hours_end text NOT NULL DEFAULT '07:00',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON public.notification_settings(user_id);

CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id uuid,
  p_title text,
  p_message text,
  p_type text DEFAULT 'info',
  p_action_url text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_notification_id uuid;
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, action_url, metadata)
  VALUES (p_user_id, p_title, p_message, p_type, p_action_url, coalesce(p_metadata, '{}'::jsonb))
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;

-- ----------------------------------------------------------------------------
-- 11. Fisioterapia clínica
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.physiotherapy_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  evaluator_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  evaluation_date date NOT NULL DEFAULT current_date,
  main_complaint text NOT NULL,
  pain_scale_initial integer CHECK (pain_scale_initial BETWEEN 0 AND 10),
  pain_location text,
  pain_characteristics text,
  medical_history text,
  previous_treatments text,
  medications text,
  lifestyle_factors text,
  posture_analysis text,
  muscle_strength jsonb,
  range_of_motion jsonb,
  functional_tests jsonb,
  clinical_diagnosis text,
  physiotherapy_diagnosis text,
  treatment_goals text[],
  estimated_sessions integer,
  frequency_per_week integer,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_physio_evaluations_patient ON public.physiotherapy_evaluations(patient_id);
CREATE INDEX IF NOT EXISTS idx_physio_evaluations_evaluator ON public.physiotherapy_evaluations(evaluator_id);
CREATE INDEX IF NOT EXISTS idx_physio_evaluations_date ON public.physiotherapy_evaluations(evaluation_date);

CREATE TABLE IF NOT EXISTS public.treatment_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  therapist_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  evaluation_id uuid REFERENCES public.physiotherapy_evaluations(id) ON DELETE SET NULL,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  session_date date NOT NULL DEFAULT current_date,
  session_number integer,
  duration_minutes integer NOT NULL DEFAULT 60,
  pain_scale_before integer CHECK (pain_scale_before BETWEEN 0 AND 10),
  pain_scale_after integer CHECK (pain_scale_after BETWEEN 0 AND 10),
  techniques_used text[],
  exercises_performed jsonb,
  patient_response text,
  observations text,
  objective_improvements text,
  patient_feedback text,
  next_session_plan text,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_treatment_sessions_patient ON public.treatment_sessions(patient_id);
CREATE INDEX IF NOT EXISTS idx_treatment_sessions_therapist ON public.treatment_sessions(therapist_id);
CREATE INDEX IF NOT EXISTS idx_treatment_sessions_date ON public.treatment_sessions(session_date);

CREATE TABLE IF NOT EXISTS public.exercise_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text NOT NULL,
  body_region text[],
  anatomical_region text,
  difficulty_level integer CHECK (difficulty_level BETWEEN 1 AND 5),
  equipment_needed text[],
  contraindications text[],
  default_sets integer NOT NULL DEFAULT 3,
  default_reps integer NOT NULL DEFAULT 10,
  default_hold_time integer,
  default_rest_time integer,
  image_url text,
  video_url text,
  instruction_steps text[],
  recommended_conditions text[],
  is_favorite boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exercise_library_category ON public.exercise_library(category);
CREATE INDEX IF NOT EXISTS idx_exercise_library_active ON public.exercise_library(is_active);
CREATE INDEX IF NOT EXISTS idx_exercise_library_name_trgm ON public.exercise_library USING gin (name gin_trgm_ops);

-- Compatibilidade com API antiga que consulta public.exercises.
CREATE TABLE IF NOT EXISTS public.exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text NOT NULL,
  difficulty text,
  difficulty_level integer CHECK (difficulty_level BETWEEN 1 AND 5),
  body_region text[],
  anatomical_region text,
  equipment_needed text[],
  contraindications text[],
  instructions text,
  video_url text,
  image_url text,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exercises_category ON public.exercises(category);
CREATE INDEX IF NOT EXISTS idx_exercises_difficulty_level ON public.exercises(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_exercises_active ON public.exercises(is_active);

CREATE TABLE IF NOT EXISTS public.exercise_prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  prescribed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  evaluation_id uuid REFERENCES public.physiotherapy_evaluations(id) ON DELETE SET NULL,
  prescription_date date NOT NULL DEFAULT current_date,
  title text NOT NULL,
  description text,
  frequency_per_week integer NOT NULL DEFAULT 3,
  duration_weeks integer NOT NULL DEFAULT 4,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'completed', 'suspended')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exercise_prescriptions_patient ON public.exercise_prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_exercise_prescriptions_status ON public.exercise_prescriptions(status);

CREATE TABLE IF NOT EXISTS public.prescription_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id uuid NOT NULL REFERENCES public.exercise_prescriptions(id) ON DELETE CASCADE,
  exercise_id uuid REFERENCES public.exercise_library(id) ON DELETE SET NULL,
  legacy_exercise_id uuid REFERENCES public.exercises(id) ON DELETE SET NULL,
  sets integer NOT NULL DEFAULT 3,
  reps integer,
  hold_time integer,
  rest_time integer,
  week_start integer NOT NULL DEFAULT 1,
  week_end integer,
  progression_notes text,
  order_index integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prescription_exercises_prescription ON public.prescription_exercises(prescription_id);
CREATE INDEX IF NOT EXISTS idx_prescription_exercises_exercise ON public.prescription_exercises(exercise_id);

CREATE TABLE IF NOT EXISTS public.exercise_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_exercise_id uuid NOT NULL REFERENCES public.prescription_exercises(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  execution_date date NOT NULL DEFAULT current_date,
  sets_completed integer,
  reps_completed integer,
  duration_seconds integer,
  pain_level integer CHECK (pain_level BETWEEN 0 AND 10),
  difficulty_perceived integer CHECK (difficulty_perceived BETWEEN 1 AND 5),
  notes text,
  photos text[],
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exercise_executions_patient ON public.exercise_executions(patient_id);
CREATE INDEX IF NOT EXISTS idx_exercise_executions_date ON public.exercise_executions(execution_date);

CREATE TABLE IF NOT EXISTS public.goniometry_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id uuid REFERENCES public.physiotherapy_evaluations(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE,
  joint text NOT NULL,
  movement text NOT NULL,
  measurement_degrees numeric(6,2),
  side text CHECK (side IN ('left', 'right', 'bilateral', 'not_applicable')),
  pain_reported boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_goniometry_patient ON public.goniometry_measurements(patient_id);
CREATE INDEX IF NOT EXISTS idx_goniometry_evaluation ON public.goniometry_measurements(evaluation_id);

CREATE TABLE IF NOT EXISTS public.functional_test_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id uuid REFERENCES public.physiotherapy_evaluations(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE,
  test_name text NOT NULL,
  result_value text,
  unit text,
  interpretation text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_functional_tests_patient ON public.functional_test_results(patient_id);
CREATE INDEX IF NOT EXISTS idx_functional_tests_evaluation ON public.functional_test_results(evaluation_id);

CREATE TABLE IF NOT EXISTS public.evolution_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  uploaded_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  photo_url text NOT NULL,
  caption text,
  taken_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evolution_photos_patient ON public.evolution_photos(patient_id);

CREATE TABLE IF NOT EXISTS public.clinical_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  generated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  title text NOT NULL,
  report_type text NOT NULL DEFAULT 'clinical',
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  file_url text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'final', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clinical_reports_patient ON public.clinical_reports(patient_id);

-- ----------------------------------------------------------------------------
-- 12. Configurações, páginas institucionais e assets
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clinic_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_name text NOT NULL DEFAULT 'FisioSys',
  legal_name text,
  document_number text,
  phone text,
  email citext,
  address text,
  logo_url text,
  primary_color text,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.site_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key text UNIQUE NOT NULL,
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_published boolean NOT NULL DEFAULT true,
  updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.site_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_key text,
  file_name text NOT NULL,
  file_url text NOT NULL,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_site_pages_key ON public.site_pages(page_key);
CREATE INDEX IF NOT EXISTS idx_site_assets_key ON public.site_assets(asset_key);

-- ----------------------------------------------------------------------------
-- 13. Funções de analytics usadas pelo projeto
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_total_patients()
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::integer FROM public.patients WHERE status <> 'archived';
$$;

CREATE OR REPLACE FUNCTION public.get_appointments_this_month()
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT (
    SELECT COUNT(*) FROM public.calendar_events
    WHERE event_type = 'appointment'
      AND date_trunc('month', start_time) = date_trunc('month', now())
  )::integer
  +
  (
    SELECT COUNT(*) FROM public.appointments
    WHERE date_trunc('month', starts_at) = date_trunc('month', now())
  )::integer;
$$;

CREATE OR REPLACE FUNCTION public.get_new_patients_this_month()
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::integer
  FROM public.patients
  WHERE date_trunc('month', created_at) = date_trunc('month', now());
$$;

CREATE OR REPLACE FUNCTION public.get_appointment_status_distribution()
RETURNS TABLE(status text, count bigint)
LANGUAGE sql
STABLE
AS $$
  SELECT status, COUNT(*) AS count
  FROM (
    SELECT ce.status::text AS status
    FROM public.calendar_events ce
    WHERE ce.event_type = 'appointment'
    UNION ALL
    SELECT a.status::text AS status
    FROM public.appointments a
  ) s
  GROUP BY status
  ORDER BY status;
$$;

CREATE OR REPLACE FUNCTION public.get_project_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT jsonb_build_object(
    'total_projects', COUNT(*)::integer,
    'active_projects', COUNT(*) FILTER (WHERE status = 'active')::integer,
    'completed_this_month', COUNT(*) FILTER (
      WHERE status = 'completed'
        AND date_trunc('month', updated_at) = date_trunc('month', now())
    )::integer,
    'overdue_projects', COUNT(*) FILTER (
      WHERE due_date IS NOT NULL
        AND due_date < current_date
        AND status NOT IN ('completed', 'cancelled', 'archived')
    )::integer,
    'team_productivity', COALESCE(ROUND(AVG(completion_percentage))::integer, 0),
    'average_completion_time', COALESCE(ROUND(AVG(EXTRACT(day FROM (updated_at - created_at))))::integer, 0)
  )
  FROM public.projects;
$$;

-- Placeholder seguro para rota antiga de backup, caso seja convertida para RPC.
CREATE OR REPLACE FUNCTION public.perform_database_backup(backup_type text DEFAULT 'manual')
RETURNS jsonb
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN jsonb_build_object(
    'status', 'not_implemented',
    'message', 'Backup deve ser executado fora do banco, via ferramenta de infraestrutura do Neon.',
    'backup_type', backup_type,
    'created_at', now()
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 14. Triggers de updated_at
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'users', 'app_sessions', 'patients', 'patient_records', 'notebooks', 'pages', 'projects', 'tasks',
    'mentorships', 'progress_notes', 'competency_evaluations', 'comments', 'calendar_events', 'services',
    'professional_working_hours', 'professional_time_off', 'appointments', 'notifications', 'notification_settings',
    'physiotherapy_evaluations', 'treatment_sessions', 'exercise_library', 'exercises', 'exercise_prescriptions',
    'clinical_reports', 'clinic_settings', 'site_pages'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON public.%I', tbl, tbl);
    EXECUTE format(
      'CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()',
      tbl,
      tbl
    );
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 15. Dados iniciais mínimos e seguros
-- ----------------------------------------------------------------------------
INSERT INTO public.clinic_settings (clinic_name, settings)
SELECT 'FisioSys', '{}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.clinic_settings);

INSERT INTO public.site_pages (page_key, title, slug, content, is_published)
VALUES
  ('home', 'Página Principal', 'home', jsonb_build_object('sections', jsonb_build_array()), true),
  ('about', 'Sobre nós', 'sobre-nos', jsonb_build_object('sections', jsonb_build_array()), true),
  ('services', 'Serviços', 'servicos', jsonb_build_object('sections', jsonb_build_array()), true)
ON CONFLICT (page_key) DO NOTHING;

INSERT INTO public.services (name, description, duration_minutes, is_active)
VALUES
  ('Avaliação fisioterapêutica', 'Consulta inicial para avaliação do paciente.', 60, true),
  ('Sessão de fisioterapia', 'Atendimento fisioterapêutico individual.', 50, true),
  ('Retorno', 'Consulta de retorno/acompanhamento.', 30, true)
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- 16. Comentários para documentação do banco
-- ----------------------------------------------------------------------------
COMMENT ON TABLE public.users IS 'Perfis dos usuários da aplicação FisioSys. Vincule Neon Auth pelo campo auth_user_id.';
COMMENT ON COLUMN public.users.auth_user_id IS 'Identificador retornado pelo provedor Neon Auth. Mantido como text para compatibilidade.';
COMMENT ON COLUMN public.users.password_hash IS 'Opcional: usar apenas se o projeto implementar autenticação própria no servidor.';
COMMENT ON VIEW public.admin_users IS 'View de compatibilidade para consultas antigas que esperavam public.admin_users.';
COMMENT ON VIEW public.professionals IS 'View de profissionais ativos para agenda pública e área administrativa.';
COMMENT ON TYPE public.booking_status IS 'Enum idempotente para evitar erro duplicate_object em novas execuções.';

COMMIT;
