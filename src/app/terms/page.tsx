'use client';

import { useData } from '@/contexts/DataContext';

interface TermsSection {
  title: string;
  text: string;
  bullet_points?: string[];
  note?: string;
  prohibitions?: string[];
}

interface TermsData {
  [key: string]: TermsSection;
}

export default function TermsPage() {
  const { data, loading, error } = useData();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading terms...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400">Error loading terms: {error}</p>
        </div>
      </div>
    );
  }

  const settings = data?.setting?.[0] || {};
  const termsData = (settings as { otherInfo?: { terms_and_conditions?: TermsData } })?.otherInfo?.terms_and_conditions;

  const renderTermsSection = (section: TermsSection) => {
    return (
      <div key={section.title} className="mb-8">
        <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
          {section.title}
        </h2>
        <p className="mb-4 leading-relaxed" style={{ color: 'var(--foreground)' }}>
          {section.text}
        </p>
        {section.prohibitions && (
          <ul className="list-disc list-inside space-y-2 ml-4">
            {section.prohibitions.map((prohibition: string, index: number) => (
              <li key={index} className="leading-relaxed" style={{ color: 'var(--foreground)' }}>
                {prohibition}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen py-12" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold mb-4">Terms and Conditions</h1>
          <div className="w-20 h-1 bg-indigo-600"></div>
        </div>
        
        <div className="space-y-6">
          {termsData ? (
            Object.values(termsData as TermsData).map((section: TermsSection) => renderTermsSection(section))
          ) : (
            <div className="text-center py-12">
              <p className="text-lg opacity-70">Terms and conditions content is not available at the moment.</p>
              <p className="text-sm opacity-50 mt-2">Please check back later or contact us for more information.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
