import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TranscriptChunk {
  text: string;
  isFinal: boolean;
  timestamp: number;
}

export function useSpeechTranscription(sessionId: string | undefined, isSpeaking: boolean) {
  const recognitionRef = useRef<any>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const broadcast = useCallback((text: string, isFinal: boolean) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'transcript',
      payload: { text, isFinal, timestamp: Date.now() },
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
        recognitionRef.current.stop();
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
      recognition.stop();
      recognitionRef.current = null;
      setIsTranscribing(false);
    };
  }, [isSpeaking, sessionId, broadcast]);

  return { isTranscribing };
}

export function useTranscriptListener(
  sessionId: string | undefined,
  targetLanguage: string | null,
  ttsEnabled: boolean = true
) {
  const [subtitle, setSubtitle] = useState('');
  const [translatedSubtitle, setTranslatedSubtitle] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const translateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTranslatedRef = useRef('');
  const ttsEnabledRef = useRef(ttsEnabled);
  useEffect(() => { ttsEnabledRef.current = ttsEnabled; }, [ttsEnabled]);

  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase.channel(`transcript-${sessionId}`, {
      config: { broadcast: { self: false } },
    });

    channel.on('broadcast', { event: 'transcript' }, ({ payload }: { payload: TranscriptChunk }) => {
      setSubtitle(payload.text);

      if (targetLanguage && payload.isFinal && payload.text.trim()) {
        // Debounce translation calls
        if (translateTimeoutRef.current) clearTimeout(translateTimeoutRef.current);
        translateTimeoutRef.current = setTimeout(() => {
          translateText(payload.text, targetLanguage);
        }, 300);
      }
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (translateTimeoutRef.current) clearTimeout(translateTimeoutRef.current);
    };
  }, [sessionId, targetLanguage]);

  const translateText = async (text: string, lang: string) => {
    if (text === lastTranslatedRef.current) return;
    lastTranslatedRef.current = text;
    setIsTranslating(true);

    try {
      const { data, error } = await supabase.functions.invoke('translate', {
        body: { text, targetLanguage: lang },
      });

      if (error) throw error;
      const translated = data?.translatedText || text;
      setTranslatedSubtitle(translated);

      // Text-to-speech
      if (ttsEnabledRef.current && 'speechSynthesis' in window && translated) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(translated);
        utterance.lang = getLanguageCode(lang);
        utterance.rate = 1.0;
        window.speechSynthesis.speak(utterance);
      }
    } catch (err) {
      console.error('Translation error:', err);
    } finally {
      setIsTranslating(false);
    }
  };

  return { subtitle, translatedSubtitle, isTranslating };
}

function getLanguageCode(language: string): string {
  const map: Record<string, string> = {
    english: 'en-US',
    hindi: 'hi-IN',
    spanish: 'es-ES',
    french: 'fr-FR',
    german: 'de-DE',
    chinese: 'zh-CN',
    japanese: 'ja-JP',
    korean: 'ko-KR',
    arabic: 'ar-SA',
    portuguese: 'pt-BR',
    russian: 'ru-RU',
    italian: 'it-IT',
    turkish: 'tr-TR',
    dutch: 'nl-NL',
    bengali: 'bn-IN',
    tamil: 'ta-IN',
    telugu: 'te-IN',
    marathi: 'mr-IN',
    gujarati: 'gu-IN',
    kannada: 'kn-IN',
    malayalam: 'ml-IN',
    punjabi: 'pa-IN',
    urdu: 'ur-PK',
  };
  return map[language.toLowerCase()] || 'en-US';
}

export const SUPPORTED_LANGUAGES = [
  'English', 'Hindi', 'Spanish', 'French', 'German', 'Chinese',
  'Japanese', 'Korean', 'Arabic', 'Portuguese', 'Russian', 'Italian',
  'Turkish', 'Dutch', 'Bengali', 'Tamil', 'Telugu', 'Marathi',
  'Gujarati', 'Kannada', 'Malayalam', 'Punjabi', 'Urdu',
];
