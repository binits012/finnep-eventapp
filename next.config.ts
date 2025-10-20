import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    domains: [
      // Event promotion photos
      'example.com',
      't3.ftcdn.net',
      'encrypted-tbn0.gstatic.com',
      'via.placeholder.com',
      'images.unsplash.com',
      
      // Venue photos
      'stiftelsenabo.fi',
      
      // S3 buckets and CDN domains
      'finnep.s3.eu-central-1.amazonaws.com',
      'yellowbridgery.s3.eu-central-1.amazonaws.com',
      'd33jrwq9wsr4vi.cloudfront.net',
      'd3ibhfrhdk2dm6.cloudfront.net',
      
      // Logo hosts
      'www.designmantic.com',
    ],
    // Optionally add remote patterns for more flexible configuration
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.cloudfront.net',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Other Next.js configuration options
  reactStrictMode: true,
};

export default nextConfig;