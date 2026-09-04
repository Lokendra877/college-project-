import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { QRDisplay } from '@/components/QRDisplay';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Loader2, Plus, LogOut, Mic, ExternalLink, Trash2, Power, History } from 'lucide-react';
import { toast } from 'sonner';
import { AdminNotifications } from '@/components/AdminNotifications';

interface Session {
  id: string;
  title: string;
  admin_code: string;
  is_active: boolean;
  created_at: string;
  speaking_time_seconds: number;
}

export default function AdminHome() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [speakingTime, setSpeakingTime] = useState(30);
  const [showCreate, setShowCreate] = useState(false);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [filter, setFilter] = useState<'active' | 'ended'>('active');
  const [endConfirm, setEndConfirm] = useState<string | null>(null);
  const [ending, setEnding] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const localEmail = localStorage.getItem('smartmic_admin_email');
      
      if (session) {
        setUser({ id: session.user.id, email: session.user.email });
        fetchSessions(session.user.id);
      } else if (localEmail) {
        setUser({ id: 'local-admin', email: localEmail });
        fetchSessions('local-admin');
      } else {
        navigate('/admin-login');
      }
    };
    checkAuth();
  }, [navigate]);

  const fetchSessions = async (userId: string) => {
    let query = supabase.from('sessions').select('*').order('created_at', { ascending: false });
    if (userId !== 'local-admin') {
      query = query.eq('user_id', userId);
    }
    const { data, error } = await query;
    if (!error && data) setSessions(data);
    setLoading(false);
  };

  const createSession = async () => {
    if (!title.trim() || !user) {
      toast.error('Please enter a session title');
      return;
    }
    setCreating(true);
    const insertPayload: any = {
      title: title.trim(),
      speaking_time_seconds: speakingTime,
    };
    if (user.id !== 'local-admin') {
      insertPayload.user_id = user.id;
    }
    const { data, error } = await supabase
      .from('sessions')
      .insert(insertPayload)
      .select()
      .single();

    if (error || !data) {
      toast.error('Failed to create session');
      setCreating(false);
      return;
    }

    setSessions(prev => [data, ...prev]);
    setTitle('');
    setShowCreate(false);
    setCreating(false);
    toast.success('Session created!');
  };

  const deleteSession = async (sessionId: string) => {
    setDeleting(true);
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('id', sessionId);

    if (error) {
      toast.error('Failed to delete session');
      setDeleting(false);
      return;
    }

    setSessions(prev => prev.filter(s => s.id !== sessionId));
    setDeleteConfirm(null);
    setDeleting(false);
    toast.success('Session deleted');
  };

  const endSession = async (sessionId: string) => {
    setEnding(true);
    const { error } = await supabase
      .from('sessions')
      .update({ is_active: false, current_speaker_id: null })
      .eq('id', sessionId);

    if (error) {
      toast.error('Failed to end session');
      setEnding(false);
      return;
    }

    await supabase
      .from('speaker_queue')
      .update({ status: 'done', finished_speaking_at: new Date().toISOString() })
      .eq('session_id', sessionId)
      .in('status', ['waiting', 'speaking']);

    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, is_active: false } : s));
    setEndConfirm(null);
    setEnding(false);
    toast.success('Session ended and removed from active list');
  };

  const activeSessions = sessions.filter(s => s.is_active);
  const endedSessions = sessions.filter(s => !s.is_active);
  const displayedSessions = filter === 'active' ? activeSessions : endedSessions;

  const handleLogout = async () => {
    localStorage.removeItem('smartmic_admin_email');
    await supabase.auth.signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="font-heading text-2xl font-bold">My Sessions</h1>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <AdminNotifications />
            <Button variant="hero" size="sm" onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-1" /> New Session
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>

        {/* Create Session Form */}
        {showCreate && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <Card className="gradient-card border-0 shadow-[var(--shadow-lg)] max-w-lg">
              <CardHeader>
                <CardTitle className="font-heading text-lg">Create New Session</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="Session title (e.g., CS101 Lecture)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <div className="flex items-center gap-3">
                  <label className="text-sm text-muted-foreground whitespace-nowrap">Speaking time:</label>
                  <Input
                    type="number"
                    min={10}
                    max={300}
                    value={speakingTime}
                    onChange={(e) => setSpeakingTime(Number(e.target.value))}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">sec</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="hero" onClick={createSession} disabled={creating}>
                    {creating ? 'Creating...' : 'Create'}
                  </Button>
                  <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 mb-6">
          <Button
            variant={filter === 'active' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('active')}
            className="text-xs rounded-lg"
          >
            Active Sessions ({activeSessions.length})
          </Button>
          <Button
            variant={filter === 'ended' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('ended')}
            className="text-xs rounded-lg text-muted-foreground"
          >
            Past / Ended ({endedSessions.length})
          </Button>
        </div>

        {/* Sessions List */}
        {displayedSessions.length === 0 ? (
          <div className="text-center py-20 bg-muted/10 rounded-2xl border border-dashed border-border/50">
            <Mic className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="font-heading text-xl font-semibold mb-2">
              {filter === 'active' ? 'No active sessions' : 'No ended sessions'}
            </h2>
            <p className="text-muted-foreground mb-4">
              {filter === 'active'
                ? 'There are no live sessions running right now. Click below to create one.'
                : 'Ended sessions will appear here for reference.'}
            </p>
            {filter === 'active' && (
              <Button variant="hero" onClick={() => setShowCreate(true)}>
                <Plus className="w-4 h-4 mr-1" /> Create Session
              </Button>
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedSessions.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="gradient-card border-0 shadow-[var(--shadow-md)] overflow-hidden">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-heading font-semibold text-lg">{s.title}</h3>
                        <p className="text-xs text-muted-foreground">
                          {new Date(s.created_at).toLocaleDateString()} · {s.speaking_time_seconds}s per speaker
                        </p>
                      </div>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          s.is_active
                            ? 'bg-success/15 text-success'
                            : 'bg-muted/30 text-muted-foreground'
                        }`}
                      >
                        {s.is_active ? 'Active' : 'Ended'}
                      </span>
                    </div>

                    {/* QR Code - only show active QR code for live sessions */}
                    {s.is_active ? (
                      <div className="flex justify-center">
                        <QRDisplay sessionId={s.id} size={140} />
                      </div>
                    ) : (
                      <div className="h-32 flex items-center justify-center bg-muted/20 rounded-xl border border-dashed text-xs text-muted-foreground">
                        Session Closed
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      {s.is_active ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-xs"
                            onClick={() => navigate(`/admin/${s.id}?code=${s.admin_code}`)}
                          >
                            <ExternalLink className="w-3.5 h-3.5 mr-1" />
                            Open
                          </Button>
                          <AlertDialog open={endConfirm === s.id} onOpenChange={(open) => setEndConfirm(open ? s.id : null)}>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-warning hover:text-warning text-xs"
                                title="End Session"
                              >
                                <Power className="w-3.5 h-3.5 mr-1" />
                                End
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>End session?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Ending "{s.title}" will disconnect all speakers and audience members. It will be removed from your active list.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => endSession(s.id)}
                                  disabled={ending}
                                  className="bg-warning text-warning-foreground hover:bg-warning/90"
                                >
                                  {ending ? 'Ending...' : 'End Session'}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      ) : null}

                      <AlertDialog open={deleteConfirm === s.id} onOpenChange={(open) => setDeleteConfirm(open ? s.id : null)}>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            title="Delete permanently"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete session?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete "{s.title}" and all associated data. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteSession(s.id)}
                              disabled={deleting}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {deleting ? 'Deleting...' : 'Delete'}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
