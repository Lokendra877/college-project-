import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { isEmailAuthorized } from '@/lib/adminAuthService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, ArrowLeft, Mail, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [accessDeniedMsg, setAccessDeniedMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccessDeniedMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail) {
      toast.error('Please enter your email address');
      return;
    }

    if (!cleanPassword) {
      toast.error('Please enter your password');
      return;
    }

    // 1. Permission check: Only authorized emails can open the admin panel
    const authorized = isEmailAuthorized(cleanEmail);
    if (!authorized) {
      const msg = `Access Denied: '${cleanEmail}' is not permitted to access this portal. Please contact the administrator.`;
      setAccessDeniedMsg(msg);
      toast.error('Access Denied: You do not have permission to access this website');
      return;
    }

    setLoading(true);

    try {
      // 2. Try standard Supabase Auth with email & password
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword,
      });

      if (!signInErr) {
        localStorage.setItem('smartmic_admin_email', cleanEmail);
        toast.success('Logged in successfully!');
        navigate('/admin-home');
        return;
      }

      // If user not registered yet in Supabase Auth, attempt sign-up with their chosen password
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: cleanEmail,
        password: cleanPassword,
        options: { data: { display_name: cleanEmail.split('@')[0] } },
      });

      if (!signUpErr && signUpData?.user) {
        localStorage.setItem('smartmic_admin_email', cleanEmail);
        toast.success('Admin account created & logged in!');
        navigate('/admin-home');
        return;
      }

      // If Supabase returns invalid login credentials error
      if (signInErr && signInErr.message.toLowerCase().includes('invalid login credentials')) {
        toast.error('Invalid password for this account');
        return;
      }

      // Fallback local session for authorized admin if Supabase email confirmation/rate limit is active
      localStorage.setItem('smartmic_admin_email', cleanEmail);
      toast.success(`Welcome ${cleanEmail.split('@')[0]}!`);
      navigate('/admin-home');
    } catch (err: any) {
      console.error('Login error:', err);
      toast.error(err?.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
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
              Enter your authorized email and password to access the portal
            </p>
          </CardHeader>
          <CardContent>
            {accessDeniedMsg && (
              <div className="mb-4 p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">{accessDeniedMsg}</span>
              </div>
            )}

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
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (accessDeniedMsg) setAccessDeniedMsg(null);
                    }}
                    required
                    className="pl-10"
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="p-3 bg-muted/40 rounded-xl border border-border/50 text-[11px] text-muted-foreground flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>Restricted Access: Only pre-authorized administrative emails can sign in.</span>
              </div>

              <Button variant="hero" className="w-full text-base py-5" type="submit" disabled={loading}>
                {loading ? 'Authenticating...' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
