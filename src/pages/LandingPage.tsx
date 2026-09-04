import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, Users, QrCode, Timer, Shield, Zap } from 'lucide-react';
import smartmicLogo from '@/assets/smartmic-logo.png';
import { toast } from 'sonner';

export default function LandingPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [speakingTime, setSpeakingTime] = useState(30);
  const [creating, setCreating] = useState(false);
  const [joinCode, setJoinCode] = useState('');

  const createSession = async () => {
    if (!title.trim()) {
      toast.error('Please enter a session title');
      return;
    }
    setCreating(true);
    const { data, error } = await supabase
      .from('sessions')
      .insert({ title: title.trim(), speaking_time_seconds: speakingTime })
      .select()
      .single();

    if (error || !data) {
      toast.error('Failed to create session');
      setCreating(false);
      return;
    }

    toast.success('Session created!');
    navigate(`/admin/${data.id}?code=${data.admin_code}`);
  };

  const joinSession = () => {
    if (!joinCode.trim()) {
      toast.error('Please enter a session ID');
      return;
    }
    navigate(`/session/${joinCode.trim()}`);
  };

  const features = [
    { icon: QrCode, title: 'QR Code Access', desc: 'Scan to join instantly', color: 'primary' },
    { icon: Users, title: 'Smart Queue', desc: 'Fair, automated ordering', color: 'secondary' },
    { icon: Timer, title: 'Timed Speaking', desc: 'Configurable time limits', color: 'accent' },
    { icon: Shield, title: 'Admin Controls', desc: 'Full session management', color: 'vibrant-orange' },
    { icon: Zap, title: 'Real-time Updates', desc: 'Live queue status for all', color: 'vibrant-blue' },
    { icon: Mic, title: 'Mic Management', desc: 'One speaker at a time', color: 'vibrant-pink' },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 gradient-hero" />
      {/* Colorful blobs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 blob-shape blur-[120px]" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-secondary/5 blob-shape-2 blur-[100px]" />

      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Top nav */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-1">
            <img src={smartmicLogo} alt="SmartMic" className="h-28 w-auto" />
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/admin-login')} className="font-medium">
            <Shield className="w-4 h-4 mr-1" /> Admin Login
          </Button>
        </div>

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto pt-8 pb-16"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-5 py-2 mb-6 border border-primary/20">
            <Mic className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-primary">Smart Auditorium</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-heading font-extrabold leading-tight mb-4">
            <span className="text-gradient">Digital Mic</span> for
            <br />Modern Auditoriums
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Eliminate physical microphone passing. Let your audience request speaking
            access digitally with automatic queue management.
          </p>
        </motion.div>

        {/* Action Cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto mb-20">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <Card className="card-hover h-full border shadow-md">
              <CardHeader>
                <CardTitle className="font-heading text-xl flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-colored">
                    <Zap className="w-5 h-5 text-primary-foreground" />
                  </div>
                  Create Session
                </CardTitle>
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
                <Button className="w-full gradient-primary text-primary-foreground font-heading font-semibold shadow-colored hover:opacity-90 transition-opacity" onClick={createSession} disabled={creating}>
                  {creating ? 'Creating...' : 'Create Session'}
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
            <Card className="card-hover h-full border shadow-md">
              <CardHeader>
                <CardTitle className="font-heading text-xl flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl gradient-accent flex items-center justify-center">
                    <Users className="w-5 h-5 text-accent-foreground" />
                  </div>
                  Join Session
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="Paste session ID"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Or scan the QR code displayed by the session admin.
                </p>
                <Button variant="outline" className="w-full font-heading font-semibold border-2" onClick={joinSession}>
                  Join Session
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Features Grid */}
        <div className="max-w-4xl mx-auto pb-16">
          <h2 className="font-heading text-3xl font-bold text-center mb-8">How It Works</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.08 }}
                className="card-hover flex flex-col items-center text-center p-5 rounded-xl bg-card border border-border shadow-sm"
              >
                <div className={`w-12 h-12 rounded-xl bg-${f.color}/10 flex items-center justify-center mb-3`}>
                  <f.icon className={`w-6 h-6 text-${f.color}`} />
                </div>
                <h3 className="font-heading font-bold text-sm mb-1">{f.title}</h3>
                <p className="text-xs text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}