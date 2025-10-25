import { TranslationKeys } from '@/types/translations';

// Basic translation loader for local files
export const loadLocalTranslations = async (locale: string): Promise<TranslationKeys> => {
  try {
    const response = await fetch(`/locales/${locale}.json`);
    if (!response.ok) {
      throw new Error(`Failed to load local translations for ${locale}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Failed to load local translations for ${locale}:`, error);
    throw error;
  }
};

// Load translations with fallback
export const loadTranslationsWithFallback = async (locale: string): Promise<TranslationKeys> => {
  try {
    return await loadLocalTranslations(locale);
  } catch (error) {
    console.warn(`Failed to load translations for ${locale}, falling back to en-US`);
    if (locale !== 'en-US') {
      return await loadLocalTranslations('en-US');
    }
    throw error;
  }
};

// Preload multiple translations
export const preloadTranslations = async (locales: string[]): Promise<Map<string, TranslationKeys>> => {
  const translations = new Map<string, TranslationKeys>();

  const promises = locales.map(async (locale) => {
    try {
      const translation = await loadLocalTranslations(locale);
      translations.set(locale, translation);
    } catch (error) {
      console.warn(`Failed to preload translations for ${locale}:`, error);
    }
  });

  await Promise.allSettled(promises);
  return translations;
};
