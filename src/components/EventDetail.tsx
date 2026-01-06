"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { formatEventDateLocale } from '@/utils/common';
import {
    FaCalendarAlt, FaMapMarkerAlt, FaTicketAlt, FaInfoCircle, FaGlobe,
    FaFacebookF, FaTwitter, FaInstagram, FaTiktok, FaExternalLinkAlt
} from 'react-icons/fa';
import type { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getCurrencySymbol, getCurrencyCode } from '@/utils/currency';
import TicketPurchaseModal from '@/components/TicketPurchaseModal';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/hooks/useTranslation';
import dynamic from 'next/dynamic';


// Dynamically import the map components with no SSR
const MapContainer = dynamic(
    () => import('react-leaflet').then((mod) => mod.MapContainer),
    { ssr: false }
);
const TileLayer = dynamic(
    () => import('react-leaflet').then((mod) => mod.TileLayer),
    { ssr: false }
);
const Marker = dynamic(
    () => import('react-leaflet').then((mod) => mod.Marker),
    { ssr: false }
);
const Popup = dynamic(
    () => import('react-leaflet').then((mod) => mod.Popup),
    { ssr: false }
);

import { Event, TicketInfo } from '@/types/event';

// Free Event Registration Modal Component
function FreeEventRegistrationModal({ isOpen, onClose, event, ticket }: { isOpen: boolean; onClose: () => void; event: Event; ticket: TicketInfo | null }) {
    const { t } = useTranslation();
    const [email, setEmail] = useState("");
    const [confirmEmail, setConfirmEmail] = useState("");
    const [quantity, setQuantity] = useState<number>(1);
    const [marketingOptIn, setMarketingOptIn] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        const prevOverflow = document.body.style.overflow;
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.body.style.overflow = prevOverflow;
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) {
            setEmail("");
            setConfirmEmail("");
            setQuantity(1);
            setMarketingOptIn(false);
            setError(null);
            setSuccess(false);
        }
    }, [isOpen]);

    const isEmailValid = useMemo(() => /.+@.+\..+/.test(email), [email]);
    const emailsMatch = useMemo(() => email.trim() !== "" && email === confirmEmail, [email, confirmEmail]);
    const canSubmit = isEmailValid && emailsMatch && Boolean(ticket?._id || !event.ticketInfo || event.ticketInfo.length === 0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmit) return;

        setIsSubmitting(true);
        setError(null);

        try {
            // Call free event registration API endpoint
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/front'}/free-event-register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    quantity,
                    eventId: event._id,
                    ticketId: ticket?._id || null,
                    merchantId: event?.merchant?._id || event?.merchantId,
                    externalMerchantId: event?.externalMerchantId,
                    eventName: event.eventTitle,
                    ticketName: ticket?.name || t('eventDetail.freeEvent.freeTicket'),
                    marketingOptIn: marketingOptIn || false,
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Registration failed');
            }

            setSuccess(true);
            // Close modal after 2 seconds
            setTimeout(() => {
                onClose();
            }, 2000);
        } catch (err) {
            setError(err instanceof Error ? err.message : t('eventDetail.freeEventRegistration.registrationFailed'));
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
            <div
                className="relative z-50 w-[92vw] max-w-md rounded-xl p-5 sm:p-6 shadow-xl"
                style={{ background: 'var(--surface)', color: 'var(--foreground)', borderColor: 'var(--border)', borderWidth: 1 }}
                role="dialog"
                aria-modal="true"
                aria-label="Free event registration"
            >
                <h2 className="text-xl font-semibold mb-2">{t('eventDetail.freeEventRegistration.title')}</h2>
                {ticket && (
                    <div className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium"
                        style={{ borderColor: 'var(--border)', color: 'var(--foreground)', background: 'color-mix(in srgb, var(--foreground) 8%, var(--surface))' }}
                    >
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-600"></span>
                        <span>{ticket.name}</span>
                    </div>
                )}

                {success ? (
                    <div className="text-center py-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                            <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold mb-2">{t('eventDetail.freeEventRegistration.registrationSuccessful')}</h3>
                        <p className="text-gray-600 dark:text-gray-400">{t('eventDetail.freeEventRegistration.registrationSuccessMessage')}</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="free-email" className="block text-sm font-medium mb-1">{t('eventDetail.freeEventRegistration.emailAddress')}</label>
                            <input
                                id="free-email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border"
                                style={{ background: 'var(--surface)', color: 'var(--foreground)', borderColor: 'var(--border)' }}
                                placeholder={t('eventDetail.freeEventRegistration.emailPlaceholder')}
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="free-confirm-email" className="block text-sm font-medium mb-1">{t('eventDetail.freeEventRegistration.confirmEmail')}</label>
                            <input
                                id="free-confirm-email"
                                type="email"
                                value={confirmEmail}
                                onChange={(e) => setConfirmEmail(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border"
                                style={{ background: 'var(--surface)', color: 'var(--foreground)', borderColor: 'var(--border)' }}
                                placeholder={t('eventDetail.freeEventRegistration.emailPlaceholder')}
                                required
                            />
                            {email && !emailsMatch && (
                                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{t('eventDetail.freeEventRegistration.emailsDoNotMatch')}</p>
                            )}
                        </div>

                        <div className="flex items-center">
                            <input
                                id="free-marketing"
                                type="checkbox"
                                checked={marketingOptIn}
                                onChange={(e) => setMarketingOptIn(e.target.checked)}
                                className="mr-2"
                            />
                            <label htmlFor="free-marketing" className="text-sm">{t('eventDetail.freeEventRegistration.marketingOptIn')}</label>
                        </div>

                        {error && (
                            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-2 px-4 rounded-lg border font-medium transition-colors"
                                style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
                            >
                                {t('eventDetail.freeEventRegistration.cancel')}
                            </button>
                            <button
                                type="submit"
                                disabled={!canSubmit || isSubmitting}
                                className="flex-1 py-2 px-4 rounded-lg font-medium text-white transition-colors bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? t('eventDetail.freeEventRegistration.registering') : t('eventDetail.freeEventRegistration.title')}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}

// Debounce hook to stabilize rapidly changing values
function useDebouncedValue<T>(value: T, delay = 250): T {
    const [debounced, setDebounced] = useState<T>(value);

    useEffect(() => {
        const timerId = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(timerId);
    }, [value, delay]);

    return debounced;
}

export default function EventDetail({ event }: { event: Event }) {
    const { t, locale } = useTranslation();
    const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
    const [isLeafletReady, setIsLeafletReady] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [markerIcon, setMarkerIcon] = useState<L.Icon | null>(null);
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [showAllImages, setShowAllImages] = useState(false);
    const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);
    const [tiktokUrl, setTiktokUrl] = useState<string | null>(null);
    const [isPurchaseOpen, setIsPurchaseOpen] = useState(false);
    const [isFreeRegistrationOpen, setIsFreeRegistrationOpen] = useState(false);
    const selectedTicketObj = useMemo(() => event.ticketInfo.find(t => t._id === selectedTicket) || null, [event.ticketInfo, selectedTicket]);
    const router = useRouter();

    // Check if seat selection is enabled (venue.venueId takes priority over everything)
    const hasSeatSelection = Boolean(event?.venue?.venueId);

    // Check if event is free
    const isFreeEvent = event.otherInfo?.eventExtraInfo?.eventType === 'free' ||
        (event.ticketInfo && event.ticketInfo.length > 0 && event.ticketInfo.every(ticket => Number(ticket.price) === 0));

    const calculateTotalPrice = (ticket: TicketInfo): string => {
        try {
            // Use Number() to ensure values are numeric and nullish coalescing for defaults
            const basePrice = Number(ticket?.price ?? 0);
            const serviceFee = Number(ticket?.serviceFee ?? 0);
            const vatRate = Number(ticket?.vat ?? 0);
            const orderFee = Number(ticket?.orderFee ?? 0);
            const serviceTaxRate = Number(ticket?.serviceTax ?? 0);

            // Validate inputs
            if (isNaN(basePrice) || isNaN(serviceFee) || isNaN(vatRate)) {
                console.warn('Invalid price values detected', { basePrice, serviceFee, vatRate });
                return '0.00';
            }

            // Calculate subtotal (price + service fee)
            const subtotal = basePrice + serviceFee;

            // Calculate serviceTax on serviceFee (if serviceFee exists and serviceTaxRate is set)
            // Keep full precision, round only when displaying
            const serviceFeeServiceTax = (serviceFee > 0 && serviceTaxRate > 0)
              ? serviceFee * (serviceTaxRate / 100)
              : 0;

            // Calculate VAT amount (on base price only, not service fee)
            const vatAmount = basePrice * (vatRate / 100);

            // Calculate serviceTax on orderFee (if orderFee exists and serviceTaxRate is set)
            // Keep full precision, round only when displaying
            const orderFeeServiceTax = (orderFee > 0 && serviceTaxRate > 0)
              ? orderFee * (serviceTaxRate / 100)
              : 0;

            // Calculate total (subtotal + serviceTax on serviceFee + VAT + orderFee + serviceTax on orderFee)
            // Note: orderFee is per transaction, not per ticket
            const total = subtotal + serviceFeeServiceTax + vatAmount + orderFee + orderFeeServiceTax;

            // Format with 2 decimal places and handle potential rounding issues
            return (Math.round(total * 100) / 100).toFixed(2);
        } catch (error) {
            console.error('Error calculating ticket price:', error);
            return '0.00';
        }
    };



    // YouTube video ID extraction
    interface YoutubeVideoIdExtractor {
        (url: string | null | undefined): string | null;
    }

    const getYoutubeVideoId: YoutubeVideoIdExtractor = (url) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    // Check if URL is TikTok
    const isTikTokUrl = (url: string | null | undefined): boolean => {
        return !!(url && url.includes('tiktok.com'));
    };

    useEffect(() => {
        // Dynamically import Leaflet and set up icons on client side only
        Promise.all([
            import('leaflet')
        ]).then(([L]) => {
            delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
            // Use absolute URLs to ensure paths work in both dev and production
            const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

            // Create a custom icon instance
            const icon = new L.Icon({
                iconRetinaUrl: `${baseUrl}/marker-icon-2x.png`,
                iconUrl: `${baseUrl}/marker-icon.png`,
                shadowUrl: `${baseUrl}/marker-shadow.png`,
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
            });

            setMarkerIcon(icon);
            setIsLeafletReady(true);
        });
    }, []);

    const [lat, lng] = event?.eventLocationGeoCode
        ? event.eventLocationGeoCode.split(',').map(coord => parseFloat(coord.trim()))
        : [0, 0];


    // Normalize then debounce, then memoize for stable references in render
    const normalizedPhotos = useMemo(() => (Array.isArray(event?.eventPhoto) ? event.eventPhoto : []), [event?.eventPhoto]);
    const debouncedPhotos = useDebouncedValue(normalizedPhotos, 250);
    const eventPhotos = useMemo(() => debouncedPhotos, [debouncedPhotos]);

    useEffect(() => {
        const videoUrl = event?.videoUrl;
        if (!videoUrl) {
            setYoutubeVideoId(null);
            setTiktokUrl(null);
            return;
        }

        // Check for TikTok first (since it's the example URL)
        if (isTikTokUrl(videoUrl)) {
            setTiktokUrl(videoUrl);
            setYoutubeVideoId(null);
        } else {
            // Check for YouTube
            const youtubeId = getYoutubeVideoId(videoUrl);
            setYoutubeVideoId(youtubeId);
            setTiktokUrl(null);
        }
    }, [event?.videoUrl]);

    if (!event) {
        return <div className="container mx-auto px-4 py-20 text-center">{t('common.loading')}</div>;
    }


    return (
        <>
            {/* Hero Section */}
            <section className="relative h-[60vh]">
                <div className="absolute inset-0 z-0">
                    <Image
                        src={event.eventPromotionPhoto || "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4"}
                        alt={event.eventTitle}
                        fill
                        className="object-cover brightness-[0.7]"
                        priority
                    />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                <div className="container mx-auto px-4 h-full flex flex-col justify-end pb-10 z-10 relative">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <div className="flex items-center text-white mb-3">
                            <span className="inline-flex items-center bg-indigo-600 px-3 py-1 rounded-full text-sm">
                                <FaCalendarAlt className="mr-1" />
                                {formatEventDateLocale(event.eventDate, event.eventTimezone, locale)}
                            </span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">{event.eventTitle}</h1>
                        <div className="flex items-center text-white mb-2">
                            <FaMapMarkerAlt className="mr-2" />
                            <span>{event.venueInfo?.name}, {event.city}, {event.country}</span>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Main Content */}
            <section className="py-12" style={{ background: 'var(--background)' }}>
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                        {/* Left Column - Event Info */}
                        <div className="lg:col-span-2">


                            {/* Video Section - YouTube or TikTok */}
                            {(youtubeVideoId || tiktokUrl) && (
                                <div className="rounded-lg shadow p-6 mb-8" style={{ background: 'var(--surface)', borderColor: 'var(--border)', borderWidth: 1 }}>
                                    <h2 className="text-2xl font-bold mb-4">{t('eventDetail.video.title')}</h2>
                                    <div className="aspect-w-16 aspect-h-9">
                                        {youtubeVideoId && (
                                            <iframe
                                                src={`https://www.youtube.com/embed/${youtubeVideoId}`}
                                                title="YouTube video player"
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                allowFullScreen
                                                className="w-full h-64 sm:h-96 rounded-lg"
                                            ></iframe>
                                        )}
                                        {tiktokUrl && (
                                            <div className="w-full max-w-sm mx-auto rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                                                {/* Compact TikTok embed */}
                                                <div className="relative w-full" style={{ paddingBottom: '133.33%' /* 4:3 aspect ratio - more compact */ }}>
                                                    <iframe
                                                        src={`https://www.tiktok.com/embed/v2/${tiktokUrl.split('/video/')[1]?.split('?')[0] || ''}`}
                                                        title="TikTok video player"
                                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                        allowFullScreen
                                                        className="absolute inset-0 w-full h-full rounded-lg"
                                                        style={{ border: 'none' }}
                                                    ></iframe>
                                                </div>
                                                {/* TikTok attribution */}
                                                <div className="p-2 text-center">
                                                    <a
                                                        href={tiktokUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 hover:text-pink-500 dark:hover:text-pink-400 transition-colors"
                                                    >
                                                        <FaTiktok />
                                                        <span>View on TikTok</span>
                                                        <FaExternalLinkAlt className="text-xs" />
                                                    </a>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="rounded-lg shadow p-6 mb-8" style={{ background: 'var(--surface)', borderColor: 'var(--border)', borderWidth: 1 }}>
                                <h2 className="text-2xl font-bold mb-4">{t('eventDetail.about.title')}</h2>
                                <div className="prose dark:prose-invert max-w-none">
                                    <p>{event.eventDescription}</p>
                                </div>

                                {/* Additional Information */}
                                {event.otherInfo && Object.keys(event.otherInfo).length > 0 && (
                                    <div className="mt-6 pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
                                        <h3 className="text-xl font-semibold mb-3">{t('eventDetail.additionalInfo.title')}</h3>
                                        <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
                                            {Object.entries(event.otherInfo).map(([key, value]) => {
                                                // Skip eventExtraInfo as it's an object - we'll render it separately
                                                if (key === 'eventExtraInfo' && typeof value === 'object' && value !== null) {
                                                    return null;
                                                }

                                                // Skip categoryName and subCategoryName
                                                if (key === 'categoryName' || key === 'subCategoryName') {
                                                    return null;
                                                }

                                                // Handle null or undefined values
                                                if (value === null || value === undefined) {
                                                    return null;
                                                }

                                                // Handle objects (other than eventExtraInfo)
                                                if (typeof value === 'object' && !Array.isArray(value)) {
                                                    return null;
                                                }

                                                // Render primitive values
                                                return (
                                                    <div key={key} className="flex flex-col">
                                                        <dt className="text-sm font-medium capitalize" style={{ color: 'var(--foreground)', opacity: 0.75 }}>{key}</dt>
                                                        <dd className="mt-1" style={{ color: 'var(--foreground)' }}>{String(value)}</dd>
                                                    </div>
                                                );
                                            })}

                                            {/* Render door sale info only for paid events with door sale enabled */}
                                            {event.otherInfo?.eventExtraInfo &&
                                             typeof event.otherInfo.eventExtraInfo === 'object' &&
                                             event.otherInfo.eventExtraInfo !== null &&
                                             event.otherInfo.eventExtraInfo.eventType === 'paid' &&
                                             event.otherInfo.eventExtraInfo.doorSaleAllowed === true && (
                                                <>
                                                    <div key="doorSaleAllowed" className="flex flex-col">
                                                        <dt className="text-sm font-medium capitalize" style={{ color: 'var(--foreground)', opacity: 0.75 }}>Door Sale Allowed</dt>
                                                        <dd className="mt-1" style={{ color: 'var(--foreground)' }}>Yes</dd>
                                                    </div>
                                                    {event.otherInfo.eventExtraInfo.doorSaleExtraAmount && event.otherInfo.eventExtraInfo.doorSaleExtraAmount !== null && (
                                                        <div key="doorSaleExtraAmount" className="flex flex-col">
                                                            <dt className="text-sm font-medium capitalize" style={{ color: 'var(--foreground)', opacity: 0.75 }}>Door Sale Extra Amount</dt>
                                                            <dd className="mt-1" style={{ color: 'var(--foreground)' }}>{String(event.otherInfo.eventExtraInfo.doorSaleExtraAmount)}</dd>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </dl>
                                    </div>
                                )}
                            </div>

                            {/* Venue Information */}
                            <div className="rounded-lg shadow p-6 mb-8" style={{ background: 'var(--surface)', borderColor: 'var(--border)', borderWidth: 1 }}>
                                <h2 className="text-2xl font-bold mb-4">{t('eventDetail.venue.title')}</h2>

                                <div className="mb-6">
                                    <h3 className="text-lg font-semibold mb-2">{event.venueInfo?.name}</h3>
                                    <p className="mb-4" style={{ color: 'var(--foreground)', opacity: 0.85 }}>{event.eventLocationAddress}</p>

                                    {event.venueInfo?.description && (
                                        <div className="prose dark:prose-invert max-w-none mb-4">
                                            <p>{event.venueInfo.description}</p>
                                        </div>
                                    )}

                                    {/* Optional venue hero/photo */}
                                    {event.venueInfo?.media?.photo?.[0] && (
                                        <div className="mb-4">
                                            <Image
                                                src={event.venueInfo.media.photo[0]}
                                                alt={event.venueInfo?.name || 'Venue photo'}
                                                width={900}
                                                height={500}
                                                className="w-full h-auto rounded-lg object-cover"
                                            />
                                        </div>
                                    )}

                                    {/* Venue website */}
                                    {event.venueInfo?.media?.website && (
                                        <div className="mb-3">
                                            <a
                                                href={event.venueInfo.media.website}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 inline-flex items-center"
                                            >
                                                <FaGlobe className="mr-2" />
                                                {t('eventDetail.venue.visitWebsite')}
                                                <FaExternalLinkAlt className="ml-2 text-xs" />
                                            </a>
                                        </div>
                                    )}

                                    {/* Venue social links */}
                                    {(event.venueInfo?.media?.social?.facebook || event.venueInfo?.media?.social?.twitter || event.venueInfo?.media?.social?.instagram || event.venueInfo?.media?.social?.tiktok) && (
                                        <div className="mt-2">
                                            <div className="text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>{t('eventDetail.venue.followVenue')}</div>
                                            <div className="flex space-x-3">
                                                {event.venueInfo?.media?.social?.facebook && (
                                                    <a
                                                        href={event.venueInfo.media.social.facebook}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition-colors"
                                                        aria-label="Venue on Facebook"
                                                    >
                                                        <FaFacebookF />
                                                    </a>
                                                )}
                                                {event.venueInfo?.media?.social?.twitter && (
                                                    <a
                                                        href={event.venueInfo.media.social.twitter}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="bg-sky-500 text-white p-2 rounded-full hover:bg-sky-600 transition-colors"
                                                        aria-label="Venue on X"
                                                    >
                                                        <FaTwitter />
                                                    </a>
                                                )}
                                                {event.venueInfo?.media?.social?.instagram && (
                                                    <a
                                                        href={event.venueInfo.media.social.instagram}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="bg-gradient-to-tr from-yellow-500 via-pink-600 to-purple-700 text-white p-2 rounded-full hover:opacity-90 transition-opacity"
                                                        aria-label="Venue on Instagram"
                                                    >
                                                        <FaInstagram />
                                                    </a>
                                                )}
                                                {event.venueInfo?.media?.social?.tiktok && (
                                                    <a
                                                        href={event.venueInfo.media.social.tiktok}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="bg-black text-white p-2 rounded-full hover:opacity-90 transition-opacity"
                                                        aria-label="Venue on TikTok"
                                                    >
                                                        <FaTiktok />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {event.transportLink && (
                                        <a
                                            href={event.transportLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 inline-flex items-center mt-4"
                                        >
                                            <FaInfoCircle className="mr-2" />
                                            {t('eventDetail.venue.transportation')}
                                        </a>
                                    )}
                                </div>

                                {/* Map */}
                                <div className="h-80 rounded-lg overflow-hidden">
                                    {typeof window !== 'undefined' && lat && lng && isLeafletReady && markerIcon && (
                                        <MapContainer
                                            center={[lat, lng] as LatLngExpression}
                                            zoom={14}
                                            style={{ height: '100%', width: '100%', zIndex: '1' }}

                                        >
                                            <TileLayer
                                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                            />
                                            <Marker position={[lat, lng] as LatLngExpression} icon={markerIcon}>
                                                <Popup>
                                                    {event.venueInfo?.name || event.eventTitle}
                                                </Popup>
                                            </Marker>
                                        </MapContainer>
                                    )}
                                </div>
                            </div>

                            {/* Organizer Information */}
                            {event?.merchant && (
                                <div className="rounded-lg shadow p-6" style={{ background: 'var(--surface)', borderColor: 'var(--border)', borderWidth: 1 }}>
                                    <h2 className="text-2xl font-bold mb-4">{t('eventDetail.organizer.title')}</h2>
                                    <div className="flex items-center">
                                        {event.merchant?.logo ? (
                                            <Image
                                                src={event.merchant.logo}
                                                alt={event.merchant.name || 'Merchant Logo'}
                                                width={60}
                                                height={60}
                                                className="rounded-full"
                                            />
                                        ) : (
                                            <div className="w-15 h-15 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xl font-bold text-gray-500">
                                                {event.merchant?.name?.[0] || 'O'}
                                            </div>
                                        )}
                                        <div className="ml-4">
                                            <h3 className="text-lg font-medium">{event.merchant?.name || 'Event Organizer'}</h3>
                                            {event.merchant?.website && (
                                                <a
                                                    href={event.merchant.website}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-indigo-600 hover:underline text-sm"
                                                >
                                                    {t('eventDetail.organizer.visitWebsite')}
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Event Photo Gallery */}
                            {eventPhotos.length > 0 && (
                                <div className="rounded-lg shadow p-6 mt-8 mb-8" style={{ background: 'var(--surface)', borderColor: 'var(--border)', borderWidth: 1 }}>
                                    <h2 className="text-2xl font-bold mb-4">{t('eventDetail.gallery.title')}</h2>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        {eventPhotos.slice(0, 6).map((photoUrl, index) => {
                                            const remaining = eventPhotos.length - 6;
                                            const isLastVisible = index === 5 && eventPhotos.length > 6;
                                            return (
                                                <button
                                                    key={`${photoUrl}-${index}`}
                                                    type="button"
                                                    onClick={() => { setActiveImageIndex(index); setShowAllImages(true); }}
                                                    className="relative group focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-lg overflow-hidden"
                                                >
                                                    <div className="relative w-full aspect-[4/3]">
                                                        <Image
                                                            src={photoUrl}
                                                            alt={`Event photo ${index + 1}`}
                                                            fill
                                                            className="object-cover rounded-lg transition-transform duration-300 group-hover:scale-105"
                                                        />
                                                    </div>
                                                    {isLastVisible && remaining > 0 && (
                                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                            <span className="text-white font-semibold text-lg">+{remaining} {t('eventDetail.gallery.more')}</span>
                                                        </div>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Lightbox Modal */}
                            {showAllImages && eventPhotos.length > 0 && (
                                <div className="fixed inset-0 z-50 flex items-center justify-center">
                                    <div
                                        className="absolute inset-0 bg-black/80"
                                        onClick={() => setShowAllImages(false)}
                                        aria-hidden="true"
                                    ></div>
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.98 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ duration: 0.2 }}
                                        className="relative z-50 max-w-5xl w-[92vw] md:w-[80vw]"
                                        role="dialog"
                                        aria-modal="true"
                                        aria-label="Event photo viewer"
                                    >
                                        <div className="relative bg-black rounded-lg overflow-hidden">
                                            <div className="relative w-full aspect-[16/10]">
                                                <Image
                                                    src={eventPhotos[activeImageIndex]}
                                                    alt={`Event photo ${activeImageIndex + 1}`}
                                                    fill
                                                    className="object-contain"
                                                    sizes="80vw"
                                                />
                                            </div>

                                            {/* Controls */}
                                            <button
                                                type="button"
                                                onClick={() => setShowAllImages(false)}
                                                className="absolute top-3 right-3 text-white/90 hover:text-white bg-black/40 hover:bg-black/60 rounded-full px-3 py-1 text-sm"
                                                aria-label="Close"
                                            >
                                                {t('common.close')}
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setActiveImageIndex((prev) => (prev - 1 + eventPhotos.length) % eventPhotos.length)}
                                                className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center"
                                                aria-label="Previous photo"
                                            >
                                                ‹
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setActiveImageIndex((prev) => (prev + 1) % eventPhotos.length)}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center"
                                                aria-label="Next photo"
                                            >
                                                ›
                                            </button>

                                            {/* Thumbnails */}
                                            <div className="bg-black/60 p-3 flex gap-2 overflow-x-auto">
                                                {eventPhotos.map((thumbUrl, idx) => (
                                                    <button
                                                        key={`${thumbUrl}-${idx}`}
                                                        type="button"
                                                        onClick={() => setActiveImageIndex(idx)}
                                                        className={`relative h-16 w-24 rounded overflow-hidden border ${idx === activeImageIndex ? 'border-indigo-400' : 'border-transparent'}`}
                                                        aria-label={`Go to photo ${idx + 1}`}
                                                    >
                                                        <Image
                                                            src={thumbUrl}
                                                            alt={`Thumb ${idx + 1}`}
                                                            fill
                                                            className="object-cover"
                                                        />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </motion.div>
                                </div>
                            )}
                        </div>

                        {/* Right Column - Tickets and Details */}
                        <div>
                            {/* Tickets Box */}
                            <div className="rounded-lg shadow p-6 sticky top-24" style={{ background: 'var(--surface)', borderColor: 'var(--border)', borderWidth: 1 }}>
                                <h2 className="text-2xl font-bold mb-6">{t('eventDetail.tickets.title')}</h2>

                                {/* External Event - Show external ticketing link */}
                                {event.otherInfo?.isExternalEvent && event.otherInfo?.externalEventDetails ? (
                                    <div className="text-center py-8">
                                        <div className="mb-6">
                                            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-4">
                                                <FaExternalLinkAlt className="text-4xl text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>
                                                {t('eventDetail.externalEvent.title') || 'External Ticketing'}
                                            </h3>
                                            <p className="text-gray-600 dark:text-gray-400 mb-6">
                                                {t('eventDetail.externalEvent.description') || 'Tickets for this event are sold through an external platform. Click below to purchase tickets.'}
                                            </p>
                                        </div>
                                        <a
                                            href={event.otherInfo?.externalEventDetails as string}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center justify-center w-full py-3 px-4 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
                                        >
                                            <FaExternalLinkAlt className="mr-2" />
                                            {t('eventDetail.externalEvent.purchaseTickets') || 'Purchase Tickets Externally'}
                                        </a>
                                    </div>
                                ) : hasSeatSelection ? (
                                    /* Seat Selection UI - Takes priority over everything when venue.venueId exists */
                                    <div className="text-center py-8">
                                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                                            {t('eventDetail.seatSelection.available') || 'Select your seats for this event'}
                                            {event.occupancy && (
                                                <span className="block mt-2 text-sm font-medium">
                                                    {event.occupancy.toLocaleString()} {t('eventDetail.eventDetails.attendees') || 'seats available'}
                                                </span>
                                            )}
                                        </p>
                                        <button
                                            className="w-full py-3 px-4 rounded-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                                            onClick={() => router.push(`/events/${event._id}/seats`)}
                                        >
                                            {t('eventDetail.seatSelection.selectSeats') || 'Select Seats'}
                                        </button>
                                    </div>
                                ) : isFreeEvent ? (
                                    /* Free Event UI - Only show when seat selection is NOT enabled */
                                    <div className="text-center">
                                        <div className="mb-6">
                                            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                                                <FaTicketAlt className="text-4xl text-green-600 dark:text-green-400" />
                                            </div>
                                            <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>
                                                {t('eventDetail.freeEvent.title')}
                                            </h3>
                                            <p className="text-gray-600 dark:text-gray-400 mb-6">
                                                {t('eventDetail.freeEvent.description')}
                                            </p>
                                        </div>

                                        {event?.ticketInfo && event.ticketInfo.length > 0 ? (
                                            <div className="space-y-3 mb-6">
                                                {event.ticketInfo.map((ticket) => {
                                                    const isSelected = selectedTicket === ticket._id;
                                                    const isAvailable = ticket.status === 'available' || ticket.status === 'low_stock';
                                                    return (
                                                        <div
                                                            key={ticket._id}
                                                            role="button"
                                                            aria-pressed={isSelected}
                                                            aria-disabled={!isAvailable}
                                                            tabIndex={isAvailable ? 0 : -1}
                                                            className={`border-2 rounded-lg p-4 transition-all outline-none ${
                                                                isSelected
                                                                    ? 'border-blue-500 shadow-lg'
                                                                    : 'border-gray-200 dark:border-gray-700 hover:border-green-400 dark:hover:border-green-500'
                                                            } ${isAvailable ? 'cursor-pointer focus:ring-2 focus:ring-green-300 dark:focus:ring-green-600' : 'opacity-60 cursor-not-allowed'}`}
                                                            style={{ background: 'var(--surface)' }}
                                                            onClick={() => { if (isAvailable) { setSelectedTicket(ticket._id); } }}
                                                            onKeyDown={(e) => {
                                                                if (!isAvailable) return;
                                                                if (e.key === 'Enter' || e.key === ' ') {
                                                                    e.preventDefault();
                                                                    setSelectedTicket(ticket._id);
                                                                }
                                                            }}
                                                        >
                                                            <div className="flex justify-between items-center">
                                                                <h3 className="font-semibold text-lg" style={{ color: 'var(--foreground)' }}>{ticket.name}</h3>
                                                                <span className="text-lg font-bold text-green-600 dark:text-green-400">{t('eventDetail.freeEvent.free')}</span>
                                                            </div>
                                                            {isAvailable ? (
                                                                <div className={`mt-2 text-sm font-semibold ${
                                                                    ticket.status === 'low_stock'
                                                                        ? 'text-orange-600 dark:text-orange-400'
                                                                        : 'text-green-600 dark:text-green-400'
                                                                }`}>
                                                                    {ticket.status === 'low_stock' ? (
                                                                        <>⚠ {t('eventDetail.tickets.lowStock')}</>
                                                                    ) : (
                                                                        <>✓ {t('eventDetail.tickets.available')}</>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <div className="mt-2 text-sm font-semibold text-red-600 dark:text-red-400">
                                                                    ✗ {t('eventDetail.tickets.soldOut')}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : null}

                                        <button
                                            className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-colors ${
                                                (event?.ticketInfo && event.ticketInfo.length > 0 && selectedTicket) || (!event?.ticketInfo || event.ticketInfo.length === 0)
                                                    ? 'bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600'
                                                    : 'bg-gray-400 cursor-not-allowed'
                                            }`}
                                            disabled={event?.ticketInfo && event.ticketInfo.length > 0 && !selectedTicket}
                                            onClick={() => {
                                                if (selectedTicket || !event?.ticketInfo || event.ticketInfo.length === 0) {
                                                    setIsFreeRegistrationOpen(true);
                                                }
                                            }}
                                        >
                                            {event?.ticketInfo && event.ticketInfo.length > 0
                                                ? (selectedTicket ? t('eventDetail.freeEvent.register') : t('eventDetail.freeEvent.selectTicketType'))
                                                : t('eventDetail.freeEvent.register')
                                            }
                                        </button>
                                    </div>
                                ) : (
                                    /* Paid Event UI - Only show when seat selection is NOT enabled */
                                    <>
                                        {event?.ticketInfo?.map((ticket) => {
                                            const isSelected = selectedTicket === ticket._id;
                                            const isAvailable = ticket.status === 'available' || ticket.status === 'low_stock';
                                            return (
                                                <div
                                                    key={ticket._id}
                                                    role="button"
                                                    aria-pressed={isSelected}
                                                    aria-disabled={!isAvailable}
                                                    tabIndex={isAvailable ? 0 : -1}
                                                    className={`border-2 rounded-lg p-4 mb-4 transition-all outline-none ${
                                                        isSelected
                                                            ? 'border-blue-500 shadow-lg'
                                                            : 'border-gray-200 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-500'
                                                    } ${isAvailable ? 'cursor-pointer focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-600' : 'opacity-60 cursor-not-allowed'}`}
                                                    style={{ background: 'var(--surface)' }}
                                                    onClick={() => { if (isAvailable) { setSelectedTicket(ticket._id); } }}
                                                    onKeyDown={(e) => {
                                                        if (!isAvailable) return;
                                                        if (e.key === 'Enter' || e.key === ' ') {
                                                            e.preventDefault();
                                                            setSelectedTicket(ticket._id);
                                                        }
                                                    }}
                                                >
                                                    <div className="flex justify-between items-center mb-2">
                                                        <h3 className="font-semibold text-lg" style={{ color: 'var(--foreground)' }}>{ticket.name}</h3>
                                                        <span className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>{ticket.price.toFixed(2)} {getCurrencySymbol(event.country || 'Finland')}</span>
                                                    </div>

                                                    {/* Service Fee, VAT, Order Fee, and Service Tax info */}
                                                    <div className="mt-2 text-sm font-medium" style={{ color: 'var(--foreground)', opacity: 0.7 }}>
                                                        {t('eventDetail.tickets.serviceFee')}: +{(ticket.serviceFee ?? 0).toFixed(2)} • {t('eventDetail.tickets.vat')}: {ticket.vat}%
                                                        {(ticket.orderFee ?? 0) > 0 && (
                                                            <> • {t('eventDetail.tickets.orderFee')}: +{(ticket.orderFee ?? 0).toFixed(2)}</>
                                                        )}
                                                        {(ticket.serviceTax ?? 0) > 0 && (ticket.orderFee ?? 0) > 0 && (
                                                            <> • {t('eventDetail.tickets.serviceTax')}: {ticket.serviceTax}%</>
                                                        )}
                                                    </div>

                                                    {/* Total price calculation */}
                                                    <div className="mt-3 flex justify-between items-center mb-2">
                                                        <span className="text-sm font-semibold" style={{ color: 'var(--foreground)', opacity: 0.8 }}>{t('eventDetail.tickets.total')}:</span>
                                                        <span className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>
                                                            {calculateTotalPrice(ticket)} {getCurrencySymbol(event.country || 'Finland')}
                                                        </span>
                                                    </div>

                                                    {isAvailable ? (
                                                        <div className={`mt-2 text-sm font-semibold ${
                                                            ticket.status === 'low_stock'
                                                                ? 'text-orange-600 dark:text-orange-400'
                                                                : 'text-green-600 dark:text-green-400'
                                                        }`}>
                                                            {ticket.status === 'low_stock' ? (
                                                                <>⚠ {t('eventDetail.tickets.lowStock')}</>
                                                            ) : (
                                                                <>✓ {t('eventDetail.tickets.available')}</>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="mt-2 text-sm font-semibold text-red-600 dark:text-red-400">
                                                            ✗ {t('eventDetail.tickets.soldOut')}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}

                                        <button
                                            className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-colors ${selectedTicket ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-400 cursor-not-allowed'
                                                }`}
                                            disabled={!selectedTicket}
                                            onClick={() => { if (selectedTicket) setIsPurchaseOpen(true); }}
                                        >
                                            {selectedTicket ? t('eventDetail.tickets.buyTicket') : t('eventDetail.tickets.selectTicket')}
                                        </button>
                                    </>
                                )}

                                {/* Event Details */}
                                <div className="mt-8 border-t" style={{ borderColor: 'var(--border)' }}>
                                    <h3 className="text-lg font-semibold mb-4">{t('eventDetail.eventDetails.title')}</h3>

                                    <div className="space-y-4">
                                        <div className="flex">
                                            <FaCalendarAlt className="text-gray-500 dark:text-gray-400 mt-1 mr-3" />
                                            <div>
                                                <div className="font-medium">{t('eventDetail.eventDetails.dateTime')}</div>
                                                <div className="text-gray-600 dark:text-gray-400">
                                                    {formatEventDateLocale(event.eventDate, event.eventTimezone, locale)}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex">
                                            <FaMapMarkerAlt className="text-gray-500 dark:text-gray-400 mt-1 mr-3" />
                                            <div>
                                                <div className="font-medium">{t('eventDetail.eventDetails.location')}</div>
                                                <div className="text-gray-600 dark:text-gray-400">
                                                    {event.venueInfo?.name}
                                                </div>
                                                <div className="text-gray-600 dark:text-gray-400">
                                                    {event.eventLocationAddress}
                                                </div>
                                            </div>
                                        </div>

                                        {/*event.occupancy && (
                                            <div className="flex">
                                                <FaTicketAlt className="text-gray-500 dark:text-gray-400 mt-1 mr-3" />
                                                <div>
                                                    <div className="font-medium">{t('eventDetail.eventDetails.capacity')}</div>
                                                    <div className="text-gray-600 dark:text-gray-400">
                                                        {event.occupancy} {t('eventDetail.eventDetails.attendees')}
                                                    </div>
                                                </div>
                                            </div>
                                        )*/}
                                    </div>
                                </div>

                                {/* Social Media Links */}
                                {(event.socialMedia?.facebook || event.socialMedia?.twitter ||
                                    event.socialMedia?.instagram || event.socialMedia?.tiktok) && (
                                        <div className="mt-6 border-t" style={{ borderColor: 'var(--border)' }}>
                                            <h3 className="text-lg font-semibold mb-3">{t('eventDetail.social.shareEvent')}</h3>
                                            <div className="flex space-x-4">
                                                {event.socialMedia?.facebook && (
                                                    <a
                                                        href={event.socialMedia.facebook}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition-colors"
                                                    >
                                                        <FaFacebookF />
                                                    </a>
                                                )}
                                                {event.socialMedia?.twitter && (
                                                    <a
                                                        href={event.socialMedia.twitter}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="bg-sky-500 text-white p-2 rounded-full hover:bg-sky-600 transition-colors"
                                                    >
                                                        <FaTwitter />
                                                    </a>
                                                )}
                                                {event.socialMedia?.instagram && (
                                                    <a
                                                        href={event.socialMedia.instagram}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="bg-gradient-to-tr from-yellow-500 via-pink-600 to-purple-700 text-white p-2 rounded-full hover:opacity-90 transition-opacity"
                                                    >
                                                        <FaInstagram />
                                                    </a>
                                                )}
                                                {event.socialMedia?.tiktok && (
                                                    <a
                                                        href={event.socialMedia.tiktok}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="bg-gradient-to-tr from-yellow-500 via-pink-600 to-purple-700 text-white p-2 rounded-full hover:opacity-90 transition-opacity"
                                                    >
                                                        <FaTiktok />
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>
            {/* Free Event Registration Modal */}
            {isFreeRegistrationOpen && (
                <FreeEventRegistrationModal
                    isOpen={isFreeRegistrationOpen}
                    onClose={() => { setIsFreeRegistrationOpen(false); setSelectedTicket(null); }}
                    event={event}
                    ticket={selectedTicketObj}
                />
            )}


            {/* Paid Event Purchase Modal - only show for paid events without seat selection */}
            {!isFreeEvent && !hasSeatSelection && (
                <TicketPurchaseModal
                    isOpen={isPurchaseOpen}
                    onClose={() => { setIsPurchaseOpen(false); setSelectedTicket(null); }}
                    onProceed={({ email, quantity, ticket, eventId, merchantId, externalMerchantId, marketingOptIn, total, perUnitSubtotal, perUnitVat, placeIds }) => {
                        // Create checkout data object with pre-calculated values
                        const checkoutData = {
                            email,
                            quantity,
                            eventId,
                            externalMerchantId: externalMerchantId || '',
                            merchantId: merchantId || '',
                            ticketId: ticket._id,
                            ticketName: ticket.name,
                            price: ticket.price,
                            serviceFee: ticket.serviceFee ?? 0,
                            vat: ticket.vat ?? 0,
                            serviceTax: ticket.serviceTax ?? 0,
                            orderFee: ticket.orderFee ?? 0,
                            eventName: event.eventTitle,
                            country: event.country || 'Finland',
                            marketingOptIn,
                            // Pre-calculated values from TicketPurchaseModal
                            perUnitSubtotal,
                            perUnitVat,
                            total,
                            // Seat selection
                            placeIds: placeIds || undefined
                        };

                        // Encode to base64
                        const encodedData = btoa(JSON.stringify(checkoutData));

                        // Redirect to checkout page with encoded data
                        router.push(`/checkout?data=${encodedData}`);

                        // Close modal
                        setIsPurchaseOpen(false);
                        setSelectedTicket(null);
                    }}
                    ticket={selectedTicketObj!}
                    eventId={event._id}
                    merchantId={event?.merchant?._id || event?.merchantId}
                    externalMerchantId={event?.externalMerchantId}
                    hasSeatSelection={event?.venue?.hasSeatSelection || false}
                    currency={getCurrencyCode(event?.country || 'Finland')}
                    country={event?.country || 'Finland'}
                />
            )}
        </>
    );
}