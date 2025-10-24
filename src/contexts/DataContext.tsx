'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '@/services/apiClient';
import { Event } from '@/types/event';

interface AppData {
  setting?: Record<string, unknown>;
  about?: Record<string, unknown>;
  contact?: Record<string, unknown>;
  terms?: Record<string, unknown>;
  privacy?: Record<string, unknown>;
  events?: Event[];
  event?: Event[];
}

interface VenueData {
  id: string;
  name: string;
  location: string;
  capacity: number;
  website?: string;
  socialMedia?: Record<string, string>;
  photos?: string[];
  country?: string;
  city?: string;
  events?: Array<{
    id: string;
    name: string;
    date: string;
  }>;
}

interface DataContextType {
  data: AppData | null;
  venuesData: VenueData[] | null;
  loading: boolean;
  venuesLoading: boolean;
  error: string | null;
  venuesError: string | null;
  refetch: () => Promise<void>;
  refetchVenues: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

interface DataProviderProps {
  children: ReactNode;
}

export function DataProvider({ children }: DataProviderProps) {
  const [data, setData] = useState<AppData | null>(null);
  const [venuesData, setVenuesData] = useState<VenueData[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [venuesLoading, setVenuesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [venuesError, setVenuesError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/');
      setData(response as AppData);
    } catch (err) {
      console.error('Error fetching events data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const fetchVenuesData = async () => {
    try {
      setVenuesLoading(true);
      setVenuesError(null);
      const response = await api.get('/events');
      // Handle the response structure - it has an 'items' property
      const events = (response as { items?: Event[] }).items || [];

      // Transform Event data to VenueData format
      const venuesData: VenueData[] = events.map((event: Event) => ({
        id: event._id,
        name: event.venueInfo?.name || event.venue?.name || 'Unknown Venue',
        location: event.venueInfo?.description || event.venue?.address || event.eventLocationAddress || 'Unknown Location',
        capacity: event.occupancy || 0,
        website: event.venueInfo?.media?.website || '',
        socialMedia: event.venueInfo?.media?.social || {},
        photos: event.venueInfo?.media?.photo || [],
        country: event.country || '',
        city: event.city || '',
        events: [{
          id: event._id,
          name: event.eventTitle,
          date: event.eventDate
        }]
      }));

      setVenuesData(venuesData);
    } catch (err) {
      console.error('Error fetching venues data:', err);
      setVenuesError(err instanceof Error ? err.message : 'Failed to fetch venues data');
    } finally {
      setVenuesLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchVenuesData();
  }, []);

  const value: DataContextType = {
    data,
    venuesData,
    loading,
    venuesLoading,
    error,
    venuesError,
    refetch: fetchData,
    refetchVenues: fetchVenuesData,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
