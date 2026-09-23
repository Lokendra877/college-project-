import { useState } from 'react';
import { Languages, Volume2, VolumeX, Sparkles, X, Power } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { VoiceTranslatorHub } from '@/components/VoiceTranslatorHub';
import type { TranscriptItem } from '@/hooks/useTranslation';
import { motion, AnimatePresence } from 'framer-motion';

interface NavbarVoiceTranslatorProps {
  translatorEnabled?: boolean;
  onToggleTranslator?: () => void;

  isTranscribing: boolean;
  currentSpokenText: string;
  speechError: string | null;
  onToggleTranscription: () => void;
  sourceLanguage: string;
  onSourceLanguageChange: (lang: string) => void;

  subtitle: string;
  translatedSubtitle: string;
  detectedSourceLang?: string;
  speakerName?: string;
  isTranslating: boolean;
  targetLanguage: string | null;
  onTargetLanguageChange: (lang: string | null) => void;

  ttsEnabled: boolean;
  onToggleTts: () => void;
  ttsVolume: number;
  onVolumeChange: (vol: number) => void;
  ttsRate: number;
  onRateChange: (rate: number) => void;
  onTestAudio?: (lang: string) => void;

  history: TranscriptItem[];
  onClearHistory: () => void;
  role?: 'admin' | 'user';
}

export function NavbarVoiceTranslator(props: NavbarVoiceTranslatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showFloatingBanner, setShowFloatingBanner] = useState(true);

  const isEnabled = props.translatorEnabled ?? true;
  const hasActiveText = Boolean(props.translatedSubtitle || props.subtitle);

  return (
    <>
      <div className="flex items-center gap-1">
        {/* Quick ON / OFF Pill Button */}
        {props.onToggleTranslator && (
          <Button
            variant="outline"
            size="sm"
            onClick={props.onToggleTranslator}
            className={`h-8 px-2.5 rounded-lg text-xs font-semibold gap-1.5 transition-all shadow-none ${
              isEnabled
                ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-800'
                : 'border-slate-200 bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800'
            }`}
            title={isEnabled ? 'Click to turn Voice Translator OFF' : 'Click to turn Voice Translator ON'}
          >
            <span className={`w-2 h-2 rounded-full ${isEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
            <span>Translator {isEnabled ? 'ON' : 'OFF'}</span>
          </Button>
        )}

        {/* Navbar Trigger Button to Open Panel */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={`h-8 px-3 gap-1.5 border transition-all text-xs font-medium rounded-lg shadow-none ${
                props.isTranscribing
                  ? 'border-red-500 bg-red-50 text-red-600 hover:bg-red-100'
                  : isEnabled && hasActiveText
                  ? 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100'
                  : 'hover:bg-slate-50 text-slate-700 border-slate-200'
              }`}
              title="Open Live Voice Translator settings and logs"
            >
              <Languages className={`w-3.5 h-3.5 ${isEnabled ? 'text-blue-600' : 'text-slate-400'}`} />
              <span className="hidden md:inline font-semibold">
                {props.sourceLanguage} → {props.targetLanguage || 'English'}
              </span>
              <span className="md:hidden font-semibold">Voice AI</span>
              {isEnabled && props.ttsEnabled && (
                <Volume2 className="w-3 h-3 text-emerald-600 opacity-80" />
              )}
            </Button>
          </SheetTrigger>

          {/* Slide-over Full Drawer */}
          <SheetContent side="right" className="w-full sm:max-w-xl p-0 overflow-y-auto bg-background">
            <div className="p-4 sm:p-6 space-y-4">
              <SheetHeader className="pb-2">
                <SheetTitle className="text-lg font-heading flex items-center gap-2">
                  <Languages className="w-5 h-5 text-primary" /> Live Voice Translation Panel
                </SheetTitle>
              </SheetHeader>

              <VoiceTranslatorHub {...props} />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Slim Floating Real-time Subtitle Banner on Main Screen */}
      <AnimatePresence>
        {isEnabled && hasActiveText && showFloatingBanner && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 pointer-events-auto"
          >
            <div className="rounded-2xl bg-card/95 backdrop-blur-md border border-primary/30 p-3.5 shadow-2xl space-y-1.5 text-xs text-foreground">
              <div className="flex items-center justify-between border-b border-border/40 pb-1 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-semibold text-primary">
                    {props.speakerName || 'Speaker'} ({props.detectedSourceLang || props.sourceLanguage} → {props.targetLanguage || 'English'})
                  </span>
                  {props.isTranslating && (
                    <span className="text-[10px] text-primary animate-pulse">Translating...</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setIsOpen(true)}
                    className="hover:text-primary transition-colors text-[10px] underline"
                  >
                    Open Hub
                  </button>
                  <button
                    onClick={() => setShowFloatingBanner(false)}
                    className="p-1 hover:text-foreground text-muted-foreground rounded"
                    title="Hide banner"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Translated Text */}
              {props.translatedSubtitle && (
                <p className="font-heading font-bold text-sm text-foreground leading-snug">
                  {props.translatedSubtitle}
                </p>
              )}

              {/* Original Spoken Text */}
              {props.subtitle && (
                <p className="text-muted-foreground italic text-[11px]">
                  "{props.subtitle}"
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
