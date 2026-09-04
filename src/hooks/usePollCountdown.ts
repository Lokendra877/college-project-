import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function usePollCountdown(pollId: string, closesAt: string | null, isActive: boolean) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  const calcRemaining = useCallback(() => {
    if (!closesAt || !isActive) return null;
    const diff = Math.max(0, Math.floor((new Date(closesAt).getTime() - Date.now()) / 1000));
    return diff;
  }, [closesAt, isActive]);

  // Calculate total duration for progress bar
  const totalDuration = (() => {
    if (!closesAt) return null;
    // We can't know original duration perfectly, but we store it as created_at -> closes_at
    return null; // Will be calculated externally
  })();

  useEffect(() => {
    const remaining = calcRemaining();
    setSecondsLeft(remaining);
    if (remaining === null || remaining <= 0) return;

    const interval = setInterval(() => {
      const r = calcRemaining();
      setSecondsLeft(r);
      if (r !== null && r <= 0) {
        clearInterval(interval);
        // Auto-close the poll
        supabase.from('session_polls').update({ is_active: false }).eq('id', pollId).then();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [pollId, closesAt, isActive, calcRemaining]);

  return secondsLeft;
}

export function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`;
}

export function calcProgressPercent(closesAt: string | null, createdAt: string): number | null {
  if (!closesAt) return null;
  const total = new Date(closesAt).getTime() - new Date(createdAt).getTime();
  if (total <= 0) return null;
  const remaining = new Date(closesAt).getTime() - Date.now();
  return Math.max(0, Math.min(100, (remaining / total) * 100));
}
