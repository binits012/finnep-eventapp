"use client";

import React, { useState, useEffect, useMemo } from 'react';
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

  const [events, setEvents] = useState<Event[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedVenue, setSelectedVenue] = useState(venueFromUrl || "");
  const [showFilters, setShowFilters] = useState(false);

  // Get unique countries and venues for filter
  const countries = [...new Set(allEvents.map((event: Event) => event.country).filter(Boolean))];
  const venues = [...new Set(allEvents.map((event: Event) => event.venueInfo?.name).filter(Boolean))];

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

    setEvents(filtered);
  }, [searchTerm, selectedCountry, selectedVenue, allEvents]);

  // build qs helper
  const buildHref = (page: number, limit = serverLimit) => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(limit));
    if (selectedCountry) params.set('country', selectedCountry);
    if (selectedVenue) params.set('venue', selectedVenue);
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
                {selectedVenue ? t('events.eventsAtVenue', { venue: selectedVenue }) : t('events.eventCount', { count: events.length })}
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
                <option value="">All Countries</option>
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
                <option value="">All Venues</option>
                {venues.map((venue) => (
                  <option key={venue} value={venue}>{venue}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Mobile Filters */}
          {showFilters && (
            <div className="md:hidden mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="mb-4">
                <label className="block mb-2 text-sm font-medium">Country</label>
                <select
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  className="w-full rounded-lg py-2 px-4"
                  style={{ background: 'var(--surface)', color: 'var(--foreground)', borderColor: 'var(--border)', borderWidth: 1 }}
                >
                  <option value="">All Countries</option>
                  {countries.map((country) => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="block mb-2 text-sm font-medium">Venue</label>
                <select
                  value={selectedVenue}
                  onChange={(e) => setSelectedVenue(e.target.value)}
                  className="w-full rounded-lg py-2 px-4"
                  style={{ background: 'var(--surface)', color: 'var(--foreground)', borderColor: 'var(--border)', borderWidth: 1 }}
                >
                  <option value="">All Venues</option>
                  {venues.map((venue) => (
                    <option key={venue} value={venue}>{venue}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Events Grid */}
          {events.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {events.map((event: Event) => (
                <EventCard key={event._id} event={event} locale={locale} />
              ))}
            </div>
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

function EventCard({ event, locale }: { event: Event; locale: string }) {
  const minPrice = Array.isArray(event.ticketInfo) && event.ticketInfo.length
    ? Math.min(...event.ticketInfo.map((t) => Number(t.price) || 0))
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

        <div className="p-6">
          {/* Merchant chip */}
          {event.merchant?.name && (
            <div className="mb-2 flex items-center gap-2">
              {event.merchant.logo ? (
                <Image src={event.merchant.logo} alt={event.merchant.name} width={28} height={28} className="rounded-full" />
              ) : (
                <div className="h-7 w-7 rounded-full" style={{ background: 'var(--border)' }} />
              )}
              <span className="text-xs opacity-80" style={{ color: 'var(--foreground)' }}>{event.merchant.name}</span>
            </div>
          )}
          <h3 className="text-xl font-semibold mb-2 line-clamp-1">{event.eventTitle}</h3>
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
                Available
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}