import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  MicOff,
  Languages,
  Volume2,
  VolumeX,
  History,
  Copy,
  Check,
  Trash2,
  Play,
  Sliders,
  AlertCircle,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from '@/components/ui/sheet';
import { LanguageSelector } from '@/components/LanguageSelector';
import type { TranscriptItem } from '@/hooks/useTranslation';
import { toast } from 'sonner';

interface VoiceTranslatorHubProps {
  // Speaker controls
  isTranscribing: boolean;
  currentSpokenText: string;
  speechError: string | null;
  onToggleTranscription: () => void;
  sourceLanguage: string;
  onSourceLanguageChange: (lang: string) => void;

  // Listener / Receiver controls
  subtitle: string;
  translatedSubtitle: string;
  detectedSourceLang?: string;
  speakerName?: string;
  isTranslating: boolean;
  targetLanguage: string | null;
  onTargetLanguageChange: (lang: string | null) => void;

  // TTS Voice Output
  ttsEnabled: boolean;
  onToggleTts: () => void;
  ttsVolume: number;
  onVolumeChange: (vol: number) => void;
  ttsRate: number;
  onRateChange: (rate: number) => void;
  onTestAudio?: (lang: string) => void;

  // History
  history: TranscriptItem[];
  onClearHistory: () => void;

  // Optional role context (e.g. 'admin' or 'user')
  role?: 'admin' | 'user';
}

export function VoiceTranslatorHub({
  isTranscribing,
  currentSpokenText,
  speechError,
  onToggleTranscription,
  sourceLanguage,
  onSourceLanguageChange,
  subtitle,
  translatedSubtitle,
  detectedSourceLang,
  speakerName,
  isTranslating,
  targetLanguage,
  onTargetLanguageChange,
  ttsEnabled,
  onToggleTts,
  ttsVolume,
  onVolumeChange,
  ttsRate,
  onRateChange,
  onTestAudio,
  history,
  onClearHistory,
  role = 'user',
}: VoiceTranslatorHubProps) {
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const copyTranscript = () => {
    if (history.length === 0) {
      toast.error('No transcript history to copy');
      return;
    }
    const textToCopy = history
      .map(
        (item) =>
          `[${new Date(item.timestamp).toLocaleTimeString()}] ${item.speakerName || 'Speaker'} (${item.sourceLang}): ${item.original}\n` +
          (item.translated ? `Translation (${item.targetLang}): ${item.translated}\n` : '')
      )
      .reverse()
      .join('\n');

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    toast.success('Transcript copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="border-2 border-primary/20 shadow-[var(--shadow-md)] overflow-hidden bg-card">
      <CardHeader className="p-4 pb-3 bg-gradient-to-r from-primary/10 via-primary/5 to-background border-b border-border/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-sm">
              <Languages className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="font-heading text-base flex items-center gap-2">
                Live Voice Translator
                <span className="text-[10px] bg-primary/20 text-primary font-semibold px-2 py-0.5 rounded-full uppercase">
                  Real-time AI
                </span>
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Speak in one language (e.g. Hindi) and hear/read in another (e.g. English)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Test Audio Button */}
            {onTestAudio && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onTestAudio(targetLanguage || 'English')}
                className="h-8 text-xs font-medium border-primary/30 hover:bg-primary/10 text-primary"
                title="Click to test your device speakers"
              >
                <Play className="w-3 h-3 mr-1" /> Test Audio
              </Button>
            )}

            {/* History Drawer */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs font-medium">
                  <History className="w-3.5 h-3.5 mr-1" />
                  History ({history.length})
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-6">
                <SheetHeader className="pb-3 border-b">
                  <div className="flex items-center justify-between">
                    <SheetTitle className="text-base font-heading flex items-center gap-2">
                      <History className="w-4 h-4 text-primary" /> Translated Session Log
                    </SheetTitle>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={copyTranscript} className="h-8 px-2 text-xs">
                        {copied ? <Check className="w-3.5 h-3.5 mr-1 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                        {copied ? 'Copied' : 'Copy'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClearHistory}
                        className="h-8 px-2 text-xs text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  <SheetDescription className="text-xs">
                    Complete record of spoken lines and their translations.
                  </SheetDescription>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto space-y-3 py-4 pr-1">
                  {history.length === 0 ? (
                    <div className="text-center py-20 text-muted-foreground text-xs">
                      No translation history yet. Start speaking or listening to record transcripts here.
                    </div>
                  ) : (
                    history.map((item) => (
                      <div key={item.id} className="p-3 rounded-xl bg-muted/20 border border-border/50 space-y-1 text-xs">
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span className="font-semibold text-foreground">
                            {item.speakerName || 'Speaker'} ({item.sourceLang} → {item.targetLang})
                          </span>
                          <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                        </div>
                        {item.translated && (
                          <p className="text-primary font-medium text-sm leading-relaxed">{item.translated}</p>
                        )}
                        <p className="text-muted-foreground italic">"{item.original}"</p>
                      </div>
                    ))
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* TOP ROW: Language Pairing (Source -> Target) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center bg-muted/20 p-3 rounded-xl border border-border/50">
          <div>
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
              <Mic className="w-3.5 h-3.5 text-blue-500" /> Speaker Speaks In:
            </span>
            <LanguageSelector
              selectedLanguage={sourceLanguage}
              onSelect={(lang) => onSourceLanguageChange(lang || 'Hindi')}
              labelPrefix="Speaking in"
            />
          </div>

          <div>
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
              <Languages className="w-3.5 h-3.5 text-purple-500" /> Translate & Hear In:
            </span>
            <LanguageSelector
              selectedLanguage={targetLanguage}
              onSelect={onTargetLanguageChange}
              labelPrefix="Translate into"
            />
          </div>
        </div>

        {/* SPEAK BUTTON & LIVE RECORDING BAR */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/60">
          <Button
            onClick={onToggleTranscription}
            className={`h-11 px-5 font-semibold text-sm transition-all shadow-md flex items-center justify-center gap-2 ${
              isTranscribing
                ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                : 'bg-primary hover:bg-primary/90 text-primary-foreground'
            }`}
          >
            {isTranscribing ? (
              <>
                <MicOff className="w-4 h-4" /> Stop Speaking
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" /> Speak in {sourceLanguage}
              </>
            )}
          </Button>

          <div className="flex-1 flex items-center justify-between text-xs px-2">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isTranscribing ? 'bg-emerald-500 animate-ping' : 'bg-muted-foreground/40'
                  }`}
                />
                <span className="font-medium text-foreground">
                  {isTranscribing ? `Mic Active: Speak in ${sourceLanguage}...` : 'Mic is idle. Tap button to speak.'}
                </span>
              </div>
              {currentSpokenText && (
                <p className="text-muted-foreground italic truncate max-w-xs sm:max-w-md">
                  Hearing: "{currentSpokenText}"
                </p>
              )}
            </div>

            {/* Audio Voice Output Controls */}
            <div className="flex items-center gap-1">
              <Button
                variant={ttsEnabled ? 'default' : 'outline'}
                size="sm"
                onClick={onToggleTts}
                className="h-8 text-xs font-medium gap-1"
                title={ttsEnabled ? 'Voice output is enabled' : 'Voice output is muted'}
              >
                {ttsEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                <span>{ttsEnabled ? 'Voice ON' : 'Voice OFF'}</span>
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSettings(!showSettings)}
                className="h-8 w-8 text-muted-foreground"
                title="Voice speed & volume settings"
              >
                <Sliders className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {speechError && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{speechError}</span>
          </div>
        )}

        {/* Expandable Voice Settings */}
        {showSettings && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="p-3.5 bg-muted/20 rounded-xl border border-border/50 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs"
          >
            <div>
              <span className="font-semibold block mb-1.5">Voice Audio Speed: {ttsRate}x</span>
              <div className="flex gap-1.5">
                {[0.8, 1.0, 1.25].map((rate) => (
                  <Button
                    key={rate}
                    variant={ttsRate === rate ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onRateChange(rate)}
                    className="flex-1 h-7 text-xs"
                  >
                    {rate === 0.8 ? 'Slow' : rate === 1.0 ? 'Normal' : 'Fast'}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-semibold">Voice Audio Volume</span>
                <span className="text-muted-foreground font-mono">{Math.round(ttsVolume * 100)}%</span>
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
          </motion.div>
        )}

        {/* LIVE TRANSLATION DISPLAY BOX */}
        <div className="rounded-xl bg-card border border-border/80 p-4 space-y-2 min-h-[100px] flex flex-col justify-center shadow-inner">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground border-b border-border/40 pb-1.5">
            <span className="flex items-center gap-1 font-medium">
              <Sparkles className="w-3 h-3 text-primary" /> Live Translated Output:
            </span>
            {isTranslating && (
              <span className="text-primary font-semibold animate-pulse">Translating...</span>
            )}
          </div>

          {translatedSubtitle ? (
            <div className="space-y-1.5">
              <p className="text-lg md:text-xl font-heading font-bold text-foreground leading-snug">
                {translatedSubtitle}
              </p>
              {subtitle && (
                <p className="text-xs text-muted-foreground italic flex items-center gap-1">
                  <span>Spoken ({detectedSourceLang || sourceLanguage}):</span>
                  <span>"{subtitle}"</span>
                </p>
              )}
            </div>
          ) : subtitle ? (
            <div className="space-y-1">
              <p className="text-base font-medium text-foreground">{subtitle}</p>
              <p className="text-xs text-muted-foreground">Original speech (No translation language selected)</p>
            </div>
          ) : (
            <div className="py-4 text-center text-xs text-muted-foreground space-y-1">
              <p>Ready to translate!</p>
              <p className="text-[11px] text-muted-foreground/70">
                Click <strong>"Speak in {sourceLanguage}"</strong> above or speak into your microphone.
                Translations will appear and speak out loud in <strong>{targetLanguage || 'English'}</strong>.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
