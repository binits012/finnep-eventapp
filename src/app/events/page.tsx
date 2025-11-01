"use client";

import { useMemo } from 'react';
import EventsPage from "@/components/EventsPage";
import { useData } from '@/contexts/DataContext';
import { useTranslation } from '@/hooks/useTranslation';

export default function Events() {
  const { t } = useTranslation();
  const { eventsData, venuesLoading } = useData();

  // Transform eventsData to the format EventsPage expects
  const data = useMemo(() => {
    return { items: eventsData || [] };
  }, [eventsData]);

  if (venuesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">{t('events.loading') || 'Loading events...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <EventsPage data={data} />
    </div>
  );
}