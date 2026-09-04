
-- Add DELETE policy on sessions for authenticated users
CREATE POLICY "Users can delete own sessions"
ON public.sessions
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Drop existing foreign keys and re-create with CASCADE
ALTER TABLE public.speaker_queue DROP CONSTRAINT speaker_queue_session_id_fkey;
ALTER TABLE public.speaker_queue ADD CONSTRAINT speaker_queue_session_id_fkey
  FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;

ALTER TABLE public.audience_questions DROP CONSTRAINT audience_questions_session_id_fkey;
ALTER TABLE public.audience_questions ADD CONSTRAINT audience_questions_session_id_fkey
  FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;

ALTER TABLE public.audio_recordings DROP CONSTRAINT audio_recordings_session_id_fkey;
ALTER TABLE public.audio_recordings ADD CONSTRAINT audio_recordings_session_id_fkey
  FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;

ALTER TABLE public.session_polls DROP CONSTRAINT session_polls_session_id_fkey;
ALTER TABLE public.session_polls ADD CONSTRAINT session_polls_session_id_fkey
  FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;

ALTER TABLE public.user_notifications DROP CONSTRAINT user_notifications_session_id_fkey;
ALTER TABLE public.user_notifications ADD CONSTRAINT user_notifications_session_id_fkey
  FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;
