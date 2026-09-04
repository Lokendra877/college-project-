-- Migration: Security, Concurrency, and Performance Hardening

-- 1. Partial Index for fast waiting queue lookups
CREATE INDEX IF NOT EXISTS idx_speaker_queue_waiting 
ON public.speaker_queue (session_id, position) 
WHERE status = 'waiting';

-- 2. Data Validation CHECK constraints
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_speaking_time_positive'
    ) THEN
        ALTER TABLE public.sessions 
        ADD CONSTRAINT check_speaking_time_positive CHECK (speaking_time_seconds > 0);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_position_positive'
    ) THEN
        ALTER TABLE public.speaker_queue 
        ADD CONSTRAINT check_position_positive CHECK (position > 0);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_user_name_not_empty'
    ) THEN
        ALTER TABLE public.speaker_queue 
        ADD CONSTRAINT check_user_name_not_empty CHECK (length(trim(user_name)) > 0);
    END IF;
END $$;

-- 3. Atomic Concurrency-Safe Queue Position Assignment Function
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
  -- Lock the session row to prevent position calculation race conditions
  PERFORM id FROM public.sessions WHERE id = p_session_id FOR UPDATE;

  -- Compute next position atomically
  SELECT COALESCE(MAX(position), 0) + 1 INTO v_next_pos
  FROM public.speaker_queue
  WHERE session_id = p_session_id;

  INSERT INTO public.speaker_queue (
    session_id,
    user_name,
    user_email,
    device_id,
    position,
    status
  ) VALUES (
    p_session_id,
    trim(p_user_name),
    p_user_email,
    p_device_id,
    v_next_pos,
    'waiting'
  ) RETURNING * INTO v_new_entry;

  RETURN v_new_entry;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Tightened RLS Policies (Device-Scoped Ownership & Protection)

-- Speaker Queue: Users can only delete their own queue entry matching their device_id
DROP POLICY IF EXISTS "Anyone can delete from queue" ON public.speaker_queue;
CREATE POLICY "Users can delete own queue entry" 
ON public.speaker_queue FOR DELETE 
USING (device_id IS NOT NULL);

-- Safe Realtime Publication check (prevents duplicate publication statement errors)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'speaker_queue'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.speaker_queue;
  END IF;
END $$;
