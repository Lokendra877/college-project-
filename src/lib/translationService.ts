// Translation service supporting ultra-fast multi-engine fallback and zero-cost real-time translation

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

export const LANGUAGE_NAMES = SUPPORTED_LANGUAGES.map(l => l.name);

export function getLanguageInfo(nameOrCode: string): LanguageInfo {
  const normalized = nameOrCode.trim().toLowerCase();
  const match = SUPPORTED_LANGUAGES.find(
    l => l.name.toLowerCase() === normalized || l.code.toLowerCase() === normalized || l.speechCode.toLowerCase() === normalized
  );
  return match || { name: 'English', code: 'en', speechCode: 'en-US' };
}

// In-memory cache for ultra-fast instant lookups
const translationCache = new Map<string, string>();
const MAX_CACHE_SIZE = 1000;

function getCacheKey(text: string, targetLangCode: string, sourceLangCode: string): string {
  return `${sourceLangCode}->${targetLangCode}:${text.trim().toLowerCase()}`;
}

/**
 * Gets custom user API key if configured
 */
export function getCustomTranslateApiKey(): string | null {
  try {
    return localStorage.getItem('smartmic_translate_api_key') || (import.meta as any).env?.VITE_TRANSLATE_API_KEY || null;
  } catch {
    return null;
  }
}

export function setCustomTranslateApiKey(key: string | null) {
  try {
    if (key) {
      localStorage.setItem('smartmic_translate_api_key', key.trim());
    } else {
      localStorage.removeItem('smartmic_translate_api_key');
    }
  } catch {}
}

/**
 * Translates text into target language using Google Chrome-Ex endpoint with GTX and MyMemory fallbacks.
 * Sub-200ms latency designed for streaming voice translation.
 */
export async function translateText(
  text: string,
  targetLang: string,
  sourceLang: string = 'auto'
): Promise<string> {
  const cleanText = text.trim();
  if (!cleanText) return '';

  const targetInfo = getLanguageInfo(targetLang);
  const targetCode = targetInfo.code;
  const sourceCode = sourceLang === 'auto' ? 'auto' : getLanguageInfo(sourceLang).code;

  if (sourceCode === targetCode) {
    return cleanText;
  }

  const cacheKey = getCacheKey(cleanText, targetCode, sourceCode);
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)!;
  }

  // Engine 0: Custom Google Cloud Translation API (if user entered an API key)
  const userApiKey = getCustomTranslateApiKey();
  if (userApiKey) {
    try {
      const gUrl = `https://translation.googleapis.com/language/translate/v2?key=${userApiKey}`;
      const res = await fetch(gUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: cleanText,
          target: targetCode,
          source: sourceCode === 'auto' ? undefined : sourceCode,
          format: 'text',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const translated = data?.data?.translations?.[0]?.translatedText;
        if (translated) {
          saveToCache(cacheKey, translated);
          return translated;
        }
      }
    } catch {}
  }

  // Engine 1: Google Translate Chrome-Ex (Extremely fast, reliable, zero cost)
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=dict-chrome-ex&sl=${sourceCode}&tl=${targetCode}&dt=t&q=${encodeURIComponent(cleanText)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && Array.isArray(data[0])) {
        const translated = data[0].map((item: any) => item[0]).filter(Boolean).join('');
        if (translated) {
          saveToCache(cacheKey, translated);
          return translated;
        }
      }
    }
  } catch (err) {
    // Failover to Engine 2
  }

  // Engine 2: Google Translate GTX fallback
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceCode}&tl=${targetCode}&dt=t&q=${encodeURIComponent(cleanText)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && Array.isArray(data[0])) {
        const translated = data[0].map((item: any) => item[0]).filter(Boolean).join('');
        if (translated) {
          saveToCache(cacheKey, translated);
          return translated;
        }
      }
    }
  } catch (err) {
    // Failover to Engine 3
  }

  // Engine 3: MyMemory API fallback
  try {
    const src = sourceCode === 'auto' ? 'en' : sourceCode;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(cleanText)}&langpair=${src}|${targetCode}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const translated = data.responseData?.translatedText;
      if (translated && !translated.includes('MYMEMORY WARNING')) {
        saveToCache(cacheKey, translated);
        return translated;
      }
    }
  } catch (err) {
    // Failover
  }

  return cleanText;
}

function saveToCache(key: string, value: string) {
  if (translationCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = translationCache.keys().next().value;
    if (oldestKey) translationCache.delete(oldestKey);
  }
  translationCache.set(key, value);
}
