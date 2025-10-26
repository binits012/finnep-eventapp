"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { formatEventDateLocale } from '@/utils/common';
import {
    FaCalendarAlt, FaMapMarkerAlt, FaTicketAlt, FaInfoCircle, FaGlobe,
    FaFacebookF, FaTwitter, FaInstagram, FaTiktok, FaExternalLinkAlt
} from 'react-icons/fa';
import dynamic from 'next/dynamic';
import type { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {  getCurrencySymbol } from '@/utils/currency';
import TicketPurchaseModal from '@/components/TicketPurchaseModal';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/hooks/useTranslation';


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
    const [, setIsLeafletReady] = useState(false);
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [showAllImages, setShowAllImages] = useState(false);
    const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);
    const [isPurchaseOpen, setIsPurchaseOpen] = useState(false);
    const selectedTicketObj = useMemo(() => event.ticketInfo.find(t => t._id === selectedTicket) || null, [event.ticketInfo, selectedTicket]);
    const router = useRouter();

    const calculateTotalPrice = (ticket: TicketInfo): string => {
        try {
            // Use Number() to ensure values are numeric and nullish coalescing for defaults
            const basePrice = Number(ticket?.price ?? 0);
            const serviceFee = Number(ticket?.serviceFee ?? 0);
            const vatRate = Number(ticket?.vat ?? 0);

            // Validate inputs
            if (isNaN(basePrice) || isNaN(serviceFee) || isNaN(vatRate)) {
                console.warn('Invalid price values detected', { basePrice, serviceFee, vatRate });
                return '0.00';
            }

            // Calculate subtotal (price + service fee)
            const subtotal = basePrice + serviceFee;

            // Calculate VAT amount
            const vatAmount = subtotal * (vatRate / 100);

            // Calculate total (subtotal + VAT)
            const total = subtotal + vatAmount;

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

    useEffect(() => {
        // Dynamically import Leaflet and set up icons on client side only
        Promise.all([
            import('leaflet')
        ]).then(([L]) => {
            delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: '/marker-icon-2x.png',
                iconUrl: '/marker-icon.png',
                shadowUrl: '/marker-shadow.png',
            });
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
        setYoutubeVideoId(getYoutubeVideoId(event?.videoUrl));
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


                            {/* YouTube Video */}
                            {youtubeVideoId && (
                                <div className="rounded-lg shadow p-6 mb-8" style={{ background: 'var(--surface)', borderColor: 'var(--border)', borderWidth: 1 }}>
                                    <h2 className="text-2xl font-bold mb-4">{t('eventDetail.video.title')}</h2>
                                    <div className="aspect-w-16 aspect-h-9">
                                        <iframe
                                            src={`https://www.youtube.com/embed/${youtubeVideoId}`}
                                            title="YouTube video player"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                            className="w-full h-64 sm:h-96 rounded-lg"
                                        ></iframe>
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
                                            {Object.entries(event.otherInfo).map(([key, value]) => (
                                                <div key={key} className="flex flex-col">
                                                    <dt className="text-sm font-medium capitalize" style={{ color: 'var(--foreground)', opacity: 0.75 }}>{key}</dt>
                                                    <dd className="mt-1" style={{ color: 'var(--foreground)' }}>{value}</dd>
                                                </div>
                                            ))}
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
                                    {typeof window !== 'undefined' && lat && lng && (
                                        <MapContainer
                                            center={[lat, lng] as LatLngExpression}
                                            zoom={14}
                                            style={{ height: '100%', width: '100%', zIndex: '1' }}

                                        >
                                            <TileLayer
                                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                            />
                                            <Marker position={[lat, lng] as LatLngExpression}>
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

                                {event?.ticketInfo?.map((ticket) => {
                                    const isSelected = selectedTicket === ticket._id;
                                    const isAvailable = ticket.status === 'available';
                                    return (
                                        <div
                                            key={ticket._id}
                                            role="button"
                                            aria-pressed={isSelected}
                                            aria-disabled={!isAvailable}
                                            tabIndex={isAvailable ? 0 : -1}
                                            className={`border-2 rounded-lg p-4 mb-4 transition-all outline-none ${
                                                isSelected
                                                    ? 'border-indigo-500 bg-indigo-100 dark:bg-indigo-900/50 shadow-lg'
                                                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-indigo-400 dark:hover:border-indigo-500'
                                            } ${isAvailable ? 'cursor-pointer focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-600' : 'opacity-60 cursor-not-allowed'}`}
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
                                                <h3 className={`font-semibold text-lg ${
                                                    isSelected
                                                        ? 'text-indigo-900 dark:text-indigo-100'
                                                        : 'text-gray-900 dark:text-gray-100'
                                                }`}>{ticket.name}</h3>
                                                <span className={`text-lg font-bold ${
                                                    isSelected
                                                        ? 'text-indigo-900 dark:text-indigo-100'
                                                        : 'text-gray-900 dark:text-gray-100'
                                                }`}>{ticket.price.toFixed(2)} {getCurrencySymbol(event.country || 'Finland')}</span>
                                            </div>

                                            {/* Service Fee and VAT info */}
                                            <div className={`mt-2 text-sm font-medium ${
                                                isSelected
                                                    ? 'text-indigo-800 dark:text-indigo-200'
                                                    : 'text-gray-600 dark:text-gray-400'
                                            }`}>
                                                {t('eventDetail.tickets.serviceFee')}: +{(ticket.serviceFee ?? 0).toFixed(2)} • {t('eventDetail.tickets.vat')}: {ticket.vat}%
                                            </div>

                                            {/* Total price calculation */}
                                            <div className="mt-3 flex justify-between items-center mb-2">
                                                <span className={`text-sm font-semibold ${
                                                    isSelected
                                                        ? 'text-indigo-800 dark:text-indigo-200'
                                                        : 'text-gray-700 dark:text-gray-300'
                                                }`}>{t('eventDetail.tickets.total')}:</span>
                                                <span className={`text-xl font-bold ${
                                                    isSelected
                                                        ? 'text-indigo-800 dark:text-indigo-200'
                                                        : 'text-indigo-600 dark:text-indigo-400'
                                                }`}>
                                                    {calculateTotalPrice(ticket)} {getCurrencySymbol(event.country || 'Finland')}
                                                </span>
                                            </div>

                                            {isAvailable ? (
                                                <div className="mt-2 text-sm font-semibold text-green-600 dark:text-green-400">
                                                    ✓ {t('eventDetail.tickets.available')}
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

                                        {event.occupancy && (
                                            <div className="flex">
                                                <FaTicketAlt className="text-gray-500 dark:text-gray-400 mt-1 mr-3" />
                                                <div>
                                                    <div className="font-medium">{t('eventDetail.eventDetails.capacity')}</div>
                                                    <div className="text-gray-600 dark:text-gray-400">
                                                        {event.occupancy} {t('eventDetail.eventDetails.attendees')}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
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
            <TicketPurchaseModal
                isOpen={isPurchaseOpen}
                onClose={() => { setIsPurchaseOpen(false); setSelectedTicket(null); }}
                onProceed={({ email, quantity, ticket, eventId, merchantId, externalMerchantId, marketingOptIn, total, perUnitSubtotal, perUnitVat }) => {
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
                        eventName: event.eventTitle,
                        country: event.country || 'Finland',
                        marketingOptIn,
                        // Pre-calculated values from TicketPurchaseModal
                        perUnitSubtotal,
                        perUnitVat,
                        total
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
            />
        </>
    );
}