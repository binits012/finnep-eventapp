"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { seatAPI } from '@/services/apiClient';
import SeatMap from './SeatMap';
import CapjsWidget from './CapjsWidget';
import api from '@/services/apiClient';
import { matchPlaceIdsWithPlaces } from '@/utils/placeIdDecoder';

interface Seat {
  placeId: string;
  x: number | null;
  y: number | null;
  row: string | null;
  seat: string | null;
  section: string | null;
  price: number | null;
  status: 'available' | 'sold';
}

interface Section {
  id: string;
  name: string;
  color: string;
  bounds: any;
  polygon: Array<{ x: number; y: number }> | null;
}

interface SeatSelectionViewProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
  currency?: string;
  onComplete: (data: {
    placeIds: string[];
    email: string;
    fullName: string;
    sessionId: string;
  }) => void;
}

type Step = 'seats' | 'info' | 'otp' | 'payment';

export default function SeatSelectionView({
  isOpen,
  onClose,
  eventId,
  eventTitle,
  currency = 'EUR',
  onComplete
}: SeatSelectionViewProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>('seats');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Seat selection state
  const [seatData, setSeatData] = useState<{
    backgroundSvg: string | null;
    sections: Section[];
    seats: Seat[];
    placeIds: string[];
    sold: string[];
    reserved: string[];
    pricingZones: any[];
  } | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [showSeats, setShowSeats] = useState(true); // Show seats by default

  // User info state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [captchaVerified, setCaptchaVerified] = useState(false);


  // OTP state
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpResendCooldown, setOtpResendCooldown] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Generate UUID for session
  const generateUUID = (): string => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const loadSeatData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);
      const response = await seatAPI.getEventSeats(eventId);

      // Get encoded placeIds and places array from response
      const { placeIds = [], sold = [], reserved = [], pricingZones = [], places = [] } = response.data;

      // Decode and match encoded placeIds with places array
      const matchedPlaces = matchPlaceIdsWithPlaces(placeIds, places);

      // Build seats array with status
      const soldSet = new Set(sold);
      const reservedSet = new Set(reserved);

      const seats: Seat[] = matchedPlaces.map((place, index) => {
        const placeId = place.placeId;
        let status: 'available' | 'sold' = 'available';
        if (soldSet.has(placeId)) {
          status = 'sold';
        }
        // Note: Reserved seats are treated as available for selection

        // Get price from pricingZones
        let price: number | null = null;
        for (const zone of pricingZones) {
          if (index >= zone.start && index <= zone.end) {
            price = zone.price / 100; // Convert from cents
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

      console.log('Seat data loaded:', {
        placeIdsCount: placeIds.length,
        placesCount: places.length,
        matchedPlacesCount: matchedPlaces.length,
        seatsCount: seats.length,
        sectionsCount: response.data.sections?.length || 0,
        hasBackgroundSvg: !!response.data.backgroundSvg,
        sampleSeat: seats[0],
        samplePlace: matchedPlaces[0]
      });

      setSeatData({
        backgroundSvg: response.data.backgroundSvg,
        sections: response.data.sections || [],
        seats,
        placeIds,
        sold,
        reserved,
        pricingZones
      });

      if (showLoading) setLoading(false);
    } catch (err: any) {
      console.error('Error loading seat data:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      setError(err.response?.data?.message || 'Failed to load seat map');
      setLoading(false);
    }
  }, [eventId]);

  // Load seat data
  useEffect(() => {
    if (isOpen && eventId) {
      loadSeatData();
    }
  }, [isOpen, eventId, loadSeatData]);

  // Refresh seat data periodically for real-time updates
  useEffect(() => {
    if (!isOpen || !seatData) return;

    const refreshInterval = setInterval(() => {
      // Silent refresh (no loading indicator) every 30 seconds
      loadSeatData(false);
    }, 30000);

    return () => clearInterval(refreshInterval);
  }, [isOpen, seatData, loadSeatData]);

  // Handle section click - zoom to section and show seats
  const handleSectionClick = useCallback((sectionId: string) => {
    setSelectedSection(sectionId);
    setShowSeats(true);
    // Zoom will be handled by SeatMap component
  }, []);

  // Handle seat click - add to selection (max 10 seats)
  const handleSeatClick = useCallback((placeId: string, seat: Seat) => {
    if (seat.status !== 'available') return;

    if (selectedSeats.includes(placeId)) {
      setSelectedSeats(selectedSeats.filter(id => id !== placeId));
    } else {
      // Limit to maximum 10 seats
      if (selectedSeats.length >= 10) {
        setError('Maximum 10 seats can be selected at a time');
        setTimeout(() => setError(null), 3000);
        return;
      }
      setSelectedSeats([...selectedSeats, placeId]);
    }
  }, [selectedSeats]);

  // Calculate total price
  const totalPrice = useMemo(() => {
    if (!seatData) return 0;
    return selectedSeats.reduce((sum, placeId) => {
      const seat = seatData.seats.find(s => s.placeId === placeId);
      return sum + (seat?.price || 0);
    }, 0);
  }, [selectedSeats, seatData]);

  // Step 1: Proceed to user info
  const handleProceedToInfo = () => {
    if (selectedSeats.length === 0) {
      setError('Please select at least one seat');
      return;
    }
    setStep('info');
    setError(null);
  };

  // Step 2: Send OTP
  const handleSendOTP = async () => {
    if (!fullName.trim() || !email.trim() || !captchaVerified) {
      setError('Please fill in all fields and complete CAPTCHA');
      return;
    }

    try {
      setError(null);
      // Call backend to send OTP
      // TODO: Implement OTP sending endpoint
      await api.post(`/event/${eventId}/seats/send-otp`, {
        email,
        fullName,
        placeIds: selectedSeats
      });

      setOtpSent(true);
      setStep('otp');
      // Generate sessionId after OTP is sent
      const newSessionId = generateUUID();
      setSessionId(newSessionId);

      // Start cooldown timer
      setOtpResendCooldown(60);
      const interval = setInterval(() => {
        setOtpResendCooldown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    }
  };

  // Step 3: Verify OTP and reserve seats
  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 8) {
      setError('Please enter 8-digit OTP');
      return;
    }

    try {
      setError(null);
      // Verify OTP
      await api.post(`/event/${eventId}/seats/verify-otp`, {
        email,
        otp,
        placeIds: selectedSeats
      });

      // Reserve seats with sessionId (10 min hold starts now)
      if (sessionId) {
        const reservationResult = await seatAPI.reserveSeats(eventId, selectedSeats, sessionId);

        // Check if any seats failed to reserve (race condition)
        if (reservationResult.data.failed && reservationResult.data.failed.length > 0) {
          // Some seats are no longer available - refresh data and show error
          await loadSeatData(false); // Silent refresh
          setError(`Some seats are no longer available: ${reservationResult.data.failed.join(', ')}`);
          return;
        }

        // All seats reserved successfully - refresh for real-time updates
        await loadSeatData(false);
      }

      setStep('payment');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid OTP');
    }
  };

  // Step 4: Complete payment
  const handleComplete = () => {
    if (!sessionId) return;

    onComplete({
      placeIds: selectedSeats,
      email,
      fullName,
      sessionId
    });
  };

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setStep('seats');
      setSelectedSeats([]);
      setSelectedSection(null);
      setShowSeats(false);
      setFullName('');
      setEmail('');
      setCaptchaVerified(false);
      setOtp('');
      setOtpSent(false);
      setSessionId(null);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
      <div
        className="relative z-50 w-[95vw] max-w-4xl max-h-[90vh] rounded-xl p-6 shadow-xl overflow-y-auto"
        style={{ background: 'var(--surface)', color: 'var(--foreground)', borderColor: 'var(--border)', borderWidth: 1 }}
        role="dialog"
        aria-modal="true"
        aria-label="Seat selection"
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">{eventTitle}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Step Indicator */}
        <div className="flex justify-center mb-6">
          <div className="flex gap-2">
            <div className={`px-4 py-2 rounded ${step === 'seats' ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
              1. Select Seats
            </div>
            <div className={`px-4 py-2 rounded ${step === 'info' ? 'bg-indigo-600 text-white' : step === 'otp' || step === 'payment' ? 'bg-green-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
              2. Your Info
            </div>
            <div className={`px-4 py-2 rounded ${step === 'otp' ? 'bg-indigo-600 text-white' : step === 'payment' ? 'bg-green-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
              3. Verify
            </div>
            <div className={`px-4 py-2 rounded ${step === 'payment' ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
              4. Payment
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Step 1: Seat Selection */}
        {step === 'seats' && (
          <div>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <p>Loading seat map...</p>
              </div>
            ) : seatData ? (
              <>
                <div className="mb-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Click on a section to zoom in and select seats
                  </p>
                  <div className="p-3 rounded bg-blue-50 dark:bg-blue-900/20 mb-2"
                    style={{
                      WebkitFontSmoothing: 'antialiased',
                      MozOsxFontSmoothing: 'grayscale',
                      textRendering: 'optimizeLegibility'
                    }}
                  >
                    <p className="font-semibold" style={{ color: 'var(--foreground)' }}>
                      Selected: {selectedSeats.length} / 10 seat(s)
                    </p>
                    {selectedSeats.length > 0 && (
                      <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.8 }}>
                        Total: {totalPrice.toFixed(2)} {currency}
                      </p>
                    )}
                  </div>
                </div>
                <div className="h-[500px] mb-4">
                  {seatData.seats.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <p>No seats available</p>
                    </div>
                  ) : (
                    <SeatMap
                      backgroundSvg={seatData.backgroundSvg}
                      sections={seatData.sections}
                      seats={seatData.seats.filter(s => !selectedSection || s.section === selectedSection)}
                      selectedSeats={selectedSeats}
                      onSeatClick={handleSeatClick}
                      showSeats={true}
                      readOnly={false}
                      viewMode={selectedSection ? 'section' : 'full'}
                      selectedSection={selectedSection}
                      onSectionClick={handleSectionClick}
                    />
                  )}
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={handleProceedToInfo}
                    disabled={selectedSeats.length === 0}
                    className="px-6 py-2 rounded-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    Proceed
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-red-600">Failed to load seat map</p>
              </div>
            )}
          </div>
        )}

        {/* Step 2: User Info + CAPTCHA */}
        {step === 'info' && (
          <div className="max-w-md mx-auto">
            <h3 className="text-xl font-semibold mb-4">Your Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">CAPTCHA</label>
                <CapjsWidget
                  onVerify={() => setCaptchaVerified(true)}
                  onError={() => setCaptchaVerified(false)}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep('seats')}
                  className="flex-1 px-4 py-2 rounded-lg border font-medium"
                  style={{ borderColor: 'var(--border)' }}
                >
                  Back
                </button>
                <button
                  onClick={handleSendOTP}
                  disabled={!fullName.trim() || !email.trim() || !captchaVerified}
                  className="flex-1 px-4 py-2 rounded-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Send OTP
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: OTP Verification */}
        {step === 'otp' && (
          <div className="max-w-md mx-auto text-center">
            <h3 className="text-xl font-semibold mb-4">Verify Your Email</h3>
            <div className="p-4 rounded bg-yellow-50 dark:bg-yellow-900/20 mb-4">
              <p className="font-semibold text-yellow-800 dark:text-yellow-200">
                Your tickets are now held for the next 10 minutes
              </p>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              We have sent an 8-digit code to <strong>{email}</strong>
            </p>
            <div className="mb-4">
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 8))}
                placeholder="Enter 8-digit code"
                className="w-full px-4 py-3 text-center text-2xl tracking-widest border rounded-lg"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                maxLength={8}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStep('info')}
                className="flex-1 px-4 py-2 rounded-lg border font-medium"
                style={{ borderColor: 'var(--border)' }}
              >
                Back
              </button>
              <button
                onClick={handleVerifyOTP}
                disabled={otp.length !== 8}
                className="flex-1 px-4 py-2 rounded-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Verify
              </button>
            </div>
            {otpResendCooldown > 0 ? (
              <p className="text-sm text-gray-500 mt-2">
                Resend code in {otpResendCooldown}s
              </p>
            ) : (
              <button
                onClick={handleSendOTP}
                className="text-sm text-indigo-600 hover:text-indigo-700 mt-2"
              >
                Resend code
              </button>
            )}
          </div>
        )}

        {/* Step 4: Payment */}
        {step === 'payment' && (
          <div className="max-w-md mx-auto">
            <h3 className="text-xl font-semibold mb-4">Complete Payment</h3>
            <div className="space-y-4">
              <div className="p-4 rounded border" style={{ borderColor: 'var(--border)' }}>
                <h4 className="font-semibold mb-2">Event Details</h4>
                <p className="text-sm">{eventTitle}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{email}</p>
              </div>
              <div className="p-4 rounded border" style={{ borderColor: 'var(--border)' }}>
                <h4 className="font-semibold mb-2">Selected Seats</h4>
                <p className="text-sm">{selectedSeats.length} seat(s)</p>
                <p className="text-lg font-bold mt-2">Total: {totalPrice.toFixed(2)} {currency}</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep('otp')}
                  className="flex-1 px-4 py-2 rounded-lg border font-medium"
                  style={{ borderColor: 'var(--border)' }}
                >
                  Back
                </button>
                <button
                  onClick={handleComplete}
                  className="flex-1 px-4 py-2 rounded-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Proceed to Payment
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

