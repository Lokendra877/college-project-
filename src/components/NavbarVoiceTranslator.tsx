import { useState } from 'react';
import { Languages, Mic, Volume2, Sparkles, X, ChevronUp, ChevronDown } from 'lucide-react';
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

  const hasActiveText = Boolean(props.translatedSubtitle || props.subtitle);

  return (
    <>
      {/* Navbar Trigger Button */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={`h-9 px-3 gap-2 border transition-all text-xs font-medium rounded-xl shadow-sm ${
              props.isTranscribing
                ? 'border-red-500 bg-red-500/10 text-red-500 hover:bg-red-500/20'
                : hasActiveText
                ? 'border-primary/60 bg-primary/10 text-primary hover:bg-primary/20'
                : 'hover:bg-muted/60 text-foreground'
            }`}
            title="Open Live Voice Translator"
          >
            <div className="relative flex items-center justify-center">
              <Languages className="w-4 h-4 text-primary" />
              {props.isTranscribing && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 animate-ping" />
              )}
            </div>

            <span className="hidden sm:inline font-semibold">
              {props.sourceLanguage} → {props.targetLanguage || 'English'}
            </span>
            <span className="sm:hidden font-semibold">Translator</span>

            {props.ttsEnabled && (
              <Volume2 className="w-3.5 h-3.5 text-primary opacity-80" />
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

      {/* Slim Floating Real-time Subtitle Banner on Main Screen */}
      <AnimatePresence>
        {hasActiveText && showFloatingBanner && (
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

              {/* Original Spoken Line */}
              {props.subtitle && (
                <p className="text-[11px] text-muted-foreground italic leading-tight">
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
