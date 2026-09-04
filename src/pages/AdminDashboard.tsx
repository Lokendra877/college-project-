import { useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSession } from '@/hooks/useSession';
import { useQueueActions } from '@/hooks/useQueueActions';
import { useWebRTC, type EQBand } from '@/hooks/useWebRTC';
import { useSessionAnalytics } from '@/hooks/useSessionAnalytics';
import { QRDisplay } from '@/components/QRDisplay';
import { QueueList } from '@/components/QueueList';
import { MicStatus } from '@/components/MicStatus';
import { SpeakerTimer } from '@/components/SpeakerTimer';
import { AudioStatus } from '@/components/AudioStatus';
import { AnalyticsPanel } from '@/components/AnalyticsPanel';
import { AudioEqualizer } from '@/components/AudioEqualizer';
import { AudioVisualizer } from '@/components/AudioVisualizer';
import { AdminPollCreator } from '@/components/AdminPollCreator';
import { AdminQuestionsList } from '@/components/AdminQuestionsList';
import { AdminPollResults } from '@/components/AdminPollResults';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Power, PlayCircle, Users, Clock, Volume2, Download, FileText, FileSpreadsheet, MessageCircle, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { useState, useEffect, useRef } from 'react';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { RecordingsList } from '@/components/RecordingsList';
import { NavbarVoiceTranslator } from '@/components/NavbarVoiceTranslator';
import { useSpeechTranscription, useTranscriptListener } from '@/hooks/useTranslation';
import { exportAllCSV, exportSessionPDF } from '@/lib/exportData';

export default function AdminDashboard() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const adminCode = searchParams.get('code');
  const [volume, setVolume] = useState(100);
  const [speakerLanguage, setSpeakerLanguage] = useState<string>('English');
  const [targetLanguage, setTargetLanguage] = useState<string | null>('English');
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [ttsRate, setTtsRate] = useState(1.0);
  const [ttsVolume, setTtsVolume] = useState(1.0);
  const { session, queue, loading } = useSession(sessionId);
  const { grantMic, revokeMic, skipSpeaker, removeFromQueue, grantNextSpeaker, promoteModerator } = useQueueActions(sessionId);
  const { isReceiving, remoteAudioRef, remoteStreamRef, recordableStreamRef, setEQ, setVolume: setAudioVolume, enhancements, updateEnhancement, inputLevel, analyserRef } = useWebRTC(sessionId, false);
  const analyticsData = useSessionAnalytics(sessionId, session?.created_at);
  const { isRecording, startRecording, stopRecording } = useAudioRecorder(sessionId);
  const [recordings, setRecordings] = useState<any[]>([]);

  const {
    isTranscribing,
    currentText: currentSpokenText,
    speechError,
    toggleTranscription,
  } = useSpeechTranscription(sessionId, false, speakerLanguage, 'Admin (Laptop)');

  const {
    subtitle,
    translatedSubtitle,
    sourceLanguage: detectedSourceLang,
    speakerName,
    isTranslating,
    history,
    clearHistory,
    testAudioVoice,
  } = useTranscriptListener(sessionId, targetLanguage, ttsEnabled, ttsRate, ttsVolume);

  const prevSpeakerRef = useRef<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    const fetchRec = async () => {
      const { data } = await supabase.from('audio_recordings').select('*').eq('session_id', sessionId).order('recorded_at', { ascending: false });
      if (data) setRecordings(data);
    };
    fetchRec();
    const channel = supabase
      .channel(`export-recordings-${sessionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audio_recordings', filter: `session_id=eq.${sessionId}` }, () => fetchRec())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  const handleExportCSV = () => { if (!session) return; exportAllCSV(analyticsData, recordings, session); toast.success('CSV exported'); };
  const handleExportPDF = () => { if (!session) return; exportSessionPDF(analyticsData, recordings, session); toast.success('PDF report exported'); };

  const currentSpeaker = queue.find(e => e.status === 'speaking');
  const waitingCount = queue.filter(e => e.status === 'waiting').length;

  useEffect(() => {
    const currentId = currentSpeaker?.id || null;
    const prevId = prevSpeakerRef.current;
    if (currentId && currentId !== prevId) {
      setTimeout(() => { if (recordableStreamRef?.current) startRecording(recordableStreamRef.current, currentSpeaker!.user_name); else if (remoteStreamRef?.current) startRecording(remoteStreamRef.current, currentSpeaker!.user_name); }, 1000);
    } else if (!currentId && prevId && isRecording) { stopRecording(); }
    prevSpeakerRef.current = currentId;
  }, [currentSpeaker?.id]);

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (remoteAudioRef?.current) remoteAudioRef.current.volume = newVolume / 100;
  };

  const handleTimeUp = useCallback(async () => {
    if (currentSpeaker) { await revokeMic(currentSpeaker.id); setTimeout(() => grantNextSpeaker(), 500); }
  }, [currentSpeaker, revokeMic, grantNextSpeaker]);

  const endSession = async () => {
    if (!sessionId) return;
    await supabase.from('sessions').update({ is_active: false, current_speaker_id: null }).eq('id', sessionId);
    await supabase.from('speaker_queue').update({ status: 'done', finished_speaking_at: new Date().toISOString() }).eq('session_id', sessionId).in('status', ['waiting', 'speaking']);
    toast.success('Session ended');
    navigate('/admin-home');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session || session.admin_code !== adminCode) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-hero p-4">
        <Card className="max-w-md shadow-lg border w-full">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
              <Power className="w-6 h-6" />
            </div>
            <h2 className="font-heading text-2xl font-bold">Access Denied</h2>
            <p className="text-muted-foreground text-sm">
              Invalid or missing admin code for this session. Please open the dashboard directly from your Admin Home.
            </p>
            <Button onClick={() => navigate('/admin-home')} className="w-full">
              Back to Admin Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!session.is_active) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-hero p-4">
        <Card className="max-w-md shadow-lg border w-full">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
              <Power className="w-6 h-6" />
            </div>
            <h2 className="font-heading text-2xl font-bold">Session Ended</h2>
            <p className="text-muted-foreground text-sm">
              "{session.title}" has been ended and is no longer active.
            </p>
            <Button onClick={() => navigate('/admin-home')} className="w-full">
              Back to Admin Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      <div className="absolute inset-0 gradient-hero" />

      <div className="container mx-auto px-4 py-6 relative z-10">
        {/* Header */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading text-3xl font-bold">{session.title}</h1>
            <p className="text-sm text-muted-foreground">Admin Dashboard</p>
          </div>
          <div className="flex items-center gap-2">
            <NavbarVoiceTranslator
              isTranscribing={isTranscribing}
              currentSpokenText={currentSpokenText}
              speechError={speechError}
              onToggleTranscription={toggleTranscription}
              sourceLanguage={speakerLanguage}
              onSourceLanguageChange={setSpeakerLanguage}
              subtitle={subtitle}
              translatedSubtitle={translatedSubtitle}
              detectedSourceLang={detectedSourceLang}
              speakerName={speakerName}
              isTranslating={isTranslating}
              targetLanguage={targetLanguage}
              onTargetLanguageChange={setTargetLanguage}
              ttsEnabled={ttsEnabled}
              onToggleTts={() => setTtsEnabled(prev => !prev)}
              ttsVolume={ttsVolume}
              onVolumeChange={setTtsVolume}
              ttsRate={ttsRate}
              onRateChange={setTtsRate}
              onTestAudio={testAudioVoice}
              history={history}
              onClearHistory={clearHistory}
              role="admin"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-1" /> Export</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportCSV}><FileSpreadsheet className="w-4 h-4 mr-2" /> CSV</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleExportPDF}><FileText className="w-4 h-4 mr-2" /> PDF</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="destructive" size="sm" onClick={endSession}>
              <Power className="w-4 h-4 mr-1" /> End Session
            </Button>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Left: QR + Stats */}
          <div className="space-y-4">
            <Card className="shadow-md border overflow-hidden">
              <CardContent className="p-4"><QRDisplay sessionId={session.id} /></CardContent>
            </Card>
            <div className="grid grid-cols-2 gap-3">
              <Card className="shadow-sm border">
                <CardContent className="p-4 text-center">
                  <Users className="w-5 h-5 text-primary mx-auto mb-1" />
                  <p className="font-heading text-3xl font-bold">{queue.length}</p>
                  <p className="text-xs text-muted-foreground">In Queue</p>
                </CardContent>
              </Card>
              <Card className="shadow-sm border">
                <CardContent className="p-4 text-center">
                  <Clock className="w-5 h-5 text-accent mx-auto mb-1" />
                  <p className="font-heading text-3xl font-bold">{session.speaking_time_seconds}s</p>
                  <p className="text-xs text-muted-foreground">Per Speaker</p>
                </CardContent>
              </Card>
            </div>
            <Card className="shadow-sm border">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Session ID</p>
                <p className="font-mono text-[10px] break-all select-all">{session.id}</p>
              </CardContent>
            </Card>
          </div>

          {/* Center: Current Speaker + Audio */}
          <div className="space-y-4">
            <AudioStatus isSpeaker={false} isStreaming={false} isReceiving={isReceiving} micError={null} />
            <Card className="shadow-sm border">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-primary" />
                  <Label htmlFor="volume" className="text-xs text-muted-foreground">Speaker Volume</Label>
                </div>
                <Slider id="volume" min={0} max={100} step={1} value={[volume]} onValueChange={handleVolumeChange} />
                <p className="text-xs text-muted-foreground text-right">{volume}%</p>
              </CardContent>
            </Card>
            <AudioVisualizer analyserNode={analyserRef.current} isReceiving={isReceiving} />
            <AudioEqualizer onEQChange={setEQ} onVolumeChange={setAudioVolume} enhancements={enhancements} onEnhancementChange={updateEnhancement} inputLevel={inputLevel} />
            <Card className="shadow-md border-2 border-primary/20">
              <CardHeader><CardTitle className="font-heading text-xl">Current Speaker</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <MicStatus isActive={!!currentSpeaker} speakerName={currentSpeaker?.user_name} />
                {currentSpeaker && session.speaker_started_at ? (
                  <>
                    <SpeakerTimer totalSeconds={session.speaking_time_seconds} startedAt={session.speaker_started_at} onTimeUp={handleTimeUp} />
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1 bg-warning text-warning-foreground hover:bg-warning/90 font-medium" onClick={() => skipSpeaker(currentSpeaker.id).then(() => setTimeout(grantNextSpeaker, 500))}>Skip</Button>
                      <Button variant="destructive" size="sm" className="flex-1 font-medium" onClick={() => revokeMic(currentSpeaker.id)}>Revoke</Button>
                    </div>
                  </>
                ) : (
                  <Button className="w-full bg-success text-success-foreground hover:bg-success/90 font-medium" onClick={grantNextSpeaker} disabled={waitingCount === 0}>
                    <PlayCircle className="w-4 h-4 mr-1" /> Grant Next ({waitingCount})
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: Queue + Q&A + Polls */}
          <div className="space-y-4">
            <Tabs defaultValue="queue">
              <TabsList className="w-full grid grid-cols-3 bg-muted/50">
                <TabsTrigger value="queue" className="font-medium text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Queue</TabsTrigger>
                <TabsTrigger value="questions" className="font-medium text-xs data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">
                  <MessageCircle className="w-3 h-3 mr-1" /> Q&A
                </TabsTrigger>
                <TabsTrigger value="polls" className="font-medium text-xs data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
                  <BarChart3 className="w-3 h-3 mr-1" /> Polls
                </TabsTrigger>
              </TabsList>
              <TabsContent value="queue" className="mt-3">
                <Card className="shadow-sm border">
                  <CardHeader className="pb-2"><CardTitle className="font-heading text-lg">Speaker Queue</CardTitle></CardHeader>
                  <CardContent><QueueList queue={queue} isAdmin onSkip={(id) => skipSpeaker(id).then(() => setTimeout(grantNextSpeaker, 500))} onRemove={removeFromQueue} onPromoteModerator={promoteModerator} /></CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="questions" className="mt-3">
                <Card className="shadow-sm border">
                  <CardHeader className="pb-2"><CardTitle className="font-heading text-lg">Audience Questions</CardTitle></CardHeader>
                  <CardContent><AdminQuestionsList sessionId={sessionId!} /></CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="polls" className="mt-3 space-y-3">
                <AdminPollCreator sessionId={sessionId!} />
                <AdminPollResults sessionId={sessionId!} />
              </TabsContent>
            </Tabs>
          </div>

          {/* Analytics */}
          <div className="space-y-4">
            <AnalyticsPanel analytics={analyticsData} />
            <RecordingsList sessionId={session.id} />
          </div>
        </div>
      </div>
    </div>
  );
}