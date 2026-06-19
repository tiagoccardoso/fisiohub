-- ============================================================================
-- MANUS FISIO - SCRIPT COMPLETO DE CRIAÇÃO DO BANCO SUPABASE
-- ============================================================================
-- Uso recomendado:
--   1. Abra Supabase Dashboard > SQL Editor.
--   2. Cole este arquivo inteiro.
--   3. Execute em um projeto novo/limpo.
--
-- Observações importantes:
--   - Este script consolida o schema base, RLS, pacientes, calendário,
--     notificações, fisioterapia, exercícios e funções de analytics.
--   - Ele foi escrito para ser seguro em bancos novos e parcialmente
--     idempotente em bancos existentes, mas NÃO é um reconciliador de schemas
--     antigos com estruturas divergentes.
--   - Para ambiente local com Supabase CLI, prefira migrations versionadas.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EXTENSÕES E TIPOS
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('admin', 'mentor', 'intern', 'guest');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.project_status AS ENUM ('planning', 'active', 'on_hold', 'completed', 'cancelled');
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

DO $$ BEGIN
  CREATE TYPE public.mentorship_status AS ENUM ('active', 'completed', 'suspended');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.template_type AS ENUM ('evaluation', 'exercise', 'protocol', 'note', 'document');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.comment_target_type AS ENUM ('notebook', 'page', 'project', 'task', 'patient_record');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.activity_action AS ENUM ('create', 'update', 'delete', 'view', 'share', 'comment', 'login', 'logout');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.resource_type AS ENUM ('user', 'notebook', 'page', 'project', 'task', 'patient', 'patient_record', 'calendar_event', 'exercise');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ----------------------------------------------------------------------------
-- 2. FUNÇÕES UTILITÁRIAS
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

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND role = 'admin'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_mentor()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND role IN ('admin', 'mentor')
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 3. TABELAS BASE DO SISTEMA
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  avatar_url text,
  role public.user_role NOT NULL DEFAULT 'guest',
  crefito text,
  specialty text,
  university text,
  semester integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notebooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  content jsonb DEFAULT '{}'::jsonb,
  icon text DEFAULT '📁',
  color text DEFAULT 'default',
  category text DEFAULT 'geral',
  tags text[] DEFAULT '{}'::text[],
  template_type public.template_type DEFAULT 'note',
  is_public boolean DEFAULT false,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id uuid REFERENCES public.notebooks(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.pages(id) ON DELETE CASCADE,
  title text NOT NULL,
  content jsonb DEFAULT '{}'::jsonb,
  slug text NOT NULL,
  order_index integer DEFAULT 0,
  is_published boolean DEFAULT false,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (notebook_id, slug)
);

CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  status public.project_status NOT NULL DEFAULT 'planning',
  priority public.task_priority NOT NULL DEFAULT 'medium',
  due_date date,
  start_date date,
  progress integer NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  completion_percentage integer DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  owner_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

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
  patient_id uuid,
  due_date timestamptz,
  completed_at timestamptz,
  estimated_hours integer,
  actual_hours integer DEFAULT 0,
  order_index integer DEFAULT 0,
  checklist jsonb DEFAULT '[]'::jsonb,
  attachments jsonb DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mentorships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  mentee_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  intern_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  status public.mentorship_status NOT NULL DEFAULT 'active',
  start_date date NOT NULL DEFAULT current_date,
  end_date date,
  goals text[] DEFAULT '{}'::text[],
  competencies jsonb DEFAULT '[]'::jsonb,
  hours_completed integer DEFAULT 0,
  hours_required integer DEFAULT 0,
  notes text,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  author_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  target_type public.comment_target_type NOT NULL,
  target_id uuid NOT NULL,
  parent_comment_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,
  is_resolved boolean DEFAULT false,
  mentions uuid[] DEFAULT '{}'::uuid[],
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  action public.activity_action NOT NULL,
  resource_type public.resource_type NOT NULL,
  resource_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notebook_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id uuid REFERENCES public.notebooks(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  permission text NOT NULL DEFAULT 'read' CHECK (permission IN ('read', 'write', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (notebook_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.project_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  permission text NOT NULL DEFAULT 'read' CHECK (permission IN ('read', 'write', 'admin')),
  role text DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id)
);

-- ----------------------------------------------------------------------------
-- 4. PACIENTES E PRONTUÁRIOS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  birth_date date,
  gender text,
  cpf text UNIQUE,
  phone text,
  email text,
  address text,
  emergency_contact_name text,
  emergency_contact_phone text,
  initial_medical_history text,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.patient_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  session_date timestamptz NOT NULL DEFAULT now(),
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.project_patients (
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, patient_id)
);

-- ----------------------------------------------------------------------------
-- 5. CALENDÁRIO E NOTIFICAÇÕES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  event_type text NOT NULL DEFAULT 'appointment' CHECK (event_type IN ('appointment', 'supervision', 'meeting', 'break')),
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
  location text,
  attendees uuid[] DEFAULT '{}'::uuid[],
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error', 'event', 'system')),
  read boolean DEFAULT false,
  action_url text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  email_notifications boolean DEFAULT true,
  push_notifications boolean DEFAULT true,
  calendar_reminders boolean DEFAULT true,
  project_updates boolean DEFAULT true,
  team_mentions boolean DEFAULT true,
  system_alerts boolean DEFAULT true,
  reminder_time integer DEFAULT 15,
  quiet_hours_start text DEFAULT '22:00',
  quiet_hours_end text DEFAULT '07:00',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 6. FISIOTERAPIA E EXERCÍCIOS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.physiotherapy_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE,
  evaluator_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  evaluation_date date NOT NULL DEFAULT current_date,
  main_complaint text NOT NULL,
  pain_scale_initial integer CHECK (pain_scale_initial >= 0 AND pain_scale_initial <= 10),
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
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.treatment_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE,
  therapist_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  evaluation_id uuid REFERENCES public.physiotherapy_evaluations(id) ON DELETE SET NULL,
  session_date date NOT NULL DEFAULT current_date,
  session_number integer,
  duration_minutes integer DEFAULT 60,
  pain_scale_before integer CHECK (pain_scale_before >= 0 AND pain_scale_before <= 10),
  pain_scale_after integer CHECK (pain_scale_after >= 0 AND pain_scale_after <= 10),
  techniques_used text[],
  exercises_performed jsonb,
  patient_response text,
  observations text,
  objective_improvements text,
  patient_feedback text,
  next_session_plan text,
  status text DEFAULT 'completed' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.exercise_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text NOT NULL,
  body_region text[],
  difficulty_level integer CHECK (difficulty_level >= 1 AND difficulty_level <= 5),
  equipment_needed text[],
  contraindications text[],
  default_sets integer DEFAULT 3,
  default_reps integer DEFAULT 10,
  default_hold_time integer,
  default_rest_time integer,
  image_url text,
  video_url text,
  instruction_steps text[],
  recommended_conditions text[],
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.exercise_prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE,
  prescribed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  evaluation_id uuid REFERENCES public.physiotherapy_evaluations(id) ON DELETE SET NULL,
  prescription_date date NOT NULL DEFAULT current_date,
  title text NOT NULL,
  description text,
  frequency_per_week integer DEFAULT 3,
  duration_weeks integer DEFAULT 4,
  status text DEFAULT 'active' CHECK (status IN ('draft', 'active', 'completed', 'suspended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.prescription_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id uuid REFERENCES public.exercise_prescriptions(id) ON DELETE CASCADE,
  exercise_id uuid REFERENCES public.exercise_library(id) ON DELETE CASCADE,
  sets integer NOT NULL,
  reps integer,
  hold_time integer,
  rest_time integer,
  week_start integer DEFAULT 1,
  week_end integer,
  progression_notes text,
  order_index integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.exercise_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_exercise_id uuid REFERENCES public.prescription_exercises(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE,
  execution_date date NOT NULL DEFAULT current_date,
  sets_completed integer,
  reps_completed integer,
  duration_seconds integer,
  pain_level integer CHECK (pain_level >= 0 AND pain_level <= 10),
  difficulty_perceived integer CHECK (difficulty_perceived >= 1 AND difficulty_perceived <= 5),
  notes text,
  photos text[],
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 7. COLUNAS DE COMPATIBILIDADE PARA BANCOS PARCIAIS
-- ----------------------------------------------------------------------------
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS start_date date;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS completion_percentage integer DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100);
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS parent_task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS assignee_id uuid REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS checklist jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tasks_patient_id_fkey'
      AND conrelid = 'public.tasks'::regclass
  ) THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT tasks_patient_id_fkey
      FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE
      DEFERRABLE INITIALLY DEFERRED;
  END IF;
END $$;


ALTER TABLE public.notebooks ADD COLUMN IF NOT EXISTS content jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.notebooks ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}'::text[];
ALTER TABLE public.notebooks ADD COLUMN IF NOT EXISTS template_type public.template_type DEFAULT 'note';

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS read boolean DEFAULT false;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS action_url text;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- ----------------------------------------------------------------------------
-- 8. FUNÇÕES DE PERMISSÃO DEPENDENTES DAS TABELAS
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_notebook_permission(notebook_uuid uuid, permission_level text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF public.is_admin() THEN
    RETURN TRUE;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.notebooks
    WHERE id = notebook_uuid
      AND created_by = auth.uid()
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.notebook_collaborators nc
    WHERE nc.notebook_id = notebook_uuid
      AND nc.user_id = auth.uid()
      AND (
        permission_level = 'read'
        OR (permission_level = 'write' AND nc.permission IN ('write', 'admin'))
        OR (permission_level = 'admin' AND nc.permission = 'admin')
      )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.has_project_permission(project_uuid uuid, permission_level text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF public.is_admin() THEN
    RETURN TRUE;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = project_uuid
      AND (created_by = auth.uid() OR owner_id = auth.uid())
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.project_collaborators pc
    WHERE pc.project_id = project_uuid
      AND pc.user_id = auth.uid()
      AND (
        permission_level = 'read'
        OR (permission_level = 'write' AND pc.permission IN ('write', 'admin'))
        OR (permission_level = 'admin' AND pc.permission = 'admin')
      )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id uuid,
  p_title text,
  p_message text,
  p_type text DEFAULT 'info',
  p_action_url text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  notification_id uuid;
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, action_url)
  VALUES (p_user_id, p_title, p_message, p_type, p_action_url)
  RETURNING id INTO notification_id;

  RETURN notification_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1), 'Usuário'),
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'guest')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
    updated_at = now();

  INSERT INTO public.notification_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 9. ANALYTICS
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_total_patients()
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::integer FROM public.patients;
$$;

CREATE OR REPLACE FUNCTION public.get_appointments_this_month()
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::integer
  FROM public.calendar_events
  WHERE event_type = 'appointment'
    AND date_trunc('month', start_time) = date_trunc('month', now());
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
  SELECT calendar_events.status, COUNT(*) AS count
  FROM public.calendar_events
  WHERE event_type = 'appointment'
  GROUP BY calendar_events.status;
$$;

-- ----------------------------------------------------------------------------
-- 10. ÍNDICES
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_notebooks_created_by ON public.notebooks(created_by);
CREATE INDEX IF NOT EXISTS idx_notebooks_category ON public.notebooks(category);
CREATE INDEX IF NOT EXISTS idx_pages_notebook_id ON public.pages(notebook_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON public.projects(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON public.projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON public.tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_patient_id ON public.tasks(patient_id);
CREATE INDEX IF NOT EXISTS idx_comments_target ON public.comments(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notebook_collaborators_user_id ON public.notebook_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_project_collaborators_user_id ON public.project_collaborators(user_id);

CREATE INDEX IF NOT EXISTS idx_patients_full_name_trgm ON public.patients USING gin (full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_patient_records_patient_id ON public.patient_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_project_patients_project_id ON public.project_patients(project_id);
CREATE INDEX IF NOT EXISTS idx_project_patients_patient_id ON public.project_patients(patient_id);

CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON public.calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_created_by ON public.calendar_events(created_by);
CREATE INDEX IF NOT EXISTS idx_calendar_events_attendees ON public.calendar_events USING gin(attendees);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_read ON public.notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON public.notification_settings(user_id);

CREATE INDEX IF NOT EXISTS idx_physio_evaluations_patient ON public.physiotherapy_evaluations(patient_id);
CREATE INDEX IF NOT EXISTS idx_physio_evaluations_date ON public.physiotherapy_evaluations(evaluation_date);
CREATE INDEX IF NOT EXISTS idx_treatment_sessions_patient ON public.treatment_sessions(patient_id);
CREATE INDEX IF NOT EXISTS idx_exercise_library_category ON public.exercise_library(category);
CREATE INDEX IF NOT EXISTS idx_exercise_library_active ON public.exercise_library(is_active);
CREATE INDEX IF NOT EXISTS idx_exercise_prescriptions_patient ON public.exercise_prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_exercise_prescriptions_status ON public.exercise_prescriptions(status);
CREATE INDEX IF NOT EXISTS idx_prescription_exercises_prescription ON public.prescription_exercises(prescription_id);
CREATE INDEX IF NOT EXISTS idx_exercise_executions_patient ON public.exercise_executions(patient_id);
CREATE INDEX IF NOT EXISTS idx_exercise_executions_date ON public.exercise_executions(execution_date);

-- ----------------------------------------------------------------------------
-- 11. TRIGGERS DE UPDATED_AT
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'users', 'notebooks', 'pages', 'projects', 'tasks', 'mentorships', 'comments',
    'patients', 'patient_records', 'calendar_events', 'notifications',
    'notification_settings', 'physiotherapy_evaluations', 'treatment_sessions',
    'exercise_library', 'exercise_prescriptions'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_timestamp_%I ON public.%I', table_name, table_name);
    EXECUTE format(
      'CREATE TRIGGER set_timestamp_%I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()',
      table_name,
      table_name
    );
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 12. ROW LEVEL SECURITY E POLÍTICAS
-- ----------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notebooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentorships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notebook_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.physiotherapy_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescription_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_executions ENABLE ROW LEVEL SECURITY;

-- Users
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (id = auth.uid());

DROP POLICY IF EXISTS "Mentors can view intern profiles" ON public.users;
CREATE POLICY "Mentors can view intern profiles" ON public.users
  FOR SELECT USING (public.is_mentor());

DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;
CREATE POLICY "Admins can manage all users" ON public.users
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Notebooks / pages
DROP POLICY IF EXISTS "Anyone can view public notebooks" ON public.notebooks;
CREATE POLICY "Anyone can view public notebooks" ON public.notebooks
  FOR SELECT USING (is_public = true);

DROP POLICY IF EXISTS "Users can view notebooks they have access to" ON public.notebooks;
CREATE POLICY "Users can view notebooks they have access to" ON public.notebooks
  FOR SELECT USING (created_by = auth.uid() OR public.has_notebook_permission(id, 'read'));

DROP POLICY IF EXISTS "Users can create notebooks" ON public.notebooks;
CREATE POLICY "Users can create notebooks" ON public.notebooks
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND (created_by IS NULL OR created_by = auth.uid()));

DROP POLICY IF EXISTS "Users can update notebooks they can write" ON public.notebooks;
CREATE POLICY "Users can update notebooks they can write" ON public.notebooks
  FOR UPDATE USING (created_by = auth.uid() OR public.has_notebook_permission(id, 'write'));

DROP POLICY IF EXISTS "Users can delete notebooks they administer" ON public.notebooks;
CREATE POLICY "Users can delete notebooks they administer" ON public.notebooks
  FOR DELETE USING (created_by = auth.uid() OR public.has_notebook_permission(id, 'admin'));

DROP POLICY IF EXISTS "Users can manage pages in accessible notebooks" ON public.pages;
CREATE POLICY "Users can manage pages in accessible notebooks" ON public.pages
  FOR ALL USING (public.has_notebook_permission(notebook_id, 'write'))
  WITH CHECK (public.has_notebook_permission(notebook_id, 'write'));

-- Projects / tasks
DROP POLICY IF EXISTS "Users can view projects they have access to" ON public.projects;
CREATE POLICY "Users can view projects they have access to" ON public.projects
  FOR SELECT USING (created_by = auth.uid() OR owner_id = auth.uid() OR public.has_project_permission(id, 'read'));

DROP POLICY IF EXISTS "Mentors can create projects" ON public.projects;
CREATE POLICY "Mentors can create projects" ON public.projects
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND (created_by IS NULL OR created_by = auth.uid()));

DROP POLICY IF EXISTS "Users can update projects they can write" ON public.projects;
CREATE POLICY "Users can update projects they can write" ON public.projects
  FOR UPDATE USING (created_by = auth.uid() OR owner_id = auth.uid() OR public.has_project_permission(id, 'write'));

DROP POLICY IF EXISTS "Users can delete projects they administer" ON public.projects;
CREATE POLICY "Users can delete projects they administer" ON public.projects
  FOR DELETE USING (created_by = auth.uid() OR owner_id = auth.uid() OR public.has_project_permission(id, 'admin'));

DROP POLICY IF EXISTS "Users can view project tasks" ON public.tasks;
CREATE POLICY "Users can view project tasks" ON public.tasks
  FOR SELECT USING (
    created_by = auth.uid()
    OR assigned_to = auth.uid()
    OR assignee_id = auth.uid()
    OR public.has_project_permission(project_id, 'read')
  );

DROP POLICY IF EXISTS "Users can create project tasks" ON public.tasks;
CREATE POLICY "Users can create project tasks" ON public.tasks
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND (created_by IS NULL OR created_by = auth.uid() OR public.has_project_permission(project_id, 'write')));

DROP POLICY IF EXISTS "Users can update project tasks" ON public.tasks;
CREATE POLICY "Users can update project tasks" ON public.tasks
  FOR UPDATE USING (created_by = auth.uid() OR assigned_to = auth.uid() OR assignee_id = auth.uid() OR public.has_project_permission(project_id, 'write'));

DROP POLICY IF EXISTS "Users can delete project tasks" ON public.tasks;
CREATE POLICY "Users can delete project tasks" ON public.tasks
  FOR DELETE USING (created_by = auth.uid() OR public.has_project_permission(project_id, 'admin'));

-- Collaboration
DROP POLICY IF EXISTS "Users can manage notebook collaborators" ON public.notebook_collaborators;
CREATE POLICY "Users can manage notebook collaborators" ON public.notebook_collaborators
  FOR ALL USING (public.has_notebook_permission(notebook_id, 'admin'))
  WITH CHECK (public.has_notebook_permission(notebook_id, 'admin'));

DROP POLICY IF EXISTS "Users can manage project collaborators" ON public.project_collaborators;
CREATE POLICY "Users can manage project collaborators" ON public.project_collaborators
  FOR ALL USING (public.has_project_permission(project_id, 'admin'))
  WITH CHECK (public.has_project_permission(project_id, 'admin'));

DROP POLICY IF EXISTS "Authenticated users can comment" ON public.comments;
CREATE POLICY "Authenticated users can comment" ON public.comments
  FOR ALL USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL AND (author_id IS NULL OR author_id = auth.uid()));

DROP POLICY IF EXISTS "Users can view own activity logs" ON public.activity_logs;
CREATE POLICY "Users can view own activity logs" ON public.activity_logs
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "System can insert activity logs" ON public.activity_logs;
CREATE POLICY "System can insert activity logs" ON public.activity_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Patients / clinical data
DROP POLICY IF EXISTS "Admins can manage patients" ON public.patients;
CREATE POLICY "Admins can manage patients" ON public.patients
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Clinicians can view patients" ON public.patients;
CREATE POLICY "Clinicians can view patients" ON public.patients
  FOR SELECT USING (public.is_mentor() OR created_by = auth.uid());

DROP POLICY IF EXISTS "Clinicians can create patients" ON public.patients;
CREATE POLICY "Clinicians can create patients" ON public.patients
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND (created_by IS NULL OR created_by = auth.uid() OR public.is_mentor()));

DROP POLICY IF EXISTS "Clinicians can update patients" ON public.patients;
CREATE POLICY "Clinicians can update patients" ON public.patients
  FOR UPDATE USING (public.is_mentor() OR created_by = auth.uid());

DROP POLICY IF EXISTS "Clinicians can manage patient records" ON public.patient_records;
CREATE POLICY "Clinicians can manage patient records" ON public.patient_records
  FOR ALL USING (public.is_mentor() OR created_by = auth.uid())
  WITH CHECK (auth.uid() IS NOT NULL AND (created_by IS NULL OR created_by = auth.uid() OR public.is_mentor()));

DROP POLICY IF EXISTS "Project members can view project patients" ON public.project_patients;
CREATE POLICY "Project members can view project patients" ON public.project_patients
  FOR SELECT USING (public.has_project_permission(project_id, 'read'));

DROP POLICY IF EXISTS "Project admins can manage project patients" ON public.project_patients;
CREATE POLICY "Project admins can manage project patients" ON public.project_patients
  FOR ALL USING (public.has_project_permission(project_id, 'admin'))
  WITH CHECK (public.has_project_permission(project_id, 'admin'));

-- Calendar / notifications
DROP POLICY IF EXISTS "Users can view own calendar events" ON public.calendar_events;
CREATE POLICY "Users can view own calendar events" ON public.calendar_events
  FOR SELECT USING (created_by = auth.uid() OR auth.uid() = ANY(attendees) OR public.is_admin());

DROP POLICY IF EXISTS "Users can create calendar events" ON public.calendar_events;
CREATE POLICY "Users can create calendar events" ON public.calendar_events
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND (created_by IS NULL OR created_by = auth.uid() OR public.is_mentor()));

DROP POLICY IF EXISTS "Users can update own calendar events" ON public.calendar_events;
CREATE POLICY "Users can update own calendar events" ON public.calendar_events
  FOR UPDATE USING (created_by = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Users can delete own calendar events" ON public.calendar_events;
CREATE POLICY "Users can delete own calendar events" ON public.calendar_events
  FOR DELETE USING (created_by = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view own notification settings" ON public.notification_settings;
CREATE POLICY "Users can view own notification settings" ON public.notification_settings
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage own notification settings" ON public.notification_settings;
CREATE POLICY "Users can manage own notification settings" ON public.notification_settings
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Physiotherapy / exercise library
DROP POLICY IF EXISTS "Clinicians can manage physiotherapy evaluations" ON public.physiotherapy_evaluations;
CREATE POLICY "Clinicians can manage physiotherapy evaluations" ON public.physiotherapy_evaluations
  FOR ALL USING (public.is_mentor() OR evaluator_id = auth.uid())
  WITH CHECK (auth.uid() IS NOT NULL AND (evaluator_id IS NULL OR evaluator_id = auth.uid() OR public.is_mentor()));

DROP POLICY IF EXISTS "Clinicians can manage treatment sessions" ON public.treatment_sessions;
CREATE POLICY "Clinicians can manage treatment sessions" ON public.treatment_sessions
  FOR ALL USING (public.is_mentor() OR therapist_id = auth.uid())
  WITH CHECK (auth.uid() IS NOT NULL AND (therapist_id IS NULL OR therapist_id = auth.uid() OR public.is_mentor()));

DROP POLICY IF EXISTS "Authenticated users can view active exercises" ON public.exercise_library;
CREATE POLICY "Authenticated users can view active exercises" ON public.exercise_library
  FOR SELECT USING (auth.uid() IS NOT NULL AND is_active = true);

DROP POLICY IF EXISTS "Clinicians can manage exercise library" ON public.exercise_library;
CREATE POLICY "Clinicians can manage exercise library" ON public.exercise_library
  FOR ALL USING (public.is_mentor()) WITH CHECK (public.is_mentor());

DROP POLICY IF EXISTS "Clinicians can manage exercise prescriptions" ON public.exercise_prescriptions;
CREATE POLICY "Clinicians can manage exercise prescriptions" ON public.exercise_prescriptions
  FOR ALL USING (public.is_mentor() OR prescribed_by = auth.uid())
  WITH CHECK (auth.uid() IS NOT NULL AND (prescribed_by IS NULL OR prescribed_by = auth.uid() OR public.is_mentor()));

DROP POLICY IF EXISTS "Clinicians can manage prescription exercises" ON public.prescription_exercises;
CREATE POLICY "Clinicians can manage prescription exercises" ON public.prescription_exercises
  FOR ALL USING (
    public.is_mentor()
    OR EXISTS (
      SELECT 1 FROM public.exercise_prescriptions ep
      WHERE ep.id = prescription_id AND ep.prescribed_by = auth.uid()
    )
  )
  WITH CHECK (
    public.is_mentor()
    OR EXISTS (
      SELECT 1 FROM public.exercise_prescriptions ep
      WHERE ep.id = prescription_id AND ep.prescribed_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Clinicians can view exercise executions" ON public.exercise_executions;
CREATE POLICY "Clinicians can view exercise executions" ON public.exercise_executions
  FOR SELECT USING (public.is_mentor());

DROP POLICY IF EXISTS "Authenticated users can insert exercise executions" ON public.exercise_executions;
CREATE POLICY "Authenticated users can insert exercise executions" ON public.exercise_executions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ----------------------------------------------------------------------------
-- 13. PERMISSÕES PARA ROLES DO SUPABASE
-- ----------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 14. DADOS INICIAIS OPCIONAIS E SEGUROS
-- ----------------------------------------------------------------------------
INSERT INTO public.exercise_library (
  name,
  description,
  category,
  body_region,
  difficulty_level,
  equipment_needed,
  contraindications,
  default_sets,
  default_reps,
  instruction_steps,
  recommended_conditions,
  is_active
)
VALUES
  (
    'Ponte Glútea',
    'Exercício para fortalecimento de glúteos e estabilização lombopélvica.',
    'Fortalecimento',
    ARRAY['Lombar', 'Quadril'],
    2,
    ARRAY['Colchonete'],
    ARRAY['Dor aguda severa'],
    3,
    12,
    ARRAY['Deite-se de barriga para cima', 'Flexione os joelhos', 'Eleve o quadril mantendo controle', 'Retorne lentamente'],
    ARRAY['Lombalgia', 'Fraqueza de glúteos'],
    true
  ),
  (
    'Alongamento de Isquiotibiais',
    'Alongamento posterior de coxa para ganho de flexibilidade.',
    'Alongamento',
    ARRAY['Membros Inferiores'],
    1,
    ARRAY['Faixa elástica opcional'],
    ARRAY['Lesão muscular aguda'],
    3,
    NULL,
    ARRAY['Posicione a perna elevada', 'Mantenha o joelho estendido sem dor', 'Sustente a posição'],
    ARRAY['Encurtamento muscular', 'Lombalgia'],
    true
  )
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------------------
-- 15. VERIFICAÇÃO FINAL
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  missing_tables text[];
BEGIN
  SELECT array_agg(required_table)
  INTO missing_tables
  FROM (
    VALUES
      ('users'),
      ('notebooks'),
      ('projects'),
      ('tasks'),
      ('patients'),
      ('patient_records'),
      ('calendar_events'),
      ('notifications'),
      ('notification_settings'),
      ('physiotherapy_evaluations'),
      ('exercise_library'),
      ('exercise_prescriptions')
  ) AS required(required_table)
  WHERE NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = required.required_table
  );

  IF missing_tables IS NOT NULL THEN
    RAISE EXCEPTION 'Banco incompleto. Tabelas ausentes: %', missing_tables;
  END IF;

  RAISE NOTICE 'Manus Fisio: banco de dados criado/atualizado com sucesso.';
END $$;
