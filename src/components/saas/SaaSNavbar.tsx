import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import smartmicLogo from '@/assets/smartmic-logo.png';

const navLinks = [
  { label: 'Home', path: '/' },
  { label: 'Features', path: '/features' },
  { label: 'Pricing', path: '/pricing' },
  { label: 'Use Cases', path: '/use-cases' },
  { label: 'Architecture', path: '/architecture' },
  { label: 'Contact', path: '/contact' },
];

export function SaaSNavbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
      <div className="container mx-auto px-4 h-20 md:h-28 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-1 group">
          <img src={smartmicLogo} alt="SmartMic" className="h-28 w-auto group-hover:scale-105 transition-transform" />
        </Link>

        {/* Desktop Nav */}
        <div className="hidden lg:flex items-center gap-1">
          {navLinks.map(link => (
            <Link
              key={link.path}
              to={link.path}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                location.pathname === link.path
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden lg:flex items-center gap-3">
          <Link to="/admin-login">
            <Button variant="ghost" size="sm" className="font-medium">Log In</Button>
          </Link>
          <Link to="/admin-login">
            <Button size="sm" className="gradient-primary text-primary-foreground font-medium rounded-lg shadow-colored hover:opacity-90 transition-opacity">
              Start Free Trial
            </Button>
          </Link>
        </div>

        {/* Mobile Toggle */}
        <button className="lg:hidden p-2" onClick={() => setOpen(!open)}>
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden border-t border-border bg-background"
          >
            <div className="container mx-auto px-4 py-4 space-y-1">
              {navLinks.map(link => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setOpen(false)}
                  className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === link.path
                      ? 'text-primary bg-primary/10'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-3 flex flex-col gap-2">
                <Link to="/admin-login" onClick={() => setOpen(false)}>
                  <Button variant="outline" className="w-full font-medium">Log In</Button>
                </Link>
                <Link to="/admin-login" onClick={() => setOpen(false)}>
                  <Button className="w-full gradient-primary text-primary-foreground font-medium shadow-colored">Start Free Trial</Button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
