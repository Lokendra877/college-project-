CREATE POLICY "Anyone can delete own votes" ON public.poll_votes FOR DELETE USING (true);
CREATE POLICY "Anyone can update own votes" ON public.poll_votes FOR UPDATE USING (true);