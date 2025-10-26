import { Metadata } from 'next';
import { Locale } from '@/types/translations';

interface SEOConfig {
  title: string;
  description: string;
  keywords?: string[];
  image?: string;
  url?: string;
  locale?: Locale;
  type?: 'website' | 'article' | 'event';
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  section?: string;
  tags?: string[];
}

export function generateMetadata(config: SEOConfig): Metadata {
  const {
    title,
    description,
    keywords = [],
    image = '/logo.png',
    url,
    locale = 'en-US',
    type = 'website',
    publishedTime,
    modifiedTime,
    author,
    section,
    tags = []
  } = config;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://eventapp.finnep.fi';
  const fullUrl = url ? `${baseUrl}${url}` : baseUrl;
  const fullImageUrl = image.startsWith('http') ? image : `${baseUrl}${image}`;

  const metadata: Metadata = {
    title: `${title} | Finnep Events`,
    description,
    keywords: keywords.join(', '),
    authors: author ? [{ name: author }] : undefined,
    creator: 'Finnep',
    publisher: 'Finnep',
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical: fullUrl,
    },
    openGraph: {
      title,
      description,
      url: fullUrl,
      siteName: 'Finnep Events',
      images: [
        {
          url: fullImageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      locale: locale.replace('-', '_'),
      type: type === 'event' ? 'website' : type,
      ...(publishedTime && { publishedTime }),
      ...(modifiedTime && { modifiedTime }),
      ...(section && { section }),
      ...(tags.length > 0 && { tags }),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [fullImageUrl],
      creator: '@finnep',
      site: '@finnep',
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };

  return metadata;
}

export function generateStructuredData(config: {
  type: 'Organization' | 'Event' | 'WebSite';
  data: Record<string, unknown>;
  locale?: Locale;
  merchantData?: Record<string, unknown>;
}) {
  const { type, data, locale = 'en-US', merchantData } = config;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://eventapp.finnep.fi';

  const baseStructuredData = {
    '@context': 'https://schema.org',
    '@type': type,
    '@id': `${baseUrl}#${type.toLowerCase()}`,
    url: baseUrl,
    inLanguage: locale,
  };

  switch (type) {
    case 'Organization':
      return {
        ...baseStructuredData,
        name: merchantData?.name || 'Finnep Events',
        description: merchantData?.description || 'Finnep Events - Your premier destination for events in Finland and the Nordic region',
        url: merchantData?.website || baseUrl,
        logo: merchantData?.logo || `${baseUrl}/logo.png`,
        sameAs: [
          'https://www.facebook.com/finnep',
          'https://www.instagram.com/finnep',
          'https://www.twitter.com/finnep',
        ],
        ...(merchantData?.companyPhoneNumber ? {
          contactPoint: {
            '@type': 'ContactPoint',
            telephone: merchantData.companyPhoneNumber,
            contactType: 'customer service',
            availableLanguage: ['English', 'Finnish', 'Swedish', 'Danish', 'Norwegian'],
          },
        } : {}),
        ...(merchantData?.companyAddress ? {
          address: {
            '@type': 'PostalAddress',
            streetAddress: merchantData.companyAddress,
            addressCountry: merchantData.country || 'FI',
            addressLocality: merchantData.city || 'Helsinki',
          },
        } : {}),
      };

    case 'Event':
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const eventData = data as any;
      return {
        ...baseStructuredData,
        name: eventData.eventTitle,
        description: eventData.eventDescription,
        startDate: eventData.eventDate,
        endDate: eventData.eventDate,
        location: {
          '@type': 'Place',
          name: eventData.venueInfo?.name || eventData.venue?.name,
          address: eventData.eventLocationAddress,
          geo: eventData.eventLocationGeoCode ? {
            '@type': 'GeoCoordinates',
            latitude: eventData.eventLocationGeoCode.split(',')[0],
            longitude: eventData.eventLocationGeoCode.split(',')[1],
          } : undefined,
        },
        organizer: {
          '@type': 'Organization',
          name: eventData.merchant?.name,
          url: eventData.merchant?.website,
          ...(eventData.merchant?.companyPhoneNumber && {
            contactPoint: {
              '@type': 'ContactPoint',
              telephone: eventData.merchant.companyPhoneNumber,
              contactType: 'customer service',
            },
          }),
        },
        offers: eventData.ticketInfo?.map((ticket: Record<string, unknown>) => ({
          '@type': 'Offer',
          name: ticket.name,
          price: ticket.price,
          priceCurrency: 'EUR',
          availability: (ticket.available as number) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          validFrom: new Date().toISOString(),
        })),
        image: eventData.eventPromotionPhoto,
        url: `${baseUrl}/events/${eventData._id}`,
        ...(eventData.tags && Array.isArray(eventData.tags) && eventData.tags.length > 0 && {
          keywords: eventData.tags.join(', '),
          about: eventData.tags.map((tag: string) => ({
            '@type': 'Thing',
            name: tag.replace('#', ''),
          })),
        }),
      };

    case 'WebSite':
      return {
        ...baseStructuredData,
        name: 'Finnep Events',
        description: 'Discover and book tickets for the best events in Finland and the Nordic region',
        url: baseUrl,
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${baseUrl}/events?search={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      };

    default:
      return baseStructuredData;
  }
}
