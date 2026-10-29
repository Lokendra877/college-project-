// ChatGPT (OpenAI) Real-Time Voice Translation Service
// Strictly powered by OpenAI ChatGPT API (gpt-4o-mini) for ultra-accurate speech translation

export interface LanguageInfo {
  name: string;
  code: string; // ISO 639-1
  speechCode: string; // SpeechRecognition & TTS locale
}

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  { name: 'English', code: 'en', speechCode: 'en-US' },
  { name: 'Hindi', code: 'hi', speechCode: 'hi-IN' },
  { name: 'Bengali', code: 'bn', speechCode: 'bn-IN' },
  { name: 'Tamil', code: 'ta', speechCode: 'ta-IN' },
  { name: 'Telugu', code: 'te', speechCode: 'te-IN' },
  { name: 'Marathi', code: 'mr', speechCode: 'mr-IN' },
  { name: 'Gujarati', code: 'gu', speechCode: 'gu-IN' },
  { name: 'Kannada', code: 'kn', speechCode: 'kn-IN' },
  { name: 'Malayalam', code: 'ml', speechCode: 'ml-IN' },
  { name: 'Punjabi', code: 'pa', speechCode: 'pa-IN' },
  { name: 'Urdu', code: 'ur', speechCode: 'ur-PK' },
  { name: 'Spanish', code: 'es', speechCode: 'es-ES' },
  { name: 'French', code: 'fr', speechCode: 'fr-FR' },
  { name: 'German', code: 'de', speechCode: 'de-DE' },
  { name: 'Chinese', code: 'zh', speechCode: 'zh-CN' },
  { name: 'Japanese', code: 'ja', speechCode: 'ja-JP' },
  { name: 'Korean', code: 'ko', speechCode: 'ko-KR' },
  { name: 'Arabic', code: 'ar', speechCode: 'ar-SA' },
  { name: 'Portuguese', code: 'pt', speechCode: 'pt-BR' },
  { name: 'Russian', code: 'ru', speechCode: 'ru-RU' },
  { name: 'Italian', code: 'it', speechCode: 'it-IT' },
  { name: 'Turkish', code: 'tr', speechCode: 'tr-TR' },
  { name: 'Dutch', code: 'nl', speechCode: 'nl-NL' },
];

export const LANGUAGE_NAMES = SUPPORTED_LANGUAGES.map((l) => l.name);

export function getLanguageInfo(nameOrCode: string): LanguageInfo {
  const normalized = nameOrCode.trim().toLowerCase();
  const match = SUPPORTED_LANGUAGES.find(
    (l) =>
      l.name.toLowerCase() === normalized ||
      l.code.toLowerCase() === normalized ||
      l.speechCode.toLowerCase() === normalized
  );
  return match || { name: 'English', code: 'en', speechCode: 'en-US' };
}

// In-memory cache for ultra-fast instant lookups of repeated phrases
const translationCache = new Map<string, string>();
const MAX_CACHE_SIZE = 1000;

function getCacheKey(text: string, targetLang: string, sourceLang: string): string {
  return `${sourceLang}->${targetLang}:${text.trim().toLowerCase()}`;
}

function saveToCache(key: string, value: string) {
  if (translationCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = translationCache.keys().next().value;
    if (oldestKey) translationCache.delete(oldestKey);
  }
  translationCache.set(key, value);
}

/**
 * Retrieve OpenAI API Key from localStorage or environment variable
 */
export function getOpenAIApiKey(): string | null {
  try {
    return (
      localStorage.getItem('smartmic_openai_api_key') ||
      localStorage.getItem('smartmic_translate_api_key') ||
      (import.meta as any).env?.VITE_OPENAI_API_KEY ||
      null
    );
  } catch {
    return null;
  }
}

/**
 * Save custom OpenAI API Key
 */
export function setOpenAIApiKey(key: string | null) {
  try {
    if (key && key.trim()) {
      localStorage.setItem('smartmic_openai_api_key', key.trim());
      localStorage.setItem('smartmic_translate_api_key', key.trim());
    } else {
      localStorage.removeItem('smartmic_openai_api_key');
      localStorage.removeItem('smartmic_translate_api_key');
    }
  } catch {}
}

// Backward compatibility aliases
export const getCustomTranslateApiKey = getOpenAIApiKey;
export const setCustomTranslateApiKey = setOpenAIApiKey;

/**
 * Translates speech text into the target language EXCLUSIVELY using the OpenAI ChatGPT API (gpt-4o-mini).
 */
export async function translateText(
  text: string,
  targetLang: string,
  sourceLang: string = 'auto'
): Promise<string> {
  const cleanText = text.trim();
  if (!cleanText) return '';

  const targetInfo = getLanguageInfo(targetLang);
  const sourceInfo = sourceLang === 'auto' ? null : getLanguageInfo(sourceLang);

  // If source and target are the same language, no translation needed
  if (sourceInfo && sourceInfo.code === targetInfo.code) {
    return cleanText;
  }

  const cacheKey = getCacheKey(cleanText, targetInfo.name, sourceInfo ? sourceInfo.name : 'auto');
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)!;
  }

  const apiKey = getOpenAIApiKey();
  if (!apiKey) {
    console.warn(
      'OpenAI API Key is missing. Please add VITE_OPENAI_API_KEY in .env or configure your key in Translation Settings.'
    );
    return cleanText;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const systemPrompt = `You are a professional real-time speech translation engine for live auditorium sessions.
Translate the following spoken text into ${targetInfo.name}.
Rules:
1. Output ONLY the direct translated speech.
2. Do NOT add quotes, markdown, explanations, speaker tags, or notes.
3. Keep colloquial spoken idioms natural and immediate.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: cleanText },
        ],
        temperature: 0.1,
        max_tokens: 250,
      }),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error('ChatGPT API translation error:', response.status, errData);
      return cleanText;
    }

    const data = await response.json();
    const translated = data?.choices?.[0]?.message?.content?.trim();

    if (translated) {
      saveToCache(cacheKey, translated);
      return translated;
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.warn('ChatGPT translation timed out (>4000ms)');
    } else {
      console.error('ChatGPT translation error:', err);
    }
  }

  return cleanText;
}
