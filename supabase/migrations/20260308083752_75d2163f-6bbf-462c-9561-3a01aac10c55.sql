
-- Create sessions table
CREATE TABLE public.sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  admin_code TEXT NOT NULL DEFAULT substr(md5(random()::text), 1, 8),
  is_active BOOLEAN NOT NULL DEFAULT true,
  speaking_time_seconds INTEGER NOT NULL DEFAULT 30,
  current_speaker_id UUID,
  speaker_started_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create speaker_queue table
CREATE TABLE public.speaker_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  device_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'speaking', 'done', 'skipped')),
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  started_speaking_at TIMESTAMP WITH TIME ZONE,
  finished_speaking_at TIMESTAMP WITH TIME ZONE
);

-- Create index for fast queue lookups
CREATE INDEX idx_speaker_queue_session_status ON public.speaker_queue(session_id, status, position);
CREATE INDEX idx_speaker_queue_device ON public.speaker_queue(session_id, device_id);

-- Enable RLS
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.speaker_queue ENABLE ROW LEVEL SECURITY;

-- Sessions: anyone can read, anyone can create (for demo purposes)
CREATE POLICY "Anyone can view sessions" ON public.sessions FOR SELECT USING (true);
CREATE POLICY "Anyone can create sessions" ON public.sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update sessions" ON public.sessions FOR UPDATE USING (true);

-- Speaker queue: anyone can view, anyone can insert/update (device_id based auth)
CREATE POLICY "Anyone can view queue" ON public.speaker_queue FOR SELECT USING (true);
CREATE POLICY "Anyone can join queue" ON public.speaker_queue FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update queue" ON public.speaker_queue FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete from queue" ON public.speaker_queue FOR DELETE USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.speaker_queue;

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
