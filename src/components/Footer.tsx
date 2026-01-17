'use client';

import Link from 'next/link';
import Image from 'next/image';
import { FaFacebook, FaTwitter, FaInstagram, FaLinkedin, FaTiktok } from 'react-icons/fa';
import { useData } from '@/contexts/DataContext';
import { useTranslation } from '@/hooks/useTranslation';

export default function Footer() {
  const { t } = useTranslation();
  const { data } = useData();

  const settings = data?.setting?.[0] || {};

  const socialMedia = (settings as { socialMedia: {   fb?: string; x?: string; in?: string; ln?: string; tk?: string; } }).socialMedia;

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
                {t('footer.tagline')}
              </p>
              <div className="mt-4 flex justify-center sm:justify-start space-x-6" role="list">
                {socialMedia?.fb && (
                  <a href={socialMedia.fb} target="_blank" rel="noreferrer"
                     className="transition p-2 opacity-70 hover:opacity-100"
                     style={{ color: 'var(--foreground)' }}
                     aria-label={t('footer.srFacebook') || 'Visit our Facebook page'}>
                    <FaFacebook size={20} aria-hidden="true" />
                    <span className="sr-only">{t('footer.srFacebook')}</span>
                  </a>
                )}
                {socialMedia?.x && (
                  <a href={socialMedia.x} target="_blank" rel="noreferrer"
                     className="transition p-2 opacity-70 hover:opacity-100"
                     style={{ color: 'var(--foreground)' }}
                     aria-label={t('footer.srTwitter') || 'Visit our Twitter page'}>
                    <FaTwitter size={20} aria-hidden="true" />
                    <span className="sr-only">{t('footer.srTwitter')}</span>
                  </a>
                )}
                {socialMedia?.in && (
                  <a href={socialMedia?.in} target="_blank" rel="noreferrer"
                     className="transition p-2 opacity-70 hover:opacity-100"
                     style={{ color: 'var(--foreground)' }}
                     aria-label={t('footer.srInstagram') || 'Visit our Instagram page'}>
                    <FaInstagram size={20} aria-hidden="true" />
                    <span className="sr-only">{t('footer.srInstagram')}</span>
                  </a>
                )}
                {socialMedia?.ln && (
                  <a href={socialMedia.ln} target="_blank" rel="noreferrer"
                     className="transition p-2 opacity-70 hover:opacity-100"
                     style={{ color: 'var(--foreground)' }}
                     aria-label={t('footer.srLinkedIn') || 'Visit our LinkedIn page'}>
                    <FaLinkedin size={20} aria-hidden="true" />
                    <span className="sr-only">{t('footer.srLinkedIn')}</span>
                  </a>
                )}
                {socialMedia?.tk && (
                  <a href={socialMedia.tk} target="_blank" rel="noreferrer"
                     className="transition p-2 opacity-70 hover:opacity-100"
                     style={{ color: 'var(--foreground)' }}
                     aria-label={t('footer.srTiktok') || 'Visit our TikTok page'}>
                    <FaTiktok size={20} aria-hidden="true" />
                    <span className="sr-only">{t('footer.srTiktok')}</span>
                  </a>
                )}
              </div>
            </div>

            {/* Explore Links - Mobile */}
            <div className="pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-center sm:text-left" style={{ color: 'var(--foreground)' }}>
                {t('footer.explore')}
              </h3>
              <ul className="mt-4 flex flex-wrap justify-center sm:justify-start">
                <li className="w-1/2 text-center sm:text-left py-2">
                  <Link href="/events" className="text-base transition p-2 opacity-80 hover:opacity-100" style={{ color: 'var(--foreground)' }}>
                    {t('footer.allEvents')}
                  </Link>
                </li>
                <li className="w-1/2 text-center sm:text-left py-2">
                  <Link href="/venues" className="text-base transition p-2 opacity-80 hover:opacity-100" style={{ color: 'var(--foreground)' }}>
                    {t('footer.venues')}
                  </Link>
                </li>

              </ul>
            </div>

            {/* Company Links - Mobile */}
            <div className="pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-center sm:text-left" style={{ color: 'var(--foreground)' }}>
                {t('footer.company')}
              </h3>
              <ul className="mt-4 flex flex-wrap justify-center sm:justify-start">
                <li className="w-1/2 text-center sm:text-left py-2">
                  <Link href="/contact" className="text-base transition p-2 opacity-80 hover:opacity-100" style={{ color: 'var(--foreground)' }}>
                    {t('footer.contact')}
                  </Link>
                </li>
                <li className="w-1/2 text-center sm:text-left py-2">
                  <Link href="/careers" className="text-base transition p-2 opacity-80 hover:opacity-100" style={{ color: 'var(--foreground)' }}>
                    {t('footer.careers')}
                  </Link>
                </li>
                <li className="w-1/2 text-center sm:text-left py-2">
                  <Link href="/help" className="text-base transition p-2 opacity-80 hover:opacity-100" style={{ color: 'var(--foreground)' }}>
                    {t('header.help')}
                  </Link>
                </li>
              </ul>
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
              {t('footer.tagline')}
            </p>
            <div className="mt-6 flex space-x-4" role="list">
              {socialMedia?.fb && (
                <a href={socialMedia.fb} target="_blank" rel="noreferrer" className="transition duration-150 opacity-70 hover:opacity-100" style={{ color: 'var(--foreground)' }} aria-label={t('footer.srFacebook') || 'Visit our Facebook page'}>
                  <FaFacebook size={20} aria-hidden="true" />
                  <span className="sr-only">{t('footer.srFacebook')}</span>
                </a>
              )}
              {socialMedia?.x && (
                <a href={socialMedia.x} target="_blank" rel="noreferrer" className="transition duration-150 opacity-70 hover:opacity-100" style={{ color: 'var(--foreground)' }} aria-label={t('footer.srTwitter') || 'Visit our Twitter page'}>
                  <FaTwitter size={20} aria-hidden="true" />
                  <span className="sr-only">{t('footer.srTwitter')}</span>
                </a>
              )}
              {socialMedia?.in && (
                <a href={socialMedia.in} target="_blank" rel="noreferrer" className="transition duration-150 opacity-70 hover:opacity-100" style={{ color: 'var(--foreground)' }} aria-label={t('footer.srInstagram') || 'Visit our Instagram page'}>
                  <FaInstagram size={20} aria-hidden="true" />
                  <span className="sr-only">{t('footer.srInstagram')}</span>
                </a>
              )}
              {socialMedia?.ln && (
                <a href={socialMedia.ln} target="_blank" rel="noreferrer" className="transition duration-150 opacity-70 hover:opacity-100" style={{ color: 'var(--foreground)' }} aria-label={t('footer.srLinkedIn') || 'Visit our LinkedIn page'}>
                  <FaLinkedin size={20} aria-hidden="true" />
                  <span className="sr-only">{t('footer.srLinkedIn')}</span>
                </a>
              )}
              {socialMedia?.tk && (
                <a href={socialMedia.tk} target="_blank" rel="noreferrer" className="transition duration-150 opacity-70 hover:opacity-100" style={{ color: 'var(--foreground)' }} aria-label={t('footer.srTiktok') || 'Visit our TikTok page'}>
                  <FaTiktok size={20} aria-hidden="true" />
                  <span className="sr-only">{t('footer.srTiktok')}</span>
                </a>
              )}
            </div>
          </div>

          {/* Explore Column */}
          <div className="col-span-1">
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--foreground)' }}>
              {t('footer.explore')}
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="/events" className="text-sm transition duration-150 opacity-80 hover:opacity-100" style={{ color: 'var(--foreground)' }}>
                  {t('footer.allEvents')}
                </Link>
              </li>
              <li>
                <Link href="/venues" className="text-sm transition duration-150 opacity-80 hover:opacity-100" style={{ color: 'var(--foreground)' }}>
                  {t('footer.venues')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Company Column */}
          <div className="col-span-1">
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--foreground)' }}>
              {t('footer.company')}
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
                  {t('footer.contact')}
                </Link>
              </li>
              <li>
                <Link href="/careers" className="text-sm transition duration-150 opacity-80 hover:opacity-100" style={{ color: 'var(--foreground)' }}>
                  {t('footer.careers')}
                </Link>
              </li>
              <li>
                <Link href="/help" className="text-sm transition duration-150 opacity-80 hover:opacity-100" style={{ color: 'var(--foreground)' }}>
                  {t('header.help')}
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
              {t('footer.copyright', { year: new Date().getFullYear() })}
            </p>
            <div className="mt-4 md:mt-0 flex flex-wrap justify-center gap-4 text-sm">
              <Link href="/privacy" className="transition px-2 py-1 opacity-70 hover:opacity-100" style={{ color: 'var(--foreground)' }}>
                {t('footer.privacyPolicy')}
              </Link>
              <Link href="/terms" className="transition px-2 py-1 opacity-70 hover:opacity-100" style={{ color: 'var(--foreground)' }}>
                {t('footer.termsOfService')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}