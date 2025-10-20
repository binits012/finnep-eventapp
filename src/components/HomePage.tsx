"use client";

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import relativeTime from 'dayjs/plugin/relativeTime';

// Extend dayjs with plugins
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);
import { FaCalendarAlt, FaMapMarkerAlt, FaTicketAlt, FaArrowRight } from 'react-icons/fa';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { FaExternalLinkAlt, FaPlay } from 'react-icons/fa';

import { Event } from '@/types/event';
import { getCurrencySymbol } from '@/utils/currency';
import { formatEventDate } from '@/utils/common';
import countries from 'i18n-iso-countries';
import enCountries from 'i18n-iso-countries/langs/en.json';
import { useData } from '@/contexts/DataContext';

interface Slide {
  id: string;
  image: string;
  videoUrl: string;
  title: string;
}

// ensure country dataset is registered
if (!countries.getNames('en')) {
  countries.registerLocale(enCountries as unknown as { locale: string; countries: Record<string, string> });
}

// Locale helpers - removed unused function


function isEventInFuture(eventDate: string): boolean {
  return dayjs(eventDate).isAfter(dayjs());
}

export default function HomePage() {
  const { data, loading, error } = useData();
  
  // Hero carousel state - moved here to ensure hooks are called in same order
  const events = (data?.event || []) as Event[];
  
  // Filter and sort featured events based on new featured structure
  const featuredEvents = events
    .filter((event: Event) => 
      event.featured && 
      event.featured.isFeatured === true && 
      isEventInFuture(event.eventDate)
    )
    .sort((a: Event, b: Event) => {
      // Sticky events always come first
      if (a?.featured?.featuredType === 'sticky' && b?.featured?.featuredType !== 'sticky') return -1;
      if (b?.featured?.featuredType === 'sticky' && a?.featured?.featuredType !== 'sticky') return 1;
      
      // Within same type, sort by priority (higher priority first)
      return (b?.featured?.priority || 0) - (a?.featured?.priority || 0);
    });

  const featuredIds = new Set(featuredEvents.map((e: Event) => e._id));
  const upcomingEvents = events
    .filter((event: Event) => isEventInFuture(event.eventDate) && !featuredIds.has(event._id))
    .sort((a: Event, b: Event) => dayjs(a.eventDate).valueOf() - dayjs(b.eventDate).valueOf());

  // Hero carousel state
  const slides = featuredEvents.map((ev: Event) => ({
    id: ev._id,
    image: ev.eventPromotionPhoto || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4',
    videoUrl: ev.videoUrl || '',
    title: ev.eventTitle,
  }));
  const [currentSlide, setCurrentSlide] = React.useState(0);
  const [isHoveringHero, setIsHoveringHero] = React.useState(false);

  React.useEffect(() => {
    if (slides.length === 0) return;
    if (isHoveringHero) return;
    const id = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 10000);
    return () => clearInterval(id);
  }, [slides.length, isHoveringHero]);

  const getYoutubeId = (url?: string) => {
    if (!url) return null;
    const regExp = /^.*(?:youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[1] && match[1].length === 11 ? match[1] : null;
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading events...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400">Error loading events: {error}</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
      {/* Hero Section */}
      <section className="relative h-[60vh] sm:h-[70vh] flex items-center overflow-x-hidden"
        onMouseEnter={() => setIsHoveringHero(true)}
        onMouseLeave={() => setIsHoveringHero(false)}
      >
        <div className="absolute inset-0 z-0">
          {slides.length > 0 ? (
            slides.map((slide: Slide, idx: number) => {
              const isActive = idx === currentSlide;
              const yt = getYoutubeId(slide.videoUrl);
              return (
                <div key={slide.id}
                  className={`absolute inset-0 transition-opacity duration-700 ${isActive ? 'opacity-100' : 'opacity-0'}`}
                >
                  {yt ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${yt}?autoplay=${isActive ? '1' : '0'}&mute=1&controls=0&rel=0&showinfo=0&loop=1`}
                      title={slide.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full"
                    />
                  ) : (
                    <Image 
                      src={slide.image}
                      alt={slide.title || 'Featured Event'}
                      fill
                      className="object-cover brightness-50 max-w-full"
                      priority={idx === 0}
                    />
                  )}
                </div>
              );
            })
          ) : (
            <Image 
              src={"https://images.unsplash.com/photo-1501281668745-f7f57925c3b4"} 
              alt="Featured Event"
              fill
              className="object-cover brightness-50 max-w-full"
              priority
            />
          )}
        </div>
        {/* Controls */}
        {slides.length > 1 && (
          <div className="absolute inset-x-0 bottom-6 z-10 flex flex-col items-center gap-3">
            <div className="flex items-center gap-2">
              {slides.map((_: Slide, i: number) => (
                <button key={i}
                  aria-label={`Go to slide ${i + 1}`}
                  onClick={() => setCurrentSlide(i)}
                  className={`h-2.5 w-2.5 rounded-full ${currentSlide === i ? 'bg-white' : 'bg-white/60'} border border-white/30`}
                />
              ))}
            </div>
            <div className="flex items-center gap-3">
              <button
                aria-label="Previous"
                onClick={() => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)}
                className="h-10 w-10 rounded-full flex items-center justify-center bg-white/15 hover:bg-white/25 text-white shadow-md border border-white/25 backdrop-blur"
              >
                <FaChevronLeft />
              </button>
              <button
                aria-label="Next"
                onClick={() => setCurrentSlide((prev) => (prev + 1) % slides.length)}
                className="h-10 w-10 rounded-full flex items-center justify-center bg-white/15 hover:bg-white/25 text-white shadow-md border border-white/25 backdrop-blur"
              >
                <FaChevronRight />
              </button>
            </div>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-24 sm:bottom-28 z-10">
          <div className="container mx-auto px-4 text-white">
            <div className="max-w-xl bg-black/40 backdrop-blur-md rounded-xl p-4 sm:p-6 shadow-lg">
              <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold mb-2 sm:mb-4">Discover Amazing Events</h1>
              <p className="text-base sm:text-xl mb-4 sm:mb-6">Find and book tickets for the best events in your area</p>
              <Link href="/events">
                <span className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-5 py-2.5 rounded-lg transition duration-300">
                  Browse All Events
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Events Section */}
      <section
        className="py-10 sm:py-20 overflow-x-hidden"
        style={{
          background: 'color-mix(in srgb, var(--foreground) 3%, var(--background))'
        }}
      >
        <div className="container mx-auto px-4">
          <div className="mb-8 sm:mb-12 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">Featured Events</h2>
            <div className="w-20 h-1 bg-indigo-600 mx-auto"></div>
            <p className="mt-3 text-sm sm:text-base opacity-80" style={{ color: 'var(--foreground)' }}>
              Hand-picked happenings you shouldn’t miss.
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {featuredEvents.length > 0 ? (
              featuredEvents.map((event: Event) => (
                <FeaturedEventCard key={event._id} event={event} />
              ))
            ) : <></>}
          </div>
        </div>
      </section>

      {/* Upcoming Events Section */}
      <section
        className="py-10 sm:py-20 overflow-x-hidden"
        style={{
          // subtle band using theme vars to mimic light gray-50 / dark gray-900 subtle tint
          background: 'color-mix(in srgb, var(--foreground) 5%, var(--background))'
        }}
      >
        <div className="container mx-auto px-4">
          <div className="mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-center">
            <div className="mb-4 sm:mb-0">
              <h2 className="text-2xl sm:text-3xl font-bold mb-2">Upcoming Events</h2>
              <div className="w-20 h-1 bg-indigo-600"></div>
            </div>
            <Link href="/events">
              <span className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center">
                View All <FaArrowRight className="ml-1 text-sm" />
              </span>
            </Link>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {upcomingEvents.length > 0 ? (
              upcomingEvents.slice(0, 6).map((event: Event) => (
                <UpcomingEventCard key={event._id} event={event} />
              ))
            ) : (
              <div className="col-span-full text-center py-8 opacity-70" style={{ color: 'var(--foreground)' }}>
                No upcoming events scheduled at the moment.
              </div>
            )}
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-10 sm:py-20 bg-indigo-600 text-white overflow-x-hidden">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">Ready to Experience Amazing Events?</h2>
          <p className="text-base sm:text-xl mb-6 sm:mb-8 max-w-2xl mx-auto">Join thousands of event-goers and discover the best events happening near you.</p>
          <Link href="/events">
            <span className="inline-block bg-white text-indigo-600 font-bold px-6 sm:px-8 py-2 sm:py-3 rounded-lg hover:bg-gray-100 transition duration-300">
              Find Events
            </span>
          </Link>
        </div>
      </section>
    </div>
  );
}

// Featured Event Card Component
function FeaturedEventCard({ event }: { event: Event }) {
  const getMinPrice = () => {
    try {
      if (!event.ticketInfo || !event.ticketInfo.length) return 0;
      const validPrices = event.ticketInfo
        .map(ticket => Number(ticket.price))
        .filter(price => !isNaN(price) && isFinite(price));
      return validPrices.length ? Math.min(...validPrices) : 0;
    } catch (e) {
      console.error("Error calculating min price:", e);
      return 0;
    }
  };

  return (
    <div 
      className="rounded-xl overflow-hidden shadow-sm transition-all duration-300"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)', borderWidth: 1 }}
    >
      <Link href={`/events/${event._id}`} className="block">
        <div className="relative h-48">
          <Image 
            src={event.eventPromotionPhoto || "https://via.placeholder.com/500x300"} 
            alt={event.eventTitle}
            fill
            className="object-cover max-w-full"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent pointer-events-none" />
          {event.status === "up-coming" && (
            <div className="absolute top-3 right-3 bg-green-500/90 text-white text-[10px] tracking-wide px-2 py-1 rounded-full shadow">
              UPCOMING
            </div>
          )}
        </div>
      </Link>
      <div className="p-4 sm:p-6">
        {/* Merchant chip */}
        {event.merchant?.name && (
          <div className="mb-2 flex items-center gap-2">
            {event.merchant.logo ? (
              <Image src={event.merchant.logo} alt={event.merchant.name} width={60} height={22} className="rounded-full" />
            ) : (
              <div className="h-7 w-7 rounded-full" style={{ background: 'var(--border)' }} />
            )}
            <span className="text-xs opacity-80" style={{ color: 'var(--foreground)' }}>{event.merchant.name}</span>
          </div>
        )}
        <Link href={`/events/${event._id}`} className="block">
          <h3 className="text-lg sm:text-xl font-semibold mb-2 line-clamp-1">{event.eventTitle}</h3>
        </Link>
        <div className="flex items-center mb-2 text-sm sm:text-base opacity-80" style={{ color: 'var(--foreground)' }}>
          <FaCalendarAlt className="mr-2 flex-shrink-0" />
          <span className="truncate">{formatEventDate(event.eventDate, event.eventTimezone)}</span>
        </div>
        <div className="flex items-center mb-4 text-sm sm:text-base opacity-80" style={{ color: 'var(--foreground)' }}>
          <FaMapMarkerAlt className="mr-2 flex-shrink-0" />
          <span className="line-clamp-1">{event.venueInfo?.name || event.city}</span>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <div className="flex items-center text-sm opacity-80" style={{ color: 'var(--foreground)' }}>
            <FaTicketAlt className="mr-2 flex-shrink-0" />
            <span>
              From {getMinPrice()} {' '} {getCurrencySymbol(event.country || '')}
            </span>
          </div>
          <span
            className="text-[11px] sm:text-xs px-2 py-1 rounded border"
            style={{ background: 'var(--surface)', color: 'var(--foreground)', borderColor: 'var(--border)' }}
            aria-label={event.ticketsSold ? `${event.ticketsSold} tickets sold` : event.occupancy ? `Capacity ${event.occupancy}` : 'Limited capacity'}
          >
            {event.ticketsSold ? `${event.ticketsSold} sold` : event.occupancy ? `Capacity ${event.occupancy}` : 'Limited'}
          </span>
        </div>
        <div className="mt-4 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
          <Link href={`/events/${event._id}`}>
            <span className="inline-flex items-center justify-center w-full text-center font-medium px-4 py-2 rounded-lg transition-colors duration-200 bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400">
              View Details
            </span>
          </Link>
          <div className="mt-3 flex items-center gap-4 text-xs opacity-80" style={{ color: 'var(--foreground)' }}>
            {event.transportLink && (
              <a href={event.transportLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:opacity-100">
                <FaExternalLinkAlt className="text-[10px]" />
                <span>Directions</span>
              </a>
            )}
            {event.videoUrl && (
              <a href={event.videoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:opacity-100">
                <FaPlay className="text-[10px]" />
                <span>Watch video</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Upcoming Event Card (compact)
function UpcomingEventCard({ event }: { event: Event }) {
  const getMinPrice = () => {
    try {
      if (!event.ticketInfo || !event.ticketInfo.length) return 0;
      const validPrices = event.ticketInfo
        .map(ticket => Number(ticket.price))
        .filter(price => !isNaN(price) && isFinite(price));
      return validPrices.length ? Math.min(...validPrices) : 0;
    } catch {
      return 0;
    }
  };

  const promoImg = event.eventPromotionPhoto || event.venueInfo?.media?.photo?.[0] || "https://via.placeholder.com/400x240";

  return (
      <div 
        className="rounded-xl overflow-hidden shadow-sm transition-all duration-200"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)', borderWidth: 1 }}
      >
        <Link href={`/events/${event._id}`} className="block">
          <div className="relative h-40 sm:h-44">
            <Image
              src={promoImg}
              alt={event.eventTitle}
              fill
              className="object-cover max-w-full"
            />
            <div className="absolute top-2 left-2 bg-black/60 text-white text-[11px] sm:text-xs px-2 py-1 rounded">
               {formatEventDate(event.eventDate, event.eventTimezone)}
            </div>
            {event.status === 'up-coming' && (
              <div className="absolute top-2 right-2 bg-green-500/90 text-white text-[10px] px-2 py-1 rounded">
                UPCOMING
              </div>
            )}
          </div>
        </Link>

        <div className="p-3 sm:p-4">
          {/* Merchant chip (compact) */}
          {event.merchant?.name && (
            <div className="mb-1 flex items-center gap-2">
              {event.merchant.logo ? (
                <Image src={event.merchant.logo} alt={event.merchant.name} width={60} height={22} className="rounded-full" />
              ) : (
                <div className="h-6 w-6 rounded-full" style={{ background: 'var(--border)' }} />
              )}
              <span className="text-[11px] opacity-80" style={{ color: 'var(--foreground)' }}>{event.merchant.name}</span>
            </div>
          )}
          <Link href={`/events/${event._id}`} className="block">
            <h3 className="font-semibold text-sm sm:text-base line-clamp-1" style={{ color: 'var(--foreground)' }}>
              {event.eventTitle}
            </h3>
          </Link>
          <div className="mt-1 flex items-center text-xs sm:text-sm opacity-80" style={{ color: 'var(--foreground)' }}>
            <FaMapMarkerAlt className="mr-1 flex-shrink-0" size={12} />
            <span className="truncate">{event.venueInfo?.name || event.city}{event.city ? `, ${event.city}` : ''}</span>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs sm:text-sm font-medium" style={{ color: 'var(--foreground)' }}>
              From   {getMinPrice()} {' '} {getCurrencySymbol(event.country || '')}
            </span>
            <span
              className="text-[11px] sm:text-xs px-2 py-1 rounded border"
              style={{ background: 'var(--surface)', color: 'var(--foreground)', borderColor: 'var(--border)' }}
              aria-label={event.ticketsSold ? `${event.ticketsSold} tickets sold` : event.occupancy ? `Capacity ${event.occupancy}` : 'Limited capacity'}
            >
              {event.ticketsSold ? `${event.ticketsSold} sold` : event.occupancy ? `Capacity ${event.occupancy}` : 'Limited'}
            </span>
          </div>

          {(event.transportLink || event.videoUrl) && (
            <div className="mt-2 flex items-center gap-3 text-[11px] opacity-80" style={{ color: 'var(--foreground)' }}>
              {event.transportLink && (
                <a href={event.transportLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:opacity-100">
                  <FaExternalLinkAlt className="text-[9px]" />
                  <span>Directions</span>
                </a>
              )}
              {event.videoUrl && (
                <a href={event.videoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:opacity-100">
                  <FaPlay className="text-[9px]" />
                  <span>Video</span>
                </a>
              )}
            </div>
          )}
        </div>
      </div>
  );
}