import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Mic, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Recording {
  id: string;
  speaker_name: string;
  file_path: string;
  duration_seconds: number;
  recorded_at: string;
}

export function RecordingsList({ sessionId }: { sessionId: string }) {
  const [recordings, setRecordings] = useState<Recording[]>([]);

  const fetchRecordings = async () => {
    const { data } = await supabase.from('audio_recordings').select('*').eq('session_id', sessionId).order('recorded_at', { ascending: false });
    if (data) setRecordings(data as Recording[]);
  };

  useEffect(() => {
    fetchRecordings();
    const channel = supabase.channel(`recordings-${sessionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audio_recordings', filter: `session_id=eq.${sessionId}` }, () => fetchRecordings())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  const handleDownload = async (recording: Recording) => {
    const { data } = supabase.storage.from('audio-recordings').getPublicUrl(recording.file_path);
    if (data?.publicUrl) { const a = document.createElement('a'); a.href = data.publicUrl; a.download = `${recording.speaker_name}_${new Date(recording.recorded_at).toLocaleTimeString()}.webm`; a.click(); }
  };

  const handleDelete = async (recording: Recording) => {
    await supabase.storage.from('audio-recordings').remove([recording.file_path]);
    await supabase.from('audio_recordings').delete().eq('id', recording.id);
    toast.success('Recording deleted');
  };

  const formatDuration = (seconds: number) => { const m = Math.floor(seconds / 60); const s = seconds % 60; return `${m}:${s.toString().padStart(2, '0')}`; };

  return (
    <Card className="shadow-sm border">
      <CardHeader>
        <CardTitle className="font-heading text-lg flex items-center gap-2">
          <Mic className="w-4 h-4 text-primary" /> Recordings ({recordings.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {recordings.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No recordings yet. Recordings are saved automatically when a speaker finishes.</p>
        ) : (
          <div className="space-y-2">
            {recordings.map((rec) => (
              <div key={rec.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{rec.speaker_name}</p>
                  <p className="text-xs text-muted-foreground">{formatDuration(rec.duration_seconds)} · {new Date(rec.recorded_at).toLocaleTimeString()}</p>
                </div>
                <div className="flex gap-1 ml-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownload(rec)}><Download className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(rec)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}