"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { formatEventDateLocale, formatEventDateOnly, formatEventTime } from '@/utils/common';
import { FaCalendarAlt, FaMapMarkerAlt, FaSearch, FaFilter } from 'react-icons/fa';
import { getCurrencySymbol } from '@/utils/currency';
import { Event } from '@/types/event';
import { useTranslation } from '@/hooks/useTranslation';

// locale helper - removed unused function

export default function EventsPage({ data }: { data: { items?: Event[]; event?: Event[]; page?: number; limit?: number; total?: number; totalPages?: number } }) {
  const { t, locale } = useTranslation();
  const allEvents = useMemo(() => (data.items ?? data.event) ?? [], [data.items, data.event]);
  const serverPage = data.page ?? 1;
  const serverLimit = (data.limit ?? allEvents.length) || 12;
  const totalPages = data.totalPages ?? 1;

  const searchParams = useSearchParams();
  const venueFromUrl = searchParams.get('venue');
  const merchantFromUrl = searchParams.get('merchant');

  const [events, setEvents] = useState<Event[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedVenue, setSelectedVenue] = useState(venueFromUrl || "");
  const [selectedMerchant, setSelectedMerchant] = useState(merchantFromUrl || "");
  const [showFilters, setShowFilters] = useState(false);

  // Infinite scroll for events
  const [visibleCount, setVisibleCount] = useState(6);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Get unique countries, venues, and merchants for filter
  const countries = [...new Set(allEvents.map((event: Event) => event.country).filter(Boolean))];
  const venues = [...new Set(allEvents.map((event: Event) => event.venueInfo?.name).filter(Boolean))];
  const merchants = [...new Set(allEvents.map((event: Event) => event.merchant?.name).filter(Boolean))];

  // Filter events based on search and filters (client-side refinement on server slice)
  useEffect(() => {
    let filtered = [...allEvents];

    if (searchTerm) {
      filtered = filtered.filter((event: Event) =>
        (event.eventTitle || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (event.eventDescription || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (event.city || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCountry) {
      filtered = filtered.filter((event: Event) => event.country === selectedCountry);
    }

    if (selectedVenue) {
      filtered = filtered.filter((event: Event) =>
        (event.venueInfo?.name || '').toLowerCase().includes(selectedVenue.toLowerCase())
      );
    }

    if (selectedMerchant) {
      filtered = filtered.filter((event: Event) =>
        (event.merchant?.name || '').toLowerCase().includes(selectedMerchant.toLowerCase())
      );
    }

    setEvents(filtered);
    // Reset visible count when filters change
    setVisibleCount(6);
  }, [searchTerm, selectedCountry, selectedVenue, selectedMerchant, allEvents]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first?.isIntersecting && visibleCount < events.length) {
          setVisibleCount((prev) => Math.min(prev + 6, events.length));
        }
      },
      { threshold: 0.1 }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [visibleCount, events.length]);

  // build qs helper
  const buildHref = (page: number, limit = serverLimit) => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(limit));
    if (selectedCountry) params.set('country', selectedCountry);
    if (selectedVenue) params.set('venue', selectedVenue);
    if (selectedMerchant) params.set('merchant', selectedMerchant);
    if (searchTerm) params.set('q', searchTerm);
    return `?${params.toString()}`;
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
      {/* Header Section */}
      <section className="relative py-16 bg-indigo-600">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center text-white">
            <h1 className="text-4xl font-bold mb-4">{t('events.title')}</h1>
            <p className="text-xl mb-8">{t('events.subtitle')}</p>

            {/* Search Bar */}
            <div className="relative max-w-lg mx-auto">
              <input
                type="text"
                placeholder={t('events.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full py-3 px-4 pl-12 rounded-lg text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>
          </div>
        </div>
      </section>

      {/* Events Section */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-2xl font-bold">
                {selectedVenue
                  ? t('events.eventsAtVenue', { venue: selectedVenue })
                  : selectedMerchant
                  ? `Events by ${selectedMerchant}`
                  : t('events.eventCount', { count: events.length })}
              </h2>
              {selectedVenue && (
                <div className="flex items-center gap-2">
                  <p className="text-sm opacity-70">{t('events.eventsFoundAtVenue', { count: events.length })}</p>
                  <button
                    onClick={() => setSelectedVenue("")}
                    className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    {t('events.clearVenueFilter')}
                  </button>
                </div>
              )}
              {selectedMerchant && !selectedVenue && (
                <div className="flex items-center gap-2">
                  <p className="text-sm opacity-70">{t('events.eventsFound', { count: events.length })}</p>
                  <button
                    onClick={() => setSelectedMerchant("")}
                    className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    {t('events.clearOrganizerFilter')}
                  </button>
                </div>
              )}
              {totalPages > 1 && (
                <p className="text-sm opacity-70">Page {serverPage} of {totalPages}</p>
              )}
            </div>

            {/* Filter Button (Mobile) */}
            <div className="md:hidden">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2 py-2 px-4 rounded-lg shadow"
                style={{ background: 'var(--surface)', color: 'var(--foreground)', borderColor: 'var(--border)', borderWidth: 1 }}
              >
                <FaFilter />
                <span>{t('events.filters')}</span>
              </button>
            </div>

            {/* Desktop Filters */}
            <div className="hidden md:flex items-center space-x-4">
              <select
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                className="rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                style={{ background: 'var(--surface)', color: 'var(--foreground)', borderColor: 'var(--border)', borderWidth: 1 }}
              >
                <option value="">{t('events.allCountries')}</option>
                {countries.map((country) => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>

              <select
                value={selectedVenue}
                onChange={(e) => setSelectedVenue(e.target.value)}
                className="rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                style={{ background: 'var(--surface)', color: 'var(--foreground)', borderColor: 'var(--border)', borderWidth: 1 }}
              >
                <option value="">{t('events.allVenues')}</option>
                {venues.map((venue) => (
                  <option key={venue} value={venue}>{venue}</option>
                ))}
              </select>

              <select
                value={selectedMerchant}
                onChange={(e) => setSelectedMerchant(e.target.value)}
                className="rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                style={{ background: 'var(--surface)', color: 'var(--foreground)', borderColor: 'var(--border)', borderWidth: 1 }}
              >
                <option value="">{t('events.allOrganizers')}</option>
                {merchants.map((merchant) => (
                  <option key={merchant} value={merchant}>{merchant}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Mobile Filters */}
          {showFilters && (
            <div className="md:hidden mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="mb-4">
                <label className="block mb-2 text-sm font-medium">{t('events.country')}</label>
                <select
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  className="w-full rounded-lg py-2 px-4"
                  style={{ background: 'var(--surface)', color: 'var(--foreground)', borderColor: 'var(--border)', borderWidth: 1 }}
                >
                  <option value="">{t('events.allCountries')}</option>
                  {countries.map((country) => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="block mb-2 text-sm font-medium">{t('events.venue')}</label>
                <select
                  value={selectedVenue}
                  onChange={(e) => setSelectedVenue(e.target.value)}
                  className="w-full rounded-lg py-2 px-4"
                  style={{ background: 'var(--surface)', color: 'var(--foreground)', borderColor: 'var(--border)', borderWidth: 1 }}
                >
                  <option value="">{t('events.allVenues')}</option>
                  {venues.map((venue) => (
                    <option key={venue} value={venue}>{venue}</option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="block mb-2 text-sm font-medium">{t('events.organizer')}</label>
                <select
                  value={selectedMerchant}
                  onChange={(e) => setSelectedMerchant(e.target.value)}
                  className="w-full rounded-lg py-2 px-4"
                  style={{ background: 'var(--surface)', color: 'var(--foreground)', borderColor: 'var(--border)', borderWidth: 1 }}
                >
                  <option value="">{t('events.allOrganizers')}</option>
                  {merchants.map((merchant) => (
                    <option key={merchant} value={merchant}>{merchant}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Events Grid */}
          {events.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {events.slice(0, visibleCount).map((event: Event) => (
                  <EventCard key={event._id} event={event} locale={locale} t={t} />
                ))}
              </div>
              {/* Sentinel element for infinite scroll */}
              {visibleCount < events.length && (
                <div ref={loadMoreRef} className="mt-10 h-10 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-20">
              <p className="text-xl text-gray-600 dark:text-gray-400">{t('events.noEventsFound')}</p>
            </div>
          )}

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="mt-10 flex justify-center items-center gap-3">
              <Link
                href={buildHref(Math.max(serverPage - 1, 1))}
                className={`px-4 py-2 rounded-md border ${serverPage === 1 ? 'pointer-events-none opacity-50' : ''}`}
                style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
              >
                Previous
              </Link>
              <span className="text-sm opacity-80" style={{ color: 'var(--foreground)' }}>
                Page {serverPage} / {totalPages}
              </span>
              <Link
                href={buildHref(Math.min(serverPage + 1, totalPages))}
                className={`px-4 py-2 rounded-md border ${serverPage === totalPages ? 'pointer-events-none opacity-50' : ''}`}
                style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
              >
                Next
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function EventCard({ event, locale, t }: { event: Event; locale: string; t: (key: string, params?: Record<string, string | number>) => string }) {
  const minPrice = Array.isArray(event.ticketInfo) && event.ticketInfo.length
    ? Math.min(...event.ticketInfo.map((ticket) => Number(ticket.price) || 0))
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      whileHover={{ y: -5 }}
      className="rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)', borderWidth: 1 }}
    >
      <Link href={`/events/${event._id}`} className="block">
        <div className="relative h-48">
          <Image
            src={event.eventPromotionPhoto || "https://via.placeholder.com/500x300"}
            alt={event.eventTitle}
            fill
            className="object-cover"
          />
          {/* Date Badge */}
          <div className="absolute bottom-0 left-0 m-4 bg-white dark:bg-gray-900 text-gray-900 dark:text-white p-2 rounded-lg shadow flex flex-col items-center min-w-[60px]">
            <span className="text-xs font-medium">
              {formatEventDateOnly(event.eventDate, event.eventTimezone, locale)}
            </span>
            <span className="text-xl font-bold">
              {formatEventTime(event.eventDate, event.eventTimezone, locale)}
            </span>
          </div>
        </div>
      </Link>

      <div className="p-6">
        {/* Merchant chip */}
        {event.merchant?.name && (
          <Link href={`/events?merchant=${encodeURIComponent(event.merchant.name)}`}>
            <div className="mb-2 flex items-center gap-2 cursor-pointer transition-all duration-200 w-fit px-2 py-1 -ml-2 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 border border-transparent hover:border-indigo-200 dark:hover:border-indigo-700">
              {event.merchant.logo ? (
                <Image src={event.merchant.logo} alt={event.merchant.name} width={28} height={28} className="rounded-full" />
              ) : (
                <div className="h-7 w-7 rounded-full" style={{ background: 'var(--border)' }} />
              )}
              <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">{event.merchant.name}</span>
              <svg className="w-3 h-3 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        )}
        <Link href={`/events/${event._id}`}>
          <h3 className="text-xl font-semibold mb-2 line-clamp-1">{event.eventTitle}</h3>
        </Link>
        <p className="opacity-80 text-sm mb-4 line-clamp-2" style={{ color: 'var(--foreground)' }}>
          {event.eventDescription}
        </p>

        <div className="flex items-center text-sm opacity-80 mb-3" style={{ color: 'var(--foreground)' }}>
          <FaCalendarAlt className="mr-2" size={14} />
          <span>{formatEventDateLocale(event.eventDate, event.eventTimezone, locale)}</span>
        </div>

        <div className="flex items-center text-sm opacity-80">
          <FaMapMarkerAlt className="mr-2" size={14} />
          <span className="line-clamp-1">{event.venueInfo?.name || ''}{event.city ? `, ${event.city}` : ''}</span>
        </div>

          {/* Price & Status Tag */}
          <div className="mt-4 flex justify-between items-center">
            <span className="text-indigo-600 dark:text-indigo-400 font-medium">
              {minPrice} {' '} {getCurrencySymbol(event.country || '')}
            </span>
            {(event.active ?? true) && (
              <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                {t('home.upcoming.badge')}
              </span>
            )}
          </div>
      </div>
    </motion.div>
  );
}