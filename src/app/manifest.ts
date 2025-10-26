import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Finnep Events',
    short_name: 'Finnep',
    description: 'Discover and book tickets for the best events in Finland and the Nordic region',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#6366f1',
    orientation: 'portrait',
    icons: [
      {
        src: '/favicon.ico',
        sizes: '16x16 32x32 48x48',
        type: 'image/x-icon',
      },
    ],
    categories: ['entertainment', 'lifestyle', 'travel'],
    lang: 'en',
    dir: 'ltr',
    scope: '/',
    id: 'finnep-events',
    related_applications: [],
    prefer_related_applications: false,
  };
}
