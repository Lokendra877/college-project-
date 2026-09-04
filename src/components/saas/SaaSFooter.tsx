import { Link } from 'react-router-dom';
import smartmicLogo from '@/assets/smartmic-logo.png';

export function SaaSFooter() {
  return (
    <footer className="border-t border-border bg-muted/20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-1">
              <img src={smartmicLogo} alt="SmartMic" className="h-28 w-auto" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Smart, contactless microphone system for modern auditoriums.
            </p>
          </div>

          <div>
            <h4 className="font-heading font-bold text-sm mb-3">Product</h4>
            <div className="space-y-2 text-sm">
              <Link to="/features" className="block text-muted-foreground hover:text-foreground transition-colors">Features</Link>
              <Link to="/pricing" className="block text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
              <Link to="/use-cases" className="block text-muted-foreground hover:text-foreground transition-colors">Use Cases</Link>
              <Link to="/architecture" className="block text-muted-foreground hover:text-foreground transition-colors">Architecture</Link>
            </div>
          </div>

          <div>
            <h4 className="font-heading font-bold text-sm mb-3">Company</h4>
            <div className="space-y-2 text-sm">
              <Link to="/contact" className="block text-muted-foreground hover:text-foreground transition-colors">Contact</Link>
              <Link to="/saas-login" className="block text-muted-foreground hover:text-foreground transition-colors">Login</Link>
              <Link to="/app" className="block text-muted-foreground hover:text-foreground transition-colors">Launch App</Link>
            </div>
          </div>

          <div>
            <h4 className="font-heading font-bold text-sm mb-3">Admin</h4>
            <div className="space-y-2 text-sm">
              <Link to="/admin-login" className="block text-muted-foreground hover:text-foreground transition-colors">Admin Login</Link>
              <Link to="/admin-demo" className="block text-muted-foreground hover:text-foreground transition-colors">Demo Dashboard</Link>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} SmartMic. All rights reserved.</p>
          <p className="text-xs text-muted-foreground">
            Founder: <span className="font-medium text-foreground">Lokendra Dubey</span>
          </p>
        </div>
      </div>
    </footer>
  );
}