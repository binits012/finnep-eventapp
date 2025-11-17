import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
// Header and Footer are now handled by AppWrapper
import Script from 'next/script';
import { AppWrapper } from '@/components/AppWrapper';
import { generateMetadata as generateSEOMetadata } from '@/utils/seo';
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = generateSEOMetadata({
  title: "Finnep Events - Discover & Buy Tickets for the Best Events",
  description: "Find and buy tickets for the best events in Finland and the Nordic region. Discover concerts, festivals, conferences, and more with Finnep Events.",
  keywords: ["events", "tickets", "Finland", "Nordic", "concerts", "festivals", "conferences", "Helsinki", "booking"],
  image: '/logo.png',
  url: '/',
  type: 'website',
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Security headers */}
        <meta httpEquiv="Content-Security-Policy" content={`default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://js.stripe.com https://captcha.finnep.fi https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https:${process.env.NEXT_PUBLIC_CSP_MODE === 'development' ? ' http://localhost:* ws://localhost:* wss://localhost:*' : ''}; frame-src 'self' https://www.youtube.com https://youtube.com https://player.vimeo.com https://vimeo.com https://embed.ted.com https://ted.com https://js.stripe.com; worker-src 'self' blob: https://cdn.jsdelivr.net;`} />
        <meta name="referrer" content="strict-origin-when-cross-origin" />

        {/* Viewport - single instance */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />

        {/* Theme and PWA */}
        <meta name="theme-color" content="#6366f1" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Finnep Events" />
        <meta name="application-name" content="Finnep Events" />
        <meta name="msapplication-TileColor" content="#6366f1" />
        <meta name="msapplication-config" content="/browserconfig.xml" />

        {/* Resource hints for performance - Next.js handles Google Fonts automatically */}

        {/* Icons and manifest */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <link rel="manifest" href="/manifest.webmanifest" />

        {/* Canonical URL */}
        <link rel="canonical" href={process.env.NEXT_PUBLIC_BASE_URL || 'https://eventapp.finnep.fi'} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased overflow-x-hidden`}
        suppressHydrationWarning
      >
        {/* Optimized theme management - single consolidated script with defer */}
        <Script id="theme-manager" strategy="beforeInteractive">
          {`(function(){
            try {
              var d = document.documentElement;
              var mq = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
              var osListener = null;

              function apply(theme) {
                if (theme === 'dark') {
                  d.classList.add('dark');
                  d.setAttribute('data-theme', 'dark');
                } else if (theme === 'light') {
                  d.classList.remove('dark');
                  d.setAttribute('data-theme', 'light');
                } else {
                  var effective = (mq && mq.matches) ? 'dark' : 'light';
                  if (effective === 'dark') {
                    d.classList.add('dark');
                    d.setAttribute('data-theme', 'dark');
                  } else {
                    d.classList.remove('dark');
                    d.setAttribute('data-theme', 'light');
                  }
                }
              }

              function setTheme(mode) {
                try {
                  if (mode !== 'light' && mode !== 'dark' && mode !== 'system') {
                    mode = 'system';
                  }
                  localStorage.setItem('theme', mode);
                  apply(mode);

                  if (osListener && mq) {
                    mq.removeEventListener('change', osListener);
                    osListener = null;
                  }

                  if (mode === 'system' && mq) {
                    osListener = function() { apply('system'); };
                    mq.addEventListener('change', osListener);
                  }
                } catch(e) {}
              }

              // Initialize theme
              var s = localStorage.getItem('theme') || 'dark';
              var t = (s === 'light' || s === 'dark') ? s : (mq && mq.matches ? 'dark' : 'light');
              apply(t);

              // Set up runtime controls
              window.__setTheme = setTheme;

              if (t === 'system' && mq) {
                osListener = function() { apply('system'); };
                mq.addEventListener('change', osListener);
              }

              // Listen for storage changes
              window.addEventListener('storage', function(ev) {
                if (ev.key === 'theme') {
                  var val = ev.newValue || 'dark';
                  apply(val);
                }
              });
            } catch(e) {}
          })();`}
        </Script>

        <AppWrapper>
          {children}
        </AppWrapper>

        {/* Consolidated Structured Data - Single Script */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              {
                "@context": "https://schema.org",
                "@type": "Organization",
                "@id": "https://eventapp.finnep.fi#organization",
                "name": "Finnep",
                "description": "Finnep Events - Your premier destination for events in Finland and the Nordic region",
                "url": "https://eventapp.finnep.fi",
                "logo": "https://eventapp.finnep.fi/logo.png",
                "sameAs": [
                  "https://www.facebook.com/finnep",
                  "https://www.instagram.com/finnep",
                  "https://www.twitter.com/finnep"
                ],
                "contactPoint": {
                  "@type": "ContactPoint",
                  "telephone": "+358-XX-XXX-XXXX",
                  "contactType": "customer service",
                  "availableLanguage": ["English", "Finnish", "Swedish", "Danish", "Norwegian"],
                  "email": "info@finnep.fi"
                },
                "address": {
                  "@type": "PostalAddress",
                  "addressCountry": "FI",
                  "addressLocality": "Helsinki"
                }
              },
              {
                "@context": "https://schema.org",
                "@type": "WebSite",
                "@id": "https://eventapp.finnep.fi#website",
                "name": "Finnep Events",
                "description": "Discover and book tickets for the best events in Finland and the Nordic region",
                "url": "https://eventapp.finnep.fi",
                "potentialAction": {
                  "@type": "SearchAction",
                  "target": {
                    "@type": "EntryPoint",
                    "urlTemplate": "https://eventapp.finnep.fi/events?search={search_term_string}"
                  },
                  "query-input": "required name=search_term_string"
                }
              }
            ])
          }}
        />
      </body>
    </html>
  );
}
