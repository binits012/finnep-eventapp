'use client';

import { useEffect } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import Link from 'next/link';

/**
 * AccessibilityWrapper component
 * Handles dynamic lang attribute and skip-to-content link
 */
export function AccessibilityWrapper() {
  const { locale } = useTranslation();

  // Update HTML lang attribute when locale changes
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const htmlElement = document.documentElement;
      // Extract language code from locale (e.g., 'en-US' -> 'en')
      const langCode = locale.split('-')[0];
      htmlElement.setAttribute('lang', langCode);
      // Also set the full locale for more specific language variants
      htmlElement.setAttribute('data-locale', locale);
    }
  }, [locale]);

  return (
    <>
      {/* Skip to main content link */}
      <Link
        href="#main-content"
        className="skip-to-content"
        onClick={(e) => {
          e.preventDefault();
          const mainContent = document.getElementById('main-content');
          if (mainContent) {
            mainContent.focus();
            mainContent.scrollIntoView({ behavior: 'smooth' });
          }
        }}
      >
        Skip to main content
      </Link>
    </>
  );
}

