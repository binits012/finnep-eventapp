"use client";

import { useState, useEffect } from 'react';
import EventsPage from "@/components/EventsPage";
import api from "@/services/apiClient";
import { Event } from '@/types/event';

export default function Events() {
  const [data, setData] = useState<{ photo: unknown[]; notification: unknown[]; event: Event[]; setting: unknown[] }>({ photo: [], notification: [], event: [], setting: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await api.get('/events');
        setData(response as { photo: unknown[]; notification: unknown[]; event: Event[]; setting: unknown[] });
      } catch (error) {
        console.error('Error fetching events data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading events...</p>
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