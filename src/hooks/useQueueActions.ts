import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getDeviceId } from '@/lib/device-id';
import { toast } from 'sonner';

const RATE_LIMIT_COOLDOWN_MS = 30_000; // 30s between requests per device

export function useQueueActions(sessionId: string | undefined) {
  const deviceId = getDeviceId();
  const lastRequestRef = useRef<number>(0);

  const requestToSpeak = useCallback(async (userName: string, userEmail?: string) => {
    if (!sessionId) return;

    // Client-side rate limit
    const now = Date.now();
    const elapsed = now - lastRequestRef.current;
    if (elapsed < RATE_LIMIT_COOLDOWN_MS) {
      const waitSec = Math.ceil((RATE_LIMIT_COOLDOWN_MS - elapsed) / 1000);
      toast.error(`Please wait ${waitSec}s before requesting again`);
      return;
    }

    // Check for duplicate active request
    const { data: existing } = await supabase
      .from('speaker_queue')
      .select('id')
      .eq('session_id', sessionId)
      .eq('device_id', deviceId)
      .in('status', ['waiting', 'speaking']);

    if (existing && existing.length > 0) {
      toast.error('You already have an active request');
      return;
    }

    // Server-side cooldown: check last finished/skipped entry from this device
    const { data: recent } = await supabase
      .from('speaker_queue')
      .select('finished_speaking_at')
      .eq('session_id', sessionId)
      .eq('device_id', deviceId)
      .in('status', ['done', 'skipped'])
      .order('finished_speaking_at', { ascending: false })
      .limit(1);

    if (recent && recent.length > 0 && recent[0].finished_speaking_at) {
      const finishedAt = new Date(recent[0].finished_speaking_at).getTime();
      const serverElapsed = now - finishedAt;
      if (serverElapsed < RATE_LIMIT_COOLDOWN_MS) {
        const waitSec = Math.ceil((RATE_LIMIT_COOLDOWN_MS - serverElapsed) / 1000);
        toast.error(`Please wait ${waitSec}s before requesting again`);
        return;
      }
    }

    // Concurrency-safe atomic position assignment via RPC with fallback
    let insertError = null;
    const { data: rpcData, error: rpcError } = await (supabase.rpc as any)('join_speaker_queue', {
      p_session_id: sessionId,
      p_user_name: userName,
      p_user_email: userEmail || null,
      p_device_id: deviceId,
    });

    if (rpcError) {
      // Fallback: client-side position calculation
      const { data: maxPos } = await supabase
        .from('speaker_queue')
        .select('position')
        .eq('session_id', sessionId)
        .order('position', { ascending: false })
        .limit(1);

      const nextPosition = (maxPos && maxPos.length > 0) ? maxPos[0].position + 1 : 1;

      const { error } = await supabase
        .from('speaker_queue')
        .insert({
          session_id: sessionId,
          user_name: userName,
          user_email: userEmail || null,
          device_id: deviceId,
          position: nextPosition,
          status: 'waiting',
        } as any);

      insertError = error;
    }

    if (insertError) {
      toast.error('Failed to join queue');
    } else {
      lastRequestRef.current = Date.now();
      toast.success('Added to speaker queue!');
    }
  }, [sessionId, deviceId]);

  const grantMic = useCallback(async (queueEntryId: string) => {
    if (!sessionId) return;

    // Set current speaker on session
    await supabase
      .from('speaker_queue')
      .update({ status: 'speaking', started_speaking_at: new Date().toISOString() })
      .eq('id', queueEntryId);

    await supabase
      .from('sessions')
      .update({
        current_speaker_id: queueEntryId,
        speaker_started_at: new Date().toISOString(),
      })
      .eq('id', sessionId);
  }, [sessionId]);

  const revokeMic = useCallback(async (queueEntryId: string) => {
    if (!sessionId) return;

    // Check if this entry is a moderator — if so, keep them in queue as waiting
    const { data: entry } = await supabase
      .from('speaker_queue')
      .select('is_moderator')
      .eq('id', queueEntryId)
      .single();

    if (entry?.is_moderator) {
      await supabase
        .from('speaker_queue')
        .update({ status: 'waiting', started_speaking_at: null, finished_speaking_at: null } as any)
        .eq('id', queueEntryId);
    } else {
      await supabase
        .from('speaker_queue')
        .update({ status: 'done', finished_speaking_at: new Date().toISOString() })
        .eq('id', queueEntryId);
    }

    await supabase
      .from('sessions')
      .update({ current_speaker_id: null, speaker_started_at: null })
      .eq('id', sessionId);
  }, [sessionId]);

  const skipSpeaker = useCallback(async (queueEntryId: string) => {
    if (!sessionId) return;

    await supabase
      .from('speaker_queue')
      .update({ status: 'skipped', finished_speaking_at: new Date().toISOString() })
      .eq('id', queueEntryId);

    await supabase
      .from('sessions')
      .update({ current_speaker_id: null, speaker_started_at: null })
      .eq('id', sessionId);
  }, [sessionId]);

  const removeFromQueue = useCallback(async (queueEntryId: string) => {
    await supabase
      .from('speaker_queue')
      .delete()
      .eq('id', queueEntryId);
  }, []);

  const grantNextSpeaker = useCallback(async () => {
    if (!sessionId) return;
    const { data: next } = await supabase
      .from('speaker_queue')
      .select('*')
      .eq('session_id', sessionId)
      .eq('status', 'waiting')
      .order('position', { ascending: true })
      .limit(1);

    if (next && next.length > 0) {
      await grantMic(next[0].id);
    }
  }, [sessionId, grantMic]);

  const promoteModerator = useCallback(async (queueEntryId: string) => {
    const { error } = await supabase
      .from('speaker_queue')
      .update({ is_moderator: true } as any)
      .eq('id', queueEntryId);
    if (error) {
      toast.error('Failed to promote');
    } else {
      toast.success('Promoted to moderator');
    }
  }, []);

  const moderatorSpeakNow = useCallback(async (userName: string, userEmail?: string) => {
    if (!sessionId) return;

    // If moderator already has an active entry that's speaking, ignore
    const { data: existing } = await supabase
      .from('speaker_queue')
      .select('id, status')
      .eq('session_id', sessionId)
      .eq('device_id', deviceId)
      .in('status', ['speaking']);

    if (existing && existing.length > 0) {
      toast.error('You are already speaking');
      return;
    }

    // If moderator is waiting in queue, promote that entry to speaking
    const { data: waitingEntry } = await supabase
      .from('speaker_queue')
      .select('id')
      .eq('session_id', sessionId)
      .eq('device_id', deviceId)
      .eq('status', 'waiting')
      .limit(1);

    if (waitingEntry && waitingEntry.length > 0) {
      await grantMic(waitingEntry[0].id);
      toast.success('You are now speaking!');
      return;
    }

    // Otherwise insert a new entry directly as speaking
    const { data: maxPos } = await supabase
      .from('speaker_queue')
      .select('position')
      .eq('session_id', sessionId)
      .order('position', { ascending: false })
      .limit(1);

    const nextPosition = (maxPos && maxPos.length > 0) ? maxPos[0].position + 1 : 1;

    const { data: inserted, error } = await supabase
      .from('speaker_queue')
      .insert({
        session_id: sessionId,
        user_name: userName,
        user_email: userEmail || null,
        device_id: deviceId,
        position: nextPosition,
        status: 'speaking',
        is_moderator: true,
        started_speaking_at: new Date().toISOString(),
      } as any)
      .select()
      .single();

    if (error) {
      toast.error('Failed to start speaking');
      return;
    }

    await supabase
      .from('sessions')
      .update({
        current_speaker_id: inserted.id,
        speaker_started_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    toast.success('You are now speaking!');
  }, [sessionId, deviceId, grantMic]);

  return { requestToSpeak, grantMic, revokeMic, skipSpeaker, removeFromQueue, grantNextSpeaker, promoteModerator, moderatorSpeakNow, deviceId };
}
