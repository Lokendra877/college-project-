
-- Create storage bucket for audio recordings
INSERT INTO storage.buckets (id, name, public) VALUES ('audio-recordings', 'audio-recordings', true);

-- Create policy to allow anyone to upload audio recordings
CREATE POLICY "Anyone can upload audio recordings"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'audio-recordings');

-- Create policy to allow anyone to read audio recordings
CREATE POLICY "Anyone can read audio recordings"
ON storage.objects FOR SELECT
USING (bucket_id = 'audio-recordings');

-- Create table to track audio recordings
CREATE TABLE public.audio_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  speaker_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  duration_seconds INTEGER DEFAULT 0,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audio_recordings ENABLE ROW LEVEL SECURITY;

-- Anyone can insert recordings
CREATE POLICY "Anyone can insert recordings"
ON public.audio_recordings FOR INSERT
WITH CHECK (true);

-- Anyone can view recordings
CREATE POLICY "Anyone can view recordings"
ON public.audio_recordings FOR SELECT
USING (true);

-- Anyone can delete recordings
CREATE POLICY "Anyone can delete recordings"
ON public.audio_recordings FOR DELETE
USING (true);
