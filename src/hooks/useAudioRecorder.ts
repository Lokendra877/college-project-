import { useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useAudioRecorder(sessionId: string | undefined) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [currentRecordingSpeaker, setCurrentRecordingSpeaker] = useState<string | null>(null);
  const startTimeRef = useRef<number>(0);

  const startRecording = useCallback((stream: MediaStream | null, speakerName: string) => {
    if (!stream || !sessionId) return;

    // Check if stream has audio tracks
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      console.warn('No audio tracks available to record');
      return;
    }

    if (mediaRecorderRef.current?.state === 'recording') return;

    chunksRef.current = [];
    
    // Try different codecs in order of preference
    const mimeTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      ''
    ];
    
    let mimeType = '';
    for (const type of mimeTypes) {
      if (type === '' || MediaRecorder.isTypeSupported(type)) {
        mimeType = type;
        break;
      }
    }
    
    try {
      const recorderOptions = mimeType ? { mimeType } : undefined;
      const recorder = new MediaRecorder(stream, recorderOptions);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });
        const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
        if (blob.size > 0) {
          await uploadRecording(blob, speakerName, duration);
        }
        chunksRef.current = [];
        setIsRecording(false);
        setCurrentRecordingSpeaker(null);
      };

      recorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        toast.error('Recording failed');
        setIsRecording(false);
        setCurrentRecordingSpeaker(null);
      };

      mediaRecorderRef.current = recorder;
      startTimeRef.current = Date.now();
      recorder.start(1000);
      setIsRecording(true);
      setCurrentRecordingSpeaker(speakerName);
      console.log('Recording started for:', speakerName, 'with mimeType:', mimeType);
    } catch (error) {
      console.error('Failed to start recording:', error);
      toast.error('Could not start recording - check microphone permissions');
    }
  }, [sessionId]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      console.log('Recording stopped');
    }
  }, []);

  const uploadRecording = async (blob: Blob, speakerName: string, duration: number) => {
    if (!sessionId) return;

    const fileName = `${sessionId}/${Date.now()}_${speakerName.replace(/\s+/g, '_')}.webm`;

    const { error: uploadError } = await supabase.storage
      .from('audio-recordings')
      .upload(fileName, blob, { contentType: 'audio/webm' });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      toast.error('Failed to save recording');
      return;
    }

    const { error: dbError } = await supabase
      .from('audio_recordings')
      .insert({
        session_id: sessionId,
        speaker_name: speakerName,
        file_path: fileName,
        duration_seconds: duration,
      });

    if (dbError) {
      console.error('DB error:', dbError);
      toast.error('Failed to save recording metadata');
      return;
    }

    toast.success(`Recording saved: ${speakerName}`);
  };

  return { isRecording, currentRecordingSpeaker, startRecording, stopRecording };
}
