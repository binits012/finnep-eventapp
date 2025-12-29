'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { useData } from '@/contexts/DataContext';
import { Locale } from '@/types/translations';

// Fallback locales if API doesn't provide them
const fallbackLocales: { code: Locale; name: string; flag: string }[] = [
  { code: 'en-US', name: 'English', flag: '🇺🇸' },
  { code: 'fi-FI', name: 'Suomi', flag: '🇫🇮' },
  { code: 'sv-SE', name: 'Svenska', flag: '🇸🇪' },
  { code: 'da-DK', name: 'Dansk', flag: '🇩🇰' },
  { code: 'no-NO', name: 'Norsk', flag: '🇳🇴' },
];

export default function LocaleSelector() {
  const { locale, setLocale } = useTranslation();
  const { apiLocales } = useData();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Use API locales if available, otherwise fall back to hardcoded
  const locales = useMemo(() => {
    if (apiLocales && apiLocales.length > 0) {
      return apiLocales.map(apiLocale => ({
        code: apiLocale.code as Locale,
        name: apiLocale.nativeName || apiLocale.name,
        flag: apiLocale.flag
      }));
    }
    return fallbackLocales;
  }, [apiLocales]);

  const currentLocale = locales.find(l => l.code === locale) || locales[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLocaleChange = (newLocale: Locale) => {
    setLocale(newLocale);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1 px-2 py-1.5 rounded-md border transition-all text-sm"
        style={{
          background: 'var(--surface)',
          color: 'var(--foreground)',
          borderColor: 'var(--border)'
        }}
        onMouseEnter={(e) => {
          // Create a subtle hover effect using opacity on a pseudo-background
          e.currentTarget.style.opacity = '0.9';
          e.currentTarget.style.transform = 'scale(0.98)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '1';
          e.currentTarget.style.transform = 'scale(1)';
        }}
        aria-label="Select language"
      >
        <span className="text-sm">{currentLocale.flag}</span>
        <span className="text-xs font-medium hidden sm:inline">{currentLocale.name}</span>
        <svg
          className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="absolute top-full right-0 mt-1 w-40 rounded-md shadow-lg border z-[9999]"
          style={{
            background: 'var(--surface)',
            borderColor: 'var(--border)',
            position: 'absolute',
            top: '100%',
            right: '0',
            marginTop: '4px'
          }}
        >
          {locales.map((localeOption) => {
            const isSelected = locale === localeOption.code;
            return (
              <button
                key={localeOption.code}
                onClick={() => handleLocaleChange(localeOption.code)}
                className="w-full flex items-center space-x-2 px-3 py-2 text-left transition-colors first:rounded-t-md last:rounded-b-md text-sm"
                style={{
                  background: isSelected ? 'var(--surface)' : 'transparent',
                  color: 'var(--foreground)',
                  opacity: isSelected ? 1 : 0.9
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    // Hover effect: show background with slight opacity
                    e.currentTarget.style.background = 'var(--surface)';
                    e.currentTarget.style.opacity = '1';
                    // Add a subtle box-shadow for depth
                    e.currentTarget.style.boxShadow = 'inset 0 0 0 1px var(--border)';
                  } else {
                    // Selected item hover: subtle darkening
                    e.currentTarget.style.opacity = '0.95';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.opacity = '0.9';
                    e.currentTarget.style.boxShadow = 'none';
                  } else {
                    e.currentTarget.style.opacity = '1';
                  }
                }}
              >
                <span className="text-sm">{localeOption.flag}</span>
                <span className="text-xs font-medium">{localeOption.name}</span>
                {isSelected && (
                  <svg className="w-3 h-3 ml-auto" fill="currentColor" viewBox="0 0 20 20" style={{ color: 'var(--foreground)' }}>
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
