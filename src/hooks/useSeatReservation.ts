"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { seatAPI } from '@/services/apiClient';

// Generate UUID v4
const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const RESERVATION_TTL = 10 * 60 * 1000; // 10 minutes in milliseconds
const CLEANUP_INTERVAL = 60000; // Check every minute

interface ReservationData {
  placeIds: string[];
  sessionId: string;
  timestamp: number;
  eventId: string;
}

export const useSeatReservation = (eventId: string) => {
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isReserving, setIsReserving] = useState(false);
  const [isReleasing, setIsReleasing] = useState(false);
  const cleanupIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize session ID from localStorage or create new one
  useEffect(() => {
    const storageKey = `seat_reservation_session_${eventId}`;
    let storedSessionId = localStorage.getItem(storageKey);

    if (!storedSessionId) {
      storedSessionId = generateUUID();
      localStorage.setItem(storageKey, storedSessionId);
    }

    setSessionId(storedSessionId);

    // Load existing reservations
    loadReservations();
  }, [eventId]);

  // Cleanup expired reservations
  useEffect(() => {
    cleanupIntervalRef.current = setInterval(() => {
      cleanupExpiredReservations();
    }, CLEANUP_INTERVAL);

    return () => {
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current);
      }
    };
  }, [eventId]);

  // Load reservations from localStorage
  const loadReservations = useCallback(() => {
    const storageKey = `seat_reservation_${eventId}`;
    const stored = localStorage.getItem(storageKey);

    if (stored) {
      try {
        const data: ReservationData = JSON.parse(stored);
        const now = Date.now();

        // Check if reservation is still valid
        if (now - data.timestamp < RESERVATION_TTL) {
          setSelectedSeats(data.placeIds);
          return;
        } else {
          // Expired, clear it
          localStorage.removeItem(storageKey);
          setSelectedSeats([]);
        }
      } catch (error) {
        console.error('Error loading reservations:', error);
        localStorage.removeItem(storageKey);
        setSelectedSeats([]);
      }
    }
  }, [eventId]);

  // Save reservations to localStorage
  const saveReservations = useCallback((placeIds: string[]) => {
    if (!sessionId) return;

    const storageKey = `seat_reservation_${eventId}`;
    const data: ReservationData = {
      placeIds,
      sessionId,
      timestamp: Date.now(),
      eventId
    };

    localStorage.setItem(storageKey, JSON.stringify(data));
    setSelectedSeats(placeIds);
  }, [eventId, sessionId]);

  // Cleanup expired reservations
  const cleanupExpiredReservations = useCallback(async () => {
    const storageKey = `seat_reservation_${eventId}`;
    const stored = localStorage.getItem(storageKey);

    if (stored) {
      try {
        const data: ReservationData = JSON.parse(stored);
        const now = Date.now();

        if (now - data.timestamp >= RESERVATION_TTL) {
          // Expired, release from backend and clear
          if (data.placeIds.length > 0 && data.sessionId) {
            try {
              await seatAPI.releaseSeats(eventId, data.placeIds, data.sessionId);
            } catch (error) {
              console.error('Error releasing expired reservations:', error);
            }
          }

          localStorage.removeItem(storageKey);
          setSelectedSeats([]);
        }
      } catch (error) {
        console.error('Error cleaning up reservations:', error);
        localStorage.removeItem(storageKey);
        setSelectedSeats([]);
      }
    }
  }, [eventId]);

  // Reserve seats
  const reserveSeats = useCallback(async (placeIds: string[], email?: string): Promise<{ success: boolean; reserved: string[]; failed: string[] }> => {
    if (!sessionId || placeIds.length === 0) {
      return { success: false, reserved: [], failed: placeIds };
    }

    setIsReserving(true);
    try {
      const response = await seatAPI.reserveSeats(eventId, placeIds, sessionId, email || undefined);

      if (response.data && response.data.reserved) {
        // Save to localStorage
        saveReservations(response.data.reserved);

        return {
          success: response.data.failed.length === 0,
          reserved: response.data.reserved,
          failed: response.data.failed
        };
      }

      return { success: false, reserved: [], failed: placeIds };
    } catch (error: any) {
      console.error('Error reserving seats:', error);
      return { success: false, reserved: [], failed: placeIds };
    } finally {
      setIsReserving(false);
    }
  }, [eventId, sessionId, saveReservations]);

  // Release seats
  const releaseSeats = useCallback(async (placeIds: string[]): Promise<boolean> => {
    if (!sessionId || placeIds.length === 0) {
      return false;
    }

    setIsReleasing(true);
    try {
      await seatAPI.releaseSeats(eventId, placeIds, sessionId);

      // Remove from localStorage
      const storageKey = `seat_reservation_${eventId}`;
      const stored = localStorage.getItem(storageKey);

      if (stored) {
        try {
          const data: ReservationData = JSON.parse(stored);
          const remaining = data.placeIds.filter(id => !placeIds.includes(id));

          if (remaining.length > 0) {
            saveReservations(remaining);
          } else {
            localStorage.removeItem(storageKey);
            setSelectedSeats([]);
          }
        } catch (error) {
          console.error('Error updating localStorage:', error);
        }
      }

      return true;
    } catch (error) {
      console.error('Error releasing seats:', error);
      return false;
    } finally {
      setIsReleasing(false);
    }
  }, [eventId, sessionId, saveReservations]);

  // Add seat to selection
  const addSeat = useCallback(async (placeId: string): Promise<boolean> => {
    if (selectedSeats.includes(placeId)) {
      return true; // Already selected
    }

    const newSeats = [...selectedSeats, placeId];
    const result = await reserveSeats(newSeats);

    if (result.success || result.reserved.includes(placeId)) {
      return true;
    }

    return false;
  }, [selectedSeats, reserveSeats]);

  // Remove seat from selection
  const removeSeat = useCallback(async (placeId: string): Promise<boolean> => {
    if (!selectedSeats.includes(placeId)) {
      return true; // Not selected
    }

    const result = await releaseSeats([placeId]);
    return result;
  }, [selectedSeats, releaseSeats]);

  // Clear all reservations
  const clearReservations = useCallback(async (): Promise<boolean> => {
    if (selectedSeats.length === 0) {
      return true;
    }

    const result = await releaseSeats(selectedSeats);
    return result;
  }, [selectedSeats, releaseSeats]);

  // Get remaining time for reservations
  const getRemainingTime = useCallback((): number => {
    const storageKey = `seat_reservation_${eventId}`;
    const stored = localStorage.getItem(storageKey);

    if (stored) {
      try {
        const data: ReservationData = JSON.parse(stored);
        const elapsed = Date.now() - data.timestamp;
        const remaining = RESERVATION_TTL - elapsed;
        return Math.max(0, remaining);
      } catch (error) {
        return 0;
      }
    }

    return 0;
  }, [eventId]);

  return {
    selectedSeats,
    sessionId,
    isReserving,
    isReleasing,
    reserveSeats,
    releaseSeats,
    addSeat,
    removeSeat,
    clearReservations,
    getRemainingTime
  };
};

