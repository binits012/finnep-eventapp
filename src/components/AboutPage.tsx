import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { FaFacebookF, FaTwitter, FaInstagram, FaEnvelope, FaPhone } from 'react-icons/fa';
import type { Settings } from '@/types/event';

interface AboutPageProps {
  data: {
    setting?: Settings[];
  };
}

export default function AboutPage({ data }: AboutPageProps) {
  const settings = data?.setting?.[0] || {} as Settings;
  const contactEmail = (settings as any)?.contactInfo?.email as string | undefined;
  const contactPhone = (settings as any)?.contactInfo?.phone as string | undefined;
  const socials = (settings as any)?.socialMedia || {} as Record<string, string>;
  
  return (
    <div className="min-h-screen" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
      {/* Hero Section */}
      <section className="relative py-16 sm:py-20 bg-indigo-600">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center text-white">
            <h1 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4">About Us</h1>
            <p className="text-base sm:text-lg">Learn about our story and mission</p>
          </div>
        </div>
      </section>
      
      {/* About Content */}
      <section className="py-12 sm:py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto" style={{ background: 'var(--surface)', borderColor: 'var(--border)', borderWidth: 1, borderRadius: 12 }}>
            <div className="prose dark:prose-invert mx-auto p-4 sm:p-6">
              <div dangerouslySetInnerHTML={{ __html: (settings as any)?.aboutSection || '' }} />
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-8 sm:py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            {[
              { title: 'Community', desc: 'Connecting people through unforgettable experiences.' },
              { title: 'Quality', desc: 'Curated events with thoughtful details and seamless execution.' },
              { title: 'Trust', desc: 'Transparent pricing, safe experiences, and reliable support.' },
            ].map((v, idx) => (
              <div key={idx} className="rounded-xl p-5 sm:p-6" style={{ background: 'var(--surface)', borderColor: 'var(--border)', borderWidth: 1 }}>
                <h3 className="text-lg font-semibold mb-2">{v.title}</h3>
                <p className="opacity-80" style={{ color: 'var(--foreground)' }}>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Timeline Section */}
      {(settings as any)?.createdAt && (
        <section className="py-8 sm:py-12">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-xl font-semibold mb-4">Our Journey</h2>
              <ol className="relative border-s" style={{ borderColor: 'var(--border)' }}>
                <li className="mb-8 ms-4">
                  <div className="absolute w-3 h-3 bg-indigo-600 rounded-full mt-1.5 -start-1.5"></div>
                  <time className="mb-1 text-sm opacity-70" style={{ color: 'var(--foreground)' }}>{new Date((settings as any).createdAt).toLocaleDateString()}</time>
                  <h3 className="text-base font-medium">Founded</h3>
                  <p className="opacity-80" style={{ color: 'var(--foreground)' }}>Yellow Bridge begins its journey to connect communities with memorable events.</p>
                </li>
                {(settings as any)?.aboutSection && (
                  <li className="mb-8 ms-4">
                    <div className="absolute w-3 h-3 bg-indigo-600 rounded-full mt-1.5 -start-1.5"></div>
                    <h3 className="text-base font-medium">Our Story</h3>
                    <p className="opacity-80" style={{ color: 'var(--foreground)' }}>We articulated our mission and values for our audience.</p>
                  </li>
                )}
                {Object.values(socials).some(Boolean) && (
                  <li className="ms-4">
                    <div className="absolute w-3 h-3 bg-indigo-600 rounded-full mt-1.5 -start-1.5"></div>
                    <h3 className="text-base font-medium">Growing Community</h3>
                    <p className="opacity-80" style={{ color: 'var(--foreground)' }}>We expanded our presence across social platforms.</p>
                  </li>
                )}
              </ol>
            </div>
          </div>
        </section>
      )}

      {/* Logo Wall (optional) */}
      {Array.isArray((settings as any)?.partners) && (settings as any)?.partners.length > 0 && (
        <section className="py-8 sm:py-12">
          <div className="container mx-auto px-4">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-xl font-semibold mb-6 text-center">Partners & Sponsors</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6 items-center">
                {((settings as any).partners as string[]).map((logoUrl: string, idx: number) => (
                  <div key={idx} className="h-12 sm:h-14 relative opacity-80 hover:opacity-100 transition" style={{ filter: 'grayscale(100%)' }}>
                    <Image src={logoUrl} alt={`Partner ${idx + 1}`} fill className="object-contain" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-12 sm:py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center rounded-xl p-6 sm:p-8" style={{ background: 'var(--surface)', borderColor: 'var(--border)', borderWidth: 1 }}>
            <h2 className="text-2xl font-semibold mb-3">Be Part of Our Story</h2>
            <p className="opacity-80 mb-6" style={{ color: 'var(--foreground)' }}>
              Host with us, sponsor an experience, or reach out to collaborate.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/events" className="inline-block">
                <span className="inline-flex items-center justify-center px-5 py-2.5 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition">
                  Explore Events
                </span>
              </Link>
              {contactEmail && (
                <a href={`mailto:${contactEmail}`} className="inline-block">
                  <span className="inline-flex items-center justify-center px-5 py-2.5 rounded-md border" style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
                    Contact Us
                  </span>
                </a>
              )}
            </div>
          </div>
        </div>
      </section>
      
      {/* Contact & Socials */}
      {(contactEmail || contactPhone || Object.values(socials).some(Boolean)) && (
        <section className="pb-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {/* Contact Card */}
              {(contactEmail || contactPhone) && (
                <div className="rounded-xl p-5 sm:p-6" style={{ background: 'var(--surface)', borderColor: 'var(--border)', borderWidth: 1 }}>
                  <h3 className="text-lg font-semibold mb-3">Contact</h3>
                  <div className="space-y-2 text-sm sm:text-base">
                    {contactEmail && (
                      <a href={`mailto:${contactEmail}`} className="inline-flex items-center gap-2 opacity-90 hover:opacity-100" style={{ color: 'var(--foreground)' }}>
                        <FaEnvelope />
                        <span>{contactEmail}</span>
                      </a>
                    )}
                    {contactPhone && (
                      <a href={`tel:${contactPhone}`} className="inline-flex items-center gap-2 opacity-90 hover:opacity-100" style={{ color: 'var(--foreground)' }}>
                        <FaPhone />
                        <span>{contactPhone}</span>
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Socials Card */}
              {Object.values(socials).some(Boolean) && (
                <div className="rounded-xl p-5 sm:p-6" style={{ background: 'var(--surface)', borderColor: 'var(--border)', borderWidth: 1 }}>
                  <h3 className="text-lg font-semibold mb-3">Follow Us</h3>
                  <div className="flex flex-wrap items-center gap-3">
                    {socials.facebook && (
                      <Link href={socials.facebook} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center h-10 w-10 rounded-full transition" style={{ background: 'var(--surface)', color: 'var(--foreground)', borderColor: 'var(--border)', borderWidth: 1 }}>
                        <FaFacebookF />
                      </Link>
                    )}
                    {(socials.twitter || (socials as any).x) && (
                      <Link href={socials.twitter || (socials as any).x} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center h-10 w-10 rounded-full transition" style={{ background: 'var(--surface)', color: 'var(--foreground)', borderColor: 'var(--border)', borderWidth: 1 }}>
                        <FaTwitter />
                      </Link>
                    )}
                    {socials.instagram && (
                      <Link href={socials.instagram} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center h-10 w-10 rounded-full transition" style={{ background: 'var(--surface)', color: 'var(--foreground)', borderColor: 'var(--border)', borderWidth: 1 }}>
                        <FaInstagram />
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}