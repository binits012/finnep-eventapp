'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Locale, TranslationKeys, TranslationParams } from '@/types/translations';
import { loadSmartTranslations, loadLocalTranslations } from '@/utils/smartTranslationLoader';
interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => Promise<void>;
  translations: TranslationKeys | null;
  isLoading: boolean;
  t: (key: string, params?: TranslationParams) => string;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

interface LocaleProviderProps {
  children: ReactNode;
  apiLocales?: Array<{
    code: string;
    name: string;
    nativeName: string;
    flag: string;
    rtl: boolean;
    currency: string;
    currencySymbol: string;
    dateFormat: string;
    timeFormat: string;
  }>;
}

export function LocaleProvider({ children, apiLocales = [] }: LocaleProviderProps) {

  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('locale') as Locale) || 'en-US';
    }
    return 'en-US';
  });

  const [translations, setTranslations] = useState<TranslationKeys | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Validate locale against API data once it's loaded
  useEffect(() => {
    if (apiLocales.length > 0) {
      const validLocales = apiLocales.map(l => l.code);
      const currentLocale = locale;

      // If current locale is not in the API locales, fallback to first available locale
      if (!validLocales.includes(currentLocale)) {
        setLocaleState(validLocales[0] as Locale);
        localStorage.setItem('locale', validLocales[0]);
      }
    }
  }, [apiLocales, locale]);

  // Load translations when locale changes
  useEffect(() => {
    const loadTranslations = async () => {
      setIsLoading(true);
      try {
        const loadedTranslations = await loadSmartTranslations(locale);
        setTranslations(loadedTranslations);
      } catch (error) {
        console.error('Failed to load translations:', error);
        // Fallback to en-US
        try {
          const fallbackTranslations = await loadLocalTranslations('en-US');
          setTranslations(fallbackTranslations);
        } catch (fallbackError) {
          console.error('Fallback translation loading failed:', fallbackError);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadTranslations();
  }, [locale]);

  const setLocale = async (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('locale', newLocale);
  };

  const t = (key: string, params?: TranslationParams): string => {
    if (!translations) {
      return key;
    }

    const keys = key.split('.');
    let value: unknown = translations;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in (value as Record<string, unknown>)) {
        value = (value as Record<string, unknown>)[k];
      } else {
        return key;
      }
    }

    if (typeof value !== 'string') {
      return key;
    }

    // Replace parameters in the translation
    if (params) {
      return value.replace(/\{\{(\w+)\}\}/g, (match, paramKey) => {
        return params[paramKey]?.toString() || match;
      });
    }

    return value;
  };

  const value: LocaleContextType = {
    locale,
    setLocale,
    translations,
    isLoading,
    t,
  };

  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (context === undefined) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
}