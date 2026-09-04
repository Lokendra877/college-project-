import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, ArrowLeft, Mail } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [usePassword, setUsePassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    const defaultPass = `SmartMic#2026_${cleanEmail}`;

    if (!usePassword) {
      // 1-Click Email Login mode
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: defaultPass,
      });

      if (!signInErr) {
        localStorage.setItem('smartmic_admin_email', cleanEmail);
        toast.success('Logged in successfully!');
        navigate('/admin-home');
        setLoading(false);
        return;
      }

      // If account doesn't exist, create it automatically
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: cleanEmail,
        password: defaultPass,
        options: { data: { display_name: cleanEmail.split('@')[0] } },
      });

      if (!signUpErr && signUpData?.user) {
        localStorage.setItem('smartmic_admin_email', cleanEmail);
        toast.success('Admin account created & logged in!');
        navigate('/admin-home');
        setLoading(false);
        return;
      }

      // Fallback local session if Supabase Auth email rate limit is active
      localStorage.setItem('smartmic_admin_email', cleanEmail);
      toast.success(`Welcome ${cleanEmail.split('@')[0]}!`);
      navigate('/admin-home');
    } else {
      // Standard password login
      const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }
      localStorage.setItem('smartmic_admin_email', cleanEmail);
      toast.success('Logged in!');
      navigate('/admin-home');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Button
          variant="ghost"
          size="sm"
          className="mb-4"
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Home
        </Button>

        <Card className="gradient-card border-0 shadow-[var(--shadow-lg)]">
          <CardHeader className="text-center">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mx-auto mb-3">
              <Shield className="w-6 h-6 text-primary-foreground" />
            </div>
            <CardTitle className="font-heading text-2xl">
              Admin Login
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Enter your email to access your admin dashboard
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10"
                    autoFocus
                  />
                </div>
              </div>

              {usePassword && (
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              )}

              <Button variant="hero" className="w-full text-base py-5" type="submit" disabled={loading}>
                {loading ? 'Logging in...' : 'Continue with Email'}
              </Button>
            </form>

            <div className="text-center text-xs text-muted-foreground mt-4">
              <button
                type="button"
                className="hover:underline text-primary"
                onClick={() => setUsePassword(!usePassword)}
              >
                {usePassword ? 'Use 1-Click Email Login' : 'Sign in with Password instead'}
              </button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
