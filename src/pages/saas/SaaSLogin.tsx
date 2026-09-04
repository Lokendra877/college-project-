import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SaaSLayout } from '@/components/saas/SaaSLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Mic2 } from 'lucide-react';

export default function SaaSLogin() {
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'login';
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>(initialMode);

  return (
    <SaaSLayout>
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md mx-auto"
          >
            <div className="text-center mb-8">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Mic2 className="w-7 h-7 text-primary" />
              </div>
              <h1 className="font-heading text-2xl font-bold">
                {mode === 'login' && 'Admin / Institution Login'}
                {mode === 'signup' && 'Create Your Account'}
                {mode === 'forgot' && 'Reset Password'}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {mode === 'login' && 'Sign in to manage your auditorium sessions.'}
                {mode === 'signup' && 'Start your free trial — no credit card required.'}
                {mode === 'forgot' && 'Enter your email to receive a reset link.'}
              </p>
            </div>

            <Card className="border-0 shadow-[var(--shadow-lg)]">
              <CardContent className="p-8">
                {mode === 'forgot' ? (
                  <form className="space-y-4" onSubmit={e => e.preventDefault()}>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input type="email" placeholder="you@institution.edu" />
                    </div>
                    <Button className="w-full bg-primary text-primary-foreground" size="lg">Send Reset Link</Button>
                    <p className="text-center text-sm text-muted-foreground">
                      Remember your password?{' '}
                      <button onClick={() => setMode('login')} className="text-primary font-medium hover:underline">Log in</button>
                    </p>
                  </form>
                ) : (
                  <form className="space-y-4" onSubmit={e => e.preventDefault()}>
                    {mode === 'signup' && (
                      <div className="space-y-2">
                        <Label>Institution Name</Label>
                        <Input placeholder="e.g., MIT, Google" />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input type="email" placeholder="you@institution.edu" />
                    </div>
                    <div className="space-y-2">
                      <Label>Password</Label>
                      <Input type="password" placeholder="••••••••" />
                    </div>
                    {mode === 'login' && (
                      <div className="text-right">
                        <button onClick={() => setMode('forgot')} className="text-xs text-primary hover:underline">Forgot password?</button>
                      </div>
                    )}
                    <Link to="/admin-login">
                      <Button className="w-full bg-primary text-primary-foreground" size="lg">
                        {mode === 'login' ? 'Sign In' : 'Create Account'}
                      </Button>
                    </Link>
                    <p className="text-center text-sm text-muted-foreground">
                      {mode === 'login' ? (
                        <>Don&apos;t have an account?{' '}<button onClick={() => setMode('signup')} className="text-primary font-medium hover:underline">Sign up</button></>
                      ) : (
                        <>Already have an account?{' '}<button onClick={() => setMode('login')} className="text-primary font-medium hover:underline">Log in</button></>
                      )}
                    </p>
                  </form>
                )}
              </CardContent>
            </Card>

            <p className="text-center text-xs text-muted-foreground mt-6">
              This is a UI preview. Use the{' '}
              <Link to="/admin-login" className="text-primary hover:underline">actual admin login</Link>{' '}
              to access your dashboard.
            </p>
          </motion.div>
        </div>
      </section>
    </SaaSLayout>
  );
}
