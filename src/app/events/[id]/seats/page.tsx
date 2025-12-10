'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { seatAPI } from '@/services/apiClient';
import SeatMap from '@/components/SeatMap';
import CapjsWidget from '@/components/CapjsWidget';
import api from '@/services/apiClient';
import { matchPlaceIdsWithPlaces, decodePlaceId } from '@/utils/placeIdDecoder';
import { useTranslation } from '@/hooks/useTranslation';
import Link from 'next/link';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { FaCreditCard, FaLock } from 'react-icons/fa';
import { getCurrencySymbol, getCurrencyCode } from '@/utils/currency';
import SuccessPage from '@/app/success/page';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// Helper to format currency without rounding up (truncate to 2 decimals)
const formatCurrency = (value: number): string => {
  // Truncate to 2 decimal places (don't round up)
  const truncated = Math.floor(value * 100) / 100;
  // Format to 2 decimal places
  return truncated.toFixed(2);
};

// Helper to obfuscate email for privacy
const obfuscateEmail = (email: string): string => {
  if (!email || !email.includes('@')) return email;

  const [localPart, domain] = email.split('@');

  // If local part is very short, show first char + ***
  if (localPart.length <= 2) {
    return `${localPart.charAt(0)}***@${domain}`;
  }

  // Show first 2-3 chars + *** + @
  const visibleChars = Math.min(3, Math.max(1, Math.floor(localPart.length / 2)));
  const obfuscated = localPart.substring(0, visibleChars) + '***';

  return `${obfuscated}@${domain}`;
};

interface Seat {
  placeId: string;
  x: number | null;
  y: number | null;
  row: string | null;
  seat: string | null;
  section: string | null;
  price: number | null;
  status: 'available' | 'sold';
  // Pricing fields from enriched manifest (when pricingModel === 'pricing_configuration')
  basePrice?: number;
  tax?: number;
  serviceFee?: number;
  serviceTax?: number;
  orderFee?: number;
  currency?: string;
}

interface TicketInfo {
  _id: string;
  name: string;
  price: number;
  serviceFee?: number;
  entertainmentTax?: number;
  serviceTax?: number;
  orderFee?: number;
  vat?: number;
}

interface Section {
  id: string;
  name: string;
  color: string;
  bounds: any;
  polygon: Array<{ x: number; y: number }> | null;
}

type Step = 'seats' | 'info' | 'otp' | 'payment';

// Helper function to extract numeric part from seat identifier
const extractNumericSeat = (seat: string | null): number | null => {
  if (!seat) return null;
  // Extract all digits and convert to number
  const numericPart = seat.replace(/\D/g, '');
  const num = parseInt(numericPart, 10);
  return isNaN(num) ? null : num;
};

// Helper function to check if two seat strings are adjacent (for non-numeric seats)
const areAdjacentStrings = (seat1: string, seat2: string): boolean => {
  if (!seat1 || !seat2) return false;

  // Simple alphabetical adjacency (A next to B, etc.)
  const char1 = seat1.toUpperCase();
  const char2 = seat2.toUpperCase();

  // If one character different, check if adjacent in alphabet
  if (char1.length === 1 && char2.length === 1) {
    return Math.abs(char1.charCodeAt(0) - char2.charCodeAt(0)) === 1;
  }

  // For multi-character seats, check if they differ by 1 in numeric part
  const num1 = extractNumericSeat(seat1);
  const num2 = extractNumericSeat(seat2);

  if (num1 !== null && num2 !== null) {
    return Math.abs(num1 - num2) === 1;
  }

  return false;
};

export default function SeatSelectionPage() {
  const params = useParams(); 
  const { t } = useTranslation();
  const eventId = params?.id as string;

  const [step, setStep] = useState<Step>('seats');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eventTitle, setEventTitle] = useState<string>('');
  const [currency, setCurrency] = useState<string>('EUR');
  const [merchantId, setMerchantId] = useState<string>('');
  const [externalMerchantId, setExternalMerchantId] = useState<string>('');

  // Seat selection state
  const [seatData, setSeatData] = useState<{
    backgroundSvg: {
      svgContent?: string;
      sourceUrl?: string;
      sourceType?: string;
      opacity?: number;
      scale?: number;
      translateX?: number;
      translateY?: number;
      rotation?: number;
      isVisible?: boolean;
      displayConfig?: {
        dotSize?: number;
        rowGap?: number;
        seatGap?: number;
      };
    } | string | null;
    sections: Section[];
    seats: Seat[];
    placeIds: string[];
    sold: string[];
    reserved: string[];
    pricingZones: any[];
  } | null>(null);

  const [pricingConfig, setPricingConfig] = useState<{
    currency: string;
    orderFee: number;
    orderTax: number;
    tiers: Array<{
      id: string;
      basePrice: number;
      tax: number;
      serviceFee: number;
      serviceTax: number;
    }>;
  } | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  // Map of placeId -> ticketId for each selected seat
  const [seatTicketMap, setSeatTicketMap] = useState<Record<string, string>>({});
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [showSeats, setShowSeats] = useState(true);
  const [ticketTypes, setTicketTypes] = useState<TicketInfo[]>([]);
  const [showTicketSelector, setShowTicketSelector] = useState(false);
  const [pendingSeat, setPendingSeat] = useState<{ placeId: string; seat: Seat } | null>(null);
  const [pricingModel, setPricingModel] = useState<'ticket_info' | 'pricing_configuration' | null>(null);

  // User info state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [captchaVerified, setCaptchaVerified] = useState(false);

  // OTP state
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpResendCooldown, setOtpResendCooldown] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Payment state
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [successTicketData, setSuccessTicketData] = useState<any>(null);

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

  // Load event and seat data
  useEffect(() => {
    if (eventId) {
      loadEventAndSeatData();
    }
  }, [eventId]);

  const loadEventAndSeatData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load event details first
      const eventResponse = await api.get(`/event/${eventId}`) as { event: {
        eventTitle?: string;
        country?: string;
        ticketInfo?: TicketInfo[];
        merchantId?: string;
        externalMerchantId?: string;
        venue?: {
          pricingModel?: 'ticket_info' | 'pricing_configuration';
        };
        merchant?: {
          _id?: string;
          merchantId?: string;
        };
      } };
      const event = eventResponse.event;
      setEventTitle(event.eventTitle || 'Select Seats');
      setCurrency(event.country ? getCurrencyCode(event.country) : 'EUR');

      // Store merchant IDs
      setMerchantId(event.merchantId || event.merchant?._id || event.merchant?.merchantId || '');
      setExternalMerchantId(event.externalMerchantId || '');

      // Store pricing model
      const model = event.venue?.pricingModel || 'ticket_info';
      setPricingModel(model);

      // Load ticket types (only if pricingModel is 'ticket_info')
      if (model === 'ticket_info' && event.ticketInfo && event.ticketInfo.length > 0) {
        setTicketTypes(event.ticketInfo);
      }

      // Load seat data
      const response = await seatAPI.getEventSeats(eventId);

      // Get pricingModel from response if not already set from event
      const responseData = response.data as any;
      if (responseData?.venue?.pricingModel) {
        setPricingModel(responseData.venue.pricingModel);
      }

      // Store pricingConfig if available
      if (responseData?.pricingConfig) {
        setPricingConfig(responseData.pricingConfig);
        console.log('PricingConfig loaded:', responseData.pricingConfig);
      }

      // Get encoded placeIds and places array from response
      const { placeIds = [], sold = [], reserved = [], pricingZones = [], places = [], pricingConfig: responsePricingConfig } = responseData;

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
        // Note: Reserved seats are treated as available for selection

        // Get price from pricingZones (fallback)
        let price: number | null = null;
        for (const zone of pricingZones) {
          if (index >= zone.start && index <= zone.end) {
            price = zone.price / 100; // Convert from cents
            break;
          }
        }

        // If pricingModel is 'pricing_configuration', extract pricing from place object
        const seatData: Seat = {
          placeId,
          x: place.x || null,
          y: place.y || null,
          row: place.row || null,
          seat: place.seat || null,
          section: place.section || null,
          price,
          status
        };

        // Extract pricing fields from enriched manifest (when pricingModel === 'pricing_configuration')
        if (pricingModel === 'pricing_configuration') {
          let pricing = place.pricing;

          // If pricing is not directly available on place, decode from placeId using pricingConfig
          if (!pricing && pricingConfig && placeId) {
            const decoded = decodePlaceId(placeId);
            if (decoded && decoded.tierCode && pricingConfig.tiers) {
              const tier = pricingConfig.tiers.find(t => t.id === decoded.tierCode);
              if (tier) {
                pricing = {
                  basePrice: tier.basePrice,
                  tax: tier.tax,
                  serviceFee: tier.serviceFee,
                  serviceTax: tier.serviceTax,
                  orderFee: pricingConfig.orderFee || 0,
                  currency: pricingConfig.currency || currency
                };
              }
            }
          }

          // Apply pricing data if available
          if (pricing) {
            seatData.basePrice = pricing.basePrice || 0;
            seatData.tax = pricing.tax || 0;
            seatData.serviceFee = pricing.serviceFee || 0;
            seatData.serviceTax = pricing.serviceTax || 0;
            seatData.orderFee = pricing.orderFee || 0;
            seatData.currency = pricing.currency || currency;

            // Calculate total price from pricing fields
            const basePrice = seatData.basePrice || 0;
            const taxPercent = (seatData.tax || 0) / 100;
            const serviceFee = seatData.serviceFee || 0;
            const serviceTaxPercent = (seatData.serviceTax || 0) / 100;

            // Per seat: basePrice + (basePrice * tax) + serviceFee + (serviceFee * serviceTax)
            seatData.price = basePrice + (basePrice * taxPercent) + serviceFee + (serviceFee * serviceTaxPercent);
          }
        }

        return seatData;
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
      setLoading(false);
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
  };

  // Handle section click - zoom to section and show seats
  const handleSectionClick = useCallback((sectionId: string) => {
    setSelectedSection(sectionId);
    setShowSeats(true);
  }, []);

  // Check if two seats are physically adjacent to each other (ignoring status)
  // This checks the physical layout, not availability
  // Check if two seats are physically adjacent using multiple criteria
  const areSeatsPhysicallyAdjacent = useCallback((seat1: Seat, seat2: Seat): boolean => {
    // Must be in same section
    if (seat1.section !== seat2.section) return false;

    // Priority 1: Same row adjacency (most reliable)
    if (seat1.row === seat2.row && seat1.row && seat2.row) {
      // Try numeric seat comparison first
      const seat1Num = extractNumericSeat(seat1.seat);
      const seat2Num = extractNumericSeat(seat2.seat);

      if (seat1Num !== null && seat2Num !== null) {
        // Adjacent if seat numbers differ by exactly 1
        return Math.abs(seat1Num - seat2Num) === 1;
      }

      // Fallback: alphabetical comparison for non-numeric seats
      if (seat1.seat && seat2.seat) {
        return areAdjacentStrings(seat1.seat, seat2.seat);
      }
    }

    // Priority 2: STRICT cross-row adjacency (only immediately adjacent rows)
    // This prevents "jumping" over rows and creating stranded seats
    if (seat1.row !== seat2.row &&
        seat1.section === seat2.section &&
        seat1.x !== null && seat1.y !== null &&
        seat2.x !== null && seat2.y !== null) {

      // Only allow adjacency between immediately adjacent rows
      const row1 = extractNumericSeat(seat1.row);
      const row2 = extractNumericSeat(seat2.row);

      if (row1 !== null && row2 !== null && Math.abs(row1 - row2) === 1) {
        // Check if seats are in the same "column" (similar seat numbers)
        const seat1Num = extractNumericSeat(seat1.seat);
        const seat2Num = extractNumericSeat(seat2.seat);

        if (seat1Num !== null && seat2Num !== null && Math.abs(seat1Num - seat2Num) <= 1) {
          const distance = Math.sqrt(
            Math.pow(seat1.x - seat2.x, 2) + Math.pow(seat1.y - seat2.y, 2)
          );
          // Very strict threshold for cross-row connections
          return distance <= 60;
        }
      }
    }

    return false;
  }, [seatData]);

  // Check if two seats are adjacent considering sold seats as barriers
  const areSeatsAdjacentWithStatus = useCallback((seat1: Seat, seat2: Seat): boolean => {
    // Both seats must be available
    if (seat1.status !== 'available' || seat2.status !== 'available') {
      return false;
    }

    // Must be physically adjacent first
    if (!areSeatsPhysicallyAdjacent(seat1, seat2)) {
      return false;
    }

    // For same row connections, check if sold seats block the path
    if (seat1.row === seat2.row && seat1.section === seat2.section && seatData) {
      // Get all seats in the same row and section
      const rowSeats = seatData.seats.filter(s =>
        s.section === seat1.section &&
        s.row === seat1.row
      ).sort((a, b) => {
        // Sort by x-coordinate first (left to right), then by seat number as fallback
        if (a.x !== null && b.x !== null && a.x !== b.x) {
          return a.x - b.x;
        }
        // Fallback to seat numbering
        const aNum = extractNumericSeat(a.seat);
        const bNum = extractNumericSeat(b.seat);
        if (aNum !== null && bNum !== null) {
          return aNum - bNum;
        }
        return String(a.seat || '').localeCompare(String(b.seat || ''));
      });

      // Find positions of our two seats
      const seat1Index = rowSeats.findIndex(s => s.placeId === seat1.placeId);
      const seat2Index = rowSeats.findIndex(s => s.placeId === seat2.placeId);

      if (seat1Index !== -1 && seat2Index !== -1) {
        const start = Math.min(seat1Index, seat2Index);
        const end = Math.max(seat1Index, seat2Index);

        // Check if any seats between them (exclusive) are sold
        for (let i = start + 1; i < end; i++) {
          if (rowSeats[i].status === 'sold') {
            return false; // Sold seat blocks the connection
          }
        }
      }
    }

    return true;
  }, [seatData, areSeatsPhysicallyAdjacent]);

  // Check if a seat is adjacent to any selected seats (only considering available seats)
  // Sold seats cannot be used as connection points, and sold seats between seats block connectivity
  const isSeatAdjacent = useCallback((seat: Seat, selectedPlaceIds: string[]): boolean => {
    if (!seatData || selectedPlaceIds.length === 0) return true; // First seat is always allowed

    // The seat being checked must be available (not sold)
    if (seat.status !== 'available') return false;

    // Get all selected seats that are available (sold seats don't count as connection points)
    const selectedSeatObjects = seatData.seats.filter(s =>
      selectedPlaceIds.includes(s.placeId) && s.status === 'available'
    );

    // Check if clicked seat is adjacent to any available selected seat (considering sold seats block paths)
    for (const selectedSeat of selectedSeatObjects) {
      if (areSeatsAdjacentWithStatus(seat, selectedSeat)) {
        return true;
      }
    }

    return false;
  }, [seatData, areSeatsAdjacentWithStatus]);

  // Check if all selected seats form a connected group (no stranded seats)
  // Uses graph connectivity: all seats must be reachable from each other
  // Sold seats block connectivity - you cannot "jump over" a sold seat
  const areSeatsConnected = useCallback((placeIds: string[]): boolean => {
    if (!seatData || placeIds.length <= 1) return true; // 0 or 1 seat is always connected

    // Get all selected seat objects (must all be available - we can't select sold seats)
    const selectedSeatObjects = seatData.seats.filter(s =>
      placeIds.includes(s.placeId) && s.status === 'available'
    );

    // If any selected seat is sold or not found, the selection is invalid
    if (selectedSeatObjects.length !== placeIds.length) return false;

    // Build adjacency graph (only between available selected seats, considering sold seats block paths)
    const adjacencyMap = new Map<string, string[]>();
    for (let i = 0; i < selectedSeatObjects.length; i++) {
      const seat1 = selectedSeatObjects[i];
      const neighbors: string[] = [];

      for (let j = 0; j < selectedSeatObjects.length; j++) {
        if (i !== j) {
          const seat2 = selectedSeatObjects[j];
          // Check adjacency considering sold seats block connectivity
          if (areSeatsAdjacentWithStatus(seat1, seat2)) {
            neighbors.push(seat2.placeId);
          }
        }
      }
      adjacencyMap.set(seat1.placeId, neighbors);
    }

    // Check connectivity using BFS: all seats must be reachable from the first seat
    if (selectedSeatObjects.length === 0) return true;
    const startPlaceId = selectedSeatObjects[0].placeId;
    const visited = new Set<string>();
    const queue = [startPlaceId];
    visited.add(startPlaceId);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const neighbors = adjacencyMap.get(current) || [];

      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    // All seats must be visited (connected)
    return visited.size === placeIds.length;
  }, [seatData, areSeatsAdjacentWithStatus]);

  // Handle seat click - add to selection (max 10 seats)
  const handleSeatClick = useCallback((placeId: string, seat: Seat) => {
    if (seat.status !== 'available') return;

    // If seat is already selected, remove it (with validation)
    if (selectedSeats.includes(placeId)) {
      const newSelectedSeats = selectedSeats.filter(id => id !== placeId);

      // Validate that remaining seats are still connected (no stranded seats after deselection)
      if (newSelectedSeats.length > 1 && !areSeatsConnected(newSelectedSeats)) {
        console.log('❌ Seat deselection blocked:', {
          deselectedSeat: placeId,
          remainingSeats: newSelectedSeats.length,
          reason: 'would create disconnected groups'
        });
        setError(t('seatSelection.cannotDeselectStranded') || 'Cannot deselect this seat as it would leave other seats isolated. Please deselect seats in a way that keeps your selection connected.');
        setTimeout(() => setError(null), 3000);
        return;
      }

      setSelectedSeats(newSelectedSeats);
      const newMap = { ...seatTicketMap };
      delete newMap[placeId];
      setSeatTicketMap(newMap);
      return;
    }

    // Limit to maximum 10 seats
    if (selectedSeats.length >= 10) {
      setError(t('seatSelection.maxSeatsReached') || 'Maximum 10 seats can be selected at a time');
      setTimeout(() => setError(null), 3000);
      return;
    }

    // Check if seat is stranded (not adjacent to any selected seats)
    // Allow first seat selection, but prevent isolated seats after that
    // This check applies to ALL pricing models, including pricing_configuration
    if (selectedSeats.length > 0 && !isSeatAdjacent(seat, selectedSeats)) {
      console.log('❌ Seat selection blocked:', {
        seat: `${seat.section}-${seat.row}-${seat.seat}`,
        placeId: seat.placeId,
        selectedSeats: selectedSeats.length,
        reason: 'not adjacent to any selected seat'
      });
      setError(t('seatSelection.seatsMustBeAdjacent') || 'Please select seats that are adjacent to your current selection');
      setTimeout(() => setError(null), 3000);
      return;
    }

    // If pricingModel is 'pricing_configuration', use seat pricing directly (no ticket selector)
    if (pricingModel === 'pricing_configuration') {
      setSelectedSeats([...selectedSeats, placeId]);
      return;
    }

    // If ticket types are available, show ticket selector
    if (ticketTypes.length > 0) {
      setPendingSeat({ placeId, seat });
      setShowTicketSelector(true);
    } else {
      // No ticket types, just add seat (fallback)
      setSelectedSeats([...selectedSeats, placeId]);
    }
  }, [selectedSeats, seatTicketMap, ticketTypes, pricingModel, isSeatAdjacent, areSeatsConnected, t]);

  // Handle ticket type selection for a seat
  const handleTicketSelect = useCallback((ticketId: string) => {
    if (!pendingSeat) return;

    const { placeId } = pendingSeat;
    setSelectedSeats([...selectedSeats, placeId]);
    setSeatTicketMap({ ...seatTicketMap, [placeId]: ticketId });
    setShowTicketSelector(false);
    setPendingSeat(null);
  }, [pendingSeat, selectedSeats, seatTicketMap]);

  // Calculate total price using ticket pricing or seat pricing
  const totalPrice = useMemo(() => {
    if (!seatData) return 0;

    // If pricingModel is 'pricing_configuration', use seat pricing from enriched manifest
    if (pricingModel === 'pricing_configuration') {
      let total = 0;
      let orderFee = 0;
      let orderFeeTax = 0;

      selectedSeats.forEach((placeId) => {
        const seat = seatData.seats.find(s => s.placeId === placeId);
        if (!seat) return;

        // Use pricing from seat (already calculated in loadEventAndSeatData)
        const seatPrice = seat.price || 0;
        total += seatPrice;

        // Order fee (only add once, use first seat's orderFee)
        if (orderFee === 0 && seat.orderFee) {
          orderFee = seat.orderFee;
          const serviceTaxPercent = (seat.serviceTax || 0) / 100;
          orderFeeTax = orderFee * serviceTaxPercent; // Service tax on order fee
        }
      });

      // Add order fee + tax on order fee (once per transaction)
      total += orderFee + orderFeeTax;

      const finalTotal = Math.floor(total * 100) / 100; // Truncate to 2 decimals


      return finalTotal;
    }

    // Otherwise, use ticket pricing
    if (!ticketTypes.length) return 0;

    let total = 0;
    let orderFee = 0;
    let orderFeeTax = 0;

    // Calculate per-ticket prices
    selectedSeats.forEach((placeId) => {
      const ticketId = seatTicketMap[placeId];
      if (!ticketId) return;

      const ticket = ticketTypes.find(t => t._id === ticketId);
      if (!ticket) return;

      const basePrice = ticket.price || 0;
      const entertainmentTax = (ticket.entertainmentTax || 0) / 100;
      const serviceFee = ticket.serviceFee || 0;
      const serviceTax = (ticket.serviceTax || 0) / 100;

      // Per ticket: basePrice + (basePrice * entertainmentTax) + serviceFee + (serviceFee * serviceTax)
      const ticketPrice = basePrice + (basePrice * entertainmentTax) + serviceFee + (serviceFee * serviceTax);
      total += ticketPrice;

      // Order fee (only add once, use first ticket's orderFee)
      if (orderFee === 0) {
        orderFee = ticket.orderFee || 0;
        orderFeeTax = (ticket.serviceTax || 0) / 100; // Service tax on order fee
      }
    });

    // Add order fee + tax on order fee (once per transaction)
    total += orderFee + (orderFee * orderFeeTax);

    return Math.round(total * 100) / 100; // Round to 2 decimals
  }, [selectedSeats, seatTicketMap, ticketTypes, seatData, pricingModel]);

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
      await api.post(`/event/${eventId}/seats/send-otp`, {
        email,
        fullName,
        placeIds: selectedSeats
      });

      setOtpSent(true);
      setStep('otp');
      const newSessionId = generateUUID();
      setSessionId(newSessionId);

      setOtpResendCooldown(300);
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
      await api.post(`/event/${eventId}/seats/verify-otp`, {
        email,
        otp,
        placeIds: selectedSeats
      });

      if (sessionId) {
        await seatAPI.reserveSeats(eventId, selectedSeats, sessionId, email);
        // Refresh seat data to show newly reserved seats
        await loadEventAndSeatData();
      }

      setStep('payment');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid OTP');
    }
  };

  // Build checkout data for payment
  const getCheckoutData = useCallback(() => {
    // If pricingModel is 'pricing_configuration', use seat pricing
    if (pricingModel === 'pricing_configuration' && seatData) {
      // Build seat-ticket mapping with individual pricing for each seat
      const seatTickets = selectedSeats.map(placeId => {
        const seat = seatData.seats.find(s => s.placeId === placeId);
        return {
          placeId,
          ticketId: null, // No ticket ID for pricing_configuration
          ticketName: `Seat ${seat?.section || ''}${seat?.row || ''}${seat?.seat || ''}`.trim(),
          pricing: seat ? {
            basePrice: seat.basePrice || 0,
            tax: seat.tax || 0,
            serviceFee: seat.serviceFee || 0,
            serviceTax: seat.serviceTax || 0,
            orderFee: seat.orderFee || 0,
            currency: seat.currency || 'EUR'
          } : null
        };
      });

      // Get pricing from first seat (for legacy fields)
      const firstSeat = seatData.seats.find(s => selectedSeats.includes(s.placeId));

      return {
        email,
        quantity: selectedSeats.length,
        eventId,
        externalMerchantId: externalMerchantId,
        merchantId: merchantId,
        ticketId: null, // No ticket ID for pricing_configuration
        ticketName: `${selectedSeats.length} Seat(s)`,
        price: firstSeat?.basePrice || 0,
        serviceFee: firstSeat?.serviceFee || 0,
        vat: firstSeat?.tax || 0,
        entertainmentTax: firstSeat?.tax || 0, // tax is entertainment tax
        serviceTax: firstSeat?.serviceTax || 0,
        orderFee: firstSeat?.orderFee || 0,
        eventName: eventTitle,
        country: 'Finland',
        marketingOptIn: false,
        perUnitSubtotal: 0,
        perUnitVat: 0,
        total: totalPrice,
        placeIds: selectedSeats,
        seatTickets, // Individual pricing for each seat
        sessionId: sessionId,
        fullName: fullName
      };
    }

    // Otherwise, use ticket pricing
    // Build seat-ticket mapping
    const seatTickets = selectedSeats.map(placeId => {
      const ticketId = seatTicketMap[placeId];
      const ticket = ticketTypes.find(t => t._id === ticketId);
      return {
        placeId,
        ticketId: ticketId || null,
        ticketName: ticket?.name || 'Standard'
      };
    });

    // Use first ticket for legacy fields (for backward compatibility)
    const firstTicketId = seatTickets[0]?.ticketId;
    const firstTicket = ticketTypes.find(t => t._id === firstTicketId);

    return {
      email,
      quantity: selectedSeats.length,
      eventId,
      externalMerchantId: externalMerchantId,
      merchantId: merchantId,
      ticketId: firstTicketId || null,
      ticketName: `${selectedSeats.length} Seat(s)`,
      price: firstTicket?.price || 0,
      serviceFee: firstTicket?.serviceFee || 0,
      vat: firstTicket?.vat || 0,
      entertainmentTax: firstTicket?.entertainmentTax || 0,
      serviceTax: firstTicket?.serviceTax || 0,
      orderFee: firstTicket?.orderFee || 0,
      eventName: eventTitle,
      country: 'Finland',
      marketingOptIn: false,
      perUnitSubtotal: 0,
      perUnitVat: 0,
      total: totalPrice,
      placeIds: selectedSeats,
      seatTickets,
      sessionId: sessionId,
      fullName: fullName
    };
  }, [selectedSeats, seatTicketMap, ticketTypes, email, eventId, eventTitle, totalPrice, sessionId, fullName, merchantId, externalMerchantId, pricingModel, seatData]);

  // Show success page if payment succeeded
  if (successTicketData) {
    return <SuccessPage ticketData={successTicketData} />;
  }

  return (
    <Elements stripe={stripePromise}>
      <div className="min-h-screen" style={{ background: 'var(--surface)', color: 'var(--foreground)' }}>
        <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <Link
            href={`/events/${eventId}`}
            className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 mb-4 inline-block"
          >
            ← {t('common.back') || 'Back to Event'}
          </Link>
          <h1 className="text-2xl font-bold mt-2">{eventTitle || t('seatSelection.selectSeats') || 'Select Seats'}</h1>
        </div>

        {/* Modern Step Indicator */}
        <div className="mb-6">
          <div className="max-w-xl">
            <div className="flex items-center justify-between relative gap-2">
              {/* Progress Line */}
              <div className="absolute top-3 left-0 right-0 h-0.5 z-0" style={{ background: 'var(--border)' }}>
                <div
                  className="h-full transition-all duration-300 ease-in-out"
                  style={{
                    background: step === 'payment' ? '#10b981' : '#6366f1',
                    width: step === 'seats' ? '0%' : step === 'info' ? '33%' : step === 'otp' ? '66%' : '100%'
                  }}
                />
              </div>

              {/* Step Items */}
              {[
                { key: 'seats', number: 1, labelKey: 'seatSelection.steps.selectSeats', defaultLabel: 'Select Seats' },
                { key: 'info', number: 2, labelKey: 'seatSelection.steps.yourInfo', defaultLabel: 'Your Info' },
                { key: 'otp', number: 3, labelKey: 'seatSelection.steps.verify', defaultLabel: 'Verify' },
                { key: 'payment', number: 4, labelKey: 'seatSelection.steps.payment', defaultLabel: 'Payment' }
              ].map((stepItem) => {
                const isActive = step === stepItem.key;
                const isCompleted =
                  (stepItem.key === 'seats' && step !== 'seats') ||
                  (stepItem.key === 'info' && (step === 'otp' || step === 'payment')) ||
                  (stepItem.key === 'otp' && step === 'payment');

                return (
                  <div key={stepItem.key} className="flex flex-col items-center relative z-10 flex-1">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-semibold text-[10px] transition-all duration-300 ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-md scale-105'
                          : isCompleted
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}
                      style={{
                        WebkitFontSmoothing: 'antialiased',
                        MozOsxFontSmoothing: 'grayscale',
                        textRendering: 'optimizeLegibility'
                      }}
                    >
                      {isCompleted ? (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        stepItem.number
                      )}
                    </div>
                    <span
                      className={`mt-1.5 text-xs font-medium text-center ${
                        isActive
                          ? 'text-indigo-600 dark:text-indigo-400'
                          : isCompleted
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}
                      style={{
                        WebkitFontSmoothing: 'antialiased',
                        MozOsxFontSmoothing: 'grayscale',
                        textRendering: 'optimizeLegibility'
                      }}
                    >
                      {t(stepItem.labelKey) || stepItem.defaultLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-3 p-2.5 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Step 1: Seat Selection */}
        {step === 'seats' && (
          <div>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-3"></div>
                <p className="text-sm">Loading seat map...</p>
              </div>
            ) : error && !seatData ? (
              <div className="text-center py-8">
                <p className="text-red-600 dark:text-red-400 mb-3 text-sm">{error}</p>
                <button
                  onClick={loadEventAndSeatData}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm"
                >
                  Retry
                </button>
              </div>
            ) : seatData ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Left: Canvas */}
                <div className="lg:col-span-2">
                  <div className="h-[600px] mb-3 border rounded-lg overflow-hidden relative" style={{ borderColor: 'var(--border)' }}>
                    {seatData.seats.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        <p>{t('seatSelection.noSeatsAvailable') || 'No seats available. Check console for details.'}</p>
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
                </div>

                {/* Right: Your Selection Panel */}
                <div className="lg:col-span-1">
                  <div className="sticky top-4">
                    <div className="rounded-lg border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                      {/* Header */}
                      <div className="p-3 border-b" style={{ borderColor: 'var(--border)' }}>
                        <h3 className="text-base font-semibold" style={{ color: 'var(--foreground)' }}>
                          {t('seatSelection.yourSelection') || 'Your Selection'}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                          {t('seatSelection.serviceFeeDisclaimer') || 'Prices include service fees. Per order payment fees may apply depending on digital payment method used.'}
                        </p>
                      </div>

                      {/* Selected Tickets */}
                      <div className="p-3">
                        {selectedSeats.length === 0 ? (
                          <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-6">
                            {t('seatSelection.noSeatsSelected') || 'No seats selected yet'}
                          </p>
                        ) : (
                          <>
                            <div className="space-y-2 mb-3 max-h-[350px] overflow-y-auto">
                              {selectedSeats.map((placeId) => {
                                const seat = seatData.seats.find(s => s.placeId === placeId);

                                let seatPrice = 0;
                                let pricingBreakdown = null;

                                if (pricingModel === 'pricing_configuration' && seat) {
                                  // First try: Use seat's individual pricing (from backend merge)
                                  let basePrice = seat.basePrice || 0;
                                  let taxPercent = (seat.tax || 0) / 100;
                                  let serviceFee = seat.serviceFee || 0;
                                  let serviceTaxPercent = (seat.serviceTax || 0) / 100;

                                  // Second try: Decode from placeId using pricingConfig
                                  if ((!basePrice && !serviceFee) && pricingConfig && placeId) {
                                    try {
                                      const decoded = decodePlaceId(placeId);
                                      console.log(`Decoding placeId ${placeId} for seat ${seat.section}-${seat.row}-${seat.seat}:`, decoded);
                                      if (decoded && decoded.tierCode && pricingConfig.tiers) {
                                        const tier = pricingConfig.tiers.find(t => t.id === decoded.tierCode);
                                        console.log(`Found tier ${decoded.tierCode}:`, tier);
                                        if (tier) {
                                          basePrice = tier.basePrice;
                                          taxPercent = (tier.tax || 0) / 100;
                                          serviceFee = tier.serviceFee;
                                          serviceTaxPercent = (tier.serviceTax || 0) / 100;
                                          console.log(`Applied pricing: base=${basePrice}, tax=${tier.tax}%, serviceFee=${serviceFee}, serviceTax=${tier.serviceTax}%`);

                                          // Update seat object for future reference
                                          seat.basePrice = basePrice;
                                          seat.tax = tier.tax || 0;
                                          seat.serviceFee = serviceFee;
                                          seat.serviceTax = tier.serviceTax || 0;
                                          seat.currency = pricingConfig.currency;
                                        }
                                      }
                                    } catch (error) {
                                      console.warn('Failed to decode pricing from placeId:', placeId, error);
                                    }
                                  }

                                  const entertainmentTaxAmount = basePrice * taxPercent;
                                  const serviceTaxAmount = serviceFee * serviceTaxPercent;

                                  seatPrice = basePrice + entertainmentTaxAmount + serviceFee + serviceTaxAmount;

                                  if (basePrice > 0 || serviceFee > 0) {
                                    pricingBreakdown = {
                                      basePrice,
                                      entertainmentTaxAmount,
                                      serviceFee,
                                      serviceTaxAmount,
                                      total: seatPrice
                                    };
                                  }
                                } else {
                                  // Use ticket-based pricing (legacy)
                                  const ticketId = seatTicketMap[placeId];
                                  const ticket = ticketTypes.find(t => t._id === ticketId);

                                  if (ticket) {
                                    const basePrice = ticket.price || 0;
                                    const entertainmentTax = (ticket.entertainmentTax || 0) / 100;
                                    const serviceFee = ticket.serviceFee || 0;
                                    const serviceTax = (ticket.serviceTax || 0) / 100;
                                    seatPrice = basePrice + (basePrice * entertainmentTax) + serviceFee + (serviceFee * serviceTax);

                                    pricingBreakdown = {
                                      basePrice,
                                      entertainmentTaxAmount: basePrice * entertainmentTax,
                                      serviceFee,
                                      serviceTaxAmount: serviceFee * serviceTax,
                                      total: seatPrice
                                    };
                                  }
                                }

                                return seat ? (
                                  <div
                                    key={placeId}
                                    className="p-2.5 rounded-lg border"
                                    style={{
                                      background: 'var(--surface)',
                                      borderColor: 'var(--border)',
                                      WebkitFontSmoothing: 'antialiased',
                                      MozOsxFontSmoothing: 'grayscale',
                                      textRendering: 'optimizeLegibility'
                                    }}
                                  >
                                    <div className="flex items-start justify-between mb-1.5">
                                      <div className="flex-1">
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                                          {pricingModel === 'pricing_configuration'
                                            ? (t('seatSelection.individualPricing') || 'Individual Seat Pricing')
                                            : (t('seatSelection.standard') || 'Standard')
                                          }
                                        </p>

                                        {seat.section && (
                                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-0.5">
                                            <span className="font-medium">{t('seatSelection.section') || 'SECTION'}:</span> {seat.section}
                                          </p>
                                        )}
                                        {seat.row && (
                                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-0.5">
                                            <span className="font-medium">{t('seatSelection.row') || 'ROW'}:</span> {seat.row.replace('R', '')}
                                          </p>
                                        )}
                                        {seat.seat && (
                                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                                            <span className="font-medium">{t('seatSelection.seat') || 'SEAT'}:</span> {seat.seat}
                                          </p>
                                        )}
                                        {/* Pricing breakdown */}
                                        {pricingBreakdown && seatPrice > 0 && (
                                          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 space-y-0.5">
                                            <div className="flex justify-between">
                                              <span>{t('seatSelection.basePrice') || 'Base Price'}:</span>
                                              <span>{pricingBreakdown.basePrice.toFixed(2)} {currency}</span>
                                            </div>
                                            {pricingBreakdown.entertainmentTaxAmount > 0 && (
                                              <div className="flex justify-between">
                                                <span>{t('seatSelection.entertainmentTax') || 'Entertainment Tax'}:</span>
                                                <span>{pricingBreakdown.entertainmentTaxAmount.toFixed(2)} {currency}</span>
                                              </div>
                                            )}
                                            {pricingBreakdown.serviceFee > 0 && (
                                              <div className="flex justify-between">
                                                <span>{t('seatSelection.serviceFee') || 'Service Fee'}:</span>
                                                <span>{pricingBreakdown.serviceFee.toFixed(2)} {currency}</span>
                                              </div>
                                            )}
                                            {pricingBreakdown.serviceFee > 0 && (
                                              <div className="flex justify-between">
                                                <span>{t('seatSelection.serviceTax') || 'Service Tax'}:</span>
                                                <span>{pricingBreakdown.serviceTaxAmount.toFixed(2)} {currency}</span>
                                              </div>
                                            )}
                                            <div className="flex justify-between font-medium border-t pt-0.5 mt-1" style={{ borderColor: 'var(--border)' }}>
                                              <span>{t('seatSelection.total') || 'Total'}:</span>
                                              <span>{seatPrice.toFixed(2)} {currency}</span>
                                            </div>
                                          </div>
                                        )}
                                        {!pricingBreakdown && seatPrice > 0 && (
                                          <p className="text-sm font-semibold mt-1" style={{ color: 'var(--foreground)' }}>
                                            {formatCurrency(seatPrice)} {currency}
                                          </p>
                                        )}
                                      </div>
                                      <button
                                        onClick={() => handleSeatClick(placeId, seat)}
                                        className="ml-2 text-gray-400 hover:text-red-500 transition-colors p-0.5"
                                        aria-label={t('seatSelection.remove') || 'Remove seat'}
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                      </button>
                                    </div>
                                  </div>
                                ) : null;
                              })}
                            </div>

                            {/* Ticket Count Badge */}
                            <div className="flex items-center gap-1.5 mb-3">
                              <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4v-3a2 2 0 00-2-2H5z" />
                              </svg>
                              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                x{selectedSeats.length}
                              </span>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Footer with CTA Button */}
                      {selectedSeats.length > 0 && (
                        <div className="p-3 border-t" style={{ borderColor: 'var(--border)' }}>
                          <button
                            onClick={handleProceedToInfo}
                            className="w-full py-2 px-3 rounded-lg font-semibold text-sm text-white bg-green-600 hover:bg-green-700 transition-colors"
                            style={{
                              WebkitFontSmoothing: 'antialiased',
                              MozOsxFontSmoothing: 'grayscale',
                              textRendering: 'optimizeLegibility'
                            }}
                          >
                            {t('seatSelection.getTickets') || 'Get Tickets'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-red-600">Failed to load seat map</p>
              </div>
            )}
          </div>
        )}

        {/* Step 2: User Info + CAPTCHA */}
        {step === 'info' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Form Section */}
            <div className="lg:col-span-1 lg:col-start-1 max-w-xl">
              <div className="rounded-lg border p-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <h3 className="text-lg font-semibold mb-3">{t('seatSelection.yourInformation') || 'Your Information'}</h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('seatSelection.fullName') || 'Full Name'}</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-2.5 py-1.5 border rounded-lg text-sm"
                      style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('seatSelection.email') || 'Email'}</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-2.5 py-1.5 border rounded-lg text-sm"
                      style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('seatSelection.captcha') || 'CAPTCHA'}</label>
                    <div className="mt-1">
                      <CapjsWidget
                        onVerify={() => setCaptchaVerified(true)}
                        onError={() => setCaptchaVerified(false)}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => setStep('seats')}
                      className="flex-1 px-3 py-1.5 rounded-lg border font-medium text-sm transition-colors"
                      style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
                    >
                      {t('common.back') || 'Back'}
                    </button>
                    <button
                      onClick={handleSendOTP}
                      disabled={!fullName.trim() || !email.trim() || !captchaVerified}
                      className="flex-1 px-3 py-1.5 rounded-lg font-medium text-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      {t('seatSelection.sendOTP') || 'Send OTP'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Information Panel - Right Side */}
            <div className="lg:col-span-2 lg:col-start-2">
              <div className="rounded-lg border p-6" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <h4 className="text-lg font-semibold mb-4 text-blue-800 dark:text-blue-200">{t('seatSelection.howItWorks') || 'How It Works'}</h4>

                <div className="space-y-4">
                  {/* Step 1 */}
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">1</div>
                    <div>
                      <h5 className="font-medium text-sm mb-1">{t('seatSelection.step1Title') || 'Enter Your Details'}</h5>
                      <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.8 }}>
                        {t('seatSelection.infoStep1') || 'Enter your details to verify your email and secure your seat selection.'}
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">2</div>
                    <div>
                      <h5 className="font-medium text-sm mb-1">{t('seatSelection.step2Title') || 'Email Verification'}</h5>
                      <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.8 }}>
                        {t('seatSelection.infoStep2') || 'We\'ll send a verification code to your email for security.'}
                      </p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">3</div>
                    <div>
                      <h5 className="font-medium text-sm mb-1">{t('seatSelection.step3Title') || 'Complete Payment'}</h5>
                      <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.8 }}>
                        {t('seatSelection.infoStep3') || 'Complete payment to receive your digital tickets instantly.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Privacy Note */}
                <div className="mt-6 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                  <h5 className="font-medium text-sm mb-2 text-green-700 dark:text-green-300">{t('seatSelection.privacyNote') || 'Privacy & Security'}</h5>
                  <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
                    {t('seatSelection.privacyText') || 'Your information is encrypted and used only for ticket delivery and event management. We never share your personal data with third parties.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: OTP Verification */}
        {step === 'otp' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="lg:col-span-1 lg:col-start-1 max-w-xl">
            <h3 className="text-lg font-semibold mb-3">{t('seatSelection.verifyEmail') || 'Verify Your Email'}</h3>
            <div className="p-3 rounded bg-yellow-50 dark:bg-yellow-900/20 mb-3">
              <p className="font-semibold text-sm text-yellow-800 dark:text-yellow-200">
                {t('seatSelection.ticketsHeld') || 'Your tickets are now held for the next 10 minutes'}
              </p>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {t('seatSelection.otpSent') || "We've sent an 8-digit code to"} <strong>{obfuscateEmail(email)}</strong>
            </p>
            <div className="mb-3">
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 8))}
                placeholder={t('seatSelection.enterOTP') || 'Enter 8-digit code'}
                className="w-full px-3 py-2 text-center text-xl tracking-widest border rounded-lg"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                maxLength={8}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setStep('info')}
                className="flex-1 px-3 py-1.5 rounded-lg border font-medium text-sm"
                style={{ borderColor: 'var(--border)' }}
              >
                {t('common.back') || 'Back'}
              </button>
              <button
                onClick={handleVerifyOTP}
                disabled={otp.length !== 8}
                className="flex-1 px-3 py-1.5 rounded-lg font-medium text-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {t('seatSelection.verify') || 'Verify'}
              </button>
            </div>
            {otpResendCooldown > 0 ? (
              <p className="text-xs text-gray-500 mt-2">
                {t('seatSelection.resendIn') || 'Resend code in'} {otpResendCooldown}s
              </p>
            ) : (
              <button
                onClick={handleSendOTP}
                className="text-xs text-indigo-600 hover:text-indigo-700 mt-2"
              >
                {t('seatSelection.resendCode') || 'Resend code'}
              </button>
            )}

            </div>

            {/* OTP Information Panel - Right Side */}
            <div className="lg:col-span-2 lg:col-start-2">
              <div className="rounded-lg border p-6" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <h4 className="text-lg font-semibold mb-4 text-blue-800 dark:text-blue-200">{t('seatSelection.otpVerification') || 'OTP Verification'}</h4>

                <div className="space-y-4">
                  {/* What is OTP */}
                  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                    <h5 className="font-medium text-sm mb-2 text-blue-800 dark:text-blue-200">{t('seatSelection.whatIsOtp') || 'What is OTP?'}</h5>
                    <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.8 }}>
                      {t('seatSelection.otpExplanation') || 'OTP (One-Time Password) is a secure 8-digit code sent to your email to verify your identity and complete the seat reservation process.'}
                    </p>
                  </div>

                  {/* Seat Reservation Status */}
                  <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                    <h5 className="font-medium text-sm mb-2 text-green-800 dark:text-green-200">{t('seatSelection.seatReservation') || 'Seat Reservation Status'}</h5>
                    <div className="text-sm space-y-1" style={{ color: 'var(--foreground)', opacity: 0.8 }}>
                      <p>{t('seatSelection.reservationActive') || '✅ Your selected seats are temporarily reserved for 10 minutes'}</p>
                      <p>{t('seatSelection.reservationNote') || '⏰ Complete verification within this time to secure your booking'}</p>
                      <p>{t('seatSelection.reservationExpiry') || '❌ Reservation expires if OTP verification is not completed'}</p>
                    </div>
                  </div>

                  {/* Security Benefits */}
                  <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                    <h5 className="font-medium text-sm mb-2 text-purple-800 dark:text-purple-200">{t('seatSelection.securityBenefits') || 'Security & Benefits'}</h5>
                    <div className="text-sm space-y-1" style={{ color: 'var(--foreground)', opacity: 0.8 }}>
                      <p>{t('seatSelection.securityPoint1') || '🔒 Prevents unauthorized seat bookings'}</p>
                      <p>{t('seatSelection.securityPoint2') || '📧 Verifies your email address for ticket delivery'}</p>
                      <p>{t('seatSelection.securityPoint3') || '⚡ Ensures fair access to limited seats'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Payment */}
        {step === 'payment' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="lg:col-span-1 lg:col-start-1 max-w-xl">
              <PaymentForm
                checkoutData={getCheckoutData()}
                totalPrice={totalPrice}
                currency={currency}
                ticketTypes={ticketTypes}
                seatTicketMap={seatTicketMap}
                selectedSeats={selectedSeats}
                seatData={seatData}
                onBack={() => setStep('otp')}
                onSuccess={(ticketData) => setSuccessTicketData(ticketData)}
                onError={(error) => setPaymentError(error)}
              />
            </div>

            {/* Empty right panel for grid consistency */}
            <div className="lg:col-span-2 lg:col-start-2">
            </div>
          </div>
        )}

      {/* Ticket Type Selector Modal */}
      {showTicketSelector && pendingSeat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl pointer-events-auto" style={{ background: 'var(--surface)', color: 'var(--foreground)' }}>
            <h3 className="text-lg font-semibold mb-4">
              {t('seatSelection.selectTicketType') || 'Select Ticket Type'}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {pendingSeat.seat.section && `Section: ${pendingSeat.seat.section}`}
              {pendingSeat.seat.row && ` Row: ${pendingSeat.seat.row.replace('R', '')}`}
              {pendingSeat.seat.seat && ` Seat: ${pendingSeat.seat.seat}`}
            </p>
            <div className="space-y-3 mb-4 max-h-[400px] overflow-y-auto">
              {ticketTypes.map((ticket) => {
                const basePrice = ticket.price || 0;
                const entertainmentTaxPercent = ticket.entertainmentTax || 0;
                const entertainmentTax = entertainmentTaxPercent / 100;
                const serviceFee = ticket.serviceFee || 0;
                const serviceTaxPercent = ticket.serviceTax || 0;
                const serviceTax = serviceTaxPercent / 100;
                const orderFee = ticket.orderFee || 0;

                // Calculate price breakdown
                const entertainmentTaxAmount = basePrice * entertainmentTax;
                const serviceTaxAmount = serviceFee * serviceTax;
                const ticketPrice = basePrice + entertainmentTaxAmount + serviceFee + serviceTaxAmount;

                return (
                  <button
                    key={ticket._id}
                    onClick={() => handleTicketSelect(ticket._id)}
                    className="w-full p-4 text-left border-2 rounded-lg hover:border-indigo-500 transition-colors"
                    style={{
                      borderColor: 'var(--border)',
                      background: 'var(--surface)'
                    }}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-base">{ticket.name}</span>
                      <span className="font-semibold text-lg">
                        {formatCurrency(ticketPrice)} {currency}
                      </span>
                    </div>
                    {/* Pricing Breakdown */}
                    <div className="text-xs space-y-1" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
                      <div className="flex justify-between">
                        <span>{t('seatSelection.basePrice') || 'Base Price'}:</span>
                        <span>{formatCurrency(basePrice)} {currency}</span>
                      </div>
                      {entertainmentTaxPercent > 0 && (
                        <div className="flex justify-between">
                          <span>{t('seatSelection.entertainmentTax') || 'Entertainment Tax'} ({entertainmentTaxPercent}%):</span>
                          <span>+{formatCurrency(entertainmentTaxAmount)} {currency}</span>
                        </div>
                      )}
                      {serviceFee > 0 && (
                        <div className="flex justify-between">
                          <span>{t('seatSelection.serviceFee') || 'Service Fee'}:</span>
                          <span>+{formatCurrency(serviceFee)} {currency}</span>
                        </div>
                      )}
                      {serviceTaxPercent > 0 && serviceFee > 0 && (
                        <div className="flex justify-between">
                          <span>{t('seatSelection.serviceTax') || 'Service Tax'} ({serviceTaxPercent}%):</span>
                          <span>+{formatCurrency(serviceTaxAmount)} {currency}</span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => {
                setShowTicketSelector(false);
                setPendingSeat(null);
              }}
              className="w-full px-4 py-2 rounded-lg border"
              style={{
                borderColor: 'var(--border)',
                color: 'var(--foreground)',
                background: 'var(--surface)'
              }}
            >
              {t('seatSelection.cancel') || 'Cancel'}
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
    </Elements>
  );
}

// Payment Form Component
interface PaymentFormProps {
  checkoutData: any;
  totalPrice: number;
  currency: string;
  ticketTypes: TicketInfo[];
  seatTicketMap: Record<string, string>;
  selectedSeats: string[];
  seatData: {
    seats: Seat[];
  } | null;
  onBack: () => void;
  onSuccess: (ticketData: any) => void;
  onError: (error: string) => void;
}

function PaymentForm({ checkoutData, totalPrice, currency, ticketTypes, seatTicketMap, selectedSeats, seatData, onBack, onSuccess, onError }: PaymentFormProps) {
  const { t } = useTranslation();
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardComplete, setCardComplete] = useState(false);
  const [themeColors, setThemeColors] = useState({ textColor: '#000', placeholderColor: '#999', iconColor: '#666' });

  // Helper to extract numeric part from row/seat string
  const extractNumericPart = (value: string | number | null | undefined): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    const numericPart = str.replace(/\D/g, '');
    return numericPart || '';
  };

  // Get theme colors
  useEffect(() => {
    const getThemeColors = () => {
      const isDark = document.documentElement.classList.contains('dark');
      return {
        textColor: isDark ? '#f3f4f6' : '#111827',
        placeholderColor: isDark ? '#9ca3af' : '#6b7280',
        iconColor: isDark ? '#9ca3af' : '#6b7280',
      };
    };

    const updateColors = () => setThemeColors(getThemeColors());
    updateColors();

    const observer = new MutationObserver(updateColors);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', updateColors);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', updateColors);
    };
  }, []);

  // Calculate pricing breakdown for each seat
  const seatPricingBreakdown = useMemo(() => {
    if (!ticketTypes.length || !seatData) return [];

    return selectedSeats.map((placeId) => {
      const ticketId = seatTicketMap[placeId];
      const ticket = ticketTypes.find(t => t._id === ticketId);
      const seat = seatData.seats.find(s => s.placeId === placeId);

      if (!ticket) return null;

      const basePrice = ticket.price || 0;
      const entertainmentTaxPercent = ticket.entertainmentTax || 0;
      const entertainmentTax = entertainmentTaxPercent / 100;
      const serviceFee = ticket.serviceFee || 0;
      const serviceTaxPercent = ticket.serviceTax || 0;
      const serviceTax = serviceTaxPercent / 100;

      const entertainmentTaxAmount = basePrice * entertainmentTax;
      const serviceTaxAmount = serviceFee * serviceTax;
      const ticketPrice = basePrice + entertainmentTaxAmount + serviceFee + serviceTaxAmount;

      return {
        placeId,
        seat,
        ticket,
        ticketName: ticket.name,
        basePrice,
        entertainmentTaxPercent,
        entertainmentTaxAmount,
        serviceFee,
        serviceTaxPercent,
        serviceTaxAmount,
        ticketPrice
      };
    }).filter(Boolean);
  }, [selectedSeats, seatTicketMap, ticketTypes, seatData]);

  // Calculate order fee (once per transaction)
  const orderFeeInfo = useMemo(() => {
    if (!ticketTypes.length) return { orderFee: 0, orderFeeTax: 0, orderFeeTotal: 0 };

    // Get order fee from first ticket (order fee is per transaction, not per ticket)
    const firstTicketId = checkoutData.seatTickets?.[0]?.ticketId;
    const firstTicket = ticketTypes.find(t => t._id === firstTicketId);

    if (!firstTicket) return { orderFee: 0, orderFeeTax: 0, orderFeeTotal: 0 };

    const orderFee = firstTicket.orderFee || 0;
    const serviceTaxPercent = firstTicket.serviceTax || 0;
    // Calculate with full precision - use exact calculation, format to 2 decimals
    const orderFeeTax = orderFee * (serviceTaxPercent / 100);
    const orderFeeTotal = orderFee + orderFeeTax;

    return { orderFee, orderFeeTax, orderFeeTotal, serviceTaxPercent };
  }, [ticketTypes, checkoutData.seatTickets]);

  // Calculate subtotal (sum of all ticket prices)
  const subtotal = useMemo(() => {
    return seatPricingBreakdown.reduce((sum, item) => sum + (item?.ticketPrice || 0), 0);
  }, [seatPricingBreakdown]);

  // Calculate pricing breakdown (legacy, for payment intent)
  const perUnitSubtotal = checkoutData.price + checkoutData.serviceFee;
  const perUnitVat = perUnitSubtotal * (checkoutData.vat / 100);

  const createPaymentIntentPayload = () => {
    // Base metadata (always present)
    const metadata: Record<string, string | boolean> = {
      eventId: checkoutData.eventId,
      ticketId: checkoutData.ticketId,
      email: checkoutData.email,
      quantity: checkoutData.quantity.toString(),
      eventName: checkoutData.eventName,
      ticketName: checkoutData.ticketName,
      merchantId: checkoutData.merchantId,
      externalMerchantId: checkoutData.externalMerchantId,
      basePrice: checkoutData.price.toString(),
      serviceFee: checkoutData.serviceFee.toString(),
      vatRate: checkoutData.vat.toString(),
      vatAmount: perUnitVat.toString(),
      perUnitSubtotal: perUnitSubtotal.toString(),
      perUnitTotal: (perUnitSubtotal + perUnitVat).toString(),
      totalBasePrice: (checkoutData.price * checkoutData.quantity).toString(),
      totalServiceFee: (checkoutData.serviceFee * checkoutData.quantity).toString(),
      totalVatAmount: (perUnitVat * checkoutData.quantity).toString(),
      totalAmount: totalPrice.toString(),
      country: checkoutData.country || 'Finland',
      marketingOptIn: checkoutData.marketingOptIn || false,
    };

    // Optional fields - only include if they have values
    if (checkoutData?.fullName) {
      metadata.fullName = checkoutData.fullName;
    }

    // Seat-related fields - only include for seat-based events
    if (checkoutData?.placeIds && Array.isArray(checkoutData.placeIds) && checkoutData.placeIds.length > 0) {
      metadata.placeIds = JSON.stringify(checkoutData.placeIds);
    }

    if (checkoutData?.seatTickets && Array.isArray(checkoutData.seatTickets) && checkoutData.seatTickets.length > 0) {
      metadata.seatTickets = JSON.stringify(checkoutData.seatTickets);
    }

    if (checkoutData?.sessionId) {
      metadata.sessionId = checkoutData.sessionId;
    }

    // Tax and fee fields - only include if they have values
    if (checkoutData?.entertainmentTax !== undefined && checkoutData.entertainmentTax !== null) {
      metadata.entertainmentTax = checkoutData.entertainmentTax.toString();
    }

    if (checkoutData?.serviceTax !== undefined && checkoutData.serviceTax !== null) {
      metadata.serviceTax = checkoutData.serviceTax.toString();
    }

    if (checkoutData?.orderFee !== undefined && checkoutData.orderFee !== null) {
      metadata.orderFee = checkoutData.orderFee.toString();
    }

    return {
      amount: Math.round(totalPrice * 100), // Convert to cents
      currency: getCurrencyCode(checkoutData.country ).toLowerCase() || checkoutData?.currency || 'EUR',
      metadata
    };
  };

  const createPaymentIntent = async () => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/front'}/create-payment-intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createPaymentIntentPayload())
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to create payment intent');
    }

    return await response.json();
  };

  const confirmPaymentWithStripe = async (clientSecret: string) => {
    if (!stripe || !elements) {
      throw new Error('Stripe not initialized');
    }

    return await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: elements.getElement(CardElement)!,
        billing_details: {
          email: checkoutData.email,
          name: checkoutData.fullName || checkoutData.email.split('@')[0],
        },
      },
      receipt_email: checkoutData.email,
    });
  };

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    const successResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/front'}/payment-success`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentIntentId,
        metadata: {
          eventId: checkoutData.eventId,
          ticketId: checkoutData.ticketId,
          merchantId: checkoutData.merchantId,
          email: checkoutData.email,
          quantity: checkoutData.quantity.toString(),
          eventName: checkoutData.eventName,
          ticketName: checkoutData.ticketName,
          externalMerchantId: checkoutData.externalMerchantId,
          marketingOptIn: checkoutData.marketingOptIn || false,
          placeIds: checkoutData.placeIds || [],
          seatTickets: checkoutData.seatTickets || [], // Map of placeId -> ticketId
          sessionId: checkoutData.sessionId || undefined,
        }
      })
    });

    if (!successResponse.ok) {
      throw new Error('Failed to create ticket record');
    }

    return await successResponse.json();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) return;

    setLoading(true);
    setError(null);
    onError('');

    try {
      // 1. Create payment intent
      const { clientSecret } = await createPaymentIntent();

      // 2. Confirm payment with Stripe
      const { error: stripeError, paymentIntent } = await confirmPaymentWithStripe(clientSecret);

      if (stripeError) {
        const errorMsg = stripeError.message || 'Payment failed';
        setError(errorMsg);
        onError(errorMsg);
        return;
      }

      if (paymentIntent?.status === 'succeeded') {
        // 3. Handle payment success
        const response = await handlePaymentSuccess(paymentIntent.id);

        // 4. Show success page with full ticket data
        onSuccess(response.data);
      }
    } catch (err) {
      let errorMessage = 'An error occurred during payment';
      if (err instanceof Error) {
        errorMessage = err.message;
        // Handle specific error messages with user-friendly text
        if (errorMessage.includes('SOLD_OUT:')) {
          errorMessage = errorMessage.replace('SOLD_OUT:', '').trim();
        } else if (errorMessage.includes('sold out') || errorMessage.includes('sold_out')) {
          errorMessage = 'Unfortunately, the selected tickets are no longer available. Please select different seats or check back later.';
        }
      }
      setError(errorMessage);
      onError(errorMessage);
      console.error('Payment error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCardChange = (event: { complete: boolean; error?: { message: string } }) => {
    setCardComplete(event.complete);
    if (event.error) {
      setError(event.error.message);
    } else {
      setError(null);
    }
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">{t('seatSelection.completePayment') || 'Complete Payment'}</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Payer Information */}
        <div className="rounded-lg p-4 shadow" style={{ background: 'var(--surface)', borderColor: 'var(--border)', borderWidth: 1 }}>
          <h4 className="font-semibold mb-3 text-sm">{t('checkout.customerInformation') || 'Customer Information'}</h4>
          <div className="space-y-1.5 text-sm">
            <div>
              <span style={{ opacity: 0.8 }}>{t('seatSelection.fullName') || 'Full Name'}:</span>
              <span className="font-medium ml-2">{checkoutData.fullName || '-'}</span>
            </div>
            <div>
              <span style={{ opacity: 0.8 }}>{t('seatSelection.email') || 'Email'}:</span>
              <span className="font-medium ml-2">{checkoutData.email}</span>
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="rounded-lg p-4 shadow" style={{ background: 'var(--surface)', borderColor: 'var(--border)', borderWidth: 1 }}>
          <h4 className="font-semibold mb-3 text-sm">{t('seatSelection.orderSummary') || 'Order Summary'}</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span style={{ opacity: 0.8 }}>{t('seatSelection.event') || 'Event'}:</span>
              <span className="font-medium">{checkoutData.eventName}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ opacity: 0.8 }}>{t('seatSelection.selectedSeats') || 'Selected Seats'}:</span>
              <span className="font-medium">{checkoutData.quantity} {t('seatSelection.seats') || 'seat(s)'}</span>
            </div>
          </div>
        </div>

        {/* Full Ticket Information */}
        <div className="rounded-lg p-4 shadow" style={{ background: 'var(--surface)', borderColor: 'var(--border)', borderWidth: 1 }}>
          <h4 className="font-semibold mb-3 text-sm">{t('checkout.pricing') || 'Pricing Breakdown'}</h4>
          <div className="space-y-3">
            {/* Individual Seat Breakdown */}
            {seatPricingBreakdown.map((item, index) => {
              if (!item) return null;
              return (
                <div key={item.placeId || index} className="pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
                  <div className="font-medium mb-1.5 text-sm">
                    {t('seatSelection.seat') || 'Seat'} {index + 1}
                    {item.seat && (
                      <span className="text-xs font-normal ml-2" style={{ opacity: 0.7 }}>
                        (
                        {item.seat.section && `${t('seatSelection.section') || 'Section'}: ${item.seat.section}`}
                        {item.seat.row && (() => {
                          // Extract numeric part from row (handles "R1", "PERMANTO 1", etc.)
                          const displayRow = extractNumericPart(item.seat.row);
                          return `${item.seat.section ? ', ' : ''}${t('seatSelection.row') || 'Row'}: ${displayRow}`;
                        })()}
                        {item.seat.seat && (() => {
                          // Extract numeric part from seat (handles "31", "Seat 31", etc.)
                          const displaySeat = extractNumericPart(item.seat.seat);
                          return `, ${t('seatSelection.seat') || 'Seat'}: ${displaySeat}`;
                        })()}
                        )
                      </span>
                    )}
                  </div>
                  <div className="text-xs space-y-0.5 ml-3" style={{ opacity: 0.8 }}>
                    <div className="flex justify-between">
                      <span>{item.ticketName} - {t('seatSelection.basePrice') || 'Base Price'}:</span>
                      <span>{formatCurrency(item.basePrice)} {getCurrencySymbol(checkoutData.country || 'Finland')}</span>
                    </div>
                    {item.entertainmentTaxPercent > 0 && (
                      <div className="flex justify-between">
                        <span>{t('seatSelection.entertainmentTax') || 'Entertainment Tax'} ({item.entertainmentTaxPercent}%):</span>
                        <span>+{formatCurrency(item.entertainmentTaxAmount)} {getCurrencySymbol(checkoutData.country || 'Finland')}</span>
                      </div>
                    )}
                    {item.serviceFee > 0 && (
                      <div className="flex justify-between">
                        <span>{t('seatSelection.serviceFee') || 'Service Fee'}:</span>
                        <span>+{formatCurrency(item.serviceFee)} {getCurrencySymbol(checkoutData.country || 'Finland')}</span>
                      </div>
                    )}
                    {item.serviceTaxPercent > 0 && item.serviceFee > 0 && (
                      <div className="flex justify-between">
                        <span>{t('seatSelection.serviceTax') || 'Service Tax'} ({item.serviceTaxPercent}%):</span>
                        <span>+{formatCurrency(item.serviceTaxAmount)} {getCurrencySymbol(checkoutData.country || 'Finland')}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-medium pt-1">
                      <span>{t('seatSelection.total') || 'Total'}:</span>
                      <span>{formatCurrency(item.ticketPrice)} {getCurrencySymbol(checkoutData.country || 'Finland')}</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Subtotal */}
            <div className="flex justify-between pt-1.5 border-t" style={{ borderColor: 'var(--border)' }}>
              <span style={{ opacity: 0.8 }} className="text-sm">{t('checkout.subtotal') || 'Subtotal'}:</span>
              <span className="font-medium text-sm">{formatCurrency(subtotal)} {getCurrencySymbol(checkoutData.country || 'Finland')}</span>
            </div>

            {/* Order Fee */}
            {orderFeeInfo.orderFee > 0 && (
              <>
                <div className="flex justify-between text-xs">
                  <span style={{ opacity: 0.8 }}>{t('seatSelection.orderFee') || 'Order Fee'} {t('seatSelection.perTransaction') || '(per transaction)'}:</span>
                  <span>{formatCurrency(orderFeeInfo.orderFee)} {getCurrencySymbol(checkoutData.country || 'Finland')}</span>
                </div>
                {orderFeeInfo.serviceTaxPercent && orderFeeInfo.serviceTaxPercent > 0 && orderFeeInfo.orderFeeTax > 0 && (
                  <div className="flex justify-between text-xs ml-3">
                    <span style={{ opacity: 0.8 }}>{t('seatSelection.serviceTax') || 'Service Tax'} ({orderFeeInfo.serviceTaxPercent}%) {t('seatSelection.onOrderFee') || 'on Order Fee'}:</span>
                    <span>+{formatCurrency(orderFeeInfo.orderFeeTax)} {getCurrencySymbol(checkoutData.country || 'Finland')}</span>
                  </div>
                )}
              </>
            )}

            {/* Grand Total */}
            <div className="flex justify-between text-base font-bold pt-1.5 border-t" style={{ borderColor: 'var(--border)' }}>
              <span>{t('seatSelection.total') || 'Total'}:</span>
              <span>{formatCurrency(totalPrice)} {getCurrencySymbol(checkoutData.country || 'Finland')}</span>
            </div>
          </div>
        </div>

        {/* Payment Information */}
        <div className="rounded-lg p-4 shadow" style={{ background: 'var(--surface)', borderColor: 'var(--border)', borderWidth: 1 }}>
          <h4 className="font-semibold mb-3 text-sm flex items-center">
            <FaCreditCard className="mr-2 text-indigo-600" />
            {t('checkout.paymentDetails') || 'Payment Details'}
          </h4>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">{t('checkout.cardNumber') || 'Card Number'}</label>
            <div className="p-3 border rounded-lg bg-transparent" style={{ borderColor: 'var(--border)' }}>
              <CardElement
                options={{
                  style: {
                    base: {
                      fontSize: '16px',
                      color: themeColors.textColor,
                      backgroundColor: 'transparent',
                      '::placeholder': {
                        color: themeColors.placeholderColor,
                      },
                      iconColor: themeColors.iconColor,
                    },
                    invalid: {
                      color: '#ef4444',
                      iconColor: '#ef4444',
                    },
                    complete: {
                      color: themeColors.textColor,
                      iconColor: '#10b981',
                    },
                  },
                  hidePostalCode: true,
                }}
                onChange={handleCardChange}
              />
            </div>
          </div>

          <div className="flex items-center text-xs mb-3" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
            <FaLock className="mr-1.5" />
            <span>{t('checkout.securePaymentText') || 'Your payment information is secure and encrypted'}</span>
          </div>

          {error && (
            <div className="text-red-600 text-xs mb-3 p-3 rounded-lg bg-red-50 border border-red-200" style={{ background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
              <div className="font-medium mb-1">{t('seatSelection.error') || 'Error'}</div>
              <div>{error === 'TICKET_SOLD_OUT' ? (t('seatSelection.ticketSoldOut') || 'Unfortunately, the selected tickets are no longer available. Please select different seats or check back later.') : error}</div>
            </div>
          )}

          <div className="flex gap-2 mt-4">
            <button
              type="button"
              onClick={onBack}
              className="flex-1 px-3 py-1.5 rounded-lg border font-medium text-sm transition-colors"
              style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
            >
              {t('common.back') || 'Back'}
            </button>
            <button
              type="submit"
              disabled={!stripe || loading || !cardComplete}
              className={`flex-1 px-3 py-1.5 rounded-lg font-medium text-sm text-white transition-colors ${
                !stripe || loading || !cardComplete
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {loading
                ? (t('checkout.processing') || 'Processing...')
                : `${t('checkout.completePurchase') || 'Complete Purchase'} ${formatCurrency(totalPrice)} ${getCurrencySymbol(checkoutData.country || 'Finland')}`
              }
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

