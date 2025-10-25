'use client';

import React, { ReactNode } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { PageSkeleton } from './LoadingSkeletons';

interface TranslationLoaderProps {
  children: ReactNode;
}

export function TranslationLoader({ children }: TranslationLoaderProps) {
  const { isLoading: translationsLoading, translations } = useTranslation();

  // Show loading skeleton while translations are loading
  if (translationsLoading || !translations) {
    return <PageSkeleton />;
  }

  return <>{children}</>;
}

// Alternative minimal loader
export function MinimalTranslationLoader({ children }: TranslationLoaderProps) {
  const { isLoading: translationsLoading } = useTranslation();

  if (translationsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading translations...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
