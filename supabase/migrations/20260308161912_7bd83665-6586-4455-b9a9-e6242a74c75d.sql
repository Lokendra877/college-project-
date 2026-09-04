
-- Polls table
CREATE TABLE public.session_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.session_polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view polls" ON public.session_polls FOR SELECT USING (true);
CREATE POLICY "Anyone can create polls" ON public.session_polls FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update polls" ON public.session_polls FOR UPDATE USING (true);

-- Poll votes table
CREATE TABLE public.poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID REFERENCES public.session_polls(id) ON DELETE CASCADE NOT NULL,
  device_id TEXT NOT NULL,
  option_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(poll_id, device_id)
);

ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view votes" ON public.poll_votes FOR SELECT USING (true);
CREATE POLICY "Anyone can vote" ON public.poll_votes FOR INSERT WITH CHECK (true);

-- Audience questions table
CREATE TABLE public.audience_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
  device_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  question TEXT NOT NULL,
  is_answered BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audience_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view questions" ON public.audience_questions FOR SELECT USING (true);
CREATE POLICY "Anyone can submit questions" ON public.audience_questions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update questions" ON public.audience_questions FOR UPDATE USING (true);

-- Question upvotes table
CREATE TABLE public.question_upvotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES public.audience_questions(id) ON DELETE CASCADE NOT NULL,
  device_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(question_id, device_id)
);

ALTER TABLE public.question_upvotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view upvotes" ON public.question_upvotes FOR SELECT USING (true);
CREATE POLICY "Anyone can upvote" ON public.question_upvotes FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can remove upvote" ON public.question_upvotes FOR DELETE USING (true);

-- User notifications table (for audience members)
CREATE TABLE public.user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
  device_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view own notifications" ON public.user_notifications FOR SELECT USING (true);
CREATE POLICY "Anyone can create notifications" ON public.user_notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update notifications" ON public.user_notifications FOR UPDATE USING (true);

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_polls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.poll_votes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.audience_questions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.question_upvotes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_notifications;
