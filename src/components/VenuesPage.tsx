"use client";

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { FaMapMarkerAlt, FaSearch, FaFilter, FaCalendarAlt, FaStar, FaGlobe, FaFacebook, FaTwitter, FaInstagram, FaLinkedin } from 'react-icons/fa';
import { useData } from '@/contexts/DataContext';
import { Event } from '@/types/event';

interface VenueData {
  id: string;
  name: string;
  location: string;
  capacity: number;
  website?: string;
  socialMedia?: Record<string, string>;
  photos?: string[];
  events?: Array<{
    id: string;
    name: string;
    date: string;
  }>;
}

// Add custom CSS for animations
const customStyles = `
  @keyframes blob {
    0% {
      transform: translate(0px, 0px) scale(1);
    }
    33% {
      transform: translate(30px, -50px) scale(1.1);
    }
    66% {
      transform: translate(-20px, 20px) scale(0.9);
    }
    100% {
      transform: translate(0px, 0px) scale(1);
    }
  }
  
  .animate-blob {
    animation: blob 7s infinite;
  }
  
  .animation-delay-2000 {
    animation-delay: 2s;
  }
  
  .animation-delay-4000 {
    animation-delay: 4s;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.type = "text/css";
  styleSheet.innerText = customStyles;
  document.head.appendChild(styleSheet);
}

interface Venue {
  _id: string;
  venueName: string;
  venueAddress: string;
  city: string;
  country: string;
  venueDescription?: string;
  venueImage?: string;
  capacity?: number;
  eventsCount?: number;
  upcomingEvents?: Event[];
  website?: string;
  socialMedia?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
  };
}

export default function VenuesPage() {
  const { venuesData, venuesLoading, venuesError } = useData();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Helper function to ensure URLs have proper protocol
  const ensureProtocol = (url: string): string => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `https://${url}`;
  };
  
  // Memoize venues processing to prevent infinite re-renders
  const venues = useMemo(() => {
    if (!venuesData || !Array.isArray(venuesData)) return [];
    
    const venueMap = new Map<string, Venue>();
    
    venuesData.forEach((venueData: VenueData) => {
      // Use venue data directly
      const venueName = venueData.name;
      const venueAddress = venueData.location;
      
      if (venueName && venueAddress) {
        const venueKey = `${venueName}-${venueAddress}`;
        
        if (venueMap.has(venueKey)) {
          const existingVenue = venueMap.get(venueKey)!;
          existingVenue.eventsCount = (existingVenue.eventsCount || 0) + 1;
          
          // Add upcoming events from venue data
          if (venueData.events && venueData.events.length > 0) {
            existingVenue.upcomingEvents = existingVenue.upcomingEvents || [];
            venueData.events.forEach(event => {
              if (existingVenue.upcomingEvents!.length < 3) {
                existingVenue.upcomingEvents!.push({
                  _id: event.id,
                  eventTitle: event.name,
                  eventDate: event.date,
                  eventPromotionPhoto: '',
                  ticketInfo: []
                });
              }
            });
          }
        } else {
          const newVenue: Venue = {
            _id: venueData.id,
            venueName: venueName,
            venueAddress: venueAddress,
            city: '',
            country: '',
            venueDescription: '',
            venueImage: venueData.photos && venueData.photos.length > 0 ? venueData.photos[0] : '',
            capacity: venueData.capacity || 0,
            eventsCount: 1,
            upcomingEvents: [],
            website: venueData.website || '',
            socialMedia: {
              facebook: venueData.socialMedia?.facebook || '',
              twitter: venueData.socialMedia?.twitter || '',
              instagram: venueData.socialMedia?.instagram || '',
              linkedin: venueData.socialMedia?.linkedin || ''
            }
          };
          
          // Add upcoming events from venue data
          if (venueData.events && venueData.events.length > 0) {
            venueData.events.forEach(event => {
              if (newVenue.upcomingEvents!.length < 3) {
                newVenue.upcomingEvents!.push({
                  _id: event.id,
                  eventTitle: event.name,
                  eventDate: event.date,
                  eventPromotionPhoto: '',
                  ticketInfo: []
                });
              }
            });
          }
          
          venueMap.set(venueKey, newVenue);
        }
      }
    });
    
    return Array.from(venueMap.values());
  }, [venuesData]);
  
  // Get unique countries for filter
  const countries = useMemo(() => 
    [...new Set(venues.map(venue => venue.country).filter(Boolean))], 
    [venues]
  );
  
  // Filter venues based on search and filters
  const filteredVenues = useMemo(() => {
    let filtered = [...venues];
    
    if (searchTerm) {
      filtered = filtered.filter(venue => 
        venue.venueName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        venue.venueAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
        venue.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (venue.venueDescription || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (selectedCountry) {
      filtered = filtered.filter(venue => venue.country === selectedCountry);
    }
    
    return filtered;
  }, [searchTerm, selectedCountry, venues]);
  
  if (venuesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading venues...</p>
        </div>
      </div>
    );
  }

  if (venuesError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400">Error loading venues: {venuesError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
      {/* Compact Hero Section */}
      <section className="relative py-12 bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center text-white">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                Discover Venues
              </h1>
              <p className="text-lg md:text-xl mb-8 text-blue-100 max-w-2xl mx-auto leading-relaxed">
                Explore stunning venues that host amazing events
              </p>
            </motion.div>
            
            {/* Compact Search Bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="relative max-w-xl mx-auto"
            >
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search venues..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full py-3 px-5 pl-12 rounded-xl text-gray-800 bg-white/95 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-white/30 focus:bg-white shadow-lg text-base placeholder-gray-500"
                />
                <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Venues Section */}
      <section className="py-12 relative">
        <div className="container mx-auto px-4 relative z-10">
          {/* Compact Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center gap-3 mb-3">
              <div className="w-8 h-1 bg-gradient-to-r from-slate-400 to-slate-600 rounded-full"></div>
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                {filteredVenues.length} Venues Found
              </span>
              <div className="w-8 h-1 bg-gradient-to-r from-slate-600 to-slate-800 rounded-full"></div>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-3 text-slate-800 dark:text-white">
              Stunning Venues
            </h2>
            <p className="text-base text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
              Each venue carefully selected for unforgettable experiences.
            </p>
          </motion.div>
          
          {/* Enhanced Filter Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
            className="mb-8"
          >
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="group flex items-center gap-3 px-6 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 transition-all duration-300 hover:shadow-lg"
                >
                  <FaFilter className="text-slate-600 dark:text-slate-400 group-hover:rotate-12 transition-transform duration-300" />
                  <span className="font-medium text-slate-600 dark:text-slate-400">Filters</span>
                </button>
                
                {selectedCountry && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-full">
                    <span className="text-sm text-slate-700 dark:text-slate-300">Filtered by:</span>
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{selectedCountry}</span>
                    <button
                      onClick={() => setSelectedCountry("")}
                      className="text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            {/* Enhanced Filters */}
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-4 p-6 bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-800 dark:to-gray-900 rounded-2xl border border-slate-200 dark:border-slate-700"
              >
                <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Filter by Country</h3>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setSelectedCountry("")}
                    className={`px-6 py-3 rounded-full text-sm font-medium transition-all duration-300 ${
                      selectedCountry === ""
                        ? "bg-gradient-to-r from-slate-600 to-slate-800 text-white shadow-lg transform scale-105"
                        : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:border-slate-400 dark:hover:border-slate-500 hover:shadow-md"
                    }`}
                  >
                    All Countries
                  </button>
                  {countries.map((country) => (
                    <button
                      key={country}
                      onClick={() => setSelectedCountry(country)}
                      className={`px-6 py-3 rounded-full text-sm font-medium transition-all duration-300 ${
                        selectedCountry === country
                          ? "bg-gradient-to-r from-slate-600 to-slate-800 text-white shadow-lg transform scale-105"
                          : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:border-slate-400 dark:hover:border-slate-500 hover:shadow-md"
                      }`}
                    >
                      {country}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
          
          {/* Enhanced Venues Grid */}
          {filteredVenues.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="text-center py-20"
            >
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-r from-slate-100 to-gray-100 dark:from-slate-800 dark:to-gray-800 rounded-full flex items-center justify-center">
                <FaMapMarkerAlt className="text-3xl text-slate-600 dark:text-slate-400" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">No Venues Found</h3>
              <p className="text-gray-600 dark:text-gray-400 text-lg max-w-md mx-auto">
                We couldn&apos;t find any venues matching your criteria. Try adjusting your search or filters.
              </p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {filteredVenues.map((venue, index) => (
                <motion.div
                  key={venue._id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  whileHover={{ y: -8 }}
                  className="group"
                >
                  <div className="relative bg-white dark:bg-gray-800 rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-500 border border-gray-100 dark:border-gray-700">
                    {/* Venue Image with Overlay */}
                    <div className="relative h-64 overflow-hidden">
                      {venue.venueImage ? (
                        <Image
                          src={venue.venueImage}
                          alt={venue.venueName}
                          fill
                          className="object-cover group-hover:scale-110 transition-transform duration-700"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-600 via-slate-700 to-slate-800">
                          <FaMapMarkerAlt className="text-5xl text-white" />
                        </div>
                      )}
                      
                      {/* Gradient Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                      
                      {/* Event Count Badge */}
                      <div className="absolute top-4 right-4">
                        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm text-gray-900 dark:text-white px-3 py-1.5 rounded-full text-sm font-semibold shadow-lg">
                          {venue.eventsCount} {venue.eventsCount === 1 ? 'Event' : 'Events'}
                        </div>
                      </div>
                      
                      {/* Featured Badge */}
                      {venue.eventsCount && venue.eventsCount > 5 && (
                        <div className="absolute top-4 left-4">
                          <div className="bg-gradient-to-r from-slate-600 to-slate-800 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                            <FaStar className="text-xs" />
                            Popular
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Venue Info */}
                    <div className="p-6">
                      <div className="mb-4">
                        <h3 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white group-hover:text-slate-600 dark:group-hover:text-slate-400 transition-colors">
                          {venue.venueName}
                        </h3>
                        <div className="flex items-start text-gray-600 dark:text-gray-400 mb-2">
                          <FaMapMarkerAlt className="mr-2 mt-1 flex-shrink-0 text-slate-500" />
                          <span className="text-sm leading-relaxed">{venue.venueAddress}</span>
                        </div>
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-3">
                          {venue.city}, {venue.country}
                        </p>
                      </div>
                      
                      {venue.venueDescription && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2 leading-relaxed">
                          {venue.venueDescription}
                        </p>
                      )}
                      
                      
                      
                      {/* Upcoming Events Preview */}
                      {venue.upcomingEvents && venue.upcomingEvents.length > 0 && (
                        <div className="mb-6 p-4 bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-700 dark:to-gray-600 rounded-xl">
                          <h4 className="text-sm font-bold mb-3 text-gray-900 dark:text-white flex items-center">
                            <FaCalendarAlt className="mr-2 text-slate-500" />
                            Upcoming Events
                          </h4>
                          <div className="space-y-2">
                            {venue.upcomingEvents.slice(0, 2).map((event: Event) => (
                              <div key={event._id} className="flex items-center text-xs text-gray-700 dark:text-gray-300">
                                <div className="w-2 h-2 bg-slate-500 rounded-full mr-3"></div>
                                <span className="font-medium">{new Date(event.eventDate).toLocaleDateString()}</span>
                                <span className="ml-2 truncate">{event.eventTitle}</span>
                              </div>
                            ))}
                            {venue.upcomingEvents.length > 2 && (
                              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                                +{venue.upcomingEvents.length - 2} more events
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Website and Social Media Links */}
                      {(venue.website || venue.socialMedia) && (() => {
                        const linkCount = [
                          venue.website,
                          venue.socialMedia?.facebook,
                          venue.socialMedia?.twitter,
                          venue.socialMedia?.instagram,
                          venue.socialMedia?.linkedin
                        ].filter(Boolean).length;
                        
                        return (
                          <div className="mb-6 p-4 bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-700 dark:to-gray-600 rounded-xl">
                            <h4 className="text-sm font-bold mb-3 text-gray-900 dark:text-white flex items-center">
                              <FaGlobe className="mr-2 text-slate-500" />
                              Connect with Venue
                              <span className="ml-2 px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full text-xs font-medium">
                                {linkCount} link{linkCount !== 1 ? 's' : ''}
                              </span>
                            </h4>
                          <div className="flex flex-wrap gap-3">
                            {/* Website Link */}
                            {venue.website && (
                              <a
                                href={ensureProtocol(venue.website)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition-all duration-200 text-sm font-medium border border-gray-200 dark:border-gray-600 hover:border-slate-300 dark:hover:border-slate-500 hover:scale-105 hover:shadow-md"
                              >
                                <FaGlobe className="text-slate-500 text-xs" />
                                Website
                              </a>
                            )}
                            
                            {/* Social Media Links */}
                            {venue.socialMedia?.facebook && (
                              <a
                                href={ensureProtocol(venue.socialMedia.facebook)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900 transition-all duration-200 hover:scale-105 hover:shadow-md text-sm font-medium border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500"
                              >
                                <FaFacebook className="text-blue-600 text-xs" />
                                Facebook
                              </a>
                            )}
                            
                            {venue.socialMedia?.twitter && (
                              <a
                                href={ensureProtocol(venue.socialMedia.twitter)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-sky-50 dark:hover:bg-sky-900 transition-all duration-200 hover:scale-105 hover:shadow-md text-sm font-medium border border-gray-200 dark:border-gray-600 hover:border-sky-300 dark:hover:border-sky-500"
                              >
                                <FaTwitter className="text-sky-500 text-xs" />
                                Twitter
                              </a>
                            )}
                            
                            {venue.socialMedia?.instagram && (
                              <a
                                href={ensureProtocol(venue.socialMedia.instagram)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-pink-50 dark:hover:bg-pink-900 transition-all duration-200 hover:scale-105 hover:shadow-md text-sm font-medium border border-gray-200 dark:border-gray-600 hover:border-pink-300 dark:hover:border-pink-500"
                              >
                                <FaInstagram className="text-pink-500 text-xs" />
                                Instagram
                              </a>
                            )}
                            
                            {venue.socialMedia?.linkedin && (
                              <a
                                href={ensureProtocol(venue.socialMedia.linkedin)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900 transition-all duration-200 hover:scale-105 hover:shadow-md text-sm font-medium border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500"
                              >
                                <FaLinkedin className="text-blue-700 text-xs" />
                                LinkedIn
                              </a>
                            )}
                          </div>
                        </div>
                        );
                      })()}
                      
                      {/* View Events Button */}
                      <Link href={`/events?venue=${encodeURIComponent(venue.venueName)}`}>
                        <span className="group/btn inline-flex items-center justify-center w-full py-3 px-6 bg-gradient-to-r from-slate-600 to-slate-800 text-white rounded-xl hover:from-slate-700 hover:to-slate-900 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                          <FaCalendarAlt className="mr-2 group-hover/btn:scale-110 transition-transform duration-300" />
                          View Events at this Venue
                        </span>
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
