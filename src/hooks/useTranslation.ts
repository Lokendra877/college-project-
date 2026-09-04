import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { translateText, getLanguageInfo, SUPPORTED_LANGUAGES, LANGUAGE_NAMES } from '@/lib/translationService';

export interface TranscriptItem {
  id: string;
  original: string;
  translated: string;
  sourceLang: string;
  targetLang: string;
  speakerName?: string;
  timestamp: number;
}

interface TranscriptChunk {
  text: string;
  isFinal: boolean;
  sourceLang?: string;
  speakerName?: string;
  timestamp: number;
}

export function useSpeechTranscription(
  sessionId: string | undefined,
  isSpeaking: boolean,
  sourceLanguage: string = 'Hindi',
  speakerName: string = 'User'
) {
  const recognitionRef = useRef<any>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const channelSubscribedRef = useRef(false);
  const pendingBroadcastsRef = useRef<any[]>([]);

  const [isTranscribing, setIsTranscribing] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const [speechError, setSpeechError] = useState<string | null>(null);
  const sourceLangRef = useRef(sourceLanguage);
  const speakerNameRef = useRef(speakerName);

  useEffect(() => {
    sourceLangRef.current = sourceLanguage;
  }, [sourceLanguage]);

  useEffect(() => {
    speakerNameRef.current = speakerName;
  }, [speakerName]);

  // Connect to Supabase Broadcast channel
  useEffect(() => {
    if (!sessionId) return;

    channelSubscribedRef.current = false;
    const channel = supabase.channel(`transcript-${sessionId}`, {
      config: { broadcast: { self: true } },
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channelSubscribedRef.current = true;
        // Flush any pending broadcasts
        while (pendingBroadcastsRef.current.length > 0) {
          const payload = pendingBroadcastsRef.current.shift();
          channel.send({ type: 'broadcast', event: 'transcript', payload });
        }
      }
    });

    channelRef.current = channel;

    return () => {
      channelSubscribedRef.current = false;
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [sessionId]);

  const broadcast = useCallback((text: string, isFinal: boolean) => {
    const payload = {
      text,
      isFinal,
      sourceLang: sourceLangRef.current,
      speakerName: speakerNameRef.current,
      timestamp: Date.now(),
    };

    if (channelRef.current && channelSubscribedRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'transcript',
        payload,
      });
    } else {
      pendingBroadcastsRef.current.push(payload);
    }
  }, []);

  const startTranscription = useCallback(() => {
    setSpeechError(null);
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      const msg = 'Speech Recognition is not supported in this browser. Please use Chrome or Edge.';
      setSpeechError(msg);
      console.warn(msg);
      return;
    }

    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.lang = getLanguageInfo(sourceLangRef.current).speechCode;

      recognition.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const text = result[0].transcript;
          if (result.isFinal) {
            setCurrentText(text);
            broadcast(text, true);
          } else {
            interim += text;
            setCurrentText(interim);
            broadcast(interim, false);
          }
        }
      };

      recognition.onend = () => {
        // Auto-restart if user still has speech active
        if (recognitionRef.current) {
          try { recognition.start(); } catch {}
        }
      };

      recognition.onerror = (e: any) => {
        if (e.error === 'not-allowed') {
          setSpeechError('Microphone access denied. Please allow mic permissions in your browser settings.');
          setIsTranscribing(false);
          recognitionRef.current = null;
        } else if (e.error !== 'no-speech' && e.error !== 'aborted') {
          console.warn('Speech recognition warning:', e.error);
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsTranscribing(true);
    } catch (err: any) {
      console.warn('Failed to start speech recognition:', err);
      setSpeechError(err?.message || 'Failed to start microphone');
      setIsTranscribing(false);
    }
  }, [broadcast]);

  const stopTranscription = useCallback(() => {
    if (recognitionRef.current) {
      const rec = recognitionRef.current;
      recognitionRef.current = null;
      try { rec.stop(); } catch {}
    }
    setIsTranscribing(false);
  }, []);

  const toggleTranscription = useCallback(() => {
    if (isTranscribing) {
      stopTranscription();
    } else {
      startTranscription();
    }
  }, [isTranscribing, startTranscription, stopTranscription]);

  // If session mic is granted by admin
  useEffect(() => {
    if (isSpeaking && !isTranscribing) {
      startTranscription();
    } else if (!isSpeaking && isTranscribing && !recognitionRef.current) {
      stopTranscription();
    }
  }, [isSpeaking, isTranscribing, startTranscription, stopTranscription]);

  return {
    isTranscribing,
    currentText,
    speechError,
    startTranscription,
    stopTranscription,
    toggleTranscription,
  };
}

export function useTranscriptListener(
  sessionId: string | undefined,
  targetLanguage: string | null = 'English',
  ttsEnabled: boolean = true,
  ttsRate: number = 1.0,
  ttsVolume: number = 1.0
) {
  const [subtitle, setSubtitle] = useState('');
  const [translatedSubtitle, setTranslatedSubtitle] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('Hindi');
  const [speakerName, setSpeakerName] = useState('Speaker');
  const [isTranslating, setIsTranslating] = useState(false);
  const [history, setHistory] = useState<TranscriptItem[]>([]);

  const translateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const activeUtterancesRef = useRef<SpeechSynthesisUtterance[]>([]);
  const targetLanguageRef = useRef(targetLanguage);
  const ttsEnabledRef = useRef(ttsEnabled);
  const ttsRateRef = useRef(ttsRate);
  const ttsVolumeRef = useRef(ttsVolume);

  useEffect(() => { targetLanguageRef.current = targetLanguage; }, [targetLanguage]);
  useEffect(() => { ttsEnabledRef.current = ttsEnabled; }, [ttsEnabled]);
  useEffect(() => { ttsRateRef.current = ttsRate; }, [ttsRate]);
  useEffect(() => { ttsVolumeRef.current = ttsVolume; }, [ttsVolume]);

  const speakVoice = useCallback((textToSpeak: string, language: string) => {
    if (!('speechSynthesis' in window) || !textToSpeak.trim()) return;

    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      const targetInfo = getLanguageInfo(language);
      utterance.lang = targetInfo.speechCode;
      utterance.rate = ttsRateRef.current;
      utterance.volume = ttsVolumeRef.current;

      const voices = window.speechSynthesis.getVoices();
      let matchedVoice = voices.find(
        v => v.lang.replace('_', '-').toLowerCase() === targetInfo.speechCode.toLowerCase()
      );
      if (!matchedVoice) {
        matchedVoice = voices.find(v => v.lang.toLowerCase().startsWith(targetInfo.code.toLowerCase()));
      }
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }

      activeUtterancesRef.current.push(utterance);
      utterance.onend = () => {
        activeUtterancesRef.current = activeUtterancesRef.current.filter(u => u !== utterance);
      };
      utterance.onerror = () => {
        activeUtterancesRef.current = activeUtterancesRef.current.filter(u => u !== utterance);
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Speech synthesis error:', err);
    }
  }, []);

  const handleTranslateAndProcess = useCallback(
    async (
      text: string,
      srcLang: string = 'auto',
      isFinal: boolean = false,
      spkName: string = 'Speaker'
    ) => {
      if (!text.trim()) return;

      const currentTarget = targetLanguageRef.current;
      if (!currentTarget) {
        setTranslatedSubtitle('');
        if (isFinal) {
          setHistory(prev => [
            {
              id: `${Date.now()}-${Math.random()}`,
              original: text,
              translated: '',
              sourceLang: srcLang,
              targetLang: 'Off',
              speakerName: spkName,
              timestamp: Date.now(),
            },
            ...prev.slice(0, 49),
          ]);
        }
        return;
      }

      setIsTranslating(true);
      try {
        const translated = await translateText(text, currentTarget, srcLang);
        setTranslatedSubtitle(translated);

        if (isFinal && translated) {
          setHistory(prev => [
            {
              id: `${Date.now()}-${Math.random()}`,
              original: text,
              translated,
              sourceLang: srcLang,
              targetLang: currentTarget,
              speakerName: spkName,
              timestamp: Date.now(),
            },
            ...prev.slice(0, 49),
          ]);

          if (ttsEnabledRef.current) {
            speakVoice(translated, currentTarget);
          }
        }
      } catch (err) {
        console.warn('Live translation error:', err);
      } finally {
        setIsTranslating(false);
      }
    },
    [speakVoice]
  );

  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase.channel(`transcript-${sessionId}`, {
      config: { broadcast: { self: true } },
    });

    channel.on(
      'broadcast',
      { event: 'transcript' },
      ({ payload }: { payload: TranscriptChunk }) => {
        if (!payload || !payload.text) return;
        setSubtitle(payload.text);
        if (payload.sourceLang) setSourceLanguage(payload.sourceLang);
        if (payload.speakerName) setSpeakerName(payload.speakerName);

        if (payload.text.trim()) {
          if (payload.isFinal) {
            if (translateTimeoutRef.current) clearTimeout(translateTimeoutRef.current);
            handleTranslateAndProcess(payload.text, payload.sourceLang || 'auto', true, payload.speakerName);
          } else {
            if (translateTimeoutRef.current) clearTimeout(translateTimeoutRef.current);
            translateTimeoutRef.current = setTimeout(() => {
              handleTranslateAndProcess(payload.text, payload.sourceLang || 'auto', false, payload.speakerName);
            }, 300);
          }
        }
      }
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (translateTimeoutRef.current) clearTimeout(translateTimeoutRef.current);
    };
  }, [sessionId, handleTranslateAndProcess]);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  const testAudioVoice = useCallback((lang: string = 'English') => {
    const phrases: Record<string, string> = {
      English: 'Voice translation is working properly.',
      Hindi: 'ध्वनि अनुवाद सही तरीके से काम कर रहा है।',
      Spanish: 'La traducción de voz está funcionando correctamente.',
      French: 'La traduction vocale fonctionne correctement.',
      German: 'Die Sprachübersetzung funktioniert einwandfrei.',
    };
    const phrase = phrases[lang] || `Voice translation for ${lang} is active.`;
    speakVoice(phrase, lang);
  }, [speakVoice]);

  return {
    subtitle,
    translatedSubtitle,
    sourceLanguage,
    speakerName,
    isTranslating,
    history,
    clearHistory,
    speakVoice,
    testAudioVoice,
  };
}

export { SUPPORTED_LANGUAGES, LANGUAGE_NAMES };
