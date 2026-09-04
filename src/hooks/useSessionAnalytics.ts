import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type QueueEntry = Tables<'speaker_queue'>;

export interface SessionAnalytics {
  totalSpeakers: number;
  completedSpeakers: number;
  skippedSpeakers: number;
  waitingSpeakers: number;
  averageSpeakingTime: number; // seconds
  totalSpeakingTime: number; // seconds
  sessionDuration: number; // seconds
  speakerLog: QueueEntry[];
}

export function useSessionAnalytics(sessionId: string | undefined, sessionCreatedAt: string | undefined) {
  const [analytics, setAnalytics] = useState<SessionAnalytics>({
    totalSpeakers: 0,
    completedSpeakers: 0,
    skippedSpeakers: 0,
    waitingSpeakers: 0,
    averageSpeakingTime: 0,
    totalSpeakingTime: 0,
    sessionDuration: 0,
    speakerLog: [],
  });

  const fetchAnalytics = useCallback(async () => {
    if (!sessionId) return;

    const { data } = await supabase
      .from('speaker_queue')
      .select('*')
      .eq('session_id', sessionId)
      .order('position', { ascending: true });

    if (!data) return;

    const completed = data.filter(e => e.status === 'done');
    const skipped = data.filter(e => e.status === 'skipped');
    const waiting = data.filter(e => e.status === 'waiting');
    const speaking = data.filter(e => e.status === 'speaking');

    // Calculate speaking durations for completed speakers
    const durations = completed
      .filter(e => e.started_speaking_at && e.finished_speaking_at)
      .map(e => {
        const start = new Date(e.started_speaking_at!).getTime();
        const end = new Date(e.finished_speaking_at!).getTime();
        return Math.max(0, (end - start) / 1000);
      });

    const totalSpeakingTime = durations.reduce((sum, d) => sum + d, 0);
    const avgTime = durations.length > 0 ? totalSpeakingTime / durations.length : 0;

    const sessionDuration = sessionCreatedAt
      ? Math.floor((Date.now() - new Date(sessionCreatedAt).getTime()) / 1000)
      : 0;

    setAnalytics({
      totalSpeakers: completed.length + skipped.length + speaking.length,
      completedSpeakers: completed.length,
      skippedSpeakers: skipped.length,
      waitingSpeakers: waiting.length,
      averageSpeakingTime: Math.round(avgTime),
      totalSpeakingTime: Math.round(totalSpeakingTime),
      sessionDuration,
      speakerLog: data,
    });
  }, [sessionId, sessionCreatedAt]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Re-fetch on realtime changes
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`analytics-${sessionId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'speaker_queue',
        filter: `session_id=eq.${sessionId}`,
      }, () => {
        fetchAnalytics();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId, fetchAnalytics]);

  // Update session duration every second
  useEffect(() => {
    if (!sessionCreatedAt) return;
    const interval = setInterval(() => {
      setAnalytics(prev => ({
        ...prev,
        sessionDuration: Math.floor((Date.now() - new Date(sessionCreatedAt).getTime()) / 1000),
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionCreatedAt]);

  return analytics;
}
