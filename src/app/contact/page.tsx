'use client';

import { useData } from '@/contexts/DataContext';
import ContactPage from '@/components/ContactPage';

export default function ContactRoute() {
  const { data, loading, error } = useData();

  if (loading) {
    return (
      <div className="min-h-screen py-12 flex items-center justify-center" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-lg opacity-70">Loading contact information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen py-12 flex items-center justify-center" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
        <div className="text-center">
          <p className="text-lg text-red-600 dark:text-red-400 mb-4">Error loading contact information</p>
          <p className="text-sm opacity-70">{error}</p>
        </div>
      </div>
    );
  }

  return <ContactPage data={data as { setting?: Array<{ contactInfo?: { email?: string; phone?: string; address?: string; }; socialMedia?: { fb?: string; x?: string; in?: string; ln?: string; tk?: string; }; }> } | undefined} />;
}