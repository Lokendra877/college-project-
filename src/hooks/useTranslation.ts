import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { translateText, getLanguageInfo, SUPPORTED_LANGUAGES, LANGUAGE_NAMES } from '@/lib/translationService';

export interface TranscriptItem {
  id: string;
  original: string;
  translated: string;
  timestamp: number;
}

interface TranscriptChunk {
  text: string;
  isFinal: boolean;
  sourceLang?: string;
  timestamp: number;
}

export function useSpeechTranscription(
  sessionId: string | undefined,
  isSpeaking: boolean,
  sourceLanguage: string = 'English'
) {
  const recognitionRef = useRef<any>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const sourceLangRef = useRef(sourceLanguage);

  useEffect(() => {
    sourceLangRef.current = sourceLanguage;
  }, [sourceLanguage]);

  const broadcast = useCallback((text: string, isFinal: boolean) => {
    if (!channelRef.current) return;
    channelRef.current.send({
      type: 'broadcast',
      event: 'transcript',
      payload: {
        text,
        isFinal,
        sourceLang: sourceLangRef.current,
        timestamp: Date.now(),
      },
    });
  }, []);

  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase.channel(`transcript-${sessionId}`, {
      config: { broadcast: { self: false } },
    });
    channel.subscribe();
    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [sessionId]);

  useEffect(() => {
    if (!isSpeaking || !sessionId) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
        recognitionRef.current = null;
        setIsTranscribing(false);
      }
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Speech Recognition not supported in this browser');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = getLanguageInfo(sourceLanguage).speechCode;

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;
        broadcast(text, result.isFinal);
      }
    };

    recognition.onend = () => {
      // Auto-restart if still speaking
      if (isSpeaking && recognitionRef.current) {
        try { recognition.start(); } catch {}
      }
    };

    recognition.onerror = (e: any) => {
      if (e.error !== 'no-speech' && e.error !== 'aborted') {
        console.warn('Speech recognition error:', e.error);
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
      setIsTranscribing(true);
    } catch (err) {
      console.warn('Failed to start speech recognition:', err);
    }

    return () => {
      try { recognition.stop(); } catch {}
      recognitionRef.current = null;
      setIsTranscribing(false);
    };
  }, [isSpeaking, sessionId, sourceLanguage, broadcast]);

  return { isTranscribing };
}

export function useTranscriptListener(
  sessionId: string | undefined,
  targetLanguage: string | null,
  ttsEnabled: boolean = true,
  ttsRate: number = 1.0,
  ttsVolume: number = 1.0
) {
  const [subtitle, setSubtitle] = useState('');
  const [translatedSubtitle, setTranslatedSubtitle] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [history, setHistory] = useState<TranscriptItem[]>([]);

  const translateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTranslatedRef = useRef('');
  const ttsEnabledRef = useRef(ttsEnabled);
  const ttsRateRef = useRef(ttsRate);
  const ttsVolumeRef = useRef(ttsVolume);

  useEffect(() => { ttsEnabledRef.current = ttsEnabled; }, [ttsEnabled]);
  useEffect(() => { ttsRateRef.current = ttsRate; }, [ttsRate]);
  useEffect(() => { ttsVolumeRef.current = ttsVolume; }, [ttsVolume]);

  const speakVoice = useCallback((textToSpeak: string, language: string) => {
    if (!('speechSynthesis' in window) || !textToSpeak.trim()) return;

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      const targetInfo = getLanguageInfo(language);
      utterance.lang = targetInfo.speechCode;
      utterance.rate = ttsRateRef.current;
      utterance.volume = ttsVolumeRef.current;

      // Select matching voice if available
      const voices = window.speechSynthesis.getVoices();
      const matchingVoice = voices.find(v => v.lang.startsWith(targetInfo.code));
      if (matchingVoice) {
        utterance.voice = matchingVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Speech synthesis error:', err);
    }
  }, []);

  const handleTranslateAndProcess = useCallback(async (
    text: string,
    sourceLang: string = 'auto',
    isFinal: boolean = false
  ) => {
    if (!text.trim()) return;

    if (!targetLanguage) {
      setTranslatedSubtitle('');
      if (isFinal) {
        setHistory(prev => [
          { id: `${Date.now()}-${Math.random()}`, original: text, translated: '', timestamp: Date.now() },
          ...prev.slice(0, 49)
        ]);
      }
      return;
    }

    setIsTranslating(true);
    try {
      const translated = await translateText(text, targetLanguage, sourceLang);
      setTranslatedSubtitle(translated);

      if (isFinal && translated) {
        setHistory(prev => [
          { id: `${Date.now()}-${Math.random()}`, original: text, translated, timestamp: Date.now() },
          ...prev.slice(0, 49)
        ]);

        if (ttsEnabledRef.current) {
          speakVoice(translated, targetLanguage);
        }
      }
    } catch (err) {
      console.warn('Live translation error:', err);
    } finally {
      setIsTranslating(false);
    }
  }, [targetLanguage, speakVoice]);

  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase.channel(`transcript-${sessionId}`, {
      config: { broadcast: { self: false } },
    });

    channel.on('broadcast', { event: 'transcript' }, ({ payload }: { payload: TranscriptChunk }) => {
      setSubtitle(payload.text);

      if (payload.text.trim()) {
        if (payload.isFinal) {
          if (translateTimeoutRef.current) clearTimeout(translateTimeoutRef.current);
          handleTranslateAndProcess(payload.text, payload.sourceLang || 'auto', true);
        } else {
          // Debounce interim translations
          if (translateTimeoutRef.current) clearTimeout(translateTimeoutRef.current);
          translateTimeoutRef.current = setTimeout(() => {
            handleTranslateAndProcess(payload.text, payload.sourceLang || 'auto', false);
          }, 350);
        }
      }
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (translateTimeoutRef.current) clearTimeout(translateTimeoutRef.current);
    };
  }, [sessionId, handleTranslateAndProcess]);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return {
    subtitle,
    translatedSubtitle,
    isTranslating,
    history,
    clearHistory,
    speakVoice,
  };
}

export { SUPPORTED_LANGUAGES, LANGUAGE_NAMES };
