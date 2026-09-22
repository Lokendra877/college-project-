import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from '@/hooks/useSession';
import { useQueueActions } from '@/hooks/useQueueActions';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useSessionAnalytics } from '@/hooks/useSessionAnalytics';
import { QRDisplay } from '@/components/QRDisplay';
import { QueueList } from '@/components/QueueList';
import { AudioStatus } from '@/components/AudioStatus';
import { AudioEqualizer } from '@/components/AudioEqualizer';
import { AudioVisualizer } from '@/components/AudioVisualizer';
import { AdminPollCreator } from '@/components/AdminPollCreator';
import { AdminQuestionsList } from '@/components/AdminQuestionsList';
import { AdminPollResults } from '@/components/AdminPollResults';
import { RecordingsList } from '@/components/RecordingsList';
import { NavbarVoiceTranslator } from '@/components/NavbarVoiceTranslator';
import { useSpeechTranscription, useTranscriptListener } from '@/hooks/useTranslation';
import { exportAllCSV, exportSessionPDF } from '@/lib/exportData';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import {
  Loader2,
  Power,
  PlayCircle,
  Users,
  Clock,
  Download,
  FileText,
  FileSpreadsheet,
  MessageCircle,
  BarChart3,
  SlidersHorizontal,
  QrCode,
  Sparkles,
  ArrowLeft,
  Copy,
  Check,
  Disc,
  LayoutDashboard,
  Mic,
  Mic2,
  Radio,
  Settings,
  Search,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Volume2,
  VolumeX,
  Menu,
  X,
  Shield,
  Activity,
  Calendar,
  Layers,
  LogOut,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

type ActiveView = 'dashboard' | 'requests' | 'session' | 'queue' | 'users' | 'analytics' | 'settings';

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function AdminDashboard() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const adminCode = searchParams.get('code');

  // Active View State
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Translation & Voice State
  const [speakerLanguage, setSpeakerLanguage] = useState<string>('English');
  const [targetLanguage, setTargetLanguage] = useState<string | null>('English');
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [ttsRate, setTtsRate] = useState(1.0);
  const [ttsVolume, setTtsVolume] = useState(1.0);

  // Modals & UI State
  const [showQrModal, setShowQrModal] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState('');

  // Mic Requests Filters
  const [requestFilter, setRequestFilter] = useState<'all' | 'waiting' | 'approved' | 'rejected'>('all');
  const [requestSearch, setRequestSearch] = useState('');
  const [statusDropdown, setStatusDropdown] = useState<string>('all');

  // Hooks & Audio
  const { session, queue, loading } = useSession(sessionId);
  const { grantMic, revokeMic, skipSpeaker, removeFromQueue, grantNextSpeaker, promoteModerator } = useQueueActions(sessionId);
  const {
    isReceiving,
    remoteAudioRef,
    remoteStreamRef,
    recordableStreamRef,
    setEQ,
    setVolume: setAudioVolume,
    setBalance,
    enhancements,
    updateEnhancement,
    inputLevel,
    analyserRef,
  } = useWebRTC(sessionId, false);

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

  // Live Speaker & Queue Metrics
  const currentSpeaker = queue.find((e) => e.status === 'speaking');
  const waitingCount = queue.filter((e) => e.status === 'waiting').length;
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Real-time formatted clock
  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      };
      setCurrentDateTime(new Intl.DateTimeFormat('en-US', options).format(now));
    };
    updateDateTime();
    const interval = setInterval(updateDateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  // Speaker Timer Tracker
  const handleTimeUp = useCallback(async () => {
    if (currentSpeaker) {
      toast.info(`Time limit reached for ${currentSpeaker.user_name}. Granting next speaker...`);
      await revokeMic(currentSpeaker.id);
      setTimeout(() => grantNextSpeaker(), 500);
    }
  }, [currentSpeaker, revokeMic, grantNextSpeaker]);

  useEffect(() => {
    if (!currentSpeaker || !session?.speaker_started_at) {
      setElapsedSeconds(0);
      return;
    }
    const startMs = new Date(session.speaker_started_at).getTime();
    const tick = () => {
      const diff = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
      setElapsedSeconds(diff);
      if (session.speaking_time_seconds && diff >= session.speaking_time_seconds) {
        handleTimeUp();
      }
    };
    tick();
    const interval = setInterval(tick, 500);
    return () => clearInterval(interval);
  }, [currentSpeaker?.id, session?.speaker_started_at, session?.speaking_time_seconds, handleTimeUp]);

  // Audio Recording Auto-trigger
  useEffect(() => {
    const currentId = currentSpeaker?.id || null;
    const prevId = prevSpeakerRef.current;
    if (currentId && currentId !== prevId) {
      setTimeout(() => {
        if (recordableStreamRef?.current) {
          startRecording(recordableStreamRef.current, currentSpeaker!.user_name);
        } else if (remoteStreamRef?.current) {
          startRecording(remoteStreamRef.current, currentSpeaker!.user_name);
        }
      }, 1000);
    } else if (!currentId && prevId && isRecording) {
      stopRecording();
    }
    prevSpeakerRef.current = currentId;
  }, [currentSpeaker?.id]);

  // Fetch Session Recordings
  useEffect(() => {
    if (!sessionId) return;
    const fetchRec = async () => {
      const { data } = await supabase
        .from('audio_recordings')
        .select('*')
        .eq('session_id', sessionId)
        .order('recorded_at', { ascending: false });
      if (data) setRecordings(data);
    };
    fetchRec();
    const channel = supabase
      .channel(`export-recordings-${sessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'audio_recordings', filter: `session_id=eq.${sessionId}` },
        () => fetchRec()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  // Export handlers
  const handleExportCSV = () => {
    if (!session) return;
    exportAllCSV(analyticsData, recordings, session);
    toast.success('Analytics CSV downloaded');
  };

  const handleExportPDF = () => {
    if (!session) return;
    exportSessionPDF(analyticsData, recordings, session);
    toast.success('Executive PDF report downloaded');
  };

  const endSession = async () => {
    if (!sessionId) return;
    await supabase.from('sessions').update({ is_active: false, current_speaker_id: null }).eq('id', sessionId);
    await supabase
      .from('speaker_queue')
      .update({ status: 'done', finished_speaking_at: new Date().toISOString() })
      .eq('session_id', sessionId)
      .in('status', ['waiting', 'speaking']);
    toast.success('Auditorium session ended');
    navigate('/admin-home');
  };

  const extendCurrentSpeakerTime = async () => {
    if (!session || !sessionId) return;
    const currentLimit = session.speaking_time_seconds || 30;
    const newLimit = currentLimit + 30;
    await supabase.from('sessions').update({ speaking_time_seconds: newLimit }).eq('id', sessionId);
    toast.success(`Extended speaker time limit to ${newLimit}s (+30s)`);
  };

  const copySessionLink = () => {
    const url = `${window.location.origin}/session/${sessionId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(true);
    toast.success('Session link copied to clipboard!');
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Restore rejected/skipped user back to waiting
  const handleRestoreUser = async (queueEntryId: string) => {
    await supabase
      .from('speaker_queue')
      .update({ status: 'waiting', started_speaking_at: null, finished_speaking_at: null } as any)
      .eq('id', queueEntryId);
    toast.success('Participant restored to waiting queue');
  };

  // Format Helper MM:SS
  const formatMMSS = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Format timestamp helper
  const formatTimeOnly = (isoString?: string | null) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return '—';
    }
  };

  // Real requests from speakerLog (including done and skipped)
  const allRequests = useMemo(() => {
    return analyticsData.speakerLog || [];
  }, [analyticsData.speakerLog]);

  // Counts for pills
  const allCount = allRequests.length;
  const waitingReqCount = allRequests.filter((e) => e.status === 'waiting').length;
  const approvedReqCount = allRequests.filter((e) => e.status === 'speaking' || e.status === 'done').length;
  const rejectedReqCount = allRequests.filter((e) => e.status === 'skipped').length;

  // Filtered requests for "Mic Requests" tab
  const filteredRequests = useMemo(() => {
    return allRequests.filter((entry) => {
      // Filter by pill tab
      if (requestFilter === 'waiting' && entry.status !== 'waiting') return false;
      if (requestFilter === 'approved' && entry.status !== 'speaking' && entry.status !== 'done') return false;
      if (requestFilter === 'rejected' && entry.status !== 'skipped') return false;

      // Filter by status dropdown
      if (statusDropdown !== 'all') {
        if (statusDropdown === 'waiting' && entry.status !== 'waiting') return false;
        if (statusDropdown === 'approved' && entry.status !== 'speaking' && entry.status !== 'done') return false;
        if (statusDropdown === 'rejected' && entry.status !== 'skipped') return false;
      }

      // Filter by search text
      if (requestSearch.trim()) {
        const query = requestSearch.toLowerCase();
        const matchesName = entry.user_name?.toLowerCase().includes(query);
        const matchesEmail = entry.user_email?.toLowerCase().includes(query);
        return matchesName || matchesEmail;
      }
      return true;
    });
  }, [allRequests, requestFilter, statusDropdown, requestSearch]);

  // Real Average Wait Time Calculation from completed/started speakers
  const realAvgWaitTimeSeconds = useMemo(() => {
    const startedEntries = allRequests.filter(
      (e) => ((e as any).requested_at || (e as any).created_at) && (e.started_speaking_at || e.finished_speaking_at)
    );
    if (startedEntries.length === 0) return 0;
    const totalWait = startedEntries.reduce((acc, e) => {
      const start = new Date(e.started_speaking_at || e.finished_speaking_at!).getTime();
      const created = new Date((e as any).requested_at || (e as any).created_at).getTime();
      return acc + Math.max(0, (start - created) / 1000);
    }, 0);
    return Math.round(totalWait / startedEntries.length);
  }, [allRequests]);

  // Current real active concurrent audience
  const realConcurrentAudience = queue.length + (currentSpeaker ? 1 : 0);

  // Real Charts Data (Generated from actual timestamps)
  const chartData = useMemo(() => {
    const now = new Date();
    const buckets: { time: string; requests: number; users: number }[] = [];

    // Last 6 hour intervals
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hour = d.getHours();
      const label = hour === 0 ? '12 AM' : hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`;
      buckets.push({ time: label, requests: 0, users: 0 });
    }

    allRequests.forEach((req) => {
      const timestamp = (req as any).requested_at || (req as any).created_at;
      if (timestamp) {
        const reqDate = new Date(timestamp);
        const hour = reqDate.getHours();
        const label = hour === 0 ? '12 AM' : hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`;
        const found = buckets.find((b) => b.time === label);
        if (found) {
          found.requests += 1;
          found.users += 1;
        }
      }
    });

    const requestsOverTime = buckets.map((b) => ({ time: b.time, requests: b.requests }));
    const userJoinTrend = buckets.map((b) => ({ time: b.time, users: b.users }));

    const statusDistribution = [
      { name: 'Approved', value: approvedReqCount, color: '#10b981' },
      { name: 'Waiting', value: waitingReqCount, color: '#f59e0b' },
      { name: 'Rejected', value: rejectedReqCount, color: '#ef4444' },
    ];

    return { requestsOverTime, userJoinTrend, statusDistribution };
  }, [allRequests, approvedReqCount, waitingReqCount, rejectedReqCount]);

  // Donut Percentages
  const approvedPct = allRequests.length > 0 ? Math.round((approvedReqCount / allRequests.length) * 100) : 0;
  const waitingPct = allRequests.length > 0 ? Math.round((waitingReqCount / allRequests.length) * 100) : 0;
  const rejectedPct = allRequests.length > 0 ? Math.round((rejectedReqCount / allRequests.length) * 100) : 0;

  // Real Date string for Analytics header
  const todayDateString = useMemo(() => {
    return new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date());
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-9 h-9 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!session || session.admin_code !== adminCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <Card className="max-w-md shadow-lg border border-slate-200 bg-white w-full rounded-2xl">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Power className="w-6 h-6" />
            </div>
            <h2 className="font-heading text-2xl font-bold text-slate-900">Access Denied</h2>
            <p className="text-slate-500 text-sm">
              Invalid or missing admin code for this session. Please open the dashboard directly from your Admin Home.
            </p>
            <Button onClick={() => navigate('/admin-home')} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">
              Back to Admin Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!session.is_active) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <Card className="max-w-md shadow-lg border border-slate-200 bg-white w-full rounded-2xl">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Power className="w-6 h-6" />
            </div>
            <h2 className="font-heading text-2xl font-bold text-slate-900">Session Ended</h2>
            <p className="text-slate-500 text-sm">"{session.title}" has been concluded and is no longer active.</p>
            <Button onClick={() => navigate('/admin-home')} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">
              Back to Admin Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Navigation Items
  const navItems: { id: ActiveView; label: string; icon: any; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'requests', label: 'Mic Requests', icon: Mic2, badge: waitingCount },
    { id: 'session', label: 'Active Session', icon: Radio },
    { id: 'queue', label: 'Queue', icon: Layers, badge: queue.length },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  // Headings
  const viewHeadings: Record<ActiveView, { title: string; subtitle: string }> = {
    dashboard: {
      title: 'Dashboard',
      subtitle: 'Overview of real-time auditorium interaction',
    },
    requests: {
      title: 'Mic Requests',
      subtitle: 'Manage incoming microphone requests from audience',
    },
    session: {
      title: 'Live Session',
      subtitle: 'Monitor and control the ongoing microphone session',
    },
    queue: {
      title: 'Audience Queue',
      subtitle: 'Order, prioritization, and speaker management',
    },
    users: {
      title: 'Audience & Engagement',
      subtitle: 'Real-time Q&A upvotes, live polling, and attendees',
    },
    analytics: {
      title: 'Analytics',
      subtitle: 'Usage statistics and system performance',
    },
    settings: {
      title: 'Settings & Studio',
      subtitle: 'Acoustic anti-feedback notch, EQ presets, and limits',
    },
  };

  return (
    <div className="min-h-screen bg-slate-50/80 text-slate-800 flex flex-col lg:flex-row font-body antialiased">
      {/* ========================================================= */}
      {/* 1. LEFT SIDEBAR (Deep Forest Green: #022c22 / #032b20)     */}
      {/* ========================================================= */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#022c22] border-r border-emerald-900/60 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-5 flex flex-col h-full">
          {/* Brand Header */}
          <div className="flex items-center justify-between pb-6 border-b border-emerald-900/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/30">
                <Mic className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-heading font-bold text-white text-base tracking-wide leading-tight">Smart Auditorium</h2>
                <p className="text-[11px] text-emerald-300/80 font-medium">Session Console</p>
              </div>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden text-emerald-300 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="mt-6 space-y-1.5 flex-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = activeView === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveView(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 font-semibold'
                      : 'text-emerald-100/75 hover:text-white hover:bg-emerald-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-emerald-300/80'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                        isActive ? 'bg-white/20 text-white' : 'bg-emerald-500/30 text-emerald-200'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Admin Profile & Logout Footer */}
          <div className="pt-4 mt-auto border-t border-emerald-900/80 space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-emerald-800/70 border border-emerald-600/40 text-emerald-300 flex items-center justify-center font-bold text-sm shrink-0">
                  A
                </div>
                <div className="min-w-0">
                  <p className="font-heading font-semibold text-white text-xs truncate">Session Admin</p>
                  <p className="text-[11px] text-emerald-300/70 truncate">ID: #{session.id.slice(0, 8)}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/admin-home')}
                className="flex-1 justify-start text-xs text-emerald-200/80 hover:text-white hover:bg-emerald-800/50 h-8 rounded-lg"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Sessions
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={endSession}
                className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/20 h-8 rounded-lg px-2"
                title="End auditorium session"
              >
                <LogOut className="w-3.5 h-3.5 mr-1" /> End
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Backdrop for mobile */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* ========================================================= */}
      {/* 2. MAIN WORKSPACE                                         */}
      {/* ========================================================= */}
      <div className="flex-1 flex flex-col lg:pl-64 min-w-0 overflow-x-hidden">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-3.5 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-heading text-lg sm:text-xl font-bold text-slate-900 leading-tight">
                {viewHeadings[activeView].title}
              </h1>
              <p className="text-xs text-slate-500 hidden sm:block">
                {viewHeadings[activeView].subtitle}
              </p>
            </div>
          </div>

          {/* Right Header Status & Tools */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* System Online badge */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/70 text-emerald-700 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>System Online</span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-500 text-[11px] font-mono">{currentDateTime || 'Live'}</span>
            </div>

            {/* Audio Stream Receiving Status */}
            <AudioStatus isSpeaker={false} isStreaming={false} isReceiving={isReceiving} micError={null} />

            {/* QR Join Drawer Trigger */}
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-lg text-xs font-medium border-emerald-200 text-emerald-700 hover:bg-emerald-50 gap-1.5 shadow-none"
              onClick={() => setShowQrModal((prev) => !prev)}
            >
              <QrCode className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">{showQrModal ? 'Close QR' : 'Join QR'}</span>
            </Button>

            {/* Voice Translator Hub Button */}
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
              onToggleTts={() => setTtsEnabled((prev) => !prev)}
              ttsVolume={ttsVolume}
              onVolumeChange={setTtsVolume}
              ttsRate={ttsRate}
              onRateChange={setTtsRate}
              onTestAudio={testAudioVoice}
              history={history}
              onClearHistory={clearHistory}
              role="admin"
            />

            {/* Export Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 rounded-lg text-xs font-medium border-slate-200 text-slate-700 hover:bg-slate-50 shadow-none">
                  <Download className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                  <span className="hidden sm:inline">Export</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl border-slate-200 bg-white shadow-lg">
                <DropdownMenuItem onClick={handleExportCSV} className="text-xs">
                  <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-600" /> Analytics CSV
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleExportPDF} className="text-xs">
                  <FileText className="w-4 h-4 mr-2 text-red-600" /> Executive PDF Report
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* End Session Button (Red) */}
            <Button
              size="sm"
              className="h-8 rounded-lg text-xs font-medium bg-red-600 hover:bg-red-700 text-white shadow-none"
              onClick={endSession}
            >
              <Power className="w-3.5 h-3.5 mr-1" />
              <span className="hidden sm:inline">End Session</span>
            </Button>
          </div>
        </header>

        {/* QR Code Slide-Down Banner */}
        <AnimatePresence>
          {showQrModal && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm"
            >
              <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="bg-emerald-50/60 p-2 rounded-xl border border-emerald-200 shadow-xs">
                    <QRDisplay sessionId={session.id} size={100} />
                  </div>
                  <div className="space-y-1">
                    <p className="font-heading text-sm font-semibold text-slate-900">Audience QR & Quick Join</p>
                    <p className="text-xs text-slate-500 max-w-md">
                      Audience can scan this QR code with any smartphone to request microphones, vote on live polls, and submit questions.
                    </p>
                    <p className="text-xs font-mono text-emerald-600 select-all font-semibold">
                      {window.location.origin}/session/{session.id}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="secondary" onClick={copySessionLink} className="rounded-xl text-xs h-8">
                    {copiedId ? <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 mr-1 text-emerald-600" />}
                    Copy Invite Link
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowQrModal(false)} className="rounded-xl text-xs h-8">
                    Close
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className="p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-6">
          {/* ========================================================= */}
          {/* VIEW 1: DASHBOARD (Green & Red Palette)                   */}
          {/* ========================================================= */}
          {activeView === 'dashboard' && (
            <div className="space-y-6">
              {/* 4 Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Total Users (Green) */}
                <Card className="bg-white border border-slate-200/90 rounded-2xl shadow-xs p-5">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                      <Users className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Users</p>
                      <div className="flex items-baseline gap-2">
                        <span className="font-heading text-2xl font-bold text-slate-900">
                          {analyticsData.totalSpeakers}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">Audience participants</p>
                    </div>
                  </div>
                </Card>

                {/* 2. In Queue (Red Alert) */}
                <Card className="bg-white border border-slate-200/90 rounded-2xl shadow-xs p-5">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-600 flex items-center justify-center shrink-0">
                      <Clock className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">In Queue</p>
                      <div className="flex items-baseline gap-2">
                        <span className="font-heading text-2xl font-bold text-slate-900">
                          {waitingCount}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">Waiting for mic</p>
                    </div>
                  </div>
                </Card>

                {/* 3. Active Speaker (Green) */}
                <Card className="bg-white border border-slate-200/90 rounded-2xl shadow-xs p-5">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                      <Mic className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Active Speaker</p>
                      <div className="flex items-baseline gap-2">
                        <span className="font-heading text-2xl font-bold text-slate-900">
                          {currentSpeaker ? '1' : '0'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[120px]">
                        {currentSpeaker ? currentSpeaker.user_name : 'No active mic'}
                      </p>
                    </div>
                  </div>
                </Card>

                {/* 4. Total Requests (Deep Green) */}
                <Card className="bg-white border border-slate-200/90 rounded-2xl shadow-xs p-5">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-600/10 text-emerald-700 flex items-center justify-center shrink-0">
                      <BarChart3 className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Requests</p>
                      <div className="flex items-baseline gap-2">
                        <span className="font-heading text-2xl font-bold text-slate-900">
                          {allRequests.length}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">Total submitted</p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Main Two-Column Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left: Live Queue (Next 5) */}
                <div className="lg:col-span-8">
                  <Card className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                      <div>
                        <h2 className="font-heading text-base font-bold text-slate-900">Live Queue (Next 5)</h2>
                        <p className="text-xs text-slate-500">Upcoming audience members waiting to speak</p>
                      </div>
                      <button
                        onClick={() => setActiveView('requests')}
                        className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors"
                      >
                        View All →
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 font-semibold uppercase text-[11px]">
                            <th className="py-3 px-4 w-12 text-center">#</th>
                            <th className="py-3 px-4">Name</th>
                            <th className="py-3 px-4">Email</th>
                            <th className="py-3 px-4">Request Time</th>
                            <th className="py-3 px-4 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {queue.slice(0, 5).map((entry, index) => {
                            const isSpeaking = entry.status === 'speaking';
                            return (
                              <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-3.5 px-4 font-mono font-medium text-slate-600 text-center">
                                  {index + 1}
                                </td>
                                <td className="py-3.5 px-4 font-medium text-slate-900">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center">
                                      {entry.user_name.charAt(0).toUpperCase()}
                                    </div>
                                    <span>{entry.user_name}</span>
                                    {isSpeaking && (
                                      <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold">
                                        Speaking
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                                  {entry.user_email || '—'}
                                </td>
                                <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                                  {formatTimeOnly((entry as any).requested_at || (entry as any).created_at)}
                                </td>
                                <td className="py-3.5 px-4 text-right">
                                  {isSpeaking ? (
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      className="h-7 text-xs px-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white"
                                      onClick={() => revokeMic(entry.id)}
                                    >
                                      Revoke
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      className="h-7 text-xs px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                                      onClick={() => grantMic(entry.id)}
                                    >
                                      Grant
                                    </Button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}

                          {queue.length === 0 && (
                            <tr>
                              <td colSpan={5} className="text-center py-10 text-slate-400">
                                <Clock className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
                                No speakers currently waiting in queue
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>

                {/* Right: Current Speaker Card */}
                <div className="lg:col-span-4">
                  <Card className="bg-emerald-50/50 border border-emerald-200/70 rounded-2xl p-6 shadow-xs flex flex-col items-center justify-center text-center h-full min-h-[300px]">
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-800 mb-4">Current Speaker</p>

                    {currentSpeaker ? (
                      <div className="w-full space-y-4">
                        <div className="w-20 h-20 rounded-full bg-emerald-200 border-2 border-emerald-300 text-emerald-800 text-3xl font-bold flex items-center justify-center mx-auto shadow-inner">
                          {currentSpeaker.user_name.charAt(0).toUpperCase()}
                        </div>

                        <div>
                          <h3 className="font-heading text-lg font-bold text-slate-900 leading-tight">
                            {currentSpeaker.user_name}
                          </h3>
                          <p className="text-xs text-slate-500 font-medium">
                            {currentSpeaker.user_email || '—'}
                          </p>
                        </div>

                        {/* Timer Display */}
                        <div className="pt-2">
                          <p className="font-mono text-base font-bold text-slate-800">
                            {formatMMSS(elapsedSeconds)} / {formatMMSS(session.speaking_time_seconds || 30)}
                          </p>
                          <div className="w-full bg-emerald-200/80 rounded-full h-2.5 mt-2 overflow-hidden">
                            <div
                              className="bg-emerald-600 h-2.5 rounded-full transition-all duration-300"
                              style={{
                                width: `${Math.min(
                                  100,
                                  Math.round((elapsedSeconds / (session.speaking_time_seconds || 30)) * 100)
                                )}%`,
                              }}
                            />
                          </div>
                        </div>

                        {/* Action Buttons (Red for End Speaker) */}
                        <div className="pt-3 space-y-2">
                          <Button
                            className="w-full bg-red-600 hover:bg-red-700 text-white rounded-xl h-10 font-medium text-xs shadow-sm"
                            onClick={() => revokeMic(currentSpeaker.id)}
                          >
                            ■ End Speaker
                          </Button>
                          <Button
                            variant="outline"
                            className="w-full bg-white hover:bg-slate-50 text-slate-700 border-slate-300 rounded-xl h-9 text-xs"
                            onClick={() => skipSpeaker(currentSpeaker.id).then(() => setTimeout(grantNextSpeaker, 500))}
                          >
                            Skip Speaker
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4 text-center py-6">
                        <div className="w-16 h-16 rounded-full bg-emerald-100/80 text-emerald-600 flex items-center justify-center mx-auto">
                          <Mic className="w-7 h-7 opacity-70" />
                        </div>
                        <div>
                          <p className="font-heading font-semibold text-slate-800 text-sm">No Active Speaker</p>
                          <p className="text-xs text-slate-500 mt-1 max-w-xs">
                            Select a participant from the queue or click below to grant access to the next person.
                          </p>
                        </div>
                        <Button
                          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs h-9 px-5 font-medium shadow-xs"
                          onClick={grantNextSpeaker}
                          disabled={waitingCount === 0}
                        >
                          <PlayCircle className="w-4 h-4 mr-1.5" /> Grant Next Speaker ({waitingCount})
                        </Button>
                      </div>
                    )}
                  </Card>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* VIEW 2: MIC REQUESTS (Green & Red Filter & Actions)       */}
          {/* ========================================================= */}
          {activeView === 'requests' && (
            <div className="space-y-5">
              {/* Filter Tabs Row */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-slate-200/90 shadow-xs">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setRequestFilter('all')}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                      requestFilter === 'all'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    All ({allCount})
                  </button>
                  <button
                    onClick={() => setRequestFilter('waiting')}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                      requestFilter === 'waiting'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Waiting ({waitingReqCount})
                  </button>
                  <button
                    onClick={() => setRequestFilter('approved')}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                      requestFilter === 'approved'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Approved ({approvedReqCount})
                  </button>
                  <button
                    onClick={() => setRequestFilter('rejected')}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                      requestFilter === 'rejected'
                        ? 'bg-red-600 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Rejected ({rejectedReqCount})
                  </button>
                </div>

                <div className="text-xs text-slate-500 font-medium px-2">
                  Showing {filteredRequests.length} requests
                </div>
              </div>

              {/* Search & Status Filter Row */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Search by name or email..."
                    value={requestSearch}
                    onChange={(e) => setRequestSearch(e.target.value)}
                    className="pl-9 h-9 text-xs rounded-xl bg-white border-slate-200"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <select
                    value={statusDropdown}
                    onChange={(e) => setStatusDropdown(e.target.value)}
                    className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700 shadow-none focus:outline-hidden"
                  >
                    <option value="all">All Status</option>
                    <option value="waiting">Waiting</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              {/* Real Requests Table */}
              <Card className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 font-semibold uppercase text-[11px]">
                        <th className="py-3 px-4 w-12 text-center">#</th>
                        <th className="py-3 px-4">Name</th>
                        <th className="py-3 px-4">Email</th>
                        <th className="py-3 px-4">Request Time</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredRequests.map((entry, index) => {
                        const isSpeaking = entry.status === 'speaking';
                        const isWaiting = entry.status === 'waiting';
                        const isDone = entry.status === 'done';
                        const isSkipped = entry.status === 'skipped';

                        return (
                          <tr key={entry.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3.5 px-4 font-mono font-medium text-slate-600 text-center">
                              {index + 1}
                            </td>
                            <td className="py-3.5 px-4 font-medium text-slate-900">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center">
                                  {entry.user_name.charAt(0).toUpperCase()}
                                </div>
                                <span>{entry.user_name}</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                              {entry.user_email || '—'}
                            </td>
                            <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                              {formatTimeOnly((entry as any).requested_at || (entry as any).created_at)}
                            </td>
                            <td className="py-3.5 px-4">
                              {isWaiting && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-100 text-amber-700">
                                  Waiting
                                </span>
                              )}
                              {(isSpeaking || isDone) && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-100 text-emerald-700">
                                  {isSpeaking ? 'Speaking' : 'Approved'}
                                </span>
                              )}
                              {isSkipped && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-red-100 text-red-700">
                                  Rejected
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {isWaiting && (
                                  <>
                                    <Button
                                      size="sm"
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7 px-3 rounded-lg font-medium shadow-none"
                                      onClick={() => grantMic(entry.id)}
                                    >
                                      Approve
                                    </Button>
                                    <Button
                                      size="sm"
                                      className="bg-red-500 hover:bg-red-600 text-white text-xs h-7 px-3 rounded-lg font-medium shadow-none"
                                      onClick={() => skipSpeaker(entry.id)}
                                    >
                                      Reject
                                    </Button>
                                  </>
                                )}
                                {(isSpeaking || isDone) && (
                                  <Button
                                    size="sm"
                                    className="bg-red-500 hover:bg-red-600 text-white text-xs h-7 px-3 rounded-lg font-medium shadow-none"
                                    onClick={() => revokeMic(entry.id)}
                                  >
                                    Revoke
                                  </Button>
                                )}
                                {isSkipped && (
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs h-7 px-3 rounded-lg font-medium shadow-none"
                                    onClick={() => handleRestoreUser(entry.id)}
                                  >
                                    Restore
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                      {filteredRequests.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center py-12 text-slate-400">
                            No requests found for this filter.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* ========================================================= */}
          {/* VIEW 3: LIVE SESSION (Green & Red Controls)               */}
          {/* ========================================================= */}
          {activeView === 'session' && (
            <div className="space-y-6">
              {/* Speaker Stage Card */}
              <Card className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs">
                {currentSpeaker ? (
                  <>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-800 text-2xl font-bold flex items-center justify-center shrink-0">
                          {currentSpeaker.user_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h2 className="font-heading text-xl font-bold text-slate-900 leading-tight">
                            {currentSpeaker.user_name}
                          </h2>
                          <p className="text-xs text-slate-500 font-medium">
                            {currentSpeaker.user_email || '—'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          Speaking
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar & Countdown (Green) */}
                    <div className="mt-6 pt-4 border-t border-slate-100">
                      <div className="flex items-center justify-between text-xs font-mono font-semibold text-slate-700 mb-2">
                        <span>
                          {formatMMSS(elapsedSeconds)} / {formatMMSS(session.speaking_time_seconds || 30)}
                        </span>
                        <span className="text-slate-400">
                          Remaining: {Math.max(0, (session.speaking_time_seconds || 30) - elapsedSeconds)}s
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                        <div
                          className="bg-emerald-600 h-3 rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.round((elapsedSeconds / (session.speaking_time_seconds || 30)) * 100)
                            )}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Action Buttons (Red for End, Emerald for Extend) */}
                    <div className="mt-6 flex flex-wrap items-center gap-3">
                      <Button
                        className="bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs h-9 px-5 font-medium shadow-none"
                        onClick={() => revokeMic(currentSpeaker.id)}
                      >
                        ■ End Session
                      </Button>
                      <Button
                        className="bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs h-9 px-5 font-medium shadow-none"
                        onClick={() => skipSpeaker(currentSpeaker.id).then(() => setTimeout(grantNextSpeaker, 500))}
                      >
                        <VolumeX className="w-3.5 h-3.5 mr-1.5" /> Mute / Skip
                      </Button>
                      <Button
                        variant="outline"
                        className="border-emerald-300 hover:bg-emerald-50 text-emerald-700 rounded-xl text-xs h-9 px-5 font-medium shadow-none"
                        onClick={extendCurrentSpeakerTime}
                      >
                        <Clock className="w-3.5 h-3.5 mr-1.5" /> Extend (30s)
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="py-8 text-center space-y-3">
                    <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                      <Mic className="w-6 h-6 opacity-60" />
                    </div>
                    <div>
                      <h3 className="font-heading font-semibold text-slate-800 text-base">No Speaker on Center Stage</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Microphone is currently idle. Click below to grant the microphone to the next person in line.
                      </p>
                    </div>
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs h-9 px-5 font-medium shadow-xs"
                      onClick={grantNextSpeaker}
                      disabled={waitingCount === 0}
                    >
                      <PlayCircle className="w-4 h-4 mr-1.5" /> Grant Next Speaker ({waitingCount})
                    </Button>
                  </div>
                )}
              </Card>

              {/* Bottom 2 Cards Grid: Audio Level & Session Information */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Real-time Audio Level */}
                <div className="lg:col-span-7">
                  <Card className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs h-full">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                      <div>
                        <h3 className="font-heading text-sm font-bold text-slate-900">Audio Level (Real-time)</h3>
                        <p className="text-[11px] text-slate-500">Live WebRTC waveform & anti-feedback visualizer</p>
                      </div>
                      <span className="text-[11px] font-mono text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md">
                        {isReceiving ? '48kHz Streaming' : 'Awaiting Stream'}
                      </span>
                    </div>

                    <div className="space-y-4">
                      <AudioVisualizer analyserNode={analyserRef.current} isReceiving={isReceiving} />

                      {/* Timeline Scale Marks */}
                      <div className="flex justify-between text-[11px] font-mono text-slate-400 px-1 pt-1 border-t border-slate-100">
                        <span>0s</span>
                        <span>5s</span>
                        <span>10s</span>
                        <span>15s</span>
                        <span>20s</span>
                        <span>25s</span>
                        <span>30s</span>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Real Session Information Panel */}
                <div className="lg:col-span-5">
                  <Card className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs h-full">
                    <h3 className="font-heading text-sm font-bold text-slate-900 pb-3 border-b border-slate-100 mb-4">
                      Session Information
                    </h3>

                    <div className="space-y-3.5 text-xs">
                      <div className="flex justify-between py-1.5 border-b border-slate-100">
                        <span className="text-slate-500 font-medium">User ID</span>
                        <span className="font-mono font-semibold text-slate-800">
                          {currentSpeaker ? `#${currentSpeaker.id.slice(0, 8)}` : '—'}
                        </span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-100">
                        <span className="text-slate-500 font-medium">Name</span>
                        <span className="font-semibold text-slate-800">
                          {currentSpeaker ? currentSpeaker.user_name : 'No active speaker'}
                        </span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-100">
                        <span className="text-slate-500 font-medium">Email</span>
                        <span className="font-mono text-slate-800">
                          {currentSpeaker?.user_email || '—'}
                        </span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-100">
                        <span className="text-slate-500 font-medium">Request Time</span>
                        <span className="font-mono text-slate-800">
                          {currentSpeaker ? formatTimeOnly((currentSpeaker as any).requested_at || (currentSpeaker as any).created_at) : '—'}
                        </span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-100">
                        <span className="text-slate-500 font-medium">Session Start</span>
                        <span className="font-mono text-slate-800">
                          {session.speaker_started_at ? formatTimeOnly(session.speaker_started_at) : '—'}
                        </span>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <span className="text-slate-500 font-medium">Scheduled End</span>
                        <span className="font-mono text-slate-800">
                          {session.speaker_started_at
                            ? formatTimeOnly(
                                new Date(
                                  new Date(session.speaker_started_at).getTime() +
                                    (session.speaking_time_seconds || 30) * 1000
                                ).toISOString()
                              )
                            : '—'}
                        </span>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copySessionLink}
                        className="w-full text-xs rounded-xl h-9 border-slate-200 text-slate-700"
                      >
                        <Copy className="w-3.5 h-3.5 mr-1.5 text-emerald-600" /> Copy Audience Link
                      </Button>
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* VIEW 4: ANALYTICS (Green & Red Charts & Performance)      */}
          {/* ========================================================= */}
          {activeView === 'analytics' && (
            <div className="space-y-6">
              {/* Date Filter & Top Bar */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-heading text-base font-bold text-slate-900">Usage statistics and system performance</h2>
                  <p className="text-xs text-slate-500">Live audience metrics for session "{session.title}"</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Today ({todayDateString})</span>
                  </div>
                </div>
              </div>

              {/* 4 Real Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Users (Green) */}
                <Card className="bg-white border border-slate-200/90 rounded-2xl shadow-xs p-5">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                      <Users className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Users</p>
                      <div className="flex items-baseline gap-2">
                        <span className="font-heading text-2xl font-bold text-slate-900">
                          {analyticsData.totalSpeakers}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">Audience participants</p>
                    </div>
                  </div>
                </Card>

                {/* Total Requests (Deep Green) */}
                <Card className="bg-white border border-slate-200/90 rounded-2xl shadow-xs p-5">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-700/10 text-emerald-700 flex items-center justify-center shrink-0">
                      <BarChart3 className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Requests</p>
                      <div className="flex items-baseline gap-2">
                        <span className="font-heading text-2xl font-bold text-slate-900">
                          {allRequests.length}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">Queue requests</p>
                    </div>
                  </div>
                </Card>

                {/* Real Avg. Wait Time (Red) */}
                <Card className="bg-white border border-slate-200/90 rounded-2xl shadow-xs p-5">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-600 flex items-center justify-center shrink-0">
                      <Clock className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Avg. Wait Time</p>
                      <div className="flex items-baseline gap-2">
                        <span className="font-heading text-2xl font-bold text-slate-900">
                          {realAvgWaitTimeSeconds > 0 ? `${realAvgWaitTimeSeconds} s` : '0 s'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">Queue duration</p>
                    </div>
                  </div>
                </Card>

                {/* Peak Concurrent (Green) */}
                <Card className="bg-white border border-slate-200/90 rounded-2xl shadow-xs p-5">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                      <Radio className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Active In-Session</p>
                      <div className="flex items-baseline gap-2">
                        <span className="font-heading text-2xl font-bold text-slate-900">
                          {realConcurrentAudience}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">Queue + Speaker</p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* 4 Visual Charts & Cards Grid (Emerald Green & Red) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. Requests Over Time (Green Curve) */}
                <Card className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
                  <h3 className="font-heading text-sm font-bold text-slate-900 mb-4">Requests Over Time</h3>
                  <div className="h-60 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData.requestsOverTime} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                        />
                        <Line
                          type="monotone"
                          dataKey="requests"
                          stroke="#059669"
                          strokeWidth={2.5}
                          dot={{ r: 4, fill: '#059669', strokeWidth: 1, stroke: '#ffffff' }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {/* 2. User Join Trend (Emerald Green Bars) */}
                <Card className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
                  <h3 className="font-heading text-sm font-bold text-slate-900 mb-4">User Join Trend</h3>
                  <div className="h-60 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData.userJoinTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                        />
                        <Bar dataKey="users" fill="#059669" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {/* 3. Request Status Distribution (Green for Approved, Red for Rejected) */}
                <Card className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                  <h3 className="font-heading text-sm font-bold text-slate-900 mb-2">Request Status Distribution</h3>
                  <div className="flex flex-col sm:flex-row items-center justify-around gap-4 h-60">
                    <div className="w-48 h-48 relative flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={
                              allRequests.length > 0
                                ? chartData.statusDistribution
                                : [{ name: 'None', value: 1, color: '#e2e8f0' }]
                            }
                            innerRadius={50}
                            outerRadius={75}
                            paddingAngle={allRequests.length > 0 ? 4 : 0}
                            dataKey="value"
                          >
                            {(allRequests.length > 0
                              ? chartData.statusDistribution
                              : [{ name: 'None', value: 1, color: '#e2e8f0' }]
                            ).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute text-center">
                        <span className="font-heading text-2xl font-bold text-slate-900">
                          {allRequests.length}
                        </span>
                        <p className="text-[10px] text-slate-400 font-semibold uppercase">Total</p>
                      </div>
                    </div>

                    {/* Donut Legend */}
                    <div className="space-y-3 text-xs">
                      <div className="flex items-center gap-3">
                        <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                        <span className="text-slate-600">Approved:</span>
                        <span className="font-bold text-slate-900">
                          {approvedReqCount} ({approvedPct}%)
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="w-3 h-3 rounded-full bg-amber-500 shrink-0" />
                        <span className="text-slate-600">Waiting:</span>
                        <span className="font-bold text-slate-900">
                          {waitingReqCount} ({waitingPct}%)
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="w-3 h-3 rounded-full bg-red-500 shrink-0" />
                        <span className="text-slate-600">Rejected:</span>
                        <span className="font-bold text-slate-900">
                          {rejectedReqCount} ({rejectedPct}%)
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* 4. Real System Performance (Green & Red) */}
                <Card className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                  <h3 className="font-heading text-sm font-bold text-slate-900 mb-4">System Performance</h3>
                  <div className="grid grid-cols-2 gap-4 h-full">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-center">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <span className="text-xs text-slate-500 font-medium">Session Duration</span>
                      </div>
                      <p className="font-heading text-xl font-bold text-slate-900 mt-2">
                        {formatDuration(analyticsData.sessionDuration)}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-center">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                        <span className="text-xs text-slate-500 font-medium">Active Devices</span>
                      </div>
                      <p className="font-heading text-xl font-bold text-slate-900 mt-2">
                        {queue.length + (currentSpeaker ? 1 : 0) + 1}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-center">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${isReceiving ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        <span className="text-xs text-slate-500 font-medium">WebRTC Audio</span>
                      </div>
                      <p className="font-heading text-base font-bold text-slate-900 mt-2">
                        {isReceiving ? '< 45 ms (Live)' : 'Standby'}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-center">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                        <span className="text-xs text-slate-500 font-medium">Packet Stream</span>
                      </div>
                      <p className="font-heading text-base font-bold text-slate-900 mt-2">
                        {isReceiving ? '0.0% Loss' : 'Idle'}
                      </p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Recordings Section */}
              <div className="pt-2">
                <RecordingsList sessionId={session.id} />
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* VIEW 5: QUEUE (Audience Queue Manager)                     */}
          {/* ========================================================= */}
          {activeView === 'queue' && (
            <div className="space-y-4">
              <Card className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
                <CardHeader className="p-5 border-b border-slate-100 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="font-heading text-base font-bold text-slate-900">Audience Speaker Queue</CardTitle>
                    <p className="text-xs text-slate-500">
                      Manage upcoming speakers, grant microphone access, and promote moderators.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl text-xs h-9 px-4"
                    onClick={grantNextSpeaker}
                    disabled={waitingCount === 0}
                  >
                    <PlayCircle className="w-3.5 h-3.5 mr-1.5" /> Next Speaker ({waitingCount})
                  </Button>
                </CardHeader>
                <CardContent className="p-5">
                  <QueueList
                    queue={queue}
                    isAdmin
                    onSkip={(id) => skipSpeaker(id).then(() => setTimeout(grantNextSpeaker, 500))}
                    onRemove={removeFromQueue}
                    onPromoteModerator={promoteModerator}
                  />
                </CardContent>
              </Card>
            </div>
          )}

          {/* ========================================================= */}
          {/* VIEW 6: USERS (Audience Q&A & Live Polls)                  */}
          {/* ========================================================= */}
          {activeView === 'users' && (
            <div className="space-y-6">
              {/* Audience Questions */}
              <Card className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
                <CardHeader className="p-5 border-b border-slate-100">
                  <CardTitle className="font-heading text-base font-bold text-slate-900 flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-emerald-600" /> Audience Questions & Live Upvotes
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                  <AdminQuestionsList sessionId={sessionId!} />
                </CardContent>
              </Card>

              {/* Live Polls Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-5">
                  <AdminPollCreator sessionId={sessionId!} />
                </div>
                <div className="lg:col-span-7">
                  <AdminPollResults sessionId={sessionId!} />
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* VIEW 7: SETTINGS & SOUND STUDIO                           */}
          {/* ========================================================= */}
          {activeView === 'settings' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Equalizer & Audio Controls */}
                <div className="lg:col-span-7">
                  <AudioEqualizer
                    onEQChange={setEQ}
                    onVolumeChange={setAudioVolume}
                    onBalanceChange={setBalance}
                    enhancements={enhancements}
                    onEnhancementChange={updateEnhancement}
                    inputLevel={inputLevel}
                  />
                </div>

                {/* Session Settings & Limits */}
                <div className="lg:col-span-5 space-y-6">
                  <Card className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
                    <h3 className="font-heading text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
                      Session Configuration
                    </h3>

                    <div className="space-y-3 text-xs">
                      <div>
                        <label className="text-slate-500 font-medium block mb-1">Speaking Time Limit (Seconds)</label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={session.speaking_time_seconds || 30}
                            onChange={async (e) => {
                              const val = parseInt(e.target.value, 10);
                              if (val > 0) {
                                await supabase
                                  .from('sessions')
                                  .update({ speaking_time_seconds: val })
                                  .eq('id', sessionId);
                              }
                            }}
                            className="h-9 rounded-xl text-xs"
                          />
                          <span className="text-slate-500 font-medium">sec</span>
                        </div>
                      </div>

                      <div className="pt-2">
                        <label className="text-slate-500 font-medium block mb-1">Session Access Link</label>
                        <div className="flex items-center gap-2">
                          <Input
                            readOnly
                            value={`${window.location.origin}/session/${sessionId}`}
                            className="h-9 rounded-xl text-xs font-mono bg-slate-50"
                          />
                          <Button size="sm" variant="secondary" onClick={copySessionLink} className="h-9 rounded-xl text-xs">
                            <Copy className="w-3.5 h-3.5 text-emerald-600" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Anti-Feedback Tips */}
                  <Card className="border border-emerald-200 bg-emerald-50/50 p-4 rounded-2xl shadow-none">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-600/10 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div className="space-y-1 text-xs">
                        <p className="font-semibold text-slate-900">Anti-Echo & Acoustic Feedback Guard Active</p>
                        <p className="text-slate-600 leading-relaxed">
                          Your WebRTC stream is configured in strict mono 48kHz with active 80Hz sub-rumble cut and a 4.5kHz notch filter.
                          If room loudspeakers begin resonating into the microphone, click <strong>"Echo-Shield"</strong> preset in Sound Controls.
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}