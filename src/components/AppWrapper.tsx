'use client';

import { DataProvider, useData } from '@/contexts/DataContext';
import { LocaleProvider } from '@/contexts/LocaleContext';
import { TranslationLoader } from '@/components/TranslationLoader';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ReactNode } from 'react';

interface AppWrapperProps {
  children: ReactNode;
}

function AppContent({ children }: AppWrapperProps) {
  const { apiLocales } = useData();

  return (
    <LocaleProvider apiLocales={apiLocales}>
      <TranslationLoader>
        <Header />
        <main className="pt-24">{children}</main>
        <Footer />
      </TranslationLoader>
    </LocaleProvider>
  );
}

export function AppWrapper({ children }: AppWrapperProps) {
  return (
    <DataProvider>
      <AppContent>{children}</AppContent>
    </DataProvider>
  );
}
