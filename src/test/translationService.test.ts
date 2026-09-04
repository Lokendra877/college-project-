import { describe, it, expect, vi } from 'vitest';
import { getLanguageInfo, translateText, SUPPORTED_LANGUAGES } from '@/lib/translationService';

describe('translationService', () => {
  it('should return correct language info for supported languages', () => {
    const hindi = getLanguageInfo('Hindi');
    expect(hindi.code).toBe('hi');
    expect(hindi.speechCode).toBe('hi-IN');

    const spanish = getLanguageInfo('es');
    expect(spanish.name).toBe('Spanish');
    expect(spanish.speechCode).toBe('es-ES');

    const english = getLanguageInfo('unknown-lang');
    expect(english.name).toBe('English');
    expect(english.code).toBe('en');
  });

  it('should have key Indian and international languages supported', () => {
    const names = SUPPORTED_LANGUAGES.map(l => l.name);
    expect(names).toContain('Hindi');
    expect(names).toContain('English');
    expect(names).toContain('Bengali');
    expect(names).toContain('Tamil');
    expect(names).toContain('Telugu');
    expect(names).toContain('Marathi');
    expect(names).toContain('Spanish');
    expect(names).toContain('French');
  });

  it('should return original text if source and target language are the same', async () => {
    const res = await translateText('Hello world', 'English', 'English');
    expect(res).toBe('Hello world');
  });

  it('should return empty string for empty input', async () => {
    const res = await translateText('   ', 'Hindi');
    expect(res).toBe('');
  });
});
