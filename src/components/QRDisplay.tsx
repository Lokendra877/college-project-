import { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  buildDynamicSessionUrl,
  getSecondsRemaining,
  ROTATING_INTERVAL_SECONDS,
} from '@/lib/dynamicQrService';
import { ShieldCheck, RotateCw, Copy, Check, Maximize2, X } from 'lucide-react';
import { toast } from 'sonner';

interface QRDisplayProps {
  sessionId: string;
  size?: number;
  dynamic?: boolean;
  showDetails?: boolean;
  onUrlChange?: (url: string) => void;
}

export function QRDisplay({
  sessionId,
  size = 200,
  dynamic = true,
  showDetails = true,
  onUrlChange,
}: QRDisplayProps) {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(() =>
    dynamic ? getSecondsRemaining() : ROTATING_INTERVAL_SECONDS
  );
  const [activeUrl, setActiveUrl] = useState<string>(() => {
    if (dynamic) {
      return buildDynamicSessionUrl(sessionId).url;
    }
    return `${typeof window !== 'undefined' ? window.location.origin : ''}/session/${sessionId}`;
  });
  const [activeToken, setActiveToken] = useState<string>(() => {
    return dynamic ? buildDynamicSessionUrl(sessionId).token : '';
  });
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Refresh dynamic token and URL
  const refreshQr = useCallback(() => {
    if (!dynamic) return;
    const { url, token, secondsRemaining: remaining } = buildDynamicSessionUrl(sessionId);
    setActiveUrl(url);
    setActiveToken(token);
    setSecondsRemaining(remaining);
    if (onUrlChange) onUrlChange(url);
  }, [sessionId, dynamic, onUrlChange]);

  // Timer loop for 30s rotation
  useEffect(() => {
    if (!dynamic) {
      const staticUrl = `${window.location.origin}/session/${sessionId}`;
      setActiveUrl(staticUrl);
      if (onUrlChange) onUrlChange(staticUrl);
      return;
    }

    // Initial setup
    refreshQr();

    const interval = setInterval(() => {
      const remaining = getSecondsRemaining();
      setSecondsRemaining(remaining);

      // When bucket rolls over (remaining hits top or resets)
      if (remaining === ROTATING_INTERVAL_SECONDS) {
        refreshQr();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionId, dynamic, refreshQr, onUrlChange]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(activeUrl);
    setCopied(true);
    toast.success(
      dynamic
        ? 'Live 30s dynamic invite link copied to clipboard!'
        : 'Session invite link copied to clipboard!'
    );
    setTimeout(() => setCopied(false), 2000);
  };

  const progressPercent = ((ROTATING_INTERVAL_SECONDS - secondsRemaining) / ROTATING_INTERVAL_SECONDS) * 100;

  return (
    <>
      <Card className="gradient-card border-0 shadow-[var(--shadow-lg)] relative overflow-hidden">
        {/* Dynamic Security Header Bar */}
        {dynamic && showDetails && (
          <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-4 py-2 flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-400">
            <div className="flex items-center gap-1.5 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>30s Dynamic Anti-Proxy QR</span>
            </div>
            <div className="flex items-center gap-1 font-mono text-[11px] bg-emerald-500/20 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{secondsRemaining}s left</span>
            </div>
          </div>
        )}

        <CardContent className="flex flex-col items-center gap-3 p-4 sm:p-6">
          {/* QR Code Container */}
          <div className="relative group rounded-2xl bg-white p-4 shadow-[var(--shadow-md)] border border-slate-200/80 transition-transform hover:scale-[1.01]">
            <QRCodeSVG
              value={activeUrl}
              size={size}
              bgColor="#ffffff"
              fgColor="#0f172a"
              level="H"
              includeMargin={false}
            />

            {/* Projector / Expand button */}
            <button
              onClick={() => setIsFullscreen(true)}
              title="Auditorium Fullscreen Projector"
              className="absolute top-2 right-2 bg-slate-900/80 text-white hover:bg-slate-900 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 30s Countdown Progress Bar */}
          {dynamic && (
            <div className="w-full max-w-[220px] space-y-1">
              <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full transition-all duration-1000 ease-linear rounded-full"
                  style={{ width: `${100 - progressPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground px-0.5 font-mono">
                <span>Code: {activeToken}</span>
                <span>Refreshes in {secondsRemaining}s</span>
              </div>
            </div>
          )}

          {/* Details & Actions */}
          {showDetails && (
            <div className="flex flex-col items-center gap-2 w-full max-w-xs text-center">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {dynamic
                  ? 'Screenshots & forwarded links expire in 30s. Audience must scan directly from this screen.'
                  : 'Audience can scan with any phone camera to join the session.'}
              </p>

              <div className="flex items-center gap-2 mt-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyLink}
                  className="h-7 text-xs rounded-lg gap-1 border-slate-200"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy Live Link'}</span>
                </Button>

                {dynamic && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={refreshQr}
                    title="Force Refresh QR Now"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                  >
                    <RotateCw className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Auditorium Big Screen / Projector Fullscreen Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-white backdrop-blur-md">
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute top-6 right-6 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="flex flex-col items-center max-w-xl text-center space-y-6">
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-sm font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Auditorium Live QR — 30s Dynamic Security</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Scan with Phone to Join</h2>
            <p className="text-slate-400 text-sm max-w-md">
              Point your smartphone camera at this screen. QR changes every 30 seconds to prevent outside unauthorized access.
            </p>

            <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-2xl border-4 border-emerald-500/30">
              <QRCodeSVG
                value={activeUrl}
                size={Math.min(320, typeof window !== 'undefined' ? window.innerWidth - 80 : 320)}
                bgColor="#ffffff"
                fgColor="#0f172a"
                level="H"
              />
            </div>

            {/* Countdown indicator */}
            <div className="flex items-center gap-3 text-emerald-400 font-mono text-base">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>QR rotating in: <strong>{secondsRemaining}s</strong></span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400 text-xs">Token: {activeToken}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
