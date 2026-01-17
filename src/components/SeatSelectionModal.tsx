"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { seatAPI } from '@/services/apiClient';
import { useSeatReservation } from '@/hooks/useSeatReservation';
import SeatMap from './SeatMap';
import { getCurrencySymbol } from '@/utils/currency';
import { matchPlaceIdsWithPlaces } from '@/utils/placeIdDecoder';
import { useFocusTrap } from '@/hooks/useFocusTrap';

interface Seat {
  placeId: string;
  x: number | null;
  y: number | null;
  row: string | null;
  seat: string | null;
  section: string | null;
  price: number | null;
  status: 'available' | 'sold' | 'reserved';
}

interface SeatSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (placeIds: string[]) => void;
  eventId: string;
  quantity: number;
  currency?: string;
}

const SeatSelectionModal: React.FC<SeatSelectionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  eventId,
  quantity,
  currency = 'EUR'
}) => {
  const { t: _t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const titleId = 'seat-selection-title';
  const descriptionId = 'seat-selection-description';

  // Focus trap
  useFocusTrap(isOpen, modalRef);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);
  interface SectionBounds {
    minX?: number;
    minY?: number;
    maxX?: number;
    maxY?: number;
    x1?: number;
    y1?: number;
    x2?: number;
    y2?: number;
  }
  interface Section {
    id: string;
    name: string;
    color: string;
    bounds: SectionBounds | null;
    polygon: Array<{ x: number; y: number }> | null;
  }
  const [seatMapData, setSeatMapData] = useState<{
    backgroundSvg: string | null;
    sections: Section[];
    seats: Seat[];
  } | null>(null);
  const [showSeats, setShowSeats] = useState(false);
  const [hoveredSeat, setHoveredSeat] = useState<Seat | null>(null);

  const {
    selectedSeats,
    isReserving,
    addSeat,
    removeSeat,
    clearReservations: _clearReservations,
    getRemainingTime
  } = useSeatReservation(eventId);

  const [remainingTime, setRemainingTime] = useState(0);

  // Load seat map data
  useEffect(() => {
    if (isOpen && eventId) {
      loadSeatMap();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, eventId]);

  // Update remaining time
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      const time = getRemainingTime();
      setRemainingTime(time);
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, getRemainingTime]);

  // Cleanup on close
  useEffect(() => {
    if (!isOpen) {
      // Don't clear reservations on close - let them expire naturally
      // This allows user to come back within 7 minutes
    }
  }, [isOpen]);

  const loadSeatMap = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await seatAPI.getEventSeats(eventId);

      // Get encoded placeIds and places array from response
      const { placeIds = [], sold = [], pricingZones = [], places = [], backgroundSvg, sections = [] } = response.data;

      // Decode and match encoded placeIds with places array
      const matchedPlaces = matchPlaceIdsWithPlaces(placeIds, places);

      // Build seats array with status
      const soldSet = new Set(sold);

      const seats: Seat[] = matchedPlaces.map((place, index) => {
        const placeId = place.placeId;
        let status: 'available' | 'sold' = 'available';
        if (soldSet.has(placeId)) {
          status = 'sold';
        }

        // Get price from pricingZones
        let price: number | null = null;
        for (const zone of pricingZones) {
          if (index >= zone.start && index <= zone.end) {
            price = zone.price;
            break;
          }
        }

        return {
          placeId,
          x: place.x || null,
          y: place.y || null,
          row: place.row || null,
          seat: place.seat || null,
          section: place.section || null,
          price,
          status
        };
      });

      setSeatMapData({
        backgroundSvg,
        sections,
        seats
      });
      setLoading(false);
    } catch (err: unknown) {
      const error = err as Error & { response?: { data?: { message?: string } } };
      console.error('Error loading seat map:', error);
      setError(error.response?.data?.message || 'Failed to load seat map');
      setLoading(false);
    }
  };

  const handleSeatClick = async (placeId: string, seat: Seat) => {
    if (seat.status !== 'available') return;
    if (isReserving) return;

    if (selectedSeats.includes(placeId)) {
      // Remove seat
      await removeSeat(placeId);
    } else {
      // Add seat (check quantity limit)
      if (selectedSeats.length >= quantity) {
        setError(`You can only select up to ${quantity} seat(s)`);
        setTimeout(() => setError(null), 3000);
        return;
      }
      await addSeat(placeId);
    }
  };

  const handleConfirm = () => {
    if (selectedSeats.length !== quantity) {
      setError(`Please select exactly ${quantity} seat(s)`);
      setTimeout(() => setError(null), 3000);
      return;
    }
    onConfirm(selectedSeats);
  };

  const formatTime = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const calculateTotal = (): number => {
    if (!seatMapData) return 0;

    let total = 0;
    selectedSeats.forEach(placeId => {
      const seat = seatMapData.seats.find(s => s.placeId === placeId);
      if (seat && seat.price) {
        total += seat.price;
      }
    });

    return total / 100; // Convert from cents to currency units
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className="relative z-50 w-[95vw] max-w-6xl h-[90vh] rounded-xl p-6 shadow-xl flex flex-col"
        style={{
          background: 'var(--surface)',
          color: 'var(--foreground)',
          borderColor: 'var(--border)',
          borderWidth: 1
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 id={titleId} className="text-2xl font-semibold mb-1">Select Your Seats</h2>
            <p id={descriptionId} className="text-sm opacity-70">
              Select {quantity} seat{quantity !== 1 ? 's' : ''} • {selectedSeats.length} selected
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-2xl leading-none opacity-70 hover:opacity-100"
            aria-label="Close seat selection"
          >
            ×
          </button>
        </div>

        {/* Timer */}
        {remainingTime > 0 && (
          <div className="mb-4 p-2 rounded bg-yellow-500/20 border border-yellow-500/50 text-sm" role="status" aria-live="polite">
            <span className="font-medium">Reservation expires in: {formatTime(remainingTime)}</span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 rounded bg-red-500/20 border border-red-500/50 text-sm text-red-600" role="alert" aria-live="assertive">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex-1 flex items-center justify-center" aria-busy="true" aria-live="polite">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4" aria-hidden="true"></div>
              <p>Loading seat map...</p>
            </div>
          </div>
        )}

        {/* Seat Map */}
        {!loading && seatMapData && (
          <div className="flex-1 min-h-0 mb-4">
            <SeatMap
              backgroundSvg={seatMapData.backgroundSvg}
              sections={seatMapData.sections}
              seats={seatMapData.seats}
              selectedSeats={selectedSeats}
              onSeatClick={handleSeatClick}
              onSeatHover={(placeId) => {
                if (placeId) {
                  const seat = seatMapData.seats.find(s => s.placeId === placeId);
                  setHoveredSeat(seat || null);
                } else {
                  setHoveredSeat(null);
                }
              }}
              showSeats={showSeats}
              onToggleSeats={() => setShowSeats(!showSeats)}
              readOnly={false}
            />
          </div>
        )}

        {/* Selected Seats Info */}
        {selectedSeats.length > 0 && seatMapData && (
          <div className="mb-4 p-4 rounded border" style={{ borderColor: 'var(--border)' }} role="status" aria-live="polite">
            <h3 className="font-semibold mb-2">Selected Seats:</h3>
            <div className="flex flex-wrap gap-2">
              {selectedSeats.map(placeId => {
                const seat = seatMapData.seats.find(s => s.placeId === placeId);
                return (
                  <div
                    key={placeId}
                    className="px-3 py-1 rounded bg-indigo-500/20 border border-indigo-500/50 text-sm"
                  >
                    {seat?.row && seat?.seat ? `${seat.row}-${seat.seat}` : placeId}
                    {seat?.price && (
                      <span className="ml-2 opacity-70">
                        {getCurrencySymbol(currency)}{(seat.price / 100).toFixed(2)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            {selectedSeats.length > 0 && (
              <div className="mt-2 text-sm font-medium">
                Total: {getCurrencySymbol(currency)}{calculateTotal().toFixed(2)}
              </div>
            )}
          </div>
        )}

        {/* Hovered Seat Info */}
        {hoveredSeat && (
          <div className="mb-4 p-2 rounded bg-gray-500/20 text-sm">
            <div className="font-medium">
              {hoveredSeat.row && hoveredSeat.seat ? `Row ${hoveredSeat.row}, Seat ${hoveredSeat.seat}` : hoveredSeat.placeId}
            </div>
            {hoveredSeat.section && (
              <div className="opacity-70">Section: {hoveredSeat.section}</div>
            )}
            {hoveredSeat.price && (
              <div className="opacity-70">
                Price: {getCurrencySymbol(currency)}{(hoveredSeat.price / 100).toFixed(2)}
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded border hover:bg-gray-500/10"
            style={{ borderColor: 'var(--border)' }}
            aria-label="Cancel seat selection"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={selectedSeats.length !== quantity || isReserving}
            className="px-6 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={selectedSeats.length !== quantity ? `Please select ${quantity} seat${quantity !== 1 ? 's' : ''}. Currently selected: ${selectedSeats.length}` : `Confirm ${selectedSeats.length} seat${selectedSeats.length !== 1 ? 's' : ''} selection`}
          >
            {isReserving ? 'Reserving...' : `Confirm ${selectedSeats.length} Seat${selectedSeats.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SeatSelectionModal;

