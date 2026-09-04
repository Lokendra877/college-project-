-- ====================================================================
-- AUDITORIUM CONNECT (SMARTMIC) - COMPLETE MASTER DATABASE SETUP SCRIPT
-- Copy this entire file, paste it into your New Supabase SQL Editor, and click "Run".
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. SESSIONS TABLE
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  admin_code TEXT NOT NULL DEFAULT substr(md5(random()::text), 1, 8),
  is_active BOOLEAN NOT NULL DEFAULT true,
  speaking_time_seconds INTEGER NOT NULL DEFAULT 30 CHECK (speaking_time_seconds > 0),
  current_speaker_id UUID,
  speaker_started_at TIMESTAMP WITH TIME ZONE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Ensure columns exist if table was already created
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS admin_code TEXT NOT NULL DEFAULT substr(md5(random()::text), 1, 8);
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS speaking_time_seconds INTEGER NOT NULL DEFAULT 30;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS current_speaker_id UUID;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS speaker_started_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. SPEAKER QUEUE TABLE
CREATE TABLE IF NOT EXISTS public.speaker_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL CHECK (length(trim(user_name)) > 0),
  user_email TEXT,
  device_id TEXT NOT NULL,
  position INTEGER NOT NULL CHECK (position > 0),
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'speaking', 'done', 'skipped')),
  is_moderator BOOLEAN NOT NULL DEFAULT false,
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  started_speaking_at TIMESTAMP WITH TIME ZONE,
  finished_speaking_at TIMESTAMP WITH TIME ZONE
);

-- Ensure columns exist if table was already created
ALTER TABLE public.speaker_queue ADD COLUMN IF NOT EXISTS user_email TEXT;
ALTER TABLE public.speaker_queue ADD COLUMN IF NOT EXISTS is_moderator BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.speaker_queue ADD COLUMN IF NOT EXISTS started_speaking_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.speaker_queue ADD COLUMN IF NOT EXISTS finished_speaking_at TIMESTAMP WITH TIME ZONE;

-- 4. AUDIENCE QUESTIONS TABLE & UPVOTES
CREATE TABLE IF NOT EXISTS public.audience_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  question TEXT NOT NULL,
  device_id TEXT NOT NULL,
  is_answered BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.question_upvotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES public.audience_questions(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(question_id, device_id)
);

-- 5. SESSION POLLS TABLE & VOTES
CREATE TABLE IF NOT EXISTS public.session_polls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  is_multi_select BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  closes_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.poll_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID NOT NULL REFERENCES public.session_polls(id) ON DELETE CASCADE,
  option_index INTEGER NOT NULL,
  device_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(poll_id, device_id)
);

-- 6. AUDIO RECORDINGS TABLE
CREATE TABLE IF NOT EXISTS public.audio_recordings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  speaker_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  duration_seconds INTEGER DEFAULT 0,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. DEMO REQUESTS TABLE (SaaS Landing Page)
CREATE TABLE IF NOT EXISTS public.demo_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_name TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  num_auditoriums TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 8. ADMIN NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 9. USER PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 10. INDEXES FOR FAST PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_speaker_queue_session_status ON public.speaker_queue(session_id, status, position);
CREATE INDEX IF NOT EXISTS idx_speaker_queue_waiting ON public.speaker_queue(session_id, position) WHERE status = 'waiting';
CREATE INDEX IF NOT EXISTS idx_audience_questions_session ON public.audience_questions(session_id);
CREATE INDEX IF NOT EXISTS idx_session_polls_session ON public.session_polls(session_id);

-- 11. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.speaker_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audience_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_upvotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audio_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 12. RLS POLICIES (IDEMPOTENT - SAFE TO RUN REPEATEDLY)
DROP POLICY IF EXISTS "Public Session View" ON public.sessions;
DROP POLICY IF EXISTS "Public Session Create" ON public.sessions;
DROP POLICY IF EXISTS "Public Session Update" ON public.sessions;
CREATE POLICY "Public Session View" ON public.sessions FOR SELECT USING (true);
CREATE POLICY "Public Session Create" ON public.sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Session Update" ON public.sessions FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public Queue View" ON public.speaker_queue;
DROP POLICY IF EXISTS "Public Queue Insert" ON public.speaker_queue;
DROP POLICY IF EXISTS "Public Queue Update" ON public.speaker_queue;
DROP POLICY IF EXISTS "Public Queue Delete" ON public.speaker_queue;
CREATE POLICY "Public Queue View" ON public.speaker_queue FOR SELECT USING (true);
CREATE POLICY "Public Queue Insert" ON public.speaker_queue FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Queue Update" ON public.speaker_queue FOR UPDATE USING (true);
CREATE POLICY "Public Queue Delete" ON public.speaker_queue FOR DELETE USING (true);

DROP POLICY IF EXISTS "Public Q&A View" ON public.audience_questions;
DROP POLICY IF EXISTS "Public Q&A Insert" ON public.audience_questions;
DROP POLICY IF EXISTS "Public Q&A Update" ON public.audience_questions;
DROP POLICY IF EXISTS "Public Q&A Delete" ON public.audience_questions;
CREATE POLICY "Public Q&A View" ON public.audience_questions FOR SELECT USING (true);
CREATE POLICY "Public Q&A Insert" ON public.audience_questions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Q&A Update" ON public.audience_questions FOR UPDATE USING (true);
CREATE POLICY "Public Q&A Delete" ON public.audience_questions FOR DELETE USING (true);

DROP POLICY IF EXISTS "Public Upvotes View" ON public.question_upvotes;
DROP POLICY IF EXISTS "Public Upvotes Insert" ON public.question_upvotes;
DROP POLICY IF EXISTS "Public Upvotes Delete" ON public.question_upvotes;
CREATE POLICY "Public Upvotes View" ON public.question_upvotes FOR SELECT USING (true);
CREATE POLICY "Public Upvotes Insert" ON public.question_upvotes FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Upvotes Delete" ON public.question_upvotes FOR DELETE USING (true);

DROP POLICY IF EXISTS "Public Polls View" ON public.session_polls;
DROP POLICY IF EXISTS "Public Polls Insert" ON public.session_polls;
DROP POLICY IF EXISTS "Public Polls Update" ON public.session_polls;
DROP POLICY IF EXISTS "Public Polls Delete" ON public.session_polls;
CREATE POLICY "Public Polls View" ON public.session_polls FOR SELECT USING (true);
CREATE POLICY "Public Polls Insert" ON public.session_polls FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Polls Update" ON public.session_polls FOR UPDATE USING (true);
CREATE POLICY "Public Polls Delete" ON public.session_polls FOR DELETE USING (true);

DROP POLICY IF EXISTS "Public Votes View" ON public.poll_votes;
DROP POLICY IF EXISTS "Public Votes Insert" ON public.poll_votes;
CREATE POLICY "Public Votes View" ON public.poll_votes FOR SELECT USING (true);
CREATE POLICY "Public Votes Insert" ON public.poll_votes FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public Audio View" ON public.audio_recordings;
DROP POLICY IF EXISTS "Public Audio Insert" ON public.audio_recordings;
CREATE POLICY "Public Audio View" ON public.audio_recordings FOR SELECT USING (true);
CREATE POLICY "Public Audio Insert" ON public.audio_recordings FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public Demo Insert" ON public.demo_requests;
DROP POLICY IF EXISTS "Public Notifications View" ON public.admin_notifications;
DROP POLICY IF EXISTS "Public Profiles View" ON public.profiles;
CREATE POLICY "Public Demo Insert" ON public.demo_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Notifications View" ON public.admin_notifications FOR SELECT USING (true);
CREATE POLICY "Public Profiles View" ON public.profiles FOR SELECT USING (true);

-- 13. CONCURRENCY-SAFE QUEUE JOIN FUNCTION (RPC)
CREATE OR REPLACE FUNCTION public.join_speaker_queue(
  p_session_id UUID,
  p_user_name TEXT,
  p_user_email TEXT,
  p_device_id TEXT
)
RETURNS public.speaker_queue AS $$
DECLARE
  v_next_pos INTEGER;
  v_new_entry public.speaker_queue;
BEGIN
  PERFORM id FROM public.sessions WHERE id = p_session_id FOR UPDATE;

  SELECT COALESCE(MAX(position), 0) + 1 INTO v_next_pos
  FROM public.speaker_queue
  WHERE session_id = p_session_id;

  INSERT INTO public.speaker_queue (
    session_id, user_name, user_email, device_id, position, status
  ) VALUES (
    p_session_id, trim(p_user_name), p_user_email, p_device_id, v_next_pos, 'waiting'
  ) RETURNING * INTO v_new_entry;

  RETURN v_new_entry;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 14. REALTIME PUBLICATION SETUP
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'sessions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'speaker_queue') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.speaker_queue;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'audience_questions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.audience_questions;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'session_polls') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.session_polls;
  END IF;
END $$;

-- 15. STORAGE BUCKET FOR AUDIO RECORDINGS
INSERT INTO storage.buckets (id, name, public) 
VALUES ('audio-recordings', 'audio-recordings', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage Policies for audio-recordings
DROP POLICY IF EXISTS "Public Audio Uploads" ON storage.objects;
CREATE POLICY "Public Audio Uploads" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'audio-recordings');

DROP POLICY IF EXISTS "Public Audio Access" ON storage.objects;
CREATE POLICY "Public Audio Access" ON storage.objects
FOR SELECT USING (bucket_id = 'audio-recordings');

DROP POLICY IF EXISTS "Public Audio Delete" ON storage.objects;
CREATE POLICY "Public Audio Delete" ON storage.objects
FOR DELETE USING (bucket_id = 'audio-recordings');



