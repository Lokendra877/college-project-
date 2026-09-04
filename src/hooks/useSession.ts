import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type Session = Tables<'sessions'>;
type QueueEntry = Tables<'speaker_queue'>;

export function useSession(sessionId: string | undefined) {
  const [session, setSession] = useState<Session | null>(null);
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSession = useCallback(async () => {
    if (!sessionId) return;
    const { data } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
    if (data) setSession(data);
    setLoading(false);
  }, [sessionId]);

  const fetchQueue = useCallback(async () => {
    if (!sessionId) return;
    const { data } = await supabase
      .from('speaker_queue')
      .select('*')
      .eq('session_id', sessionId)
      .in('status', ['waiting', 'speaking'])
      .order('position', { ascending: true });
    if (data) setQueue(data);
  }, [sessionId]);

  useEffect(() => {
    fetchSession();
    fetchQueue();
  }, [fetchSession, fetchQueue]);

  // Real-time subscriptions
  useEffect(() => {
    if (!sessionId) return;

    const sessionChannel = supabase
      .channel(`session-${sessionId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'sessions',
        filter: `id=eq.${sessionId}`,
      }, (payload) => {
        if (payload.new) setSession(payload.new as Session);
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'speaker_queue',
        filter: `session_id=eq.${sessionId}`,
      }, () => {
        fetchQueue();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(sessionChannel);
    };
  }, [sessionId, fetchQueue]);

  return { session, queue, loading, refetch: fetchQueue, refetchSession: fetchSession };
}
