'use client';

import Link from 'next/link';
import Image from 'next/image';
import { FaFacebook, FaTwitter, FaInstagram, FaLinkedin } from 'react-icons/fa';
import { useData } from '@/contexts/DataContext';

export default function Footer() {
  const { data } = useData();
  const settings = data?.setting?.[0] || {};
  
  return (
    <footer className="w-full border-t overflow-x-hidden" style={{ background: 'var(--surface)', color: 'var(--foreground)', borderColor: 'var(--border)' }}>
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto py-8 px-4 sm:pt-12 sm:pb-8 sm:px-6 lg:px-8">
        {/* Mobile Accordion Layout */}
        <div className="md:hidden mb-8">
          <div className="space-y-6">
            {/* Brand Section - Always visible on mobile */}
            <div className="pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <Link href="/">
                <div className="flex justify-center sm:justify-start">
                  <Image 
                    src="/logo.png" 
                    alt="Finnep Logo" 
                    width={120} 
                    height={40} 
                    className="h-8 w-auto object-contain"
                  />
                </div>
              </Link>
              <p className="mt-4 text-sm text-gray-600 dark:text-gray-400 text-center sm:text-left">
                Discover exciting events happening around you. Connect with people who share your interests.
              </p>
              <div className="mt-4 flex justify-center sm:justify-start space-x-6">
                {settings.socialMedia?.facebook && (
                  <a href={settings.socialMedia.facebook} target="_blank" rel="noreferrer" 
                     className="transition p-2 opacity-70 hover:opacity-100"
                     style={{ color: 'var(--foreground)' }}>
                    <FaFacebook size={20} />
                    <span className="sr-only">Facebook</span>
                  </a>
                )}
                {settings.socialMedia?.twitter && (
                  <a href={settings.socialMedia.twitter} target="_blank" rel="noreferrer" 
                     className="transition p-2 opacity-70 hover:opacity-100"
                     style={{ color: 'var(--foreground)' }}>
                    <FaTwitter size={20} />
                    <span className="sr-only">Twitter</span>
                  </a>
                )}
                {settings.socialMedia?.instagram && (
                  <a href={settings.socialMedia.instagram} target="_blank" rel="noreferrer" 
                     className="transition p-2 opacity-70 hover:opacity-100"
                     style={{ color: 'var(--foreground)' }}>
                    <FaInstagram size={20} />
                    <span className="sr-only">Instagram</span>
                  </a>
                )}
                {settings.socialMedia?.linkedin && (
                  <a href={settings.socialMedia.linkedin} target="_blank" rel="noreferrer" 
                     className="transition p-2 opacity-70 hover:opacity-100"
                     style={{ color: 'var(--foreground)' }}>
                    <FaLinkedin size={20} />
                    <span className="sr-only">LinkedIn</span>
                  </a>
                )}
              </div>
            </div>
            
            {/* Explore Links - Mobile */}
            <div className="pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-center sm:text-left" style={{ color: 'var(--foreground)' }}>
                Explore
              </h3>
              <ul className="mt-4 flex flex-wrap justify-center sm:justify-start">
                <li className="w-1/2 text-center sm:text-left py-2">
                  <Link href="/events" className="text-base transition p-2 opacity-80 hover:opacity-100" style={{ color: 'var(--foreground)' }}>
                    All Events
                  </Link>
                </li>
                <li className="w-1/2 text-center sm:text-left py-2">
                  <Link href="/venues" className="text-base transition p-2 opacity-80 hover:opacity-100" style={{ color: 'var(--foreground)' }}>
                    Venues
                  </Link>
                </li>
                
              </ul>
            </div>
            
            {/* Company Links - Mobile */}
            <div className="pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-center sm:text-left" style={{ color: 'var(--foreground)' }}>
                Company
              </h3>
              <ul className="mt-4 flex flex-wrap justify-center sm:justify-start">
                {/*
                <li className="w-1/2 text-center sm:text-left py-2">
                  <Link href="/about" className="text-base transition p-2 opacity-80 hover:opacity-100" style={{ color: 'var(--foreground)' }}>
                    About Us
                  </Link>
                </li>
                 */}
                <li className="w-1/2 text-center sm:text-left py-2">
                  <Link href="/contact" className="text-base transition p-2 opacity-80 hover:opacity-100" style={{ color: 'var(--foreground)' }}>
                    Contact
                  </Link>
                </li>
                <li className="w-1/2 text-center sm:text-left py-2">
                  <Link href="/careers" className="text-base transition p-2 opacity-80 hover:opacity-100" style={{ color: 'var(--foreground)' }}>
                    Careers
                  </Link>
                </li>
                <li className="w-1/2 text-center sm:text-left py-2">
                  <Link href="/blog" className="text-base transition p-2 opacity-80 hover:opacity-100" style={{ color: 'var(--foreground)' }}>
                    Blog
                  </Link>
                </li>
              </ul>
            </div>
            
            {/* Newsletter - Mobile */}
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-center sm:text-left" style={{ color: 'var(--foreground)' }}>
                Stay Updated
              </h3>
              <p className="mt-4 text-base text-center sm:text-left opacity-80" style={{ color: 'var(--foreground)' }}>
                Subscribe to get the latest events and offers.
              </p>
              <form className="mt-4">
                <div className="flex flex-col gap-3">
                  <input
                    type="email"
                    placeholder="Enter your email"
                    className="w-full px-4 py-3 text-base rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    style={{ background: 'var(--surface)', color: 'var(--foreground)', borderColor: 'var(--border)', borderWidth: 1 }}
                  />
                  <button
                    type="submit"
                    className="w-full py-3 px-4 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                  >
                    Subscribe
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden md:grid md:grid-cols-4 md:gap-8 lg:gap-12">
          {/* Brand Column - Takes up 2 columns for better balance */}
          <div className="col-span-2">
            <Link href="/">
              <div className="flex items-center">
                <Image 
                  src="/logo.png" 
                  alt="Finnep Logo" 
                  width={140} 
                  height={40} 
                  className="h-8 w-auto object-contain"
                />
              </div>
            </Link>
            <p className="mt-4 text-sm opacity-80 max-w-md" style={{ color: 'var(--foreground)' }}>
              Discover exciting events happening around you. Connect with people who share your interests.
            </p>
            <div className="mt-6 flex space-x-4">
              {settings.socialMedia?.fb && (
                <a href={settings.socialMedia.fb} target="_blank" rel="noreferrer" className="transition duration-150 opacity-70 hover:opacity-100" style={{ color: 'var(--foreground)' }}>
                  <FaFacebook size={20} />
                  <span className="sr-only">Facebook</span>
                </a>
              )}
              {settings.socialMedia?.x && (
                <a href={settings.socialMedia.x} target="_blank" rel="noreferrer" className="transition duration-150 opacity-70 hover:opacity-100" style={{ color: 'var(--foreground)' }}>
                  <FaTwitter size={20} />
                  <span className="sr-only">Twitter</span>
                </a>
              )}
              {settings.socialMedia?.in && (
                <a href={settings.socialMedia.in} target="_blank" rel="noreferrer" className="transition duration-150 opacity-70 hover:opacity-100" style={{ color: 'var(--foreground)' }}>
                  <FaInstagram size={20} />
                  <span className="sr-only">Instagram</span>
                </a>
              )}
              {settings.socialMedia?.ln && (
                <a href={settings.socialMedia.ln} target="_blank" rel="noreferrer" className="transition duration-150 opacity-70 hover:opacity-100" style={{ color: 'var(--foreground)' }}>
                  <FaLinkedin size={20} />
                  <span className="sr-only">LinkedIn</span>
                </a>
              )}
            </div>
          </div>

          {/* Explore Column */}
          <div className="col-span-1">
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--foreground)' }}>
              Explore
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="/events" className="text-sm transition duration-150 opacity-80 hover:opacity-100" style={{ color: 'var(--foreground)' }}>
                  All Events
                </Link>
              </li>
              <li>
                <Link href="/venues" className="text-sm transition duration-150 opacity-80 hover:opacity-100" style={{ color: 'var(--foreground)' }}>
                  Venues
                </Link>
              </li>
            </ul>
          </div>

          {/* Company Column */}
          <div className="col-span-1">
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--foreground)' }}>
              Company
            </h3>
            <ul className="space-y-3">
              {/*
              <li>
                <Link href="/about" className="text-sm transition duration-150 opacity-80 hover:opacity-100" style={{ color: 'var(--foreground)' }}>
                  About Us
                </Link>
              </li>
              */}
              <li>
                <Link href="/contact" className="text-sm transition duration-150 opacity-80 hover:opacity-100" style={{ color: 'var(--foreground)' }}>
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/careers" className="text-sm transition duration-150 opacity-80 hover:opacity-100" style={{ color: 'var(--foreground)' }}>
                  Careers
                </Link>
              </li>
              {/*
              <li>
                <Link href="/blog" className="text-sm transition duration-150 opacity-80 hover:opacity-100" style={{ color: 'var(--foreground)' }}>
                  Blog
                </Link>
              </li>
              */}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Footer - Copyright & Legal */}
      <div className="border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-center opacity-70" style={{ color: 'var(--foreground)' }}>
              © {new Date().getFullYear()} Finnep. All rights reserved.
            </p>
            <div className="mt-4 md:mt-0 flex flex-wrap justify-center gap-4 text-sm">
              <Link href="/privacy" className="transition px-2 py-1 opacity-70 hover:opacity-100" style={{ color: 'var(--foreground)' }}>
                Privacy Policy
              </Link>
              <Link href="/terms" className="transition px-2 py-1 opacity-70 hover:opacity-100" style={{ color: 'var(--foreground)' }}>
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}