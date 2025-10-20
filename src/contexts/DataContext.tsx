'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '@/services/apiClient';

interface DataContextType {
  data: any;
  venuesData: any;
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
  const [data, setData] = useState<any>(null);
  const [venuesData, setVenuesData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [venuesLoading, setVenuesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [venuesError, setVenuesError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/');
      setData(response);
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
      setVenuesData(response);
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
