'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script';
import EventDetail from '@/components/EventDetail';
import api from '@/services/apiClient';
import { Event } from '@/types/event';
import { generateStructuredData } from '@/utils/seo';

export default function EventPage() {
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const params = useParams();
  const eventId = params?.id as string;

  useEffect(() => {
    const fetchEventDetails = async () => {
      if (!eventId) return;

      try {
        setLoading(true);
        setError(null);

        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), 10000)
        );

        const eventPromise = api.get(`/event/${eventId}`) as Promise<{ event: Event }>;

        const response = await Promise.race([eventPromise, timeoutPromise]) as { event: Event }; 

        // Extract the event data from the response
        const eventData = response.event;
        setEvent(eventData);
      } catch (err) {
        console.error('Error fetching event details:', err);
        setError(err instanceof Error ? err.message : 'Failed to load event');
      } finally {
        setLoading(false);
      }
    };

    fetchEventDetails();
  }, [eventId]);

  // Update page metadata when event data loads
  useEffect(() => {
    if (event) {
      // Get the current hostname dynamically
      const hostname = typeof window !== 'undefined' ? window.location.origin : '';

      // Update document title
      document.title = `${event.eventTitle || 'Event'} | Finnep Events`;

      // Update meta description
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute('content', event.eventDescription || `Join us for ${event.eventTitle || 'this event'} on ${event.eventDate ? new Date(event.eventDate).toLocaleDateString() : 'TBD'}`);
      }

      // Update Open Graph tags
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) {
        ogTitle.setAttribute('content', event.eventTitle || 'Event');
      }

      const ogDescription = document.querySelector('meta[property="og:description"]');
      if (ogDescription) {
        ogDescription.setAttribute('content', event.eventDescription || `Join us for ${event.eventTitle || 'this event'}`);
      }

      const ogUrl = document.querySelector('meta[property="og:url"]');
      if (ogUrl) {
        ogUrl.setAttribute('content', `${hostname}/events/${eventId}`);
      }

      const ogImage = document.querySelector('meta[property="og:image"]');
      if (ogImage) {
        ogImage.setAttribute('content', event.eventPromotionPhoto || `${hostname}/logo.png`);
      }

      const ogType = document.querySelector('meta[property="og:type"]');
      if (ogType) {
        ogType.setAttribute('content', 'event');
      }

      // Add tags to Open Graph
      if (event.tags && Array.isArray(event.tags) && event.tags.length > 0) {
        const ogTags = document.querySelector('meta[property="og:article:tag"]');
        if (ogTags) {
          ogTags.setAttribute('content', event.tags.join(', '));
        } else {
          const meta = document.createElement('meta');
          meta.setAttribute('property', 'og:article:tag');
          meta.setAttribute('content', event.tags.join(', '));
          document.head.appendChild(meta);
        }
      }

      // Update Twitter Card tags
      const twitterTitle = document.querySelector('meta[name="twitter:title"]');
      if (twitterTitle) {
        twitterTitle.setAttribute('content', event.eventTitle || 'Event');
      }

      const twitterDescription = document.querySelector('meta[name="twitter:description"]');
      if (twitterDescription) {
        twitterDescription.setAttribute('content', event.eventDescription || `Join us for ${event.eventTitle || 'this event'}`);
      }

      const twitterImage = document.querySelector('meta[name="twitter:image"]');
      if (twitterImage) {
        twitterImage.setAttribute('content', event.eventPromotionPhoto || `${hostname}/logo.png`);
      }

      // Update canonical URL
      const canonical = document.querySelector('link[rel="canonical"]');
      if (canonical) {
        canonical.setAttribute('href', `${hostname}/events/${eventId}`);
      }

      // Add event-specific meta tags
      if (event.eventDate) {
        const eventStartTime = document.querySelector('meta[property="event:start_time"]');
        if (eventStartTime) {
          eventStartTime.setAttribute('content', new Date(event.eventDate).toISOString());
        } else {
          const meta = document.createElement('meta');
          meta.setAttribute('property', 'event:start_time');
          meta.setAttribute('content', new Date(event.eventDate).toISOString());
          document.head.appendChild(meta);
        }
      }

      const eventLocation = document.querySelector('meta[property="event:location"]');
      if (eventLocation) {
        eventLocation.setAttribute('content', event.eventLocationAddress || '');
      } else {
        const meta = document.createElement('meta');
        meta.setAttribute('property', 'event:location');
        meta.setAttribute('content', event.eventLocationAddress || '');
        document.head.appendChild(meta);
      }

      const eventVenue = document.querySelector('meta[property="event:venue"]');
      if (eventVenue) {
        eventVenue.setAttribute('content', event.venueInfo?.name || event.venue?.name || '');
      } else {
        const meta = document.createElement('meta');
        meta.setAttribute('property', 'event:venue');
        meta.setAttribute('content', event.venueInfo?.name || event.venue?.name || '');
        document.head.appendChild(meta);
      }
    }
  }, [event, eventId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading event details...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-md w-full mx-4 text-center">
          <div className="mb-8">
            <h1 className="text-6xl font-bold text-indigo-600 dark:text-indigo-400 mb-4">404</h1>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
              Event Not Found
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-8">
              The event you are looking for could not be found. It might have been removed or the link is incorrect.
            </p>
          </div>

          <div className="space-y-4">
            <Link
              href="/events"
              className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200"
            >
              Browse All Events
            </Link>
          </div>
        </div>
      </div>
    );
  }


  const structuredData = event ? generateStructuredData({
    type: 'Event',
    data: event as unknown as Record<string, unknown>,
    merchantData: event.merchant as unknown as Record<string, unknown>,
  }) : null;

  return (
    <>
      {/* Structured Data for Event - Using Next.js Script component for security */}
      {structuredData && (
        <Script
          id="event-structured-data"
          type="application/ld+json"
          strategy="afterInteractive"
        >
          {JSON.stringify(structuredData)}
        </Script>
      )}

      <EventDetail event={event} />
    </>
  );
}