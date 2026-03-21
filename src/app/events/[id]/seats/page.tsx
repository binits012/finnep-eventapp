'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { seatAPI } from '@/services/apiClient';
import SeatMap from '@/components/SeatMap';
import CapjsWidget from '@/components/CapjsWidget';
import api from '@/services/apiClient';
import { decodePlaceId } from '@/utils/placeIdDecoder';
import { useTranslation } from '@/hooks/useTranslation';
import Link from 'next/link';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { FaCreditCard, FaLock, FaClock } from 'react-icons/fa';
import { getCurrencySymbol, getCurrencyCode } from '@/utils/currency';
import {
  basePriceTaxPercent,
  formatTaxRateDisplay,
  isEntertainmentTaxOnBase,
} from '@/utils/basePriceTax';
import SuccessPage from '@/app/success/page';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// Helper to format currency (round to 3 decimals to handle floating-point errors)
const formatCurrency = (value: number): string => {
  // Round to 3 decimal places (use round, not floor, to handle floating-point representation errors)
  const rounded = Math.round(value * 1000) / 1000;
  // Format to 3 decimal places
  return rounded.toFixed(3);
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

const obfuscateFullName = (fullName: string): string => {
  if (!fullName || typeof fullName !== 'string') return '-';
  const parts = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return '-';

  const initials = parts.slice(0, 2).map(p => p.charAt(0).toUpperCase()).join(' ');
  return parts.length === 1 ? initials : `${initials}`;
};

interface Seat {
  placeId: string;
  x: number | null;
  y: number | null;
  row: string | null;
  seat: string | null;
  section: string | null;
  price: number | null;
  status: 'available' | 'sold' | 'reserved';
  available?: boolean;
  wheelchairAccessible?: boolean;
  tags?: string[];
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
  scanCount?: number;
}

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
  sectionType?: string;
  selectionMode?: 'seat' | 'area';
  capacity?: number;
  color: string;
  bounds: SectionBounds | null;
  polygon: Array<{ x: number; y: number }> | null;
  spacingConfig?: {
    seatSpacingVisual?: number;
    rowSpacingVisual?: number;
    seatRadius?: number;
    topMargin?: number;
    rotationAngle?: number;
  };
}

interface AreaSection {
  id: string;
  name: string;
  sectionType: string;
  selectionMode: 'area';
  capacity: number;
  soldCount: number;
  reservedCount: number;
  availableCount: number;
  color: string;
}

type Step = 'seats' | 'info' | 'otp' | 'payment';

interface CheckoutData {
  email: string;
  confirmEmail?: string;
  quantity: number;
  eventId: string;
  externalMerchantId: string;
  merchantId: string;
  ticketId: string | null;
  ticketName: string;
  price: number;
  serviceFee: number;
  vat: number;
  entertainmentTax: number;
  serviceTax: number;
  orderFee: number;
  eventName: string;
  country?: string;
  placeIds?: string[];
  seatTickets?: Array<Record<string, any>>;
  sectionSelections?: Array<{ sectionId: string; quantity: number }>;
  sessionId?: string | null;
  fullName?: string;
  totalBasePrice?: number;
  totalServiceFee?: number;
}

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
  // Get locale from localStorage, default to 'en-US'
  const [_locale, _setLocale] = useState<string>('en-US');

  useEffect(() => {
    // Get locale from localStorage on mount
    if (typeof window !== 'undefined') {
      const storedLocale = localStorage.getItem('locale') || 'en-US';
      _setLocale(storedLocale);
    }
  }, []);
  const params = useParams();
  const { t } = useTranslation();
  const eventId = params?.id as string;

  const [step, setStep] = useState<Step>('seats');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eventTitle, setEventTitle] = useState<string>('');
  const [currency, setCurrency] = useState<string>('EUR');
  const [eventCountry, setEventCountry] = useState<string>('Finland'); // Store event country, default to Finland
  const [merchantId, setMerchantId] = useState<string>('');
  const [externalMerchantId, setExternalMerchantId] = useState<string>('');
  const [paytrailEnabled, setPaytrailEnabled] = useState<boolean>(false);

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
    areaSections: AreaSection[];
    seats: Seat[];
    placeIds: string[];
    sold: string[];
    reserved: string[];
    pricingZones: Array<{ id: string; name: string; price: number }>;
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
  const [areaSelectionMap, setAreaSelectionMap] = useState<Record<string, number>>({});
  // When pricingModel is `ticket_info`, area tickets must be chosen explicitly by the user.
  // This maps the selected area ticket type for "Standing / Area Sections" to a ticketId.
  const [areaTicketId, setAreaTicketId] = useState<string | null>(null);
  // Map of placeId -> ticketId for each selected seat
  const [seatTicketMap, setSeatTicketMap] = useState<Record<string, string>>({});
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [expandedAreaSectionId, setExpandedAreaSectionId] = useState<string | null>(null);
  const [_showSeats, _setShowSeats] = useState(true);
  const [ticketTypes, setTicketTypes] = useState<TicketInfo[]>([]);
  // If a scanCount (recurring/season) ticket is selected, it represents a single personal pass/QR,
  // so the UI must restrict seat selection to exactly 1.
  const scanCountRestrictionActive = useMemo(() => {
    if (selectedSeats.length === 0) return false;
    return selectedSeats.some((placeId) => {
      const ticketId = seatTicketMap[placeId];
      if (!ticketId) return false;

      const ticket = ticketTypes.find(t => t._id === ticketId);
      const raw = ticket?.scanCount ?? 0;
      const n = Number(raw);
      return Number.isFinite(n) && n > 0;
    });
  }, [selectedSeats, seatTicketMap, ticketTypes]);

  // When pricingModel is `ticket_info`, the order-level ticket type used for area/standing pricing:
  // - If user selected seats, we follow the first selected seat's ticketId for consistency.
  // - Otherwise, we follow `areaTicketId` chosen via modal.
  const effectiveAreaTicketId = useMemo(() => {
    if (selectedSeats.length > 0) {
      return seatTicketMap[selectedSeats[0]] || null;
    }
    return areaTicketId;
  }, [selectedSeats, seatTicketMap, areaTicketId]);

  // Build payload for backend OTP verification + reservation.
  // We include `sectionName` so backend can reliably match `venueManifest.places[].section`
  // even if section metadata lookup by id is incomplete.
  const buildSectionSelectionsForSeatFlow = useCallback(() => {
    return Object.entries(areaSelectionMap)
      .filter(([, quantity]) => quantity > 0)
      .map(([sectionId, quantity]) => {
        const area = seatData?.areaSections?.find(a => a.id === sectionId);
        return {
          sectionId,
          sectionName: area?.name,
          quantity
        };
      });
  }, [areaSelectionMap, seatData]);

  const [showTicketSelector, setShowTicketSelector] = useState(false);
  const [pendingSeat, setPendingSeat] = useState<{ placeId: string; seat: Seat } | null>(null);
  const [showAreaTicketSelector, setShowAreaTicketSelector] = useState(false);
  const [pendingArea, setPendingArea] = useState<AreaSection | null>(null);
  const [pricingModel, setPricingModel] = useState<'ticket_info' | 'pricing_configuration' | null>(null);

  // User info state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [captchaVerified, setCaptchaVerified] = useState(false);

  // OTP state
  const [otp, setOtp] = useState('');
  const [_otpSent, _setOtpSent] = useState(false);
  const [otpResendCooldown, setOtpResendCooldown] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Payment state
  const [successTicketData, setSuccessTicketData] = useState<Record<string, unknown> | null>(null);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          paytrailEnabled?: boolean;
        };
      } };
      const event = eventResponse.event;
      setEventTitle(event.eventTitle || 'Select Seats');
      setEventCountry(event.country || 'Finland'); // Store event country
      setCurrency(event.country ? getCurrencyCode(event.country) : 'EUR');

      // Store merchant IDs
      setMerchantId(event.merchantId || event.merchant?._id || event.merchant?.merchantId || '');
      setExternalMerchantId(event.externalMerchantId || '');
      setPaytrailEnabled(event.merchant?.paytrailEnabled || false);

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
      const responseData = response.data as Record<string, any>;
      if (responseData?.venue?.pricingModel) {
        setPricingModel(responseData.venue.pricingModel);
      }

      // Store pricingConfig if available
      const pricingConfigFromResponse = responseData?.pricingConfig ?? null;
      if (pricingConfigFromResponse) {
        setPricingConfig(pricingConfigFromResponse);
      }

      // Use response + event model here — React state pricingModel/pricingConfig is still stale until next render
      const effectivePricingModel =
        (responseData?.venue?.pricingModel as 'ticket_info' | 'pricing_configuration') || model;

      // If pricingModel comes from the seat API response, ensure ticket types are available too.
      // (Without this, area/standing pricing can show as blank because ticketTypes remains empty.)
      if (
        effectivePricingModel === 'ticket_info' &&
        event.ticketInfo &&
        event.ticketInfo.length > 0
      ) {
        setTicketTypes(event.ticketInfo);
      }

      // Decode everything from placeIds array - no need for places array!
      // placeIds encodes: section, row, seat, x, y, tierCode, available, tags
      const { placeIds = [], sold = [], reserved = [], pricingZones = [] } = responseData;

      console.log('[loadEventAndSeatData] Seat data received:', {
        placeIdsCount: placeIds.length,
        soldCount: sold.length,
        reservedCount: reserved.length
      });

      const soldSet = new Set(sold);
      const reservedSet = new Set(reserved);

      // Decode each placeId to extract all seat data
      const sourceSeats = Array.isArray(responseData.seats) ? responseData.seats : null;
      const seats: Seat[] = sourceSeats ? sourceSeats : placeIds.map((placeId: string, index: number) => {
        const decoded = decodePlaceId(placeId);

        if (!decoded) {
          console.error('[loadEventAndSeatData] Failed to decode placeId:', placeId);
          return null;
        }

        // Determine status from decoded available flag and sold/reserved arrays
        let status: 'available' | 'sold' | 'reserved' = 'available';
        if (decoded.available === false) {
          status = 'sold';
        } else if (soldSet.has(placeId)) {
          status = 'sold';
        } else if (reservedSet.has(placeId)) {
          status = 'reserved';
        }

        // Get price from pricingZones (fallback for ticket_info model)
        let price: number | null = null;
        for (const zone of pricingZones) {
          if (index >= zone.start && index <= zone.end) {
            price = zone.price / 100; // Convert from cents
            break;
          }
        }

        const seatData: Seat = {
          placeId,
          x: decoded.x || null,
          y: decoded.y || null,
          row: decoded.row ? String(decoded.row) : null,
          seat: decoded.seat ? String(decoded.seat) : null,
          section: decoded.section || null,
          price,
          status,
          available: decoded.available !== undefined ? decoded.available : true,
          wheelchairAccessible: Array.isArray(decoded.tags) && decoded.tags.includes('wheelchair'),
          tags: Array.isArray(decoded.tags) ? decoded.tags : []
        };

        // Extract pricing from tierCode if pricingModel is 'pricing_configuration'
        if (
          effectivePricingModel === 'pricing_configuration' &&
          pricingConfigFromResponse?.tiers &&
          decoded.tierCode
        ) {
          const tier = pricingConfigFromResponse.tiers.find(
            (t: { id: string }) => t.id === decoded.tierCode
          );
          if (tier) {
            seatData.basePrice = tier.basePrice;
            seatData.tax = tier.tax;
            seatData.serviceFee = tier.serviceFee;
            seatData.serviceTax = tier.serviceTax;
            seatData.orderFee = pricingConfigFromResponse.orderFee || 0;
            seatData.currency = pricingConfigFromResponse.currency || currency;

            // Calculate total price from pricing fields
            const basePrice = seatData.basePrice || 0;
            const taxPercent = (seatData.tax || 0) / 100;
            const serviceFee = seatData.serviceFee || 0;
            const serviceTaxPercent = (seatData.serviceTax || 0) / 100;

            // Per seat: basePrice + (basePrice * tax) + serviceFee + (serviceFee * serviceTax)
            seatData.price = basePrice + (basePrice * taxPercent) + serviceFee + (serviceFee * serviceTaxPercent);
          } else {
            console.warn('[loadEventAndSeatData] Tier not found for placeId:', {
              placeId,
              tierCode: decoded.tierCode,
              availableTiers: pricingConfigFromResponse.tiers.map((t: { id: string }) => t.id)
            });
          }
        }

        return seatData;
      }).filter((seat: Seat | null): seat is Seat => seat !== null);


      // Merge sections from response with venue.sections to get spacingConfig and polygon data
      const responseSections = response.data.sections || [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const venueSections = (responseData?.venue?.sections || []) as Array<Record<string, unknown>>;

      // Enrich response sections with spacingConfig and polygon from venue sections
      const enrichedSections: Section[] = responseSections.map(section => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const venueSection = venueSections.find((vs: Record<string, any>) =>
          vs.name === section.name ||
          vs.id === section.id ||
          (vs._id && vs._id === section.id) ||
          (section.name && vs.name && String(vs.name).toLowerCase() === section.name.toLowerCase())
        );

        if (venueSection) {
          // Merge spacingConfig and polygon from venue section
          return {
            ...section,
            // Use polygon from venue section if response section doesn't have it
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            polygon: section.polygon || (venueSection as any).polygon || null,
            // Merge spacingConfig from venue section
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            spacingConfig: (venueSection as any).spacingConfig || (section as any).spacingConfig || {}
          };
        }

        return {
          ...section,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          spacingConfig: (section as Record<string, unknown>).spacingConfig as Section['spacingConfig'] || {}
        };
      });

      const responseAreaSections: AreaSection[] = Array.isArray(responseData.areaSections)
        ? responseData.areaSections
        : [];
      const fallbackAreaSections: AreaSection[] = enrichedSections
        .filter((section) => section.selectionMode === 'area')
        .map((section) => ({
          id: section.id,
          name: section.name,
          sectionType: section.sectionType || 'Area',
          selectionMode: 'area',
          capacity: Number(section.capacity || 0),
          soldCount: 0,
          reservedCount: 0,
          availableCount: Number(section.capacity || 0),
          color: section.color || '#1976D2'
        }));
      const resolvedAreaSections = responseAreaSections.length > 0 ? responseAreaSections : fallbackAreaSections;

      // Recompute availability from the actual seat inventory we just decoded.
      // This ensures `availableCount` decreases when `/seats` reports more `sold` placeIds.
      const computedAreaSections: AreaSection[] = resolvedAreaSections.map((area) => {
        const areaName = (area.name || '').trim().toLowerCase();
        const areaId = (area.id || '').trim().toLowerCase();

        const matchingSeats = seats.filter((s) => {
          const sec = (s.section || '').trim().toLowerCase();
          if (!sec) return false;

          if (areaName && sec === areaName) return true;
          if (areaId && sec === areaId) return true;

          // Best-effort fuzzy matching across backends
          if (areaName && (sec.includes(areaName) || areaName.includes(sec))) return true;
          if (areaId && (sec.includes(areaId) || areaId.includes(sec))) return true;

          return false;
        });

        const soldCount = matchingSeats.filter((s) => s.status === 'sold').length;
        const reservedCount = matchingSeats.filter((s) => s.status === 'reserved').length;

        const inferredCapacity = matchingSeats.length;
        const capacity = Number(area.capacity || 0) || inferredCapacity;

        const availableCount = Math.max(0, capacity - soldCount - reservedCount);

        return {
          ...area,
          capacity,
          soldCount,
          reservedCount,
          availableCount
        };
      });

      setSeatData({
        backgroundSvg: response.data.backgroundSvg,
        sections: enrichedSections,
        areaSections: computedAreaSections,
        seats,
        placeIds,
        sold,
        reserved,
        pricingZones
      });

      const soldSeatsCount = seats.filter(s => s.status === 'sold').length;
      console.log('[loadEventAndSeatData] Final seat data:', {
        totalSeats: seats.length,
        soldSeatsCount,
        expectedSoldCount: sold.length,
        reservedSeatsCount: seats.filter(s => s.status === 'reserved').length
      });

      setLoading(false);
    } catch (err: unknown) {
      const error = err as Error & { response?: { data?: { message?: string }; status?: number } };
      console.error('Error loading seat data:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      setError(error.response?.data?.message || 'Failed to load seat map');
      setLoading(false);
    }
  };

  // Handle section click - zoom to section and show seats
  const handleSectionClick = useCallback((sectionId: string | null) => {
    setSelectedSection(sectionId);
    _setShowSeats(sectionId !== null);
  }, []);

  // Check if two seats are physically adjacent/nearby (ignoring status)
  // Same section; same row adjacent, or cross-row (e.g. second row) when same/adjacent column or within reasonable distance
  const areSeatsPhysicallyAdjacent = useCallback((seat1: Seat, seat2: Seat): boolean => {
    // Must be in same section
    if (seat1.section !== seat2.section) return false;

    // Priority 1: Same row adjacency (most reliable)
    if (seat1.row === seat2.row && seat1.row && seat2.row) {
      const seat1Num = extractNumericSeat(seat1.seat);
      const seat2Num = extractNumericSeat(seat2.seat);

      if (seat1Num !== null && seat2Num !== null) {
        return Math.abs(seat1Num - seat2Num) === 1;
      }

      if (seat1.seat && seat2.seat) {
        return areAdjacentStrings(seat1.seat, seat2.seat);
      }
    }

    // Priority 2: Cross-row – allow second row (or a few rows) and same/adjacent column
    if (seat1.row !== seat2.row &&
        seat1.x !== null && seat1.y !== null &&
        seat2.x !== null && seat2.y !== null) {

      const row1 = extractNumericSeat(seat1.row);
      const row2 = extractNumericSeat(seat2.row);
      const seat1Num = extractNumericSeat(seat1.seat);
      const seat2Num = extractNumericSeat(seat2.seat);

      const rowDiff = row1 !== null && row2 !== null ? Math.abs(row1 - row2) : null;
      const seatDiff = seat1Num !== null && seat2Num !== null ? Math.abs(seat1Num - seat2Num) : null;

      const distance = Math.sqrt(
        Math.pow(seat1.x - seat2.x, 2) + Math.pow(seat1.y - seat2.y, 2)
      );

      // Allow up to 3 rows apart, same or adjacent column (seat diff 0 or 1)
      if (rowDiff !== null && rowDiff <= 3 && seatDiff !== null && seatDiff <= 1) {
        return distance <= 350;
      }

      // Fallback: same section and within reasonable distance (e.g. "else where" in same block)
      if (distance <= 350) {
        return true;
      }
    }

    return false;
  }, []);

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

        // Check if any seats between them (exclusive) are sold or reserved
        for (let i = start + 1; i < end; i++) {
          if (rowSeats[i].status === 'sold' || rowSeats[i].status === 'reserved') {
            return false; // Sold or reserved seat blocks the connection
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

    // If we already selected a scanCount (recurring/season pass) ticket type, force max 1 seat.
    const maxSeatsAllowed = scanCountRestrictionActive ? 1 : 10;
    if (selectedSeats.length >= maxSeatsAllowed) {
      setError(
        maxSeatsAllowed === 1
          ? 'This ticket type only allows 1 seat'
          : (t('seatSelection.maxSeatsReached') || 'Maximum 10 seats can be selected at a time')
      );
      setTimeout(() => setError(null), 3000);
      return;
    }

    // Check if seat is stranded (not adjacent to any selected seats)
    // Allow first seat selection, but prevent isolated seats after that
    // This check applies to ALL pricing models, including pricing_configuration
    if (selectedSeats.length > 0 && !isSeatAdjacent(seat, selectedSeats)) {
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
  }, [selectedSeats, seatTicketMap, ticketTypes, pricingModel, isSeatAdjacent, areSeatsConnected, t, scanCountRestrictionActive]);

  // Handle ticket type selection for a seat
  const handleTicketSelect = useCallback((ticketId: string) => {
    if (!pendingSeat) return;

    const { placeId } = pendingSeat;
    const ticket = ticketTypes.find(t => t._id === ticketId);
    const raw = ticket?.scanCount ?? 0;
    const n = Number(raw);
    const isScanCountPass = Number.isFinite(n) && n > 0;

    if (isScanCountPass) {
      // Season/recurring pass: one QR = one pass, so force selection to exactly one seat.
      setSelectedSeats([placeId]);
      setSeatTicketMap({ [placeId]: ticketId });
    } else {
      setSelectedSeats([...selectedSeats, placeId]);
      setSeatTicketMap({ ...seatTicketMap, [placeId]: ticketId });
    }
    setShowTicketSelector(false);
    setPendingSeat(null);
  }, [pendingSeat, selectedSeats, seatTicketMap, ticketTypes]);

  // Handle ticket type selection for an area/standing section (`pricingModel: ticket_info`)
  const handleAreaTicketSelect = useCallback((ticketId: string) => {
    if (!pendingArea) return;

    setAreaTicketId(ticketId);

    const ticket = ticketTypes.find(t => t._id === ticketId);
    const raw = ticket?.scanCount ?? 0;
    const n = Number(raw);
    const isScanCountPass = Number.isFinite(n) && n > 0;

    setAreaSelectionMap(prev => {
      const currentQty = prev[pendingArea.id] || 0;
      const nextQty = isScanCountPass
        ? 1
        : Math.min(pendingArea.availableCount, (currentQty || 0) + 1);
      return { ...prev, [pendingArea.id]: nextQty };
    });

    setShowAreaTicketSelector(false);
    setPendingArea(null);
  }, [pendingArea, ticketTypes]);

  // Calculate total price using ticket pricing or seat pricing
  const totalPrice = useMemo(() => {
    if (!seatData) return 0;

    const areaSelections = Object.entries(areaSelectionMap)
      .filter(([, qty]) => (qty || 0) > 0)
      .map(([sectionId, quantity]) => ({ sectionId, quantity }));

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
          // Truncate order fee tax to 3 decimals
          orderFeeTax = Math.round((orderFee * serviceTaxPercent) * 1000) / 1000; // Service tax on order fee
        }
      });

      // Add area sections pricing by using a representative priced seat from this section.
      areaSelections.forEach(({ sectionId, quantity }) => {
        const area = seatData.areaSections.find(a => a.id === sectionId);
        if (!area) return;
        const name = (area.name || '').trim().toLowerCase();
        const id = (area.id || '').trim().toLowerCase();

        const repSeat =
          seatData.seats.find(s => (s.section || '').trim().toLowerCase() === name) ||
          seatData.seats.find(s => (s.section || '').trim().toLowerCase() === id) ||
          (name
            ? seatData.seats.find(s => {
                const sec = (s.section || '').trim().toLowerCase();
                return sec.includes(name) || name.includes(sec);
              }) || null
            : null);

        if (!repSeat || !repSeat.price) return;
        total += repSeat.price * quantity;

        if (orderFee === 0 && repSeat.orderFee) {
          orderFee = repSeat.orderFee;
          const serviceTaxPercent = (repSeat.serviceTax || 0) / 100;
          orderFeeTax = Math.round((orderFee * serviceTaxPercent) * 1000) / 1000;
        }
      });

      // Add order fee + tax on order fee (once per transaction) - truncate to 3 decimals
      const orderFeeTotal = Math.round((orderFee + orderFeeTax) * 1000) / 1000;
      total += orderFeeTotal;

      // Round to 3 decimal places (use round, not floor, to handle floating-point representation errors)
      const finalTotal = Math.round(total * 1000) / 1000;

      return finalTotal;
    }

    // Otherwise, use ticket pricing
    if (!ticketTypes.length) return 0;

    let total = 0;
    let orderFee = 0;
    let orderFeeTax = 0;

    const firstTicketForAreas =
      (effectiveAreaTicketId ? ticketTypes.find(t => t._id === effectiveAreaTicketId) : null) || ticketTypes[0];

    // Calculate per-ticket prices
    selectedSeats.forEach((placeId) => {
      const ticketId = seatTicketMap[placeId];
      if (!ticketId) return;

      const ticket = ticketTypes.find(t => t._id === ticketId);
      if (!ticket) return;

      const basePrice = ticket.price || 0;
      const baseTaxPct = basePriceTaxPercent(
        ticket.vat || 0,
        ticket.entertainmentTax
      );
      const baseTaxMult = baseTaxPct / 100;
      const serviceFee = ticket.serviceFee || 0;
      const serviceTax = (ticket.serviceTax || 0) / 100;

      const baseTaxAmount = Math.round((basePrice * baseTaxMult) * 1000) / 1000;
      const serviceTaxAmount = Math.round((serviceFee * serviceTax) * 1000) / 1000;
      const ticketPrice = Math.round((basePrice + baseTaxAmount + serviceFee + serviceTaxAmount) * 1000) / 1000;
      total += ticketPrice;

      // Order fee (only add once, use first ticket's orderFee)
      if (orderFee === 0) {
        orderFee = ticket.orderFee || 0;
        const serviceTaxPercent = (ticket.serviceTax || 0) / 100;
        // Truncate order fee tax to 3 decimals
        orderFeeTax = Math.round((orderFee * serviceTaxPercent) * 1000) / 1000; // Service tax on order fee
      }
    });

    // Add area sections pricing by mapping area quantities to the first ticket type.
    if (firstTicketForAreas && areaSelections.length > 0) {
      const basePrice = firstTicketForAreas.price || 0;
      const baseTaxPct = basePriceTaxPercent(firstTicketForAreas.vat || 0, firstTicketForAreas.entertainmentTax);
      const baseTaxMult = baseTaxPct / 100;
      const serviceFee = firstTicketForAreas.serviceFee || 0;
      const serviceTax = (firstTicketForAreas.serviceTax || 0) / 100;

      const baseTaxAmount = Math.round((basePrice * baseTaxMult) * 1000) / 1000;
      const serviceTaxAmount = Math.round((serviceFee * serviceTax) * 1000) / 1000;
      const ticketPrice = Math.round((basePrice + baseTaxAmount + serviceFee + serviceTaxAmount) * 1000) / 1000;

      areaSelections.forEach(({ quantity }) => {
        total += ticketPrice * quantity;
      });

      if (orderFee === 0) {
        orderFee = firstTicketForAreas.orderFee || 0;
        const serviceTaxPercent = (firstTicketForAreas.serviceTax || 0) / 100;
        orderFeeTax = Math.round((orderFee * serviceTaxPercent) * 1000) / 1000;
      }
    }

    // Add order fee + tax on order fee (once per transaction) - truncate to 3 decimals
    const orderFeeTotal = Math.round((orderFee + orderFeeTax) * 1000) / 1000;
    total += orderFeeTotal;

    // Round to 3 decimals (use round, not floor, to handle floating-point representation errors)
    return Math.round(total * 1000) / 1000;
  }, [selectedSeats, seatTicketMap, ticketTypes, seatData, pricingModel, areaSelectionMap, effectiveAreaTicketId]);

  // Step 1: Proceed to user info
  const handleProceedToInfo = () => {
    const areaById = new Map((seatData?.areaSections || []).map((a) => [a.id, a]));
    const normalizedAreaSelectionMap: Record<string, number> = {};
    let runningAreaTotal = 0;

    // Clamp per-area quantities to live availability and max total ticket count (10).
    Object.entries(areaSelectionMap).forEach(([sectionId, rawQty]) => {
      const area = areaById.get(sectionId);
      if (!area) return;
      const qty = Math.max(0, Number(rawQty) || 0);
      const maxForArea = Math.max(0, Number(area.availableCount) || 0);
      const remainingSlots = Math.max(0, 10 - selectedSeats.length - runningAreaTotal);
      const normalizedQty = Math.min(qty, maxForArea, remainingSlots);
      if (normalizedQty > 0) {
        normalizedAreaSelectionMap[sectionId] = normalizedQty;
        runningAreaTotal += normalizedQty;
      }
    });

    const areaSelectedCount = Object.values(normalizedAreaSelectionMap).reduce((sum, qty) => sum + (qty || 0), 0);
    const normalizedChanged = JSON.stringify(normalizedAreaSelectionMap) !== JSON.stringify(areaSelectionMap);
    if (normalizedChanged) {
      setAreaSelectionMap(normalizedAreaSelectionMap);
    }

    if (selectedSeats.length + areaSelectedCount > 10) {
      setError(t('seatSelection.maxSeatsReached') || 'Maximum 10 seats can be selected at a time');
      return;
    }
    if (selectedSeats.length === 0 && areaSelectedCount === 0) {
      setError('Please select at least one seat or section quantity');
      return;
    }
    setStep('info');
    setError(null);
  };

  const getRepresentativeSeatForArea = useCallback(
    (area: AreaSection): Seat | null => {
      if (!seatData) return null;
      const name = (area.name || '').trim().toLowerCase();
      const id = (area.id || '').trim().toLowerCase();
      if (!name && !id) return null;

      const scoreSeat = (s: Seat): number => {
        // Higher score == more suitable for rendering pricing breakdowns.
        let score = 0;

        if (typeof s.basePrice === 'number' && s.basePrice > 0) score += 30;
        else if (typeof s.basePrice === 'number') score += 10;

        if (typeof s.tax === 'number') score += 10;
        if (typeof s.serviceFee === 'number' && s.serviceFee > 0) score += 20;
        else if (typeof s.serviceFee === 'number') score += 8;

        if (typeof s.serviceTax === 'number') score += 5;

        // Fallback: having a computed total helps, but should be lower priority than breakdown fields.
        if (typeof s.price === 'number' && s.price > 0) score += 1;

        return score;
      };

      const uniqByPlaceId = (items: Seat[]): Seat[] => {
        const seen = new Set<string>();
        const out: Seat[] = [];
        for (const item of items) {
          if (!item?.placeId) continue;
          if (seen.has(item.placeId)) continue;
          seen.add(item.placeId);
          out.push(item);
        }
        return out;
      };

      const exactCandidates = uniqByPlaceId([
        ...(name
          ? seatData.seats.filter(
              s => (s.section || '').trim().toLowerCase() === name
            )
          : []),
        ...(id
          ? seatData.seats.filter(
              s => (s.section || '').trim().toLowerCase() === id
            )
          : []),
      ]);

      if (exactCandidates.length > 0) {
        exactCandidates.sort((a, b) => scoreSeat(b) - scoreSeat(a));
        return exactCandidates[0] || null;
      }

      // Best-effort fuzzy matching if section ids/names differ across backends.
      if (name) {
        const fuzzyCandidates = uniqByPlaceId(
          seatData.seats.filter(s => {
            const sec = (s.section || '').trim().toLowerCase();
            return sec.includes(name) || name.includes(sec);
          })
        );

        if (fuzzyCandidates.length > 0) {
          fuzzyCandidates.sort((a, b) => scoreSeat(b) - scoreSeat(a));
          return fuzzyCandidates[0] || null;
        }
      }
      return null;
    },
    [seatData]
  );

  const getAreaPricing = useCallback(
    (area: AreaSection): {
      unitPrice: number | null;
      pricingBreakdown:
        | {
            basePrice: number;
            baseTaxAmount: number;
            baseTaxRatePercent: number;
            serviceFee: number;
            serviceTaxAmount: number;
            total: number;
          }
        | null;
    } => {
      if (!seatData) return { unitPrice: null, pricingBreakdown: null };

      // ticket_info: map area quantities to the first ticket type in the UI.
      if (pricingModel === 'ticket_info') {
        // Standing/area pricing requires an explicit area ticket selection.
        // Until `effectiveAreaTicketId` is known, hide the per-area price to avoid showing
        // an arbitrary/default ticket price.
        if (!effectiveAreaTicketId) {
          return { unitPrice: null, pricingBreakdown: null };
        }

        const ticket =
          ticketTypes.find(t => t._id === effectiveAreaTicketId) || null;
        if (!ticket) return { unitPrice: null, pricingBreakdown: null };

        const basePrice = ticket.price || 0;
        const baseTaxPct = basePriceTaxPercent(ticket.vat || 0, ticket.entertainmentTax);
        const baseTaxMult = baseTaxPct / 100;
        const serviceFee = ticket.serviceFee || 0;
        const serviceTaxMult = (ticket.serviceTax || 0) / 100;

        const baseTaxAmount = Math.round((basePrice * baseTaxMult) * 1000) / 1000;
        const serviceTaxAmount = Math.round((serviceFee * serviceTaxMult) * 1000) / 1000;
        const total = Math.round((basePrice + baseTaxAmount + serviceFee + serviceTaxAmount) * 1000) / 1000;

        return {
          unitPrice: total,
          pricingBreakdown: {
            basePrice,
            baseTaxAmount,
            baseTaxRatePercent: baseTaxPct,
            serviceFee,
            serviceTaxAmount,
            total,
          },
        };
      }

      if (pricingModel === 'pricing_configuration') {
        const repSeat = getRepresentativeSeatForArea(area);
        if (!repSeat) return { unitPrice: null, pricingBreakdown: null };

        const basePrice = repSeat.basePrice || 0;
        const taxPercentMult = (repSeat.tax || 0) / 100;
        const serviceFee = repSeat.serviceFee || 0;
        const serviceTaxMult = (repSeat.serviceTax || 0) / 100;

        const baseTaxAmount = Math.round((basePrice * taxPercentMult) * 1000) / 1000;
        const serviceTaxAmount = Math.round((serviceFee * serviceTaxMult) * 1000) / 1000;
        const total = Math.round((basePrice + baseTaxAmount + serviceFee + serviceTaxAmount) * 1000) / 1000;

        return {
          unitPrice: total,
          pricingBreakdown: {
            basePrice,
            baseTaxAmount,
            baseTaxRatePercent: repSeat.tax || 0,
            serviceFee,
            serviceTaxAmount,
            total,
          },
        };
      }

      return { unitPrice: null, pricingBreakdown: null };
    },
    [seatData, pricingModel, ticketTypes, getRepresentativeSeatForArea, effectiveAreaTicketId]
  );

  // Step 2: Send OTP
  const handleSendOTP = async () => {
    if (!fullName.trim() || !email.trim() || !confirmEmail.trim() || !captchaVerified) {
      setError('Please fill in all fields and complete CAPTCHA');
      return;
    }

    // Validate email format
    const emailRegex = /.+@.+\..+/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    // Validate emails match
    if (email !== confirmEmail) {
      setError('Email addresses do not match');
      return;
    }

    try {
      setError(null);
      // Add locale as query parameter (BCP 47 format) - get from localStorage
      const localeParam = typeof window !== 'undefined' ? (localStorage.getItem('locale') || 'en-US') : 'en-US';
      await api.post(`/event/${eventId}/seats/send-otp?locale=${encodeURIComponent(localeParam)}`, {
        email,
        fullName,
        placeIds: selectedSeats,
        sectionSelections: buildSectionSelectionsForSeatFlow()
      });

      _setOtpSent(true);
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
    } catch (err: unknown) {
      const error = err as Error & { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to send OTP');
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
        placeIds: selectedSeats,
        sectionSelections: buildSectionSelectionsForSeatFlow()
      });

      if (sessionId) {
        await seatAPI.reserveSeats(eventId, selectedSeats, sessionId, email, buildSectionSelectionsForSeatFlow());
        // Refresh seat data to show newly reserved seats
        await loadEventAndSeatData();
      }

      setStep('payment');
    } catch (err: unknown) {
      const error = err as Error & { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Invalid OTP');
    }
  };

  // Helper to extract numeric part from row/seat string
  const extractNumericPart = (value: string | number | null | undefined): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    const numericPart = str.replace(/\D/g, '');
    return numericPart || '';
  };

  // Build checkout data for payment
  const getCheckoutData = useCallback(() => {
    const sectionSelections = Object.entries(areaSelectionMap)
      .filter(([, quantity]) => quantity > 0)
      .map(([sectionId, quantity]) => {
        const area = seatData?.areaSections?.find(a => a.id === sectionId);
        return {
          sectionId,
          sectionName: area?.name || sectionId,
          quantity
        };
      });
    const areaQuantity = sectionSelections.reduce((sum, item) => sum + item.quantity, 0);
    const totalSelectedQuantity = selectedSeats.length + areaQuantity;

    console.log('[getCheckoutData] Building checkout data:', {
      selectedSeats,
      selectedSeatsLength: selectedSeats.length,
      pricingModel,
      hasSeatData: !!seatData
    });

    // If pricingModel is 'pricing_configuration', use seat pricing
    if (pricingModel === 'pricing_configuration' && seatData) {
      const enrichSeatPricingFromPlaceId = (s: Seat | null): Seat | null => {
        if (!s) return null;
        if (!pricingConfig || !s.placeId) return s;

        const basePrice = s.basePrice ?? 0;
        const serviceFee = s.serviceFee ?? 0;
        // If we already have the pricing fields, don't re-decode.
        if (basePrice > 0 || serviceFee > 0) return s;

        try {
          const decoded = decodePlaceId(s.placeId);
          if (!decoded || !decoded.tierCode || !pricingConfig.tiers?.length) return s;

          const tier = pricingConfig.tiers.find(t => t.id === decoded.tierCode);
          if (!tier) return s;

          // Fill pricing fields needed for the checkout UI and backend validation.
          s.basePrice = tier.basePrice ?? 0;
          s.tax = tier.tax ?? 0; // percent on base price
          s.serviceFee = tier.serviceFee ?? 0;
          s.serviceTax = tier.serviceTax ?? 0; // percent on serviceFee
          s.currency = pricingConfig.currency ?? currency;

          return s;
        } catch (e) {
          console.warn('[getCheckoutData] Failed to enrich seat pricing:', e);
          return s;
        }
      };

      const selectedAreaEntries = sectionSelections;
      const firstAreaSelection = selectedAreaEntries[0] ?? null;
      const firstArea = firstAreaSelection
        ? seatData.areaSections.find(a => a.id === firstAreaSelection.sectionId) || null
        : null;

      const repSeatForCheckout =
        selectedSeats.length > 0
          ? seatData.seats.find(s => selectedSeats.includes(s.placeId)) || null
          : firstArea
            ? getRepresentativeSeatForArea(firstArea)
            : null;
      const repSeatForCheckoutEnriched = enrichSeatPricingFromPlaceId(repSeatForCheckout);

      const checkoutAreaLabel = (() => {
        if (!firstArea) return 'Area Pass';
        const sectionType = (firstArea.sectionType || '').trim();
        return sectionType && sectionType.toLowerCase() !== 'area' ? `${firstArea.name} (${sectionType})` : firstArea.name;
      })();

      const checkoutTicketName = (() => {
        if (selectedSeats.length > 0 && areaQuantity === 0) return 'Seat';
        if (selectedSeats.length > 0 && areaQuantity > 0) return 'Ticket';
        if (areaQuantity > 0) return selectedAreaEntries.length === 1 ? checkoutAreaLabel : 'Area Pass';
        return 'Ticket';
      })();

      // Build seat-ticket mapping with individual pricing for each seat
      const seatTicketsForSeats = selectedSeats.map(placeId => {
        const seat = seatData.seats.find(s => s.placeId === placeId);
        const enrichedSeat = enrichSeatPricingFromPlaceId(seat || null);

        console.log('[getCheckoutData] Building seatTicket for placeId:', {
          placeId,
          foundSeat: !!seat,
          seatBasePrice: seat?.basePrice,
          seatPrice: seat?.price,
          seatTax: seat?.tax,
          seatServiceFee: seat?.serviceFee,
          hasPricingConfig: !!pricingConfig,
          pricingModel
        });

        // Build ticketName with section, row, and seat information (with colons)
        const section = seat?.section || '';
        const row = seat?.row ? extractNumericPart(seat.row) : '';
        const seatNum = seat?.seat ? extractNumericPart(seat.seat) : '';
        const ticketNameParts = [];
        if (section) ticketNameParts.push(`Section: ${section}`);
        if (row) ticketNameParts.push(`Row: ${row}`);
        if (seatNum) ticketNameParts.push(`Seat: ${seatNum}`);
        const ticketName = ticketNameParts.length > 0
          ? ticketNameParts.join(', ')
          : `Seat ${placeId}`;

        return {
          placeId,
          ticketId: null, // No ticket ID for pricing_configuration
          ticketName: ticketName,
          pricing: enrichedSeat ? {
            basePrice: enrichedSeat?.basePrice || 0,
            tax: enrichedSeat?.tax || 0,
            serviceFee: enrichedSeat?.serviceFee || 0,
            serviceTax: enrichedSeat?.serviceTax || 0,
            orderFee: enrichedSeat?.orderFee || 0,
            currency: enrichedSeat?.currency || 'EUR'
          } : null
        };
      });

      const seatTicketsForAreas = selectedAreaEntries.flatMap(({ sectionId, quantity }) => {
        const area = seatData.areaSections.find(a => a.id === sectionId);
        if (!area || !quantity) return [];

        const repSeat = enrichSeatPricingFromPlaceId(getRepresentativeSeatForArea(area));
        if (!repSeat) return [];

        const sectionType = (area.sectionType || '').trim();
        const areaLabel =
          sectionType && sectionType.toLowerCase() !== 'area' ? `${area.name} (${sectionType})` : area.name;

        return Array.from({ length: quantity }).map(() => ({
          placeId: '',
          ticketId: null,
          ticketName: areaLabel,
          pricing: {
            basePrice: repSeat.basePrice || 0,
            tax: repSeat.tax || 0,
            serviceFee: repSeat.serviceFee || 0,
            serviceTax: repSeat.serviceTax || 0,
            orderFee: repSeat.orderFee || 0,
            currency: repSeat.currency || 'EUR'
          }
        }));
      });

      const seatTickets = [...seatTicketsForSeats, ...seatTicketsForAreas];

      // Get pricing from first seat (for legacy fields)
      const firstSeat = repSeatForCheckoutEnriched;

      // Calculate totals directly from selected seats
      const totalBasePrice =
        selectedSeats.reduce((sum: number, placeId: string) => {
          const seat = seatData.seats.find(s => s.placeId === placeId);
          return sum + (seat?.basePrice || 0);
        }, 0) +
        selectedAreaEntries.reduce((sum: number, { sectionId, quantity }) => {
          const area = seatData.areaSections.find(a => a.id === sectionId);
          if (!area || !quantity) return sum;
          const repSeat = getRepresentativeSeatForArea(area);
          return sum + (repSeat?.basePrice || 0) * quantity;
        }, 0);

      const totalServiceFee =
        selectedSeats.reduce((sum: number, placeId: string) => {
          const seat = seatData.seats.find(s => s.placeId === placeId);
          return sum + (seat?.serviceFee || 0);
        }, 0) +
        selectedAreaEntries.reduce((sum: number, { sectionId, quantity }) => {
          const area = seatData.areaSections.find(a => a.id === sectionId);
          if (!area || !quantity) return sum;
          const repSeat = getRepresentativeSeatForArea(area);
          return sum + (repSeat?.serviceFee || 0) * quantity;
        }, 0);

      return {
        email,
        confirmEmail,
        quantity: totalSelectedQuantity,
        eventId,
        externalMerchantId: externalMerchantId,
        merchantId: merchantId,
        ticketId: null, // No ticket ID for pricing_configuration
        ticketName: checkoutTicketName,
        price: firstSeat?.basePrice || 0, // Per-unit for legacy
        serviceFee: firstSeat?.serviceFee || 0, // Per-unit for legacy
        totalBasePrice: totalBasePrice, // Total for all seats
        totalServiceFee: totalServiceFee, // Total for all seats
        vat: firstSeat?.tax || 0,
        entertainmentTax: firstSeat?.tax || 0, // tax is entertainment tax
        serviceTax: firstSeat?.serviceTax || 0,
        orderFee: firstSeat?.orderFee || 0,
        eventName: eventTitle,
        country: eventCountry, // Use event country instead of hardcoded 'Finland'
        marketingOptIn: false,
        perUnitSubtotal: 0,
        perUnitVat: 0,
        total: totalPrice,
        placeIds: selectedSeats,
        sectionSelections,
        seatTickets, // Individual pricing for each seat
        sessionId: sessionId,
        fullName: fullName
      };

      console.log('[getCheckoutData] pricing_configuration result:', {
        placeIds: selectedSeats,
        placeIdsLength: selectedSeats.length,
        seatTicketsLength: seatTickets.length
      });
    }

    // Otherwise, use ticket pricing
    // Build seat-ticket mapping
    const seatTickets = selectedSeats.map(placeId => {
      const ticketId = seatTicketMap[placeId];
      const ticket = ticketTypes.find(t => t._id === ticketId);
      const seat = seatData?.seats.find(s => s.placeId === placeId);

      // Build ticketName with section, row, and seat information if available
      const section = seat?.section || '';
      const row = seat?.row ? extractNumericPart(seat.row) : '';
      const seatNum = seat?.seat ? extractNumericPart(seat.seat) : '';
      const ticketNameParts = [];

      // Add ticket name first
      if (ticket?.name) {
        ticketNameParts.push(ticket.name);
      }

      // Add seat location information (with colons)
      const seatLocationParts = [];
      if (section) seatLocationParts.push(`Section: ${section}`);
      if (row) seatLocationParts.push(`Row: ${row}`);
      if (seatNum) seatLocationParts.push(`Seat: ${seatNum}`);

      if (seatLocationParts.length > 0) {
        ticketNameParts.push(`(${seatLocationParts.join(', ')})`);
      }

      const ticketName = ticketNameParts.length > 0
        ? ticketNameParts.join(' ')
        : 'Standard';

      return {
        placeId,
        ticketId: ticketId || null,
        ticketName: ticketName
      };
    });

    // Use first ticket for legacy fields (for backward compatibility)
    const firstTicketId = seatTickets[0]?.ticketId;
    const effectiveTicketId = firstTicketId || effectiveAreaTicketId || ticketTypes[0]?._id || null;
    const firstTicket = ticketTypes.find(t => t._id === effectiveTicketId) || ticketTypes[0];
    const checkoutTicketName = (() => {
      // Standing/area-only selections should not use generic "N Ticket(s)" labels.
      if (selectedSeats.length === 0 && sectionSelections.length > 0) {
        const sectionLabels = sectionSelections.map(({ sectionId, quantity }) => {
          const area = seatData?.areaSections?.find(a => a.id === sectionId);
          const areaName = area?.name || sectionId;
          return quantity > 1 ? `${areaName} x${quantity}` : areaName;
        });
        return sectionLabels.join(', ');
      }
      return totalSelectedQuantity > 0 ? `${totalSelectedQuantity} Ticket(s)` : 'Ticket';
    })();

    const result = {
      email,
      confirmEmail,
      quantity: totalSelectedQuantity,
      eventId,
      externalMerchantId: externalMerchantId,
      merchantId: merchantId,
      ticketId: effectiveTicketId || null,
      ticketName: checkoutTicketName,
      price: firstTicket?.price || 0,
      serviceFee: firstTicket?.serviceFee || 0,
      vat: firstTicket?.vat || 0,
      entertainmentTax: firstTicket?.entertainmentTax || 0,
      serviceTax: firstTicket?.serviceTax || 0,
      orderFee: firstTicket?.orderFee || 0,
      eventName: eventTitle,
      country: eventCountry,
      marketingOptIn: false,
      perUnitSubtotal: 0,
      perUnitVat: 0,
      total: totalPrice,
      placeIds: selectedSeats,
      sectionSelections,
      seatTickets,
      sessionId: sessionId,
      fullName: fullName
    };

    console.log('[getCheckoutData] ticket_info result:', {
      placeIds: selectedSeats,
      placeIdsLength: selectedSeats.length,
      seatTicketsLength: seatTickets.length,
      resultPlaceIds: result.placeIds
    });

    return result;
  }, [selectedSeats, areaSelectionMap, seatTicketMap, ticketTypes, email, eventId, eventTitle, totalPrice, sessionId, fullName, merchantId, externalMerchantId, pricingModel, seatData, eventCountry, confirmEmail, pricingConfig, effectiveAreaTicketId, getRepresentativeSeatForArea]);

  // Show success page if payment succeeded
  if (successTicketData) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return <SuccessPage ticketData={successTicketData as any} />;
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
        <nav className="mb-6" aria-label="Checkout progress">
          <div className="max-w-xl">
            <ol className="flex items-center justify-between relative gap-2" role="list">
              {/* Progress Line */}
              <div className="absolute top-3 left-0 right-0 h-0.5 z-0" style={{ background: 'var(--border)' }} aria-hidden="true">
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
                  <li key={stepItem.key} className="flex flex-col items-center relative z-10 flex-1">
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
                      aria-current={isActive ? 'step' : undefined}
                    >
                      {isCompleted ? (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <span className="sr-only">Step {stepItem.number}</span>
                      )}
                      {!isCompleted && <span aria-hidden="true">{stepItem.number}</span>}
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
                  </li>
                );
              })}
            </ol>
          </div>
        </nav>

        {error && (
          <div className="mb-3 p-2.5 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm" role="alert" aria-live="assertive">
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
                        seats={seatData.seats}
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
                          {t('seatSelection.serviceFeeDisclaimer') || 'Per order payment fees may apply depending on digital payment method used.'}
                        </p>
                      </div>

                      {/* Selected Tickets */}
                      <div className="p-3">
                        {selectedSeats.length === 0 && !Object.values(areaSelectionMap).some((qty) => qty > 0) ? (
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

                                      if (decoded && decoded.tierCode && pricingConfig.tiers) {
                                        const tier = pricingConfig.tiers.find(t => t.id === decoded.tierCode);
                                        if (tier) {
                                          basePrice = tier.basePrice;
                                          taxPercent = (tier.tax || 0) / 100;
                                          serviceFee = tier.serviceFee;
                                          serviceTaxPercent = (tier.serviceTax || 0) / 100;

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

                                  // Truncate each calculation to 3 decimal places (preserve exact values, no rounding)
                                  const baseTaxAmount = Math.round((basePrice * taxPercent) * 1000) / 1000;
                                  const serviceTaxAmount = Math.round((serviceFee * serviceTaxPercent) * 1000) / 1000;

                                  seatPrice = Math.round((basePrice + baseTaxAmount + serviceFee + serviceTaxAmount) * 1000) / 1000;

                                  if (basePrice > 0 || serviceFee > 0) {
                                    pricingBreakdown = {
                                      basePrice,
                                      baseTaxAmount,
                                      baseTaxRatePercent: seat.tax ?? 0,
                                      baseTaxIsEntertainment: true,
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
                                    const baseTaxPct = basePriceTaxPercent(
                                      ticket.vat || 0,
                                      ticket.entertainmentTax
                                    );
                                    const serviceFee = ticket.serviceFee || 0;
                                    const serviceTax = (ticket.serviceTax || 0) / 100;

                                    const baseTaxAmount =
                                      Math.round((basePrice * (baseTaxPct / 100)) * 1000) / 1000;
                                    const serviceTaxAmount = Math.round((serviceFee * serviceTax) * 1000) / 1000;
                                    seatPrice = Math.round((basePrice + baseTaxAmount + serviceFee + serviceTaxAmount) * 1000) / 1000;

                                    pricingBreakdown = {
                                      basePrice,
                                      baseTaxAmount,
                                      baseTaxRatePercent: baseTaxPct,
                                      baseTaxIsEntertainment: isEntertainmentTaxOnBase(
                                        ticket.entertainmentTax
                                      ),
                                      serviceFee,
                                      serviceTaxAmount,
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
                                              <span>{formatCurrency(pricingBreakdown.basePrice)} {getCurrencySymbol(eventCountry || 'Finland')}</span>
                                            </div>
                                            {pricingBreakdown.baseTaxAmount > 0 && (
                                              <div className="flex justify-between">
                                                <span>
                                                  {t('checkout.vat') || 'VAT'}
                                                  {pricingBreakdown.baseTaxRatePercent != null &&
                                                    pricingBreakdown.baseTaxRatePercent > 0 &&
                                                    ` (${formatTaxRateDisplay(pricingBreakdown.baseTaxRatePercent)}%)`}
                                                  :
                                                </span>
                                                <span>
                                                  {formatCurrency(pricingBreakdown.baseTaxAmount)}{' '}
                                                  {getCurrencySymbol(eventCountry || 'Finland')}
                                                </span>
                                              </div>
                                            )}
                                            {pricingBreakdown.serviceFee > 0 && (
                                              <div className="flex justify-between">
                                                <span>{t('seatSelection.serviceFee') || 'Service Fee'}:</span>
                                                <span>{formatCurrency(pricingBreakdown.serviceFee)} {getCurrencySymbol(eventCountry || 'Finland')}</span>
                                              </div>
                                            )}
                                            {pricingBreakdown.serviceFee > 0 && (
                                              <div className="flex justify-between">
                                                <span>{t('seatSelection.serviceTax') || 'Service Tax'}:</span>
                                                <span>{formatCurrency(pricingBreakdown.serviceTaxAmount)} {getCurrencySymbol(eventCountry || 'Finland')}</span>
                                              </div>
                                            )}
                                            <div className="flex justify-between font-medium border-t pt-0.5 mt-1" style={{ borderColor: 'var(--border)' }}>
                                              <span>{t('seatSelection.total') || 'Total'}:</span>
                                              <span>{formatCurrency(seatPrice)} {getCurrencySymbol(eventCountry || 'Finland')}</span>
                                            </div>
                                          </div>
                                        )}
                                        {!pricingBreakdown && seatPrice > 0 && (
                                          <p className="text-sm font-semibold mt-1" style={{ color: 'var(--foreground)' }}>
                                            {formatCurrency(seatPrice)} {getCurrencySymbol(eventCountry || 'Finland')}
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

                              {Object.entries(areaSelectionMap)
                                .filter(([, qty]) => qty > 0)
                                .map(([sectionId, qty]) => {
                                  const area = seatData.areaSections.find((a) => a.id === sectionId);
                                  if (!area) return null;

                                  const { unitPrice, pricingBreakdown } = getAreaPricing(area);
                                  const unit = unitPrice ?? 0;
                                  const lineTotal = Math.round((unit * qty) * 1000) / 1000;

                                  return (
                                    <div
                                      key={`selected-area-${sectionId}`}
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
                                            {t('seatSelection.standard') || 'Standard'}
                                          </p>
                                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-0.5">
                                            <span className="font-medium">{t('seatSelection.section') || 'SECTION'}:</span> {area.name}
                                          </p>
                                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                                            <span className="font-medium">{t('seatSelection.quantity') || 'Quantity'}:</span> {qty}
                                          </p>

                                          {pricingBreakdown ? (
                                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 space-y-0.5">
                                              <div className="flex justify-between">
                                                <span>{t('seatSelection.price') || 'Price'} ({t('seatSelection.perUnit') || 'per unit'}):</span>
                                                <span>{formatCurrency(pricingBreakdown.total)} {getCurrencySymbol(eventCountry || 'Finland')}</span>
                                              </div>
                                              <div className="flex justify-between font-medium border-t pt-0.5 mt-1" style={{ borderColor: 'var(--border)' }}>
                                                <span>{t('seatSelection.total') || 'Total'}:</span>
                                                <span>{formatCurrency(lineTotal)} {getCurrencySymbol(eventCountry || 'Finland')}</span>
                                              </div>
                                            </div>
                                          ) : unit > 0 ? (
                                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 space-y-0.5">
                                              <div className="flex justify-between">
                                                <span>{t('seatSelection.price') || 'Price'} ({t('seatSelection.perUnit') || 'per unit'}):</span>
                                                <span>{formatCurrency(unit)} {getCurrencySymbol(eventCountry || 'Finland')}</span>
                                              </div>
                                              <div className="flex justify-between font-medium border-t pt-0.5 mt-1" style={{ borderColor: 'var(--border)' }}>
                                                <span>{t('seatSelection.total') || 'Total'}:</span>
                                                <span>{formatCurrency(lineTotal)} {getCurrencySymbol(eventCountry || 'Finland')}</span>
                                              </div>
                                            </div>
                                          ) : null}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>

                            {/* Ticket Count Badge */}
                            <div className="flex items-center gap-1.5 mb-3">
                              <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4v-3a2 2 0 00-2-2H5z" />
                              </svg>
                              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                x{selectedSeats.length + Object.values(areaSelectionMap).reduce((sum, qty) => sum + (qty || 0), 0)}
                              </span>
                            </div>
                          </>
                        )}

                        {seatData.areaSections?.length > 0 && (
                          <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                            <p className="text-xs font-semibold mb-2">
                              {t('seatSelection.standingAreaSections') || 'Standing / Area Sections'}
                            </p>
                            <div className="space-y-2">
                              {seatData.areaSections.map((area) => {
                                const currentQty = areaSelectionMap[area.id] || 0;
                                const totalAreaSelectedQty = Object.values(areaSelectionMap).reduce((sum, qty) => sum + (qty || 0), 0);
                                const totalSelectedQty = selectedSeats.length + totalAreaSelectedQty;
                                const ticketForAreas =
                                  effectiveAreaTicketId
                                    ? ticketTypes.find(t => t._id === effectiveAreaTicketId) || ticketTypes[0]
                                    : ticketTypes[0];
                                const scanCountRaw = ticketForAreas?.scanCount ?? 0;
                                const n = Number(scanCountRaw);
                                const isScanCountPass = pricingModel === 'ticket_info' && Number.isFinite(n) && n > 0;
                                const maxQty = isScanCountPass ? 1 : area.availableCount;
                                const canIncrement = currentQty < maxQty && totalSelectedQty < 10;
                                const expanded = expandedAreaSectionId === area.id;
                                const isSoldOut = maxQty <= 0;
                                const availableLabel = t('seatSelection.available') || 'Available';
                                const soldOutLabel = t('seatSelection.soldOut') || 'Sold Out';
                                const { unitPrice, pricingBreakdown } = getAreaPricing(area);
                                return (
                                  <div key={area.id} className="rounded-md border p-2" style={{ borderColor: 'var(--border)' }}>
                                    <div className="flex items-center justify-between gap-2">
                                      <div>
                                        <button
                                          type="button"
                                          className="w-full text-left"
                                          onClick={() => setExpandedAreaSectionId(prev => (prev === area.id ? null : area.id))}
                                          aria-expanded={expanded}
                                        >
                                          <p className="text-xs font-medium">{area.name}</p>
                                          <p className="text-[11px] text-gray-500">
                                            {area.sectionType || 'Area'} · {isSoldOut ? soldOutLabel : `${availableLabel}: ${area.availableCount}`}
                                          </p>
                                          {unitPrice != null && unitPrice > 0 && (
                                            <p className="text-[11px] text-gray-600">
                                              {t('seatSelection.price') || 'Price'}: {formatCurrency(unitPrice)} {getCurrencySymbol(eventCountry || 'Finland')}
                                            </p>
                                          )}
                                        </button>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <button
                                          type="button"
                                          className="px-2 py-1 rounded border text-xs"
                                          style={{ borderColor: 'var(--border)' }}
                                          onClick={() => setAreaSelectionMap((prev) => ({ ...prev, [area.id]: Math.max(0, (prev[area.id] || 0) - 1) }))}
                                          disabled={currentQty <= 0}
                                        >
                                          -
                                        </button>
                                        <span className="text-xs w-6 text-center">{currentQty}</span>
                                        <button
                                          type="button"
                                          className="px-2 py-1 rounded border text-xs"
                                          style={{ borderColor: 'var(--border)' }}
                                          onClick={() => {
                                            // ticket_info: mimic seat-circle behavior by asking for ticket type on first area `+`
                                            if (pricingModel === 'ticket_info' && selectedSeats.length === 0 && !areaTicketId) {
                                              setPendingArea(area);
                                              setShowAreaTicketSelector(true);
                                              return;
                                            }

                                            if (maxQty <= 0) return;
                                            if (selectedSeats.length + Object.values(areaSelectionMap).reduce((sum, qty) => sum + (qty || 0), 0) >= 10) {
                                              return;
                                            }
                                            setAreaSelectionMap((prev) => ({
                                              ...prev,
                                              [area.id]: Math.min(maxQty, (prev[area.id] || 0) + 1)
                                            }));
                                          }}
                                          disabled={!canIncrement}
                                        >
                                          +
                                        </button>
                                      </div>
                                    </div>

                                    {expanded && pricingBreakdown && (
                                      <div className="text-[11px] text-gray-600 mt-2 space-y-0.5">
                                        <div className="flex justify-between">
                                          <span>{t('seatSelection.basePrice') || 'Base Price'}:</span>
                                          <span>{formatCurrency(pricingBreakdown.basePrice)} {getCurrencySymbol(eventCountry || 'Finland')}</span>
                                        </div>
                                        {pricingBreakdown.baseTaxAmount > 0 && (
                                          <div className="flex justify-between">
                                            <span>
                                              {t('checkout.vat') || 'VAT'}
                                              {pricingBreakdown.baseTaxRatePercent != null &&
                                                pricingBreakdown.baseTaxRatePercent > 0 &&
                                                ` (${formatTaxRateDisplay(pricingBreakdown.baseTaxRatePercent)}%)`}
                                            </span>
                                            <span>{formatCurrency(pricingBreakdown.baseTaxAmount)} {getCurrencySymbol(eventCountry || 'Finland')}</span>
                                          </div>
                                        )}
                                        {pricingBreakdown.serviceFee > 0 && (
                                          <div className="flex justify-between">
                                            <span>{t('seatSelection.serviceFee') || 'Service Fee'}:</span>
                                            <span>{formatCurrency(pricingBreakdown.serviceFee)} {getCurrencySymbol(eventCountry || 'Finland')}</span>
                                          </div>
                                        )}
                                        {pricingBreakdown.serviceTaxAmount > 0 && (
                                          <div className="flex justify-between">
                                            <span>{t('seatSelection.serviceTax') || 'Service Tax'}:</span>
                                            <span>{formatCurrency(pricingBreakdown.serviceTaxAmount)} {getCurrencySymbol(eventCountry || 'Finland')}</span>
                                          </div>
                                        )}
                                        <div className="flex justify-between font-medium border-t pt-0.5 mt-1" style={{ borderColor: 'var(--border)' }}>
                                          <span>{t('seatSelection.total') || 'Total'}:</span>
                                          <span>{formatCurrency(pricingBreakdown.total)} {getCurrencySymbol(eventCountry || 'Finland')}</span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Footer with CTA Button */}
                      {(selectedSeats.length > 0 || Object.values(areaSelectionMap).some((qty) => qty > 0)) && (
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
                    <label htmlFor="seat-full-name" className="block text-sm font-medium mb-1">{t('seatSelection.fullName') || 'Full Name'}</label>
                    <input
                      id="seat-full-name"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-2.5 py-1.5 border rounded-lg text-sm"
                      style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                      required
                      aria-required="true"
                    />
                  </div>
                  <div>
                    <label htmlFor="seat-email" className="block text-sm font-medium mb-1">{t('seatSelection.email') || 'Email'}</label>
                    <input
                      id="seat-email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError(null); // Clear error when user types
                      }}
                      className="w-full px-2.5 py-1.5 border rounded-lg text-sm"
                      style={{
                        background: 'var(--surface)',
                        borderColor: (email && confirmEmail && email !== confirmEmail) ? '#ef4444' : 'var(--border)',
                        color: 'var(--foreground)'
                      }}
                      required
                      aria-required="true"
                      aria-invalid={(email && confirmEmail && email !== confirmEmail) ? true : undefined}
                      aria-describedby={(email && confirmEmail && email !== confirmEmail) ? 'email-match-error' : undefined}
                    />
                  </div>
                  <div>
                    <label htmlFor="seat-confirm-email" className="block text-sm font-medium mb-1">{t('seatSelection.confirmEmail') || 'Confirm Email'}</label>
                    <input
                      id="seat-confirm-email"
                      type="email"
                      value={confirmEmail}
                      onChange={(e) => {
                        setConfirmEmail(e.target.value);
                        setError(null); // Clear error when user types
                      }}
                      className="w-full px-2.5 py-1.5 border rounded-lg text-sm"
                      style={{
                        background: 'var(--surface)',
                        borderColor: (email && confirmEmail && email !== confirmEmail) ? '#ef4444' : 'var(--border)',
                        color: 'var(--foreground)'
                      }}
                      required
                      aria-required="true"
                      aria-invalid={(email && confirmEmail && email !== confirmEmail) ? true : undefined}
                      aria-describedby={(email && confirmEmail && email !== confirmEmail) ? 'email-match-error' : undefined}
                    />
                    {email && confirmEmail && email !== confirmEmail && (
                      <p id="email-match-error" className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert" aria-live="polite">
                        {t('seatSelection.emailsDoNotMatch') || 'Email addresses do not match'}
                      </p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="seat-captcha" className="block text-sm font-medium mb-1">{t('seatSelection.captcha') || 'CAPTCHA'}</label>
                    <div id="seat-captcha" className="mt-1" role="group" aria-label="Complete CAPTCHA verification">
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
                      disabled={!fullName.trim() || !email.trim() || !confirmEmail.trim() || !captchaVerified || !!(email && confirmEmail && email !== confirmEmail)}
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
            <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--foreground)' }}>{t('seatSelection.verifyEmail') || 'Verify Your Email'}</h3>
            <div className="p-3 rounded mb-3" style={{ background: 'var(--surface)', borderColor: 'var(--border)', borderWidth: 1, borderStyle: 'solid' }}>
              <p className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>
                {t('seatSelection.ticketsHeld') || 'Your tickets are now held for the next 10 minutes'}
              </p>
            </div>
            <p className="text-sm mb-3" style={{ color: 'var(--foreground)', opacity: 0.8 }}>
              {t('seatSelection.otpSent') || "We've sent an 8-digit code to"} <strong style={{ color: 'var(--foreground)' }}>{obfuscateEmail(email)}</strong>
            </p>
            <div className="mb-3">
              <label htmlFor="seat-otp" className="sr-only">{t('seatSelection.enterOTP') || 'Enter 8-digit verification code'}</label>
              <input
                id="seat-otp"
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 8))}
                placeholder={t('seatSelection.enterOTP') || 'Enter 8-digit code'}
                className="w-full px-3 py-2 text-center text-xl tracking-widest border rounded-lg"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                maxLength={8}
                aria-required="true"
                aria-label="8-digit verification code"
                aria-describedby="otp-instructions"
              />
              <p id="otp-instructions" className="sr-only">Enter the 8-digit code sent to your email address</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setStep('info')}
                className="flex-1 px-3 py-1.5 rounded-lg border font-medium text-sm transition-colors"
                style={{ borderColor: 'var(--border)', color: 'var(--foreground)', background: 'var(--surface)' }}
              >
                {t('common.back') || 'Back'}
              </button>
              <button
                onClick={handleVerifyOTP}
                disabled={otp.length !== 8}
                className="flex-1 px-3 py-1.5 rounded-lg font-medium text-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {t('seatSelection.verify') || 'Verify'}
              </button>
            </div>
            {otpResendCooldown > 0 ? (
              <p className="text-xs mt-2" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
                {t('seatSelection.resendIn') || 'Resend code in'} {otpResendCooldown}s
              </p>
            ) : (
              <button
                onClick={handleSendOTP}
                className="text-xs mt-2 transition-colors"
                style={{ color: 'var(--foreground)', opacity: 0.8 }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '0.8'}
              >
                {t('seatSelection.resendCode') || 'Resend code'}
              </button>
            )}

            </div>

            {/* OTP Information Panel - Right Side */}
            <div className="lg:col-span-2 lg:col-start-2">
              <div className="rounded-lg border p-6" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <h4 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>{t('seatSelection.otpVerification') || 'OTP Verification'}</h4>

                <div className="space-y-4">
                  {/* What is OTP */}
                  <div className="p-3 rounded-lg border" style={{
                    background: 'var(--surface)',
                    borderColor: 'var(--border)',
                    opacity: 0.95
                  }}>
                    <h5 className="font-medium text-sm mb-2" style={{ color: 'var(--foreground)' }}>{t('seatSelection.whatIsOtp') || 'What is OTP?'}</h5>
                    <p className="text-sm" style={{ color: 'var(--foreground)', opacity: 0.8 }}>
                      {t('seatSelection.otpExplanation') || 'OTP (One-Time Password) is a secure 8-digit code sent to your email to verify your identity and complete the seat reservation process.'}
                    </p>
                  </div>

                  {/* Seat Reservation Status */}
                  <div className="p-3 rounded-lg border" style={{
                    background: 'var(--surface)',
                    borderColor: 'var(--border)',
                    opacity: 0.95
                  }}>
                    <h5 className="font-medium text-sm mb-2" style={{ color: 'var(--foreground)' }}>{t('seatSelection.seatReservation') || 'Seat Reservation Status'}</h5>
                    <div className="text-sm space-y-1" style={{ color: 'var(--foreground)', opacity: 0.8 }}>
                      <p>{t('seatSelection.reservationActive') || '✅ Your selected seats are temporarily reserved for 10 minutes'}</p>
                      <p>{t('seatSelection.reservationNote') || '⏰ Complete verification within this time to secure your booking'}</p>
                      <p>{t('seatSelection.reservationExpiry') || '❌ Reservation expires if OTP verification is not completed'}</p>
                    </div>
                  </div>

                  {/* Security Benefits */}
                  <div className="p-3 rounded-lg border" style={{
                    background: 'var(--surface)',
                    borderColor: 'var(--border)',
                    opacity: 0.95
                  }}>
                    <h5 className="font-medium text-sm mb-2" style={{ color: 'var(--foreground)' }}>{t('seatSelection.securityBenefits') || 'Security & Benefits'}</h5>
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
                pricingModel={pricingModel}
                paytrailEnabled={paytrailEnabled}
                onBack={() => setStep('otp')}
                onSuccess={(ticketData) => setSuccessTicketData(ticketData)}
                onError={(err) => setError(err)}
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
                const baseTaxPct = basePriceTaxPercent(
                  ticket.vat || 0,
                  ticket.entertainmentTax
                );
                const serviceFee = ticket.serviceFee || 0;
                const serviceTaxPercent = ticket.serviceTax || 0;
                const serviceTax = serviceTaxPercent / 100;

                const baseTaxAmount = basePrice * (baseTaxPct / 100);
                const serviceTaxAmount = serviceFee * serviceTax;
                const ticketPrice = basePrice + baseTaxAmount + serviceFee + serviceTaxAmount;

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
                        {formatCurrency(ticketPrice)} {getCurrencySymbol(eventCountry || 'Finland')}
                      </span>
                    </div>
                    {/* Pricing Breakdown */}
                    <div className="text-xs space-y-1" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
                      <div className="flex justify-between">
                        <span>{t('seatSelection.basePrice') || 'Base Price'}:</span>
                        <span>{formatCurrency(basePrice)} {getCurrencySymbol(eventCountry || 'Finland')}</span>
                      </div>
                      {baseTaxPct > 0 && (
                        <div className="flex justify-between">
                          <span>
                            {t('checkout.vat') || 'VAT'}{' '}
                            ({formatTaxRateDisplay(baseTaxPct)}%):
                          </span>
                          <span>
                            +{formatCurrency(baseTaxAmount)}{' '}
                            {getCurrencySymbol(eventCountry || 'Finland')}
                          </span>
                        </div>
                      )}
                      {serviceFee > 0 && (
                        <div className="flex justify-between">
                          <span>{t('seatSelection.serviceFee') || 'Service Fee'}:</span>
                          <span>+{formatCurrency(serviceFee)} {getCurrencySymbol(eventCountry || 'Finland')}</span>
                        </div>
                      )}
                      {serviceTaxPercent > 0 && serviceFee > 0 && (
                        <div className="flex justify-between">
                          <span>{t('seatSelection.serviceTax') || 'Service Tax'} ({serviceTaxPercent}%):</span>
                          <span>+{formatCurrency(serviceTaxAmount)} {getCurrencySymbol(eventCountry || 'Finland')}</span>
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

      {/* Area Ticket Type Selector Modal (ticket_info only) */}
      {showAreaTicketSelector && pendingArea && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div
            className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl pointer-events-auto"
            style={{ background: 'var(--surface)', color: 'var(--foreground)' }}
          >
            <h3 className="text-lg font-semibold mb-4">
              {t('seatSelection.selectTicketType') || 'Select Ticket Type'}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {pendingArea.name ? `Area: ${pendingArea.name}` : 'Area selection'}
              {pendingArea.sectionType ? ` · ${pendingArea.sectionType}` : ''}
            </p>

            <div className="space-y-3 mb-4 max-h-[400px] overflow-y-auto">
              {ticketTypes.map((ticket) => {
                const basePrice = ticket.price || 0;
                const baseTaxPct = basePriceTaxPercent(ticket.vat || 0, ticket.entertainmentTax);
                const serviceFee = ticket.serviceFee || 0;
                const serviceTaxPercent = ticket.serviceTax || 0;
                const serviceTax = serviceTaxPercent / 100;

                const baseTaxAmount = basePrice * (baseTaxPct / 100);
                const serviceTaxAmount = serviceFee * serviceTax;
                const ticketPrice = basePrice + baseTaxAmount + serviceFee + serviceTaxAmount;

                return (
                  <button
                    key={ticket._id}
                    onClick={() => handleAreaTicketSelect(ticket._id)}
                    className="w-full p-4 text-left border-2 rounded-lg hover:border-indigo-500 transition-colors"
                    style={{
                      borderColor: 'var(--border)',
                      background: 'var(--surface)'
                    }}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-base">{ticket.name}</span>
                      <span className="font-semibold text-lg">
                        {formatCurrency(ticketPrice)} {getCurrencySymbol(eventCountry || 'Finland')}
                      </span>
                    </div>

                    <div className="text-xs space-y-1" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
                      <div className="flex justify-between">
                        <span>{t('seatSelection.basePrice') || 'Base Price'}:</span>
                        <span>{formatCurrency(basePrice)} {getCurrencySymbol(eventCountry || 'Finland')}</span>
                      </div>
                      {baseTaxPct > 0 && (
                        <div className="flex justify-between">
                          <span>
                            {t('checkout.vat') || 'VAT'} ({formatTaxRateDisplay(baseTaxPct)}%):
                          </span>
                          <span>+{formatCurrency(baseTaxAmount)} {getCurrencySymbol(eventCountry || 'Finland')}</span>
                        </div>
                      )}
                      {serviceFee > 0 && (
                        <div className="flex justify-between">
                          <span>{t('seatSelection.serviceFee') || 'Service Fee'}:</span>
                          <span>+{formatCurrency(serviceFee)} {getCurrencySymbol(eventCountry || 'Finland')}</span>
                        </div>
                      )}
                      {serviceTaxPercent > 0 && serviceFee > 0 && (
                        <div className="flex justify-between">
                          <span>{t('seatSelection.serviceTax') || 'Service Tax'} ({serviceTaxPercent}%):</span>
                          <span>+{formatCurrency(serviceTaxAmount)} {getCurrencySymbol(eventCountry || 'Finland')}</span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => {
                setShowAreaTicketSelector(false);
                setPendingArea(null);
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
  checkoutData: CheckoutData;
  totalPrice: number;
  currency: string;
  ticketTypes: TicketInfo[];
  seatTicketMap: Record<string, string>;
  selectedSeats: string[];
  seatData: {
    seats: Seat[];
  } | null;
  pricingModel?: 'ticket_info' | 'pricing_configuration' | null;
  paytrailEnabled: boolean;
  onBack: () => void;
  onSuccess: (ticketData: Record<string, unknown>) => void;
  onError: (error: string) => void;
}

function PaymentForm({ checkoutData, totalPrice, ticketTypes, seatTicketMap, selectedSeats, seatData, pricingModel, paytrailEnabled, onBack, onSuccess, onError }: PaymentFormProps) {
  const { t } = useTranslation();
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardComplete, setCardComplete] = useState(false);
  const [themeColors, setThemeColors] = useState({ textColor: '#000', placeholderColor: '#999', iconColor: '#666' });
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [paymentProvider, setPaymentProvider] = useState<'stripe' | 'paytrail'>('stripe');
   // Countdown timer state (10 minutes = 600 seconds)
   const [timeRemaining, setTimeRemaining] = useState(600); // 10 minutes in seconds
   const [timerExpired, setTimerExpired] = useState(false);

   // Countdown timer effect
   useEffect(() => {
     if (timerExpired) return;

     const interval = setInterval(() => {
       setTimeRemaining((prev) => {
         if (prev <= 1) {
           setTimerExpired(true);

           return 0;
         }
         return prev - 1;
       });
     }, 1000);

     return () => clearInterval(interval);
   }, [timerExpired]);

   // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Generate nonce once when component mounts to prevent duplicate submissions
  const [nonce] = useState(() => {
    // Generate a cryptographically secure random nonce
    const array = new Uint8Array(32);
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(array);
    } else {
      // Fallback for environments without crypto API
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
    }
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  });

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
    if (!seatData) return [];

    // Handle pricing_configuration model
    if (pricingModel === 'pricing_configuration') {
      const seatTickets = Array.isArray(checkoutData.seatTickets) ? checkoutData.seatTickets : [];

      // Prefer checkoutData.seatTickets (works for standing/area selections too, where selectedSeats can be empty).
      if (seatTickets.length > 0) {
        return seatTickets.map((st: Record<string, any>, index: number) => {
          const pricing = (st?.pricing ?? {}) as Record<string, any>;
          const basePrice = pricing.basePrice ?? pricing.price ?? 0;
          const taxPercent = pricing.tax ?? pricing.vat ?? 0;
          const serviceFee = pricing.serviceFee ?? 0;
          const serviceTaxPercent = pricing.serviceTax ?? 0;

          const tax = taxPercent / 100;
          const serviceTax = serviceTaxPercent / 100;
          const taxAmount = basePrice * tax;
          const serviceTaxAmount = serviceFee * serviceTax;
          const ticketPrice = basePrice + taxAmount + serviceFee + serviceTaxAmount;

          return {
            placeId: (st?.placeId && String(st.placeId).trim().length > 0) ? String(st.placeId) : `seatTicket-${index + 1}`,
            // UI "seat info" expects `seat.section`, `seat.row`, and `seat.seat`.
            // For standing/area units we don't have row/seat, but we can still show the area label.
            seat: {
              tax: taxPercent,
              serviceTax: serviceTaxPercent,
              row: null,
              seat: null,
              section: (st?.ticketName && String(st.ticketName).trim().length > 0) ? String(st.ticketName) : null
            } as any,
            ticket: null,
            ticketName: (st?.ticketName && String(st.ticketName).trim().length > 0) ? String(st.ticketName) : 'Ticket',
            basePrice,
            entertainmentTaxPercent: taxPercent,
            entertainmentTaxAmount: taxAmount,
            serviceFee,
            serviceTaxPercent,
            serviceTaxAmount,
            ticketPrice
          };
        }).filter(Boolean);
      }

      // Fallback: if seatTickets isn't present, calculate from selectedSeats.
      return selectedSeats.map((placeId) => {
        const seat = seatData.seats.find(s => s.placeId === placeId);
        if (!seat) return null;

        const basePrice = seat.basePrice || 0;
        const taxPercent = seat.tax || 0;
        const tax = taxPercent / 100;
        const serviceFee = seat.serviceFee || 0;
        const serviceTaxPercent = seat.serviceTax || 0;
        const serviceTax = serviceTaxPercent / 100;

        const taxAmount = basePrice * tax;
        const serviceTaxAmount = serviceFee * serviceTax;
        const ticketPrice = basePrice + taxAmount + serviceFee + serviceTaxAmount;

        // Build ticketName with section, row, and seat information (with colons)
        const section = seat.section || '';
        const row = seat.row ? extractNumericPart(seat.row) : '';
        const seatNum = seat.seat ? extractNumericPart(seat.seat) : '';
        const ticketNameParts = [];
        if (section) ticketNameParts.push(`Section: ${section}`);
        if (row) ticketNameParts.push(`Row: ${row}`);
        if (seatNum) ticketNameParts.push(`Seat: ${seatNum}`);
        const ticketName = ticketNameParts.length > 0
          ? ticketNameParts.join(', ')
          : 'Seat';

        return {
          placeId,
          seat,
          ticket: null,
          ticketName: ticketName,
          basePrice,
          entertainmentTaxPercent: taxPercent,
          entertainmentTaxAmount: taxAmount,
          serviceFee,
          serviceTaxPercent,
          serviceTaxAmount,
          ticketPrice
        };
      }).filter(Boolean);
    }

    // Handle ticket_info model
    if (!ticketTypes.length) return [];

    return selectedSeats.map((placeId) => {
      const ticketId = seatTicketMap[placeId];
      const ticket = ticketTypes.find(t => t._id === ticketId);
      const seat = seatData.seats.find(s => s.placeId === placeId);

      if (!ticket) return null;

      const basePrice = ticket.price || 0;
      const baseTaxPct = basePriceTaxPercent(
        ticket.vat || 0,
        ticket.entertainmentTax
      );
      const serviceFee = ticket.serviceFee || 0;
      const serviceTaxPercent = ticket.serviceTax || 0;
      const serviceTax = serviceTaxPercent / 100;

      const entertainmentTaxAmount = basePrice * (baseTaxPct / 100);
      const serviceTaxAmount = serviceFee * serviceTax;
      const ticketPrice = basePrice + entertainmentTaxAmount + serviceFee + serviceTaxAmount;

      return {
        placeId,
        seat,
        ticket,
        ticketName: ticket.name,
        basePrice,
        entertainmentTaxPercent: baseTaxPct,
        entertainmentTaxAmount,
        serviceFee,
        serviceTaxPercent,
        serviceTaxAmount,
        ticketPrice
      };
    }).filter(Boolean);
  }, [selectedSeats, seatTicketMap, ticketTypes, seatData, pricingModel, checkoutData.seatTickets]);

  // Calculate order fee (once per transaction)
  const orderFeeInfo = useMemo(() => {
    // Handle pricing_configuration model
    if (pricingModel === 'pricing_configuration' && seatData) {
      if (selectedSeats.length > 0) {
        const firstSeat = seatData.seats.find(s => selectedSeats.includes(s.placeId));
        if (firstSeat) {
          const orderFee = firstSeat.orderFee || 0;
          const serviceTaxPercent = firstSeat.serviceTax || 0;
          // Round order fee tax calculation to 3 decimals
          const orderFeeTax = Math.round((orderFee * (serviceTaxPercent / 100)) * 1000) / 1000;
          const orderFeeTotal = Math.round((orderFee + orderFeeTax) * 1000) / 1000;
          return { orderFee, orderFeeTax, orderFeeTotal, serviceTaxPercent };
        }
      }

      // Standing/area can have selectedSeats.length === 0, so fall back to checkoutData.seatTickets.
      const seatTickets = Array.isArray(checkoutData.seatTickets) ? checkoutData.seatTickets : [];
      const firstTicketPricing = seatTickets?.[0]?.pricing || {};
      const orderFee = firstTicketPricing.orderFee || 0;
      const serviceTaxPercent = firstTicketPricing.serviceTax || 0;
      if (orderFee > 0 || serviceTaxPercent > 0) {
        const orderFeeTax = Math.round((orderFee * (serviceTaxPercent / 100)) * 1000) / 1000;
        const orderFeeTotal = Math.round((orderFee + orderFeeTax) * 1000) / 1000;
        return { orderFee, orderFeeTax, orderFeeTotal, serviceTaxPercent };
      }
    }

    // Handle ticket_info model
    if (!ticketTypes.length) return { orderFee: 0, orderFeeTax: 0, orderFeeTotal: 0 };

    // Get order fee from first ticket (order fee is per transaction, not per ticket)
    const firstTicketId = checkoutData.seatTickets?.[0]?.ticketId;
    const firstTicket = ticketTypes.find(t => t._id === firstTicketId);

    if (!firstTicket) return { orderFee: 0, orderFeeTax: 0, orderFeeTotal: 0 };

    const orderFee = firstTicket.orderFee || 0;
    const serviceTaxPercent = firstTicket.serviceTax || 0;
    // Round order fee tax calculation to 3 decimals
    const orderFeeTax = Math.round((orderFee * (serviceTaxPercent / 100)) * 1000) / 1000;
    const orderFeeTotal = Math.round((orderFee + orderFeeTax) * 1000) / 1000;

    return { orderFee, orderFeeTax, orderFeeTotal, serviceTaxPercent };
  }, [ticketTypes, checkoutData.seatTickets, pricingModel, seatData, selectedSeats]);

  // Calculate subtotal (sum of all ticket/seat prices, excluding order fee)
  const subtotal = useMemo(() => {
    // pricing_configuration: per-seat totals live on seat.price (tier-based).
    // ticket_info: seat.price is zone/seat-only — must use ticket selection breakdown only.
    if (pricingModel === 'pricing_configuration' && seatData && selectedSeats.length > 0) {
      let calculated = 0;
      selectedSeats.forEach((placeId) => {
        const seat = seatData.seats.find(s => s.placeId === placeId);
        if (seat && seat.price) {
          calculated += seat.price;
        }
      });
      if (calculated > 0) {
        return calculated;
      }
    }

    // Otherwise, use ticket-based pricing breakdown
    const calculated = seatPricingBreakdown.reduce((sum, item) => sum + (item?.ticketPrice || 0), 0);

    // If subtotal is still 0 but we have seats selected and a total, calculate from total minus order fee
    if (calculated === 0 && selectedSeats.length > 0 && totalPrice > 0) {
      const orderFeeTotal = orderFeeInfo.orderFeeTotal || 0;
      return Math.max(0, totalPrice - orderFeeTotal);
    }

    // If there are no individual seat tickets (e.g. standing/area-only in `ticket_info`),
    // derive subtotal from checkoutData (base price + service fee, excluding VAT).
    if (calculated === 0 && totalPrice > 0) {
      if (pricingModel === 'ticket_info') {
        return Math.max(0, (checkoutData.price + checkoutData.serviceFee) * checkoutData.quantity);
      }

      if (pricingModel === 'pricing_configuration') {
        const totalBasePrice = checkoutData.totalBasePrice ?? checkoutData.price * checkoutData.quantity;
        const totalServiceFee =
          checkoutData.totalServiceFee ?? checkoutData.serviceFee * checkoutData.quantity;
        return Math.max(0, totalBasePrice + totalServiceFee);
      }
    }

    return calculated;
  }, [
    seatPricingBreakdown,
    selectedSeats,
    seatData,
    totalPrice,
    orderFeeInfo.orderFeeTotal,
    pricingModel,
    checkoutData.price,
    checkoutData.serviceFee,
    checkoutData.quantity,
    checkoutData.totalBasePrice,
    checkoutData.totalServiceFee
  ]);

  // Calculate summary totals from seat pricing breakdown (for both ticket_info and pricing_configuration models)
  const summaryTotals = useMemo(() => {
    if (seatPricingBreakdown.length > 0) {
      // For pricing_configuration model
      if (pricingModel === 'pricing_configuration') {
        // Sum base prices and service fees (exact sum, no truncation yet)
        // Ensure we're working with numbers (handle both string and number types)
        const totalBasePriceExact = seatPricingBreakdown.reduce((sum, item) => {
          const bp = typeof item?.basePrice === 'number' ? item.basePrice : (parseFloat(String(item?.basePrice || 0)) || 0);
          return sum + bp;
        }, 0);
        const totalServiceFeeExact = seatPricingBreakdown.reduce((sum, item) => {
          const sf = typeof item?.serviceFee === 'number' ? item.serviceFee : (parseFloat(String(item?.serviceFee || 0)) || 0);
          return sum + sf;
        }, 0);

        // For pricing_configuration, VAT is the same as entertainmentTax (tax on base price)
        // Calculate percentage on EXACT total (not truncated), then truncate result to 3 decimals
        const firstSeat = seatPricingBreakdown[0]?.seat;
        const taxRate = firstSeat?.tax || checkoutData.entertainmentTax || checkoutData.vat || 0;
        const serviceTaxRate = firstSeat?.serviceTax || checkoutData.serviceTax || 0;

        // Calculate percentages on exact totals, then round to 3 decimals (use round to handle floating-point errors)
        const totalEntertainmentTaxAmount = Math.round((totalBasePriceExact * taxRate / 100) * 1000) / 1000;
        const totalServiceTaxAmount = Math.round((totalServiceFeeExact * serviceTaxRate / 100) * 1000) / 1000;

        // Round the base totals for display/storage
        const totalBasePrice = Math.round(totalBasePriceExact * 1000) / 1000;
        const totalServiceFee = Math.round(totalServiceFeeExact * 1000) / 1000;

        // Unify VAT and Entertainment Tax - they're the same, use whichever is available
        const unifiedVatAmount = totalEntertainmentTaxAmount || 0;
        const unifiedVatRate = taxRate || 0;

        return {
          totalBasePrice,
          totalServiceFee,
          totalEntertainmentTaxAmount,
          totalServiceTaxAmount,
          totalVatAmount: unifiedVatAmount, // Use unified value
          entertainmentTaxRate: unifiedVatRate,
          vatRate: unifiedVatRate // Use unified rate
        };
      }

      // For ticket_info model
      if (pricingModel === 'ticket_info') {
      // Sum individual seat ticket prices (exact sum, no truncation yet)
      // Ensure we're working with numbers (handle both string and number types)
      const totalBasePriceExact = seatPricingBreakdown.reduce((sum, item) => {
        const bp = typeof item?.basePrice === 'number' ? item.basePrice : (parseFloat(String(item?.basePrice || 0)) || 0);
        return sum + bp;
      }, 0);
      const totalServiceFeeExact = seatPricingBreakdown.reduce((sum, item) => {
        const sf = typeof item?.serviceFee === 'number' ? item.serviceFee : (parseFloat(String(item?.serviceFee || 0)) || 0);
        return sum + sf;
      }, 0);
      // Use round (not floor) to handle floating-point errors when summing
      const totalEntertainmentTaxAmount = Math.round(seatPricingBreakdown.reduce((sum, item) => sum + (item?.entertainmentTaxAmount || 0), 0) * 1000) / 1000;
      const totalServiceTaxAmount = Math.round(seatPricingBreakdown.reduce((sum, item) => sum + (item?.serviceTaxAmount || 0), 0) * 1000) / 1000;

      // Calculate VAT from base prices (VAT is on base price only)
      // Calculate percentage on EXACT total basePrice, not truncated (percentage should be on 100, not thousands)
      // Get vatRate from first ticket or checkoutData
      const firstTicketId = checkoutData.seatTickets?.[0]?.ticketId;
      const firstTicket = ticketTypes.find(t => t._id === firstTicketId);
      const unifiedVatRate = basePriceTaxPercent(
        firstTicket?.vat || checkoutData.vat || 0,
        firstTicket?.entertainmentTax ?? checkoutData.entertainmentTax
      );
      const totalBasePrice = Math.round(totalBasePriceExact * 1000) / 1000;
      const totalServiceFee = Math.round(totalServiceFeeExact * 1000) / 1000;
      const unifiedVatAmount = totalEntertainmentTaxAmount;

      return {
        totalBasePrice,
        totalServiceFee,
        totalEntertainmentTaxAmount,
        totalServiceTaxAmount,
        totalVatAmount: unifiedVatAmount,
        entertainmentTaxRate: unifiedVatRate,
        vatRate: unifiedVatRate
      };
      }
    }

    // Fallback to legacy calculation (multiply by quantity) - round each calculation
    const basePct = basePriceTaxPercent(
      checkoutData.vat,
      checkoutData.entertainmentTax
    );
    const unifiedBaseTaxAmount = Math.round(
      (checkoutData.price * (basePct / 100) * checkoutData.quantity) * 1000
    ) / 1000;

    return {
      totalBasePrice: Math.round((checkoutData.price * checkoutData.quantity) * 1000) / 1000,
      totalServiceFee: Math.round((checkoutData.serviceFee * checkoutData.quantity) * 1000) / 1000,
      totalEntertainmentTaxAmount: unifiedBaseTaxAmount,
      totalServiceTaxAmount: Math.round(((checkoutData.serviceFee * (checkoutData.serviceTax || 0) / 100) * checkoutData.quantity) * 1000) / 1000,
      totalVatAmount: unifiedBaseTaxAmount,
      entertainmentTaxRate: basePct,
      vatRate: basePct
    };
  }, [seatPricingBreakdown, checkoutData, pricingModel, ticketTypes]);

  // Calculate pricing breakdown (legacy, for payment intent)
  const perUnitSubtotal = checkoutData.price + checkoutData.serviceFee;
  const perUnitVat =
    checkoutData.price *
    (basePriceTaxPercent(checkoutData.vat, checkoutData.entertainmentTax) / 100);

  const createPaymentIntentPayload = useCallback(() => {
    // Validate required fields
    if (!checkoutData.eventId) {
      throw new Error('Missing required field: eventId');
    }
    if (!checkoutData.ticketId && !checkoutData.seatTickets?.length) {
      throw new Error('Missing required field: ticketId (or seatTickets)');
    }
    if (!checkoutData.merchantId) {
      throw new Error('Missing required field: merchantId');
    }

    // Base metadata (always present)
    // For pricing_configuration, ticketId should be null (not a placeholder string)
    const ticketIdValue = checkoutData.ticketId || checkoutData.seatTickets?.[0]?.ticketId || null;
    const metadata: Record<string, string | boolean | null> = {
      eventId: checkoutData.eventId,
      ticketId: ticketIdValue, // null for pricing_configuration, valid ObjectId for ticket_info
      email: checkoutData.email,
      quantity: checkoutData.quantity.toString(),
      eventName: checkoutData.eventName,
      ticketName: checkoutData.ticketName,
      merchantId: checkoutData.merchantId,
      externalMerchantId: checkoutData.externalMerchantId || '',
      // Nonce to prevent duplicate form submissions
      nonce: nonce,
      // Locale for email templates (BCP 47 format) - get from localStorage
      locale: typeof window !== 'undefined' ? (localStorage.getItem('locale') || 'en-US') : 'en-US',
      basePrice: checkoutData.price.toString(),
      serviceFee: checkoutData.serviceFee.toString(),
      vatRate: formatTaxRateDisplay(
        summaryTotals?.vatRate ??
          basePriceTaxPercent(checkoutData.vat, checkoutData.entertainmentTax)
      ),
      vatAmount: (summaryTotals?.totalVatAmount || (perUnitVat * checkoutData.quantity)).toFixed(3), // Total VAT amount from summary totals
      perUnitSubtotal: perUnitSubtotal.toString(),
      perUnitTotal: (perUnitSubtotal + perUnitVat).toString(),
      totalBasePrice: (summaryTotals?.totalBasePrice || checkoutData.totalBasePrice || (checkoutData.price * checkoutData.quantity)).toFixed(3),
      totalServiceFee: (summaryTotals?.totalServiceFee || checkoutData.totalServiceFee || (checkoutData.serviceFee * checkoutData.quantity)).toFixed(3),
      totalVatAmount: (summaryTotals?.totalVatAmount || (perUnitVat * checkoutData.quantity)).toFixed(3),
      totalAmount: totalPrice.toString(),
      country: checkoutData.country || 'Finland',
      marketingOptIn: marketingConsent,
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

    if (checkoutData?.sectionSelections && Array.isArray(checkoutData.sectionSelections) && checkoutData.sectionSelections.length > 0) {
      metadata.sectionSelections = JSON.stringify(checkoutData.sectionSelections);
    }

    if (checkoutData?.sessionId) {
      metadata.sessionId = checkoutData.sessionId;
    }

    if (isEntertainmentTaxOnBase(checkoutData.entertainmentTax)) {
      metadata.entertainmentTax = formatTaxRateDisplay(
        checkoutData.entertainmentTax!
      );
    }

    // Use summaryTotals for pricing_configuration (percentages calculated on totals, not per-seat)
    if (pricingModel === 'pricing_configuration' && summaryTotals) {
      // Set total amounts in metadata for backend validation
      if (summaryTotals.totalEntertainmentTaxAmount > 0) {
        metadata.entertainmentTaxAmount = summaryTotals.totalEntertainmentTaxAmount.toFixed(3);
        metadata.totalEntertainmentTaxAmount = summaryTotals.totalEntertainmentTaxAmount.toFixed(3);
        if (summaryTotals.entertainmentTaxRate > 0) {
          metadata.entertainmentTax = formatTaxRateDisplay(
            summaryTotals.entertainmentTaxRate
          );
        }
      }

      if (summaryTotals.totalServiceTaxAmount > 0) {
        metadata.serviceTaxAmount = summaryTotals.totalServiceTaxAmount.toFixed(3);
        metadata.totalServiceTaxAmount = summaryTotals.totalServiceTaxAmount.toFixed(3);
        // Get service tax rate from first seat
        const firstSeat = seatPricingBreakdown[0]?.seat;
        const serviceTaxRate = firstSeat?.serviceTax || checkoutData.serviceTax || 0;
        if (serviceTaxRate > 0) {
          metadata.serviceTax = serviceTaxRate.toString();
        }
      }

      // For pricing_configuration, VAT is the same as entertainmentTax (tax on base price)
      if (summaryTotals.totalVatAmount > 0) {
        metadata.vatAmount = summaryTotals.totalVatAmount.toFixed(3);
        metadata.totalVatAmount = summaryTotals.totalVatAmount.toFixed(3);
        if (summaryTotals.vatRate > 0) {
          metadata.vatRate = formatTaxRateDisplay(summaryTotals.vatRate);
        }
      }
    } else if (pricingModel === 'ticket_info' && seatPricingBreakdown.length > 0 && summaryTotals) {
      // For ticket_info model with seatTickets, use summaryTotals
      if (summaryTotals.totalEntertainmentTaxAmount > 0) {
        metadata.entertainmentTaxAmount = summaryTotals.totalEntertainmentTaxAmount.toFixed(3);
        if (isEntertainmentTaxOnBase(checkoutData.entertainmentTax)) {
          metadata.entertainmentTax = formatTaxRateDisplay(
            summaryTotals.entertainmentTaxRate
          );
        }
      }
      if (summaryTotals.totalServiceTaxAmount > 0) {
        metadata.serviceTaxAmount = summaryTotals.totalServiceTaxAmount.toFixed(3);
      }
    } else if (checkoutData?.price !== undefined) {
      const bp = basePriceTaxPercent(
        checkoutData.vat,
        checkoutData.entertainmentTax
      );
      if (bp > 0 && isEntertainmentTaxOnBase(checkoutData.entertainmentTax)) {
        const totalEt = Math.round(
          checkoutData.price * (bp / 100) * checkoutData.quantity * 1000
        ) / 1000;
        metadata.entertainmentTaxAmount = totalEt.toFixed(3);
      }
    }

    if (checkoutData?.serviceTax !== undefined && checkoutData.serviceTax !== null) {
      metadata.serviceTax = checkoutData.serviceTax.toString();
    }

    if (checkoutData?.orderFee !== undefined && checkoutData.orderFee !== null) {
      metadata.orderFee = checkoutData.orderFee.toString();
    }

    return {
      amount: Math.round(totalPrice * 100), // Convert to cents
      currency: getCurrencyCode(checkoutData.country || 'Finland').toLowerCase() || 'eur',
      paymentProvider: paymentProvider,
      metadata
    };
  }, [checkoutData, summaryTotals, pricingModel, seatPricingBreakdown, ticketTypes, nonce, totalPrice, marketingConsent, paymentProvider, perUnitSubtotal, perUnitVat]);

  const createPaymentIntent = async () => {
    try {
      const payload = createPaymentIntentPayload();

      // Double-check required fields before sending
      // For pricing_configuration, ticketId can be null if seatTickets is provided
      const hasSeatTickets = checkoutData.seatTickets && Array.isArray(checkoutData.seatTickets) && checkoutData.seatTickets.length > 0;
      if (!payload.metadata.eventId || !payload.metadata.merchantId || (!payload.metadata.ticketId && !hasSeatTickets)) {
        throw new Error('Missing required metadata: eventId, ticketId, and merchantId are required');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/front'}/create-payment-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to create payment intent');
      }

      return await response.json();
    } catch (error: unknown) {
      console.error('Error creating payment intent:', error);
      throw error;
    }
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

  const handlePaymentSuccess = useCallback(async (paymentIntentId: string) => {
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
          marketingOptIn: marketingConsent,
          placeIds: checkoutData.placeIds || [],
          seatTickets: checkoutData.seatTickets || [], // Map of placeId -> ticketId
          sectionSelections: checkoutData.sectionSelections || [],
          sessionId: checkoutData.sessionId || undefined,
          nonce: nonce, // Include nonce to prevent duplicate submissions
          locale: typeof window !== 'undefined' ? (localStorage.getItem('locale') || 'en-US') : 'en-US', // Locale for email templates (BCP 47 format)
        }
      })
    });

    if (!successResponse.ok) {
      throw new Error('Failed to create ticket record');
    }

    return await successResponse.json();
  }, [checkoutData, marketingConsent, nonce]);

  const handlePaytrailPayment = async () => {
    setLoading(true);
    setError(null);
    onError('');

    try {
      const payload = createPaymentIntentPayload();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/front'}/create-paytrail-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to create Paytrail payment');
      }

      const paytrailResponse = await response.json();

      // Redirect to Paytrail payment page
      if (paytrailResponse.paymentUrl) {
        // Store checkout data for when user returns from Paytrail
        if (typeof window !== 'undefined') {
          // Store full checkout data with calculated total
          const checkoutDataWithTotal = {
            ...checkoutData,
            totalPrice: totalPrice,
            marketingConsent: marketingConsent,
            selectedSeats: selectedSeats,
          };

          console.log('[handlePaytrailPayment] Storing checkout data:', {
            placeIds: checkoutData.placeIds,
            placeIdsLength: checkoutData.placeIds?.length || 0,
            seatTickets: checkoutData.seatTickets,
            seatTicketsLength: checkoutData.seatTickets?.length || 0,
            eventId: checkoutData.eventId
          });

          sessionStorage.setItem('paytrail_original_checkout_data', JSON.stringify(checkoutDataWithTotal));

          // Also save minimal data for verification
          sessionStorage.setItem('paytrail_checkout_data', JSON.stringify({
            eventId: checkoutData.eventId,
            email: checkoutData.email,
            customerName: checkoutData.fullName || checkoutData.email.split('@')[0],
            quantity: checkoutData.quantity,
            ticketTypeId: checkoutData.ticketId,
            seats: checkoutData.placeIds || [],
            placeIds: checkoutData.placeIds || [], // Explicitly include placeIds
            seatTickets: checkoutData.seatTickets || [],
            sectionSelections: checkoutData.sectionSelections || [],
            sessionId: checkoutData.sessionId || undefined,
            amount: Math.round(totalPrice * 100), // cents
            currency: getCurrencyCode(checkoutData.country || 'Finland').toUpperCase() || 'EUR',
            transactionId: paytrailResponse.transactionId,
            stamp: paytrailResponse.stamp,
          }));
        }
        window.location.href = paytrailResponse.paymentUrl;
        return;
      }
      throw new Error('Paytrail payment URL not received');
    } catch (err) {
      let errorMessage = 'Failed to initiate Paytrail payment';
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      onError(errorMessage);
      console.error('Paytrail payment error:', err);
      setLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    // Handle Paytrail payment
    if (paymentProvider === 'paytrail') {
      await handlePaytrailPayment();
      return;
    }

    // Handle Stripe payment
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

      <div className={`rounded-lg p-4 border-2 ${
        timeRemaining < 120
          ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
          : timeRemaining < 300
          ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700'
          : 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FaClock className={`text-lg ${
              timeRemaining < 120
                ? 'text-red-600 dark:text-red-400'
                : timeRemaining < 300
                ? 'text-yellow-600 dark:text-yellow-400'
                : 'text-blue-600 dark:text-blue-400'
            }`} />
            <span className={`font-medium ${
              timeRemaining < 120
                ? 'text-red-700 dark:text-red-300'
                : timeRemaining < 300
                ? 'text-yellow-700 dark:text-yellow-300'
                : 'text-blue-700 dark:text-blue-300'
            }`}>
              {timerExpired
                ? (t('checkout.timerExpired') || 'Payment session expired')
                : (t('checkout.timeRemaining') || 'Time remaining to complete payment')
              }

            </span>
          </div>
          <div className={`text-2xl font-bold font-mono ${
            timeRemaining < 120
              ? 'text-red-700 dark:text-red-300'
              : timeRemaining < 300
              ? 'text-yellow-700 dark:text-yellow-300'
              : 'text-blue-700 dark:text-blue-300'
          }`}>
            {formatTime(timeRemaining)}
          </div>
        </div>
        {timerExpired && (
          <p className="text-sm mt-2 text-red-600 dark:text-red-400">
            {t('checkout.timerExpiredMessage') || 'Please refresh the page to start a new payment session.'}
          </p>
        )}
      </div>
        {/* Payer Information */}
        <div className="rounded-lg p-4 shadow" style={{ background: 'var(--surface)', borderColor: 'var(--border)', borderWidth: 1 }}>
          <h4 className="font-semibold mb-3 text-sm">{t('checkout.customerInformation') || 'Customer Information'}</h4>
          <div className="space-y-1.5 text-sm">
            <div>
              <span style={{ opacity: 0.8 }}>{t('seatSelection.fullName') || 'Full Name'}:</span>
              <span className="font-medium ml-2">{obfuscateFullName(checkoutData.fullName || '')}</span>
            </div>
            <div>
              <span style={{ opacity: 0.8 }}>{t('seatSelection.email') || 'Email'}:</span>
              <span className="font-medium ml-2">{obfuscateEmail(checkoutData.email)}</span>
            </div>
            <div>
              <span style={{ opacity: 0.8 }}>{t('seatSelection.confirmEmail') || 'Confirm Email'}:</span>
              <span className="font-medium ml-2">{obfuscateEmail(checkoutData.confirmEmail || checkoutData.email)}</span>
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
            <div className="space-y-1.5">
              <span style={{ opacity: 0.8 }} className="block">{t('seatSelection.selectedSeats') || 'Selected Seats'}:</span>
              {seatData && (
                <>
                  {selectedSeats.map((placeId) => {
                    const seat = seatData.seats.find(s => s.placeId === placeId);
                    if (!seat) return null;
                    return (
                      <div key={placeId} className="ml-3 text-xs" style={{ opacity: 0.9 }}>
                        <span className="font-medium">
                          {seat.section && `${t('seatSelection.section') || 'Section'} ${seat.section}`}
                          {seat.section && seat.row && ' • '}
                          {seat.row && `${t('seatSelection.row') || 'Row'} ${extractNumericPart(seat.row)}`}
                          {seat.row && seat.seat && ' • '}
                          {seat.seat && `${t('seatSelection.seat') || 'Seat'} ${extractNumericPart(seat.seat)}`}
                        </span>
                      </div>
                    );
                  })}

                  {(checkoutData.sectionSelections || [])
                    .filter(s => (s.quantity || 0) > 0)
                    .map(({ sectionId, quantity }) => {
                      const areaSections = (seatData as any)?.areaSections || [];
                      const area = areaSections.find((a: any) => String(a.id) === String(sectionId));
                      const sectionType = (area?.sectionType || '').trim();
                      const areaLabel = sectionType && sectionType.toLowerCase() !== 'area'
                        ? `${area?.name || sectionId} (${sectionType})`
                        : (area?.name || sectionId);

                      return (
                        <div key={`section-${sectionId}`} className="ml-3 text-xs" style={{ opacity: 0.9 }}>
                          <span className="font-medium">
                            {t('seatSelection.section') || 'Section'}: {areaLabel} • {t('seatSelection.quantity') || 'Quantity'}: {quantity}
                          </span>
                        </div>
                      );
                    })}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Full Ticket Information */}
        <div className="rounded-lg p-4 shadow" style={{ background: 'var(--surface)', borderColor: 'var(--border)', borderWidth: 1 }}>
          <h4 className="font-semibold mb-3 text-sm">{t('checkout.pricing') || 'Pricing Breakdown'}</h4>
          <div className="space-y-3">
            {/* Summary Totals */}
            {summaryTotals && checkoutData.quantity > 0 && (
              <div className="pb-3 border-b mb-3" style={{ borderColor: 'var(--border)' }}>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span style={{ opacity: 0.8 }}>{t('seatSelection.basePrice') || 'Base Price'} (x{checkoutData.quantity}):</span>
                    <span className="font-medium">{formatCurrency(summaryTotals.totalBasePrice)} {getCurrencySymbol(checkoutData.country || 'Finland')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ opacity: 0.8 }}>{t('seatSelection.serviceFee') || 'Service Fee'} (x{checkoutData.quantity}):</span>
                    <span className="font-medium">{formatCurrency(summaryTotals.totalServiceFee)} {getCurrencySymbol(checkoutData.country || 'Finland')}</span>
                  </div>
                  {summaryTotals.totalServiceTaxAmount > 0 && (
                    <div className="flex justify-between">
                      <span style={{ opacity: 0.8 }}>{t('seatSelection.serviceTax') || 'Service Tax'} {checkoutData.serviceTax ? `(${checkoutData.serviceTax}%)` : ''} {t('success.onServiceFee') || 'on Service Fee'}:</span>
                      <span className="font-medium">{formatCurrency(summaryTotals.totalServiceTaxAmount)} {getCurrencySymbol(checkoutData.country || 'Finland')}</span>
                    </div>
                  )}
                  {/* Show unified VAT/Entertainment Tax - they're the same, use whichever is available */}
                  {(() => {
                    // Unify VAT and Entertainment Tax - if one is 0/null, use the other
                    const unifiedVatAmount = (summaryTotals.totalVatAmount && summaryTotals.totalVatAmount > 0)
                      ? summaryTotals.totalVatAmount
                      : (summaryTotals.totalEntertainmentTaxAmount || 0);
                    const unifiedVatRate = (summaryTotals.vatRate && summaryTotals.vatRate > 0)
                      ? summaryTotals.vatRate
                      : (summaryTotals.entertainmentTaxRate || 0);

                    if (unifiedVatAmount > 0 && unifiedVatRate > 0) {
                      return (
                        <div className="flex justify-between">
                          <span style={{ opacity: 0.8 }}>{t('checkout.vat') || 'VAT'} ({unifiedVatRate}%):</span>
                          <span className="font-medium">{formatCurrency(unifiedVatAmount)} {getCurrencySymbol(checkoutData.country || 'Finland')}</span>
                        </div>
                      );
                    }
                    return null;
                  })()}
                  <div className="flex justify-between pt-1 border-t" style={{ borderColor: 'var(--border)' }}>
                    <span style={{ opacity: 0.8 }} className="text-sm">{t('checkout.subtotal') || 'Subtotal'}:</span>
                    <span className="font-medium text-sm">{formatCurrency(subtotal)} {getCurrencySymbol(checkoutData.country || 'Finland')}</span>
                  </div>
                </div>
              </div>
            )}
            {/* Individual Seat Breakdown */}
            {seatPricingBreakdown.map((item, index) => {
              if (!item) return null;
              return (
                <div key={item.placeId || index} className="pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
                  <div className="font-medium mb-1.5 text-sm">
                    {t('seatSelection.seat') || 'Seat'} {index + 1}
                    {pricingModel !== 'pricing_configuration' && item.seat && (
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
                        <span>{t('checkout.vat') || 'VAT'} ({item.entertainmentTaxPercent}%):</span>
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
            {!(
              summaryTotals &&
              checkoutData.quantity > 0
            ) && (
              <div className="flex justify-between pt-1.5 border-t" style={{ borderColor: 'var(--border)' }}>
                <span style={{ opacity: 0.8 }} className="text-sm">{t('checkout.subtotal') || 'Subtotal'}:</span>
                <span className="font-medium text-sm">{formatCurrency(subtotal)} {getCurrencySymbol(checkoutData.country || 'Finland')}</span>
              </div>
            )}

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
            {(() => {
              // Calculate total from summaryTotals for consistency (subtotal + VAT + Service Tax + Order Fee)
              // Round final total to 3 decimals (use round, not floor, to handle floating-point errors)
              const calculatedTotal = summaryTotals
                ? Math.round((
                    (summaryTotals.totalBasePrice || 0) +
                    (summaryTotals.totalServiceFee || 0) +
                    ((summaryTotals.totalVatAmount && summaryTotals.totalVatAmount > 0) ? summaryTotals.totalVatAmount : (summaryTotals.totalEntertainmentTaxAmount || 0)) +
                    (summaryTotals.totalServiceTaxAmount || 0) +
                    (orderFeeInfo.orderFeeTotal || 0)
                  ) * 1000) / 1000
                : totalPrice;

              return (
            <div className="flex justify-between text-base font-bold pt-1.5 border-t" style={{ borderColor: 'var(--border)' }}>
              <span>{t('seatSelection.total') || 'Total'}:</span>
                  <span>{formatCurrency(calculatedTotal)} {getCurrencySymbol(checkoutData.country || 'Finland')}</span>
            </div>
              );
            })()}
          </div>
        </div>

        {/* Payment Information */}
        <div className="rounded-xl p-6 shadow" style={{ background: 'var(--surface)', borderColor: 'var(--border)', borderWidth: 1 }} aria-labelledby="payment-info-heading">
          <h4 className="font-semibold mb-3 text-sm flex items-center">
            <FaCreditCard className="mr-2 text-indigo-600" />
            {t('checkout.paymentDetails') || 'Payment Details'}
          </h4>

          {/* Payment Provider Selection */}
          {paytrailEnabled && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">{t('checkout.paymentMethod') || 'Payment Method'}</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentProvider('stripe')}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    paymentProvider === 'stripe'
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-gray-900 dark:text-gray-100'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-center">
                    <FaCreditCard className="mr-2" />
                    <span className="text-sm font-medium mb-1">Credit/Debit Card</span>
                  </div>
                  <div className="text-xs opacity-70 mt-1">Powered byStripe</div>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentProvider('paytrail')}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    paymentProvider === 'paytrail'
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-gray-900 dark:text-gray-100'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-center">
                    <FaCreditCard className="mr-2" />
                    <span className="text-sm font-medium">Finnish Bank/Mobile</span>
                  </div>
                  <div className="text-xs opacity-70 mt-1">Paytrail</div>
                </button>
              </div>
              <br />
              {paymentProvider === 'paytrail' && (
               <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
               <div className="text-green-800 dark:text-green-300 text-sm">
                 {t('checkout.paytrailNote') || 'You will be redirected to Paytrail to complete your payment using Finnish bank or mobile payment methods.'}
               </div>
             </div>
              )}
            </div>
          )}

          {paymentProvider === 'stripe' && (
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

            <div className="flex items-center text-xs mb-3" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
              <FaLock className="mr-1.5" />
              <span>{t('checkout.securePaymentText') || 'Your payment information is secure and encrypted'}</span>
            </div>
          </div>
          )}

          {error && (
            <div className="text-red-600 text-xs mb-3 p-3 rounded-lg bg-red-50 border border-red-200" style={{ background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
              <div className="font-medium mb-1">{t('seatSelection.error') || 'Error'}</div>
              <div>{error === 'TICKET_SOLD_OUT' ? (t('seatSelection.ticketSoldOut') || 'Unfortunately, the selected tickets are no longer available. Please select different seats or check back later.') : error}</div>
            </div>
          )}

          {/* Marketing Consent */}
          <div className="mb-4">
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={marketingConsent}
                onChange={(e) => setMarketingConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 focus:ring-2"
                style={{ accentColor: 'var(--primary)' }}
              />
              <span className="text-xs leading-relaxed" style={{ color: 'var(--foreground)', opacity: 0.8 }}>
                {t('checkout.marketingConsent') ||
                  'I agree to receive marketing communications and special offers from this organizer. You can unsubscribe at any time.'}
              </span>
            </label>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              type="button"
              onClick={onBack}
              className="flex-1 px-3 py-1.5 rounded-lg border font-medium text-sm transition-colors"
              style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
            >
              {t('common.back') || 'Back'}
            </button>
            {!timerExpired && (
            <button
              type="submit"
              disabled={loading || (paymentProvider === 'stripe' && (!stripe || !cardComplete))}
              className={`flex-1 px-3 py-1.5 rounded-lg font-medium text-sm text-white transition-colors ${
                loading || (paymentProvider === 'stripe' && (!stripe || !cardComplete))
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {loading
                ? (t('checkout.processing') || 'Processing...')
                : paymentProvider === 'paytrail'
                  ? `${t('checkout.continueToPaytrail') || 'Continue to Paytrail'} - ${formatCurrency(totalPrice)} ${getCurrencySymbol(checkoutData.country || 'Finland')}`
                  : `${t('checkout.completePurchase') || 'Complete Purchase'} ${formatCurrency(totalPrice)} ${getCurrencySymbol(checkoutData.country || 'Finland')}`
              }
            </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

