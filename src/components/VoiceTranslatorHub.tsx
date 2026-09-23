import { useState, useEffect } from 'react';
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
  ArrowRight,
  Power,
  Key,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { LanguageSelector } from '@/components/LanguageSelector';
import type { TranscriptItem } from '@/hooks/useTranslation';
import { getCustomTranslateApiKey, setCustomTranslateApiKey } from '@/lib/translationService';
import { toast } from 'sonner';

interface VoiceTranslatorHubProps {
  // Master ON / OFF
  translatorEnabled?: boolean;
  onToggleTranslator?: () => void;

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
  translatorEnabled = true,
  onToggleTranslator,
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
  const [showApiModal, setShowApiModal] = useState(false);
  const [customApiKey, setCustomApiKey] = useState('');

  useEffect(() => {
    setCustomApiKey(getCustomTranslateApiKey() || '');
  }, [showApiModal]);

  const handleSaveApiKey = () => {
    setCustomTranslateApiKey(customApiKey.trim() || null);
    toast.success(customApiKey.trim() ? 'Custom Translation API Key saved' : 'Switched to free Google Chrome-Ex engine');
    setShowApiModal(false);
  };

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
    <Card className="border-2 border-primary/20 shadow-md overflow-hidden bg-card">
      <CardHeader className="p-4 pb-3 bg-gradient-to-r from-primary/10 via-primary/5 to-background border-b border-border/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-sm">
              <Languages className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="font-heading text-base flex items-center gap-2">
                Live Voice Translator
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${
                  translatorEnabled ? 'bg-emerald-500/20 text-emerald-600' : 'bg-muted text-muted-foreground'
                }`}>
                  {translatorEnabled ? '● ACTIVE' : '○ OFF'}
                </span>
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Speak in one language (e.g. Hindi) and hear/read in another (e.g. English) in real-time
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
        {/* ========================================================= */}
        {/* 1. MASTER ON / OFF TOGGLE SWITCH BANNER                   */}
        {/* ========================================================= */}
        <div className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
          translatorEnabled
            ? 'bg-emerald-500/10 border-emerald-500/30'
            : 'bg-muted/40 border-border/60'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold transition-all ${
              translatorEnabled ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' : 'bg-muted text-muted-foreground'
            }`}>
              <Power className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading text-sm font-bold text-foreground">
                  Voice Translator Master: {translatorEnabled ? 'ON' : 'OFF'}
                </span>
                {translatorEnabled && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {translatorEnabled
                  ? 'Real-time speech-to-speech translation is active.'
                  : 'Turn ON to translate spoken voice into other languages instantly.'}
              </p>
            </div>
          </div>

          {onToggleTranslator && (
            <div className="flex items-center gap-2">
              <Switch
                checked={translatorEnabled}
                onCheckedChange={onToggleTranslator}
                className="data-[state=checked]:bg-emerald-500"
              />
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* 2. LANGUAGE PAIRING (Source -> Target)                    */}
        {/* ========================================================= */}
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 items-center p-3 rounded-xl border border-border/50 transition-opacity ${
          translatorEnabled ? 'bg-muted/20 opacity-100' : 'bg-muted/10 opacity-60 pointer-events-none'
        }`}>
          <div>
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
              <Mic className="w-3.5 h-3.5 text-blue-500" /> Speaker Speaks In:
            </span>
            <LanguageSelector
              selectedLanguage={sourceLanguage}
              onSelectLanguage={onSourceLanguageChange}
              label=""
            />
          </div>

          <div>
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
              <Volume2 className="w-3.5 h-3.5 text-emerald-500" /> Translate & Hear In:
            </span>
            <LanguageSelector
              selectedLanguage={targetLanguage || 'English'}
              onSelectLanguage={(lang) => onTargetLanguageChange(lang)}
              label=""
            />
          </div>
        </div>

        {/* ========================================================= */}
        {/* 3. SPEAKER / LISTENER CONTROLS                            */}
        {/* ========================================================= */}
        <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 transition-opacity ${
          translatorEnabled ? 'opacity-100' : 'opacity-60 pointer-events-none'
        }`}>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Mic / Speak Toggle */}
            <Button
              size="sm"
              variant={isTranscribing ? 'destructive' : 'default'}
              onClick={onToggleTranscription}
              className="gap-2 h-9 text-xs rounded-xl font-medium shadow-sm flex-1 sm:flex-initial"
            >
              {isTranscribing ? (
                <>
                  <MicOff className="w-3.5 h-3.5 animate-pulse" /> Stop Speaking
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5" /> Speak in {sourceLanguage}
                </>
              )}
            </Button>

            {/* TTS Audio Mute Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleTts}
              className={`h-9 px-3 gap-1.5 text-xs rounded-xl ${
                ttsEnabled ? 'border-primary/40 bg-primary/5 text-primary' : 'text-muted-foreground'
              }`}
              title={ttsEnabled ? 'Spoken audio output is active' : 'Audio output is muted'}
            >
              {ttsEnabled ? <Volume2 className="w-3.5 h-3.5 text-primary" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span>{ttsEnabled ? 'Voice Output ON' : 'Voice Output Muted'}</span>
            </Button>
          </div>

          {/* Quick Settings & API Key */}
          <div className="flex items-center gap-1 w-full sm:w-auto justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowApiModal((prev) => !prev)}
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
              title="Configure custom translation API Key (Optional)"
            >
              <Key className="w-3.5 h-3.5 mr-1" /> API Key
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <Sliders className="w-3.5 h-3.5 mr-1" /> Speech Speed
            </Button>
          </div>
        </div>

        {/* Custom API Key Drawer / Modal */}
        {showApiModal && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="p-3.5 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-200/80 dark:border-blue-800/40 space-y-2 text-xs"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-blue-600" /> Translation Engine Configuration
              </span>
              <span className="text-[11px] text-blue-600 font-medium">Free & Fast by default</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              By default, Smart Auditorium uses the ultra-fast <strong>Google Chrome-Ex Engine</strong> (sub-200ms, free).
              If you have your own <strong>Google Cloud Translation API Key</strong>, you can paste it below:
            </p>
            <div className="flex items-center gap-2">
              <Input
                type="password"
                placeholder="AIzaSy... (Leave empty to use free engine)"
                value={customApiKey}
                onChange={(e) => setCustomApiKey(e.target.value)}
                className="h-8 text-xs bg-background"
              />
              <Button size="sm" onClick={handleSaveApiKey} className="h-8 text-xs rounded-lg px-3">
                Save
              </Button>
            </div>
          </motion.div>
        )}

        {/* Error Alert */}
        {speechError && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
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
              <Sparkles className="w-3 h-3 text-primary" /> Instant Translated Output:
            </span>
            {isTranslating && (
              <span className="text-primary font-semibold animate-pulse">Translating...</span>
            )}
          </div>

          {!translatorEnabled ? (
            <div className="py-4 text-center text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">Voice Translator is currently OFF</p>
              <p className="text-[11px] text-muted-foreground/70">
                Click the switch above to enable real-time speech translation.
              </p>
            </div>
          ) : translatedSubtitle ? (
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
              <p className="text-xs text-muted-foreground">Original speech</p>
            </div>
          ) : (
            <div className="py-4 text-center text-xs text-muted-foreground space-y-1">
              <p className="font-semibold">Ready for instant real-time translation!</p>
              <p className="text-[11px] text-muted-foreground/70">
                Speak into the microphone in <strong>{sourceLanguage}</strong>.
                Translations will appear and speak out loud in <strong>{targetLanguage || 'English'}</strong> immediately.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
