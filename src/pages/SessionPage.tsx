import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSession } from '@/hooks/useSession';
import { useQueueActions } from '@/hooks/useQueueActions';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useSpeechTranscription, useTranscriptListener } from '@/hooks/useTranslation';
import { validateDynamicQrToken, isSessionVerified, markSessionVerified } from '@/lib/dynamicQrService';
import { QueueList } from '@/components/QueueList';
import { MicStatus } from '@/components/MicStatus';
import { SpeakerTimer } from '@/components/SpeakerTimer';
import { AudioStatus } from '@/components/AudioStatus';
import { NavbarVoiceTranslator } from '@/components/NavbarVoiceTranslator';
import { SessionPolls } from '@/components/SessionPolls';
import { AudienceQuestions } from '@/components/AudienceQuestions';
import { UserNotificationBell } from '@/components/UserNotificationBell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Hand, Loader2, Mic, Mic2, MessageCircle, BarChart3, StopCircle, Settings, Trash2, Shield, ShieldAlert, ShieldCheck, QrCode, RefreshCw, PlayCircle, SkipForward, X as XIcon } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

function getCookie(name: string): string | null {
  const nameEQ = name + '=';
  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    cookie = cookie.trim();
    if (cookie.startsWith(nameEQ)) {
      return decodeURIComponent(cookie.substring(nameEQ.length));
    }
  }
  return null;
}

function setCookie(name: string, value: string, days: number = 365) {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/`;
}

export default function SessionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { sessionId } = useParams<{ sessionId: string }>();
  const qrToken = searchParams.get('dqr') || searchParams.get('token');

  const { session, queue, loading } = useSession(sessionId);
  const { requestToSpeak, grantMic, revokeMic, skipSpeaker, removeFromQueue, grantNextSpeaker, moderatorSpeakNow, deviceId } = useQueueActions(sessionId);

  const savedName = getCookie('smartmic_user_name') || '';

  // Dynamic 30s Rotating QR Verification State
  const [isQrVerified, setIsQrVerified] = useState<boolean>(() => {
    if (!sessionId) return false;
    if (isSessionVerified(sessionId)) return true;
    if (qrToken) {
      const res = validateDynamicQrToken(sessionId, qrToken);
      if (res.isValid) {
        markSessionVerified(sessionId);
        return true;
      }
    }
    return false;
  });

  const [qrError, setQrError] = useState<string | null>(() => {
    if (!sessionId) return null;
    if (isSessionVerified(sessionId)) return null;
    if (qrToken) {
      const res = validateDynamicQrToken(sessionId, qrToken);
      if (!res.isValid) return res.message;
    }
    return 'Please scan the live 30-second dynamic QR code displayed on the auditorium screen to join.';
  });

  useEffect(() => {
    if (!sessionId || isQrVerified) return;
    if (isSessionVerified(sessionId)) {
      setIsQrVerified(true);
      setQrError(null);
      return;
    }
    if (qrToken) {
      const res = validateDynamicQrToken(sessionId, qrToken);
      if (res.isValid) {
        markSessionVerified(sessionId);
        setIsQrVerified(true);
        setQrError(null);
      } else {
        setQrError(res.message);
      }
    }
  }, [sessionId, qrToken, isQrVerified]);

  const [userName, setUserName] = useState(savedName);
  const [hasJoined, setHasJoined] = useState(!!savedName);
  const [isRequestingSpeak, setIsRequestingSpeak] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState<string | null>('English');
  const [speakerLanguage, setSpeakerLanguage] = useState<string>('Hindi');
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [ttsRate, setTtsRate] = useState(1.0);
  const [ttsVolume, setTtsVolume] = useState(1.0);

  const deduplicatedQueue = useMemo(() => {
    const seen = new Set<string>();
    return queue.filter((entry) => {
      const key = entry.user_name ? entry.user_name.trim().toLowerCase() : entry.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [queue]);

  const myEntry = useMemo(
    () => deduplicatedQueue.find(e => e.device_id === deviceId || (userName && e.user_name.trim().toLowerCase() === userName.trim().toLowerCase())),
    [deduplicatedQueue, deviceId, userName]
  );
  const amIModerator = (myEntry as any)?.is_moderator === true;
  const amISpeaking = myEntry?.status === 'speaking' || false;
  const { isStreaming, isReceiving, micError } = useWebRTC(sessionId, amISpeaking);

  const {
    translatorEnabled,
    toggleTranslator,
    subtitle,
    translatedSubtitle,
    sourceLanguage: detectedSourceLang,
    speakerName,
    isTranslating,
    history,
    clearHistory,
    testAudioVoice,
  } = useTranscriptListener(
    sessionId,
    targetLanguage,
    ttsEnabled,
    ttsRate,
    ttsVolume
  );

  const {
    isTranscribing,
    currentText: currentSpokenText,
    speechError,
    toggleTranscription,
  } = useSpeechTranscription(
    sessionId,
    amISpeaking,
    speakerLanguage,
    userName || 'User',
    translatorEnabled
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background gradient-hero p-4">
        <Card className="max-w-md shadow-lg border w-full">
          <CardContent className="p-8 text-center space-y-4">
            <h2 className="font-heading text-2xl font-bold mb-2">Session Not Found</h2>
            <p className="text-muted-foreground text-sm">This session may have ended or the link is invalid.</p>
            <Button onClick={() => navigate('/app')} className="w-full">
              Join Another Session
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!session.is_active) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background gradient-hero p-4">
        <Card className="max-w-md shadow-lg border w-full">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
              <Mic className="w-6 h-6" />
            </div>
            <h2 className="font-heading text-2xl font-bold">Session Ended</h2>
            <p className="text-muted-foreground text-sm">This auditorium session has ended and is no longer active.</p>
            <Button onClick={() => navigate('/app')} className="w-full">
              Join Another Session
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentSpeaker = queue.find(e => e.status === 'speaking');
  const waitingQueue = queue.filter(e => e.status === 'waiting');
  const myPosition = myEntry && myEntry.status === 'waiting'
    ? waitingQueue.findIndex(e => e.id === myEntry.id) + 1
    : null;

  const handleJoin = () => {
    if (!userName.trim()) return;
    setCookie('smartmic_user_name', userName.trim());
    if (sessionId) markSessionVerified(sessionId);
    setHasJoined(true);
  };

  const handleRequestSpeak = async () => {
    if (isRequestingSpeak || !userName.trim()) return;
    setIsRequestingSpeak(true);
    try {
      await requestToSpeak(userName.trim());
    } finally {
      setIsRequestingSpeak(false);
    }
  };

  const handleStopSpeaking = async () => {
    if (myEntry) {
      await revokeMic(myEntry.id);
    }
  };

  const hasSavedIdentity = !!getCookie('smartmic_user_name');

  const handleClearIdentity = () => {
    setCookie('smartmic_user_name', '', -1);
    setUserName('');
    setHasJoined(false);
  };

  const handleClearAllCookies = () => {
    document.cookie.split(';').forEach((cookie) => {
      const name = cookie.split('=')[0].trim();
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    });
    setUserName('');
    setHasJoined(false);
  };

  // 30s Dynamic Rotating QR Security Check
  if (!isQrVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-hero px-4 relative overflow-hidden">
        <div className="absolute top-20 -left-20 w-72 h-72 bg-destructive/10 blob-shape blur-[80px]" />
        <div className="absolute bottom-20 -right-20 w-64 h-64 bg-primary/10 blob-shape-2 blur-[80px]" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="relative z-10 w-full max-w-md"
        >
          <Card className="shadow-2xl border border-destructive/20 overflow-hidden bg-card/95 backdrop-blur-md">
            <div className="bg-destructive/10 border-b border-destructive/20 p-5 text-center">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-destructive/15 text-destructive flex items-center justify-center shadow-inner mb-3">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <h2 className="font-heading text-xl font-bold text-foreground">
                {qrToken ? 'QR Code Expired' : 'Auditorium Access Restricted'}
              </h2>
              <p className="text-xs text-muted-foreground mt-1">30-Second Dynamic Anti-Proxy Security</p>
            </div>

            <CardContent className="p-6 space-y-4 text-center">
              <p className="text-sm text-foreground/90 leading-relaxed font-medium">
                {qrError || 'Please scan the live QR code currently displayed on the auditorium screen.'}
              </p>

              <div className="bg-muted/50 rounded-xl p-3.5 border border-border/60 text-xs text-muted-foreground space-y-1.5 text-left">
                <div className="flex items-center gap-1.5 font-semibold text-foreground">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Why is this required?</span>
                </div>
                <p className="leading-relaxed">
                  To prevent unauthorized access by outside persons, this auditorium uses a rotating QR code that changes every <strong>30 seconds</strong>. Screenshots, WhatsApp forwarded links, and bookmarked URLs automatically expire.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <Button
                  onClick={() => window.location.reload()}
                  className="w-full gradient-primary text-primary-foreground font-semibold h-11 rounded-xl shadow-md gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>I Scanned a New Code (Refresh)</span>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => navigate('/app')}
                  className="w-full text-xs h-9 rounded-xl border-border"
                >
                  Return to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (!hasJoined) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-hero px-4 relative overflow-hidden">
        <div className="absolute top-20 -left-20 w-72 h-72 bg-primary/10 blob-shape blur-[80px]" />
        <div className="absolute bottom-20 -right-20 w-64 h-64 bg-secondary/10 blob-shape-2 blur-[80px]" />
        
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 200 }} className="relative z-10">
          <Card className="w-full max-w-sm shadow-xl border">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-colored mb-3">
                <Mic2 className="w-8 h-8 text-primary-foreground" />
              </div>
              <CardTitle className="font-heading text-2xl">{session.title}</CardTitle>
              <p className="text-sm text-muted-foreground">Enter your name to join</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Your name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                autoFocus
                className="text-center text-lg h-12 rounded-xl"
              />
              {hasSavedIdentity && (
                <button
                  type="button"
                  onClick={handleClearIdentity}
                  className="w-full text-center text-xs text-muted-foreground hover:text-primary underline underline-offset-2 transition-colors"
                >
                  Not you? Clear saved name
                </button>
              )}
              <Button
                className="w-full gradient-primary text-primary-foreground font-heading font-semibold text-lg shadow-colored hover:opacity-90 transition-opacity h-12 rounded-xl"
                onClick={handleJoin}
                disabled={!userName.trim()}
              >
                Join Session
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative">
      <div className="absolute inset-0 gradient-hero" />

      <div className="container mx-auto px-4 py-6 max-w-lg relative z-10">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold truncate">{session.title}</h1>
            <p className="text-sm text-muted-foreground">Welcome, {userName}</p>
          </div>
          <div className="flex items-center gap-2">
            <NavbarVoiceTranslator
              translatorEnabled={translatorEnabled}
              onToggleTranslator={toggleTranslator}
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
              onToggleTts={() => setTtsEnabled((prev) => !prev)}
              ttsVolume={ttsVolume}
              onVolumeChange={setTtsVolume}
              ttsRate={ttsRate}
              onRateChange={setTtsRate}
              onTestAudio={testAudioVoice}
              history={history}
              onClearHistory={clearHistory}
              role="user"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Settings className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleClearAllCookies} className="text-destructive focus:text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Reset All Cookies
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <UserNotificationBell sessionId={sessionId!} />
          </div>
        </motion.div>

        {/* Audio Status */}
        <AudioStatus isSpeaker={amISpeaking} isStreaming={isStreaming} isReceiving={isReceiving} micError={micError} />

        {/* Current Speaker */}
        <Card className="mb-4 shadow-md border">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <MicStatus isActive={!!currentSpeaker} speakerName={currentSpeaker?.user_name} />
              {currentSpeaker && session.speaker_started_at && (
                <SpeakerTimer totalSeconds={session.speaking_time_seconds} startedAt={session.speaker_started_at} />
              )}
            </div>
            {/* Moderator controls for current speaker */}
            {amIModerator && currentSpeaker && (
              <div className="flex gap-2 mt-3">
                <Button size="sm" className="flex-1 bg-warning text-warning-foreground hover:bg-warning/90 font-medium" onClick={() => skipSpeaker(currentSpeaker.id).then(() => setTimeout(grantNextSpeaker, 500))}>
                  <SkipForward className="w-4 h-4 mr-1" /> Skip
                </Button>
                <Button variant="destructive" size="sm" className="flex-1 font-medium" onClick={() => revokeMic(currentSpeaker.id)}>
                  <XIcon className="w-4 h-4 mr-1" /> Revoke
                </Button>
              </div>
            )}
            {/* Moderator grant next button */}
            {amIModerator && !currentSpeaker && waitingQueue.length > 0 && (
              <Button className="w-full mt-3 bg-success text-success-foreground hover:bg-success/90 font-medium" onClick={grantNextSpeaker}>
                <PlayCircle className="w-4 h-4 mr-1" /> Grant Next ({waitingQueue.length})
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Moderator badge + Speak Now */}
        {amIModerator && (
          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
            <Card className="bg-accent/10 border-2 border-accent/30 shadow-sm">
              <CardContent className="p-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-accent" />
                  <p className="font-heading text-sm font-bold text-accent">You are a Moderator</p>
                </div>
                {!amISpeaking && (
                  <Button
                    size="sm"
                    className="gradient-primary text-primary-foreground font-heading font-semibold shadow-colored hover:opacity-90"
                    onClick={() => moderatorSpeakNow(userName)}
                  >
                    <Mic className="w-4 h-4 mr-1" /> Speak Now
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* My Status */}
        {myEntry && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mb-4">
            <Card className={`shadow-md ${
              myEntry.status === 'speaking' ? 'bg-success/5 border-2 border-success/30' : 'bg-primary/5 border-2 border-primary/20'
            }`}>
              <CardContent className="p-4 text-center space-y-3">
                {myEntry.status === 'speaking' ? (
                  <>
                    <p className="font-heading text-xl font-bold text-success">🎙️ You are speaking!</p>
                    <Button variant="destructive" size="lg" onClick={handleStopSpeaking} className="w-full font-heading font-semibold text-lg">
                      <StopCircle className="w-5 h-5 mr-2" /> Stop Speaking
                    </Button>
                  </>
                ) : (
                  <p className="font-heading text-lg font-bold text-primary">
                    Your position: <span className="text-3xl">#{myPosition}</span>
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Request Button */}
        {!myEntry && (
          <Button
            size="lg"
            disabled={isRequestingSpeak}
            className="w-full mb-6 h-14 text-lg font-heading font-semibold gradient-primary text-primary-foreground shadow-colored hover:opacity-90 transition-opacity gap-2"
            onClick={handleRequestSpeak}
          >
            {isRequestingSpeak ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Submitting Request...</span>
              </>
            ) : (
              <>
                <Hand className="w-5 h-5 mr-1" />
                <span>Request to Speak</span>
              </>
            )}
          </Button>
        )}

        {/* Tabbed content */}
        <Tabs defaultValue="queue" className="mb-6">
          <TabsList className="w-full grid grid-cols-3 bg-muted/50">
            <TabsTrigger value="queue" className="font-medium text-sm gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Mic className="w-3.5 h-3.5" /> Queue
            </TabsTrigger>
            <TabsTrigger value="questions" className="font-medium text-sm gap-1.5 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">
              <MessageCircle className="w-3.5 h-3.5" /> Q&A
            </TabsTrigger>
            <TabsTrigger value="polls" className="font-medium text-sm gap-1.5 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
              <BarChart3 className="w-3.5 h-3.5" /> Polls
            </TabsTrigger>
          </TabsList>

          <TabsContent value="queue" className="mt-4">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Speaker Queue ({deduplicatedQueue.length})
            </h2>
            <QueueList
              queue={deduplicatedQueue}
              currentDeviceId={deviceId}
              isModerator={amIModerator}
              onSkip={amIModerator ? (id) => skipSpeaker(id).then(() => setTimeout(grantNextSpeaker, 500)) : undefined}
              onRemove={amIModerator ? removeFromQueue : undefined}
              onGrantMic={amIModerator ? grantMic : undefined}
            />
          </TabsContent>

          <TabsContent value="questions" className="mt-4">
            <AudienceQuestions sessionId={sessionId!} userName={userName} />
          </TabsContent>

          <TabsContent value="polls" className="mt-4">
            <SessionPolls sessionId={sessionId!} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}