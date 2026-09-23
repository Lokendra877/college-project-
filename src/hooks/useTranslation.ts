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
  isClauseFinal?: boolean;
  clauseText?: string;
  sourceLang?: string;
  speakerName?: string;
  timestamp: number;
}

const CLAUSE_PUNCTUATION = /[।\.\?!,;\n]/;

export function useSpeechTranscription(
  sessionId: string | undefined,
  isSpeaking: boolean,
  sourceLanguage: string = 'Hindi',
  speakerName: string = 'User',
  enabled: boolean = true
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
  const enabledRef = useRef(enabled);
  const lastBroadcastTextRef = useRef('');
  const lastClauseIndexRef = useRef(0);

  useEffect(() => { sourceLangRef.current = sourceLanguage; }, [sourceLanguage]);
  useEffect(() => { speakerNameRef.current = speakerName; }, [speakerName]);
  useEffect(() => { enabledRef.current = enabled; }, [enabled]);

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

  const broadcast = useCallback(
    (text: string, isFinal: boolean, isClauseFinal: boolean = false, clauseText?: string) => {
      const payload: TranscriptChunk = {
        text,
        isFinal,
        isClauseFinal,
        clauseText,
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
    },
    []
  );

  const startTranscription = useCallback(() => {
    if (!enabledRef.current) return;
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

      lastClauseIndexRef.current = 0;

      recognition.onresult = (event: any) => {
        let fullTranscript = '';
        let hasFinalResult = false;
        let finalPhrase = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const text = result[0].transcript;
          if (result.isFinal) {
            hasFinalResult = true;
            finalPhrase = text;
          }
          fullTranscript += text;
        }

        const trimmed = fullTranscript.trim();
        if (!trimmed) return;
        setCurrentText(trimmed);

        if (hasFinalResult) {
          // Final sentence completed
          const unbroadcastedClause = trimmed.slice(lastClauseIndexRef.current).trim();
          broadcast(trimmed, true, true, unbroadcastedClause || finalPhrase);
          lastClauseIndexRef.current = 0;
          lastBroadcastTextRef.current = trimmed;
        } else {
          // Instant clause detection: look for punctuation or natural breaks
          const newPortion = trimmed.slice(lastClauseIndexRef.current);
          const punctMatch = newPortion.search(CLAUSE_PUNCTUATION);

          if (punctMatch !== -1) {
            // A clause boundary was hit!
            const clause = newPortion.slice(0, punctMatch + 1).trim();
            if (clause.length > 2) {
              lastClauseIndexRef.current += punctMatch + 1;
              broadcast(trimmed, false, true, clause);
            } else {
              broadcast(trimmed, false, false);
            }
          } else {
            // Fast interim streaming broadcast
            broadcast(trimmed, false, false);
          }
          lastBroadcastTextRef.current = trimmed;
        }
      };

      recognition.onend = () => {
        if (recognitionRef.current && enabledRef.current) {
          try { recognition.start(); } catch {}
        }
      };

      recognition.onerror = (e: any) => {
        if (e.error === 'not-allowed') {
          setSpeechError('Microphone permission denied. Please allow microphone in browser settings.');
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

  // If enabled changes
  useEffect(() => {
    if (!enabled && isTranscribing) {
      stopTranscription();
    }
  }, [enabled, isTranscribing, stopTranscription]);

  // Auto-start when speaker is granted mic
  useEffect(() => {
    if (isSpeaking && !isTranscribing && enabled) {
      startTranscription();
    } else if (!isSpeaking && isTranscribing && !recognitionRef.current) {
      stopTranscription();
    }
  }, [isSpeaking, isTranscribing, enabled, startTranscription, stopTranscription]);

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
  ttsVolume: number = 1.0,
  initialTranslatorEnabled: boolean = true
) {
  // Master ON / OFF Switch for Voice Translator
  const [translatorEnabled, setTranslatorEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('smartmic_translator_enabled');
      return saved !== null ? saved === 'true' : initialTranslatorEnabled;
    } catch {
      return initialTranslatorEnabled;
    }
  });

  const [subtitle, setSubtitle] = useState('');
  const [translatedSubtitle, setTranslatedSubtitle] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('Hindi');
  const [speakerName, setSpeakerName] = useState('Speaker');
  const [isTranslating, setIsTranslating] = useState(false);
  const [history, setHistory] = useState<TranscriptItem[]>([]);

  const translateDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const targetLanguageRef = useRef(targetLanguage);
  const ttsEnabledRef = useRef(ttsEnabled);
  const ttsRateRef = useRef(ttsRate);
  const ttsVolumeRef = useRef(ttsVolume);
  const translatorEnabledRef = useRef(translatorEnabled);
  const speechQueueRef = useRef<{ text: string; lang: string }[]>([]);
  const isSpeakingRef = useRef(false);
  const processedClausesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    targetLanguageRef.current = targetLanguage;
  }, [targetLanguage]);

  useEffect(() => {
    ttsEnabledRef.current = ttsEnabled;
  }, [ttsEnabled]);

  useEffect(() => {
    ttsRateRef.current = ttsRate;
  }, [ttsRate]);

  useEffect(() => {
    ttsVolumeRef.current = ttsVolume;
  }, [ttsVolume]);

  useEffect(() => {
    translatorEnabledRef.current = translatorEnabled;
    try {
      localStorage.setItem('smartmic_translator_enabled', String(translatorEnabled));
    } catch {}
    if (!translatorEnabled) {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      speechQueueRef.current = [];
      isSpeakingRef.current = false;
    }
  }, [translatorEnabled]);

  // Keep-alive timer for Chrome SpeechSynthesis bug (stops after ~15s)
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const interval = setInterval(() => {
      if (window.speechSynthesis.speaking && window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Process next item in the speech queue
  const processNextSpeechQueue = useCallback(() => {
    if (!translatorEnabledRef.current || !ttsEnabledRef.current) {
      speechQueueRef.current = [];
      isSpeakingRef.current = false;
      return;
    }

    if (speechQueueRef.current.length === 0) {
      isSpeakingRef.current = false;
      return;
    }

    if (!('speechSynthesis' in window)) return;

    isSpeakingRef.current = true;
    const nextItem = speechQueueRef.current.shift();
    if (!nextItem || !nextItem.text.trim()) {
      isSpeakingRef.current = false;
      processNextSpeechQueue();
      return;
    }

    try {
      const utterance = new SpeechSynthesisUtterance(nextItem.text);
      const targetInfo = getLanguageInfo(nextItem.lang);
      utterance.lang = targetInfo.speechCode;
      utterance.rate = Math.max(0.8, Math.min(1.8, ttsRateRef.current));
      utterance.volume = Math.max(0.1, Math.min(1.0, ttsVolumeRef.current));

      const voices = window.speechSynthesis.getVoices();
      let matchedVoice = voices.find(
        (v) => v.lang.replace('_', '-').toLowerCase() === targetInfo.speechCode.toLowerCase()
      );
      if (!matchedVoice) {
        matchedVoice = voices.find((v) => v.lang.toLowerCase().startsWith(targetInfo.code.toLowerCase()));
      }
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }

      utterance.onend = () => {
        isSpeakingRef.current = false;
        processNextSpeechQueue();
      };

      utterance.onerror = () => {
        isSpeakingRef.current = false;
        processNextSpeechQueue();
      };

      window.speechSynthesis.speak(utterance);
    } catch {
      isSpeakingRef.current = false;
      processNextSpeechQueue();
    }
  }, []);

  // Enqueue translated phrase for instant voice output
  const speakVoice = useCallback(
    (textToSpeak: string, language: string, immediate: boolean = false) => {
      if (!translatorEnabledRef.current || !ttsEnabledRef.current) return;
      if (!('speechSynthesis' in window) || !textToSpeak.trim()) return;

      if (immediate) {
        try {
          window.speechSynthesis.cancel();
          speechQueueRef.current = [];
          isSpeakingRef.current = false;
        } catch {}
      }

      speechQueueRef.current.push({ text: textToSpeak, lang: language });
      if (!isSpeakingRef.current) {
        processNextSpeechQueue();
      }
    },
    [processNextSpeechQueue]
  );

  // Instant Translate & Speak Handler
  const handleInstantTranslate = useCallback(
    async (
      text: string,
      srcLang: string = 'auto',
      isFinal: boolean = false,
      spkName: string = 'Speaker',
      shouldSpeak: boolean = true
    ) => {
      const clean = text.trim();
      if (!clean) return;

      if (!translatorEnabledRef.current) {
        setTranslatedSubtitle('');
        return;
      }

      const currentTarget = targetLanguageRef.current;
      if (!currentTarget) {
        setTranslatedSubtitle('');
        return;
      }

      setIsTranslating(true);
      try {
        const translated = await translateText(clean, currentTarget, srcLang);
        if (translated) {
          setTranslatedSubtitle(translated);

          if (shouldSpeak && ttsEnabledRef.current && translatorEnabledRef.current) {
            speakVoice(translated, currentTarget);
          }

          if (isFinal) {
            setHistory((prev) => [
              {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                original: clean,
                translated,
                sourceLang: srcLang,
                targetLang: currentTarget,
                speakerName: spkName,
                timestamp: Date.now(),
              },
              ...prev.slice(0, 49),
            ]);
          }
        }
      } catch (err) {
        console.warn('Instant translation error:', err);
      } finally {
        setIsTranslating(false);
      }
    },
    [speakVoice]
  );

  // Subscribe to live transcript channel
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

        if (!translatorEnabledRef.current) return;

        const textToProcess = payload.clauseText || payload.text;
        const normalizedClause = textToProcess.trim().toLowerCase();

        // 1. Instant Clause / Sentence Trigger
        if (payload.isClauseFinal && textToProcess.trim()) {
          if (!processedClausesRef.current.has(normalizedClause)) {
            processedClausesRef.current.add(normalizedClause);
            // Translate and speak this clause immediately!
            handleInstantTranslate(
              textToProcess,
              payload.sourceLang || 'auto',
              payload.isFinal,
              payload.speakerName,
              true
            );
          }
        } else if (payload.isFinal && payload.text.trim()) {
          // Final sentence arrived
          if (translateDebounceRef.current) clearTimeout(translateDebounceRef.current);
          if (!processedClausesRef.current.has(normalizedClause)) {
            processedClausesRef.current.add(normalizedClause);
            handleInstantTranslate(
              payload.text,
              payload.sourceLang || 'auto',
              true,
              payload.speakerName,
              true
            );
          }
        } else if (payload.text.trim()) {
          // Live interim subtitles (Debounced to ~180ms for ultra-fast visual subtitles)
          if (translateDebounceRef.current) clearTimeout(translateDebounceRef.current);
          translateDebounceRef.current = setTimeout(() => {
            handleInstantTranslate(
              payload.text,
              payload.sourceLang || 'auto',
              false,
              payload.speakerName,
              false // don't speak interim, only update subtitle
            );
          }, 180);
        }
      }
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (translateDebounceRef.current) clearTimeout(translateDebounceRef.current);
    };
  }, [sessionId, handleInstantTranslate]);

  const toggleTranslator = useCallback(() => {
    setTranslatorEnabled((prev) => !prev);
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    processedClausesRef.current.clear();
  }, []);

  const testAudioVoice = useCallback(
    (lang: string = 'English') => {
      const phrases: Record<string, string> = {
        English: 'Voice translation is working properly and ready for live auditorium sessions.',
        Hindi: 'ध्वनि अनुवाद सही तरीके से काम कर रहा है और ऑडिटोरियम के लिए तैयार है।',
        Spanish: 'La traducción de voz está funcionando correctamente.',
        French: 'La traduction vocale fonctionne correctement.',
        German: 'Die Sprachübersetzung funktioniert einwandfrei.',
      };
      const phrase = phrases[lang] || `Voice translation for ${lang} is active.`;
      speakVoice(phrase, lang, true);
    },
    [speakVoice]
  );

  return {
    translatorEnabled,
    setTranslatorEnabled,
    toggleTranslator,
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
