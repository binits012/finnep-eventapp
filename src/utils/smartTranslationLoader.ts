import { TranslationKeys } from '@/types/translations';

// Simple cache for translations
const translationCache = new Map<string, { data: TranslationKeys; timestamp: number }>();
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

// Get S3 base URL from environment variable
const getS3BaseUrl = (): string => {
  return process.env.NEXT_PUBLIC_AWS_CLOUD_FRONT_URL || 'https://finnep-eventapp-test.s3.eu-central-1.amazonaws.com';
};

// Load translations from local files (fallback)
export const loadLocalTranslations = async (locale: string): Promise<TranslationKeys> => {
  try {
    // First try S3/CloudFront URL
    const s3Url = `${getS3BaseUrl()}/locale/${locale}.json`;
    const response = await fetch(s3Url);
    if (response.ok) {
      return await response.json();
    }

    // Fallback to local files if S3 fails
    const localResponse = await fetch(`/locales/${locale}.json`);
    if (!localResponse.ok) {
      throw new Error(`Failed to load local translations for ${locale}`);
    }
    return await localResponse.json();
  } catch (error) {
    console.error(`Failed to load local translations for ${locale}:`, error);
    throw error;
  }
};

// Load translations from S3
export const loadS3Translations = async (locale: string): Promise<TranslationKeys> => {
  try {
    const s3Url = `${getS3BaseUrl()}/locale/${locale}.json`;
    const response = await fetch(s3Url);
    if (!response.ok) {
      throw new Error(`Failed to load S3 translations for ${locale}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Failed to load S3 translations for ${locale}:`, error);
    throw error;
  }
};

// Get cached translations
export const getCachedTranslations = (locale: string): TranslationKeys | null => {
  const cached = translationCache.get(locale);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
};

// Cache translations
export const cacheTranslations = (locale: string, translations: TranslationKeys): void => {
  translationCache.set(locale, {
    data: translations,
    timestamp: Date.now()
  });
};

// Smart translation loading with fallback strategy
export const loadSmartTranslations = async (locale: string): Promise<TranslationKeys> => {
  // Check cache first
  const cached = getCachedTranslations(locale);
  if (cached) {
    return cached;
  }

  try {
    // Always try S3/CloudFront first for all locales
    const s3Translations = await loadS3Translations(locale);
    cacheTranslations(locale, s3Translations);
    return s3Translations;
  } catch (error) {
    console.warn(`S3 loading failed for ${locale}, trying local fallback:`, error);

    // Fallback to local files
    const localTranslations = await loadLocalTranslations(locale);
    cacheTranslations(locale, localTranslations);
    return localTranslations;
  }
};

// Preload translations for better performance
export const preloadTranslations = async (locales: string[]): Promise<void> => {
  const promises = locales.map(async (locale) => {
    try {
      await loadSmartTranslations(locale);
    } catch (error) {
      console.warn(`Failed to preload translations for ${locale}:`, error);
    }
  });

  await Promise.allSettled(promises);
};

// Check if translations need refresh
export const needsRefresh = (locale: string): boolean => {
  const cached = translationCache.get(locale);
  if (!cached) return true;
  return Date.now() - cached.timestamp >= CACHE_DURATION;
};
