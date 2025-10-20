'use client';

import { useData } from '@/contexts/DataContext';

interface PrivacySection {
  title: string;
  text: string;
  bullet_points?: string[];
  note?: string;
}

interface PrivacyData {
  [key: string]: PrivacySection;
}

export default function PrivacyPage() {
  const { data, loading, error } = useData();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading privacy policy...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400">Error loading privacy policy: {error}</p>
        </div>
      </div>
    );
  }

  const settings = data?.settings || {};
  const privacyData = (settings as { otherInfo?: { privacy_policy?: PrivacyData } })?.otherInfo?.privacy_policy;

  const renderPrivacySection = (section: PrivacySection) => {
    return (
      <div key={section.title} className="mb-8">
        <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
          {section.title}
        </h2>
        <p className="mb-4 leading-relaxed" style={{ color: 'var(--foreground)' }}>
          {section.text}
        </p>
        {section.bullet_points && (
          <ul className="list-disc list-inside space-y-2 ml-4">
            {section.bullet_points.map((point: string, index: number) => (
              <li key={index} className="leading-relaxed" style={{ color: 'var(--foreground)' }}>
                {point}
              </li>
            ))}
          </ul>
        )}
        {section.note && (
          <div className="mt-4 p-4 rounded-lg border" style={{ 
            backgroundColor: 'var(--surface)', 
            borderColor: 'var(--border)',
            color: 'var(--foreground)'
          }}>
            <p className="text-sm font-medium mb-2">Note:</p>
            <p className="text-sm leading-relaxed">{section.note}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen py-12" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold mb-4">Privacy Policy</h1>
          <div className="w-20 h-1 bg-indigo-600"></div>
        </div>
        
        <div className="space-y-6">
          {privacyData ? (
            Object.values(privacyData as PrivacyData).map((section: PrivacySection) => renderPrivacySection(section))
          ) : (
            <div className="text-center py-12">
              <p className="text-lg opacity-70">Privacy policy content is not available at the moment.</p>
              <p className="text-sm opacity-50 mt-2">Please check back later or contact us for more information.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
