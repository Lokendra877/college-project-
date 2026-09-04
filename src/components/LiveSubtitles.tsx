import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Languages,
  Loader2,
  Volume2,
  VolumeX,
  History,
  Copy,
  Check,
  Trash2,
  Gauge,
  Sliders,
  Type,
  Maximize2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from '@/components/ui/sheet';
import type { TranscriptItem } from '@/hooks/useTranslation';
import { toast } from 'sonner';

interface LiveSubtitlesProps {
  originalText: string;
  translatedText: string;
  isTranslating: boolean;
  targetLanguage: string | null;
  ttsEnabled?: boolean;
  onToggleTts?: () => void;
  ttsVolume?: number;
  onVolumeChange?: (vol: number) => void;
  ttsRate?: number;
  onRateChange?: (rate: number) => void;
  history?: TranscriptItem[];
  onClearHistory?: () => void;
}

export function LiveSubtitles({
  originalText,
  translatedText,
  isTranslating,
  targetLanguage,
  ttsEnabled = true,
  onToggleTts,
  ttsVolume = 1.0,
  onVolumeChange,
  ttsRate = 1.0,
  onRateChange,
  history = [],
  onClearHistory,
}: LiveSubtitlesProps) {
  const [copied, setCopied] = useState(false);
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xl'>('normal');
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);

  const copyTranscript = () => {
    if (history.length === 0) {
      toast.error('No transcript history to copy');
      return;
    }
    const textToCopy = history
      .map(
        (item) =>
          `[${new Date(item.timestamp).toLocaleTimeString()}]\nOriginal: ${item.original}${
            item.translated ? `\nTranslation: ${item.translated}` : ''
          }`
      )
      .reverse()
      .join('\n\n');

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    toast.success('Transcript copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const getFontSizeClass = () => {
    switch (fontSize) {
      case 'large':
        return 'text-lg leading-relaxed';
      case 'xl':
        return 'text-2xl leading-relaxed font-semibold';
      default:
        return 'text-base leading-normal';
    }
  };

  return (
    <div className="rounded-2xl bg-card border border-border shadow-[var(--shadow-md)] overflow-hidden transition-all">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30 border-b border-border/50 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <Languages className="w-3.5 h-3.5 text-primary" />
          <span className="font-medium text-foreground">
            {targetLanguage ? (
              <>
                Live Audio Translation <span className="text-primary font-semibold">→ {targetLanguage}</span>
              </>
            ) : (
              'Live Subtitles'
            )}
          </span>
          {isTranslating && (
            <div className="flex items-center gap-1 text-[11px] text-primary">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Translating...</span>
            </div>
          )}
        </div>

        {/* Controls: TTS, Audio Settings, Font Size, History */}
        <div className="flex items-center gap-1.5">
          {/* TTS Voice Toggle */}
          {onToggleTts && (
            <button
              onClick={onToggleTts}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                ttsEnabled
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/60 hover:bg-muted text-muted-foreground'
              }`}
              title={ttsEnabled ? 'AI Voice Active (Click to mute)' : 'AI Voice Off (Click to unmute)'}
            >
              {ttsEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span>{ttsEnabled ? 'Voice ON' : 'Voice OFF'}</span>
            </button>
          )}

          {/* Voice Settings Toggle */}
          {ttsEnabled && onRateChange && (
            <button
              onClick={() => setShowVoiceSettings(!showVoiceSettings)}
              className={`p-1.5 rounded-lg transition-colors ${
                showVoiceSettings ? 'bg-primary/20 text-primary' : 'hover:bg-muted/60 text-muted-foreground'
              }`}
              title="Voice speed and volume controls"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Font Size Toggle */}
          <button
            onClick={() => {
              setFontSize((curr) => (curr === 'normal' ? 'large' : curr === 'large' ? 'xl' : 'normal'));
            }}
            className="p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground transition-colors"
            title="Toggle subtitle text size"
          >
            <Type className="w-3.5 h-3.5" />
          </button>

          {/* Transcript History Drawer */}
          <Sheet>
            <SheetTrigger asChild>
              <button
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-muted/60 hover:bg-muted text-muted-foreground text-xs font-medium transition-colors"
                title="View full transcript history"
              >
                <History className="w-3.5 h-3.5" />
                <span>History ({history.length})</span>
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-6">
              <SheetHeader className="pb-4 border-b">
                <div className="flex items-center justify-between">
                  <SheetTitle className="text-lg font-heading flex items-center gap-2">
                    <History className="w-5 h-5 text-primary" /> Session Transcript Log
                  </SheetTitle>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={copyTranscript} className="h-8 px-2 text-xs">
                      {copied ? <Check className="w-3.5 h-3.5 mr-1 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                      {copied ? 'Copied' : 'Copy All'}
                    </Button>
                    {onClearHistory && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClearHistory}
                        className="h-8 px-2 text-xs text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
                <SheetDescription className="text-xs">
                  Review all translated statements from this session.
                </SheetDescription>
              </SheetHeader>

              {/* Scrollable History List */}
              <div className="flex-1 overflow-y-auto space-y-3 py-4 pr-1">
                {history.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground text-sm">
                    No transcript entries recorded yet. As speakers talk, their words and translations will appear here.
                  </div>
                ) : (
                  history.map((item) => (
                    <div key={item.id} className="p-3 rounded-xl bg-muted/20 border border-border/40 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                        {item.translated && <span className="text-primary font-semibold">Translated</span>}
                      </div>
                      {item.translated && (
                        <p className="text-foreground font-medium text-sm leading-relaxed">{item.translated}</p>
                      )}
                      <p className={`italic ${item.translated ? 'text-muted-foreground' : 'text-foreground'}`}>
                        "{item.original}"
                      </p>
                    </div>
                  ))
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Expandable Voice Settings Drawer (Speed & Volume) */}
      {showVoiceSettings && ttsEnabled && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="p-3 bg-muted/10 border-b border-border/40 space-y-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Speed Rate */}
            {onRateChange && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1 font-medium">
                    <Gauge className="w-3.5 h-3.5 text-primary" /> Voice Speed: {ttsRate}x
                  </span>
                </div>
                <div className="flex gap-1.5">
                  {[0.8, 1.0, 1.25].map((rate) => (
                    <button
                      key={rate}
                      onClick={() => onRateChange(rate)}
                      className={`flex-1 py-1 rounded-md text-xs font-medium border transition-colors ${
                        ttsRate === rate
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card border-border hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      {rate === 0.8 ? 'Slow (0.8x)' : rate === 1.0 ? 'Normal (1x)' : 'Fast (1.2x)'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Volume Slider */}
            {onVolumeChange && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1 font-medium">
                    <Volume2 className="w-3.5 h-3.5 text-primary" /> Voice Volume: {Math.round(ttsVolume * 100)}%
                  </span>
                </div>
                <Slider
                  min={0}
                  max={100}
                  step={5}
                  value={[Math.round(ttsVolume * 100)]}
                  onValueChange={(val) => onVolumeChange(val[0] / 100)}
                  className="py-1"
                />
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Main Subtitle Box */}
      <div className="p-4 space-y-2.5">
        <AnimatePresence mode="wait">
          {translatedText && targetLanguage ? (
            <motion.div
              key="translated"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="space-y-1"
            >
              <p className={`font-medium text-foreground ${getFontSizeClass()}`}>
                {translatedText}
              </p>
              {originalText && (
                <p className="text-xs text-muted-foreground italic leading-normal">
                  "{originalText}"
                </p>
              )}
            </motion.div>
          ) : originalText ? (
            <motion.div
              key="original"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
            >
              <p className={`font-medium text-foreground ${getFontSizeClass()}`}>
                {originalText}
              </p>
            </motion.div>
          ) : (
            <div className="py-2 text-center text-xs text-muted-foreground">
              Waiting for speaker audio... Subtitles and voice translation will appear here in real time.
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
