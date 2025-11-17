'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/services/apiClient';
import TicketLoginModal from '@/components/TicketLoginModal';
import { useTranslation } from '@/hooks/useTranslation';

interface Ticket {
  _id: string;
  event: {
    _id: string;
    eventTitle: string;
    eventDate: string;
    eventLocationAddress: string;
    active: boolean;
    otherInfo?: any;
  };
  type: string;
  otp: string;
  ticketInfo: any;
  createdAt: string;
  active: boolean;
}

interface TicketDetail extends Ticket {
  qrCode: string;
  ics: string;
}

export default function MyTicketsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [downloadingTicketId, setDownloadingTicketId] = useState<string | null>(null);
  const [tokenExpiryWarning, setTokenExpiryWarning] = useState(false);
  const [downloadNotification, setDownloadNotification] = useState(false);
  const expiryCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check token expiry (only on this page)
  useEffect(() => {
    const checkTokenExpiry = () => {
      const token = localStorage.getItem('guest_token');
      if (!token) {
        setShowLoginModal(true);
        return;
      }

      try {
        // Decode JWT to check expiry
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expiryTime = payload.exp * 1000; // Convert to milliseconds
        const now = Date.now();
        const timeRemaining = expiryTime - now;

        // Show warning if less than 2 minutes remaining
        if (timeRemaining < 2 * 60 * 1000 && timeRemaining > 0) {
          setTokenExpiryWarning(true);
        }

        // If expired, clear token and show login
        if (timeRemaining <= 0) {
          localStorage.removeItem('guest_token');
          setShowLoginModal(true);
          setTokenExpiryWarning(false);
        }
      } catch (err) {
        // Invalid token
        localStorage.removeItem('guest_token');
        setShowLoginModal(true);
      }
    };

    // Check immediately
    checkTokenExpiry();

    // Check every 30 seconds
    expiryCheckIntervalRef.current = setInterval(checkTokenExpiry, 30000);

    // Cleanup on unmount
    return () => {
      if (expiryCheckIntervalRef.current) {
        clearInterval(expiryCheckIntervalRef.current);
      }
    };
  }, []);

  // Fetch tickets
  useEffect(() => {
    const fetchTickets = async () => {
      const token = localStorage.getItem('guest_token');
      if (!token) {
        setShowLoginModal(true);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await api.get<{ success: boolean; data: Ticket[] }>('/guest/tickets', {
          year: selectedYear
        });

        if (response.success) {
          setTickets(response.data || []);
          setError('');
        }
      } catch (err: any) {
        if (err.response?.status === 401) {
          localStorage.removeItem('guest_token');
          setShowLoginModal(true);
        } else {
          setError(err.response?.data?.message || t('myTickets.errorLoading'));
        }
      } finally {
        setLoading(false);
      }
    };

    if (!showLoginModal) {
      fetchTickets();
    }
  }, [selectedYear, showLoginModal]);

  const handleDownload = async (ticketId: string) => {
    setDownloadingTicketId(ticketId);

    // Show notification that files will download separately
    setDownloadNotification(true);
    setTimeout(() => setDownloadNotification(false), 5000); // Auto-dismiss after 5 seconds

    // Delay download by 1.5 seconds to allow user to see the notification
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      const response = await api.get<{ success: boolean; data: TicketDetail }>(`/guest/ticket/${ticketId}`);

      if (response.success && response.data) {
        const ticket = response.data;

        // Download QR Code
        if (ticket.qrCode) {
          let base64Data: string;

          // Check if QR code is double-encoded (contains another data URI inside)
          if (ticket.qrCode.startsWith('data:image/png;base64,')) {
            const outerBase64 = ticket.qrCode.split(',')[1];
            // Decode the outer base64 to get the inner data URI
            const decoded = atob(outerBase64);

            // Check if decoded string is another data URI
            if (decoded.startsWith('data:image/png;base64,')) {
              // Extract the actual image base64 from the inner data URI
              base64Data = decoded.split(',')[1];
            } else {
              // Not double-encoded, use the outer base64 directly
              base64Data = outerBase64;
            }
          } else {
            // Already just base64 data
            base64Data = ticket.qrCode;
          }

          // Convert base64 to blob
          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const qrBlob = new Blob([byteArray], { type: 'image/png' });
          const qrUrl = URL.createObjectURL(qrBlob);
          const qrLink = document.createElement('a');
          qrLink.href = qrUrl;
          qrLink.download = `ticket-${ticket.otp}-qrcode.png`;
          document.body.appendChild(qrLink);
          qrLink.click();
          document.body.removeChild(qrLink);
          URL.revokeObjectURL(qrUrl);
        }

        // Download ICS file
        if (ticket.ics) {
          const icsBlob = new Blob([ticket.ics], { type: 'text/calendar' });
          const icsUrl = URL.createObjectURL(icsBlob);
          const icsLink = document.createElement('a');
          icsLink.href = icsUrl;
          icsLink.download = `ticket-${ticket.otp}-event.ics`;
          document.body.appendChild(icsLink);
          icsLink.click();
          document.body.removeChild(icsLink);
          URL.revokeObjectURL(icsUrl);
        }
      }
    } catch (err: any) {
      alert(err.response?.data?.message || t('myTickets.errorDownloading'));
    } finally {
      setDownloadingTicketId(null);
    }
  };


  const getAvailableYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear; i >= currentYear - 5; i--) {
      years.push(i);
    }
    return years;
  };

  if (showLoginModal) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <TicketLoginModal
          isOpen={showLoginModal}
          onClose={() => {
            const token = localStorage.getItem('guest_token');
            if (token) {
              setShowLoginModal(false);
            } else {
              router.push('/');
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-20 px-4 sm:px-6 lg:px-8" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold mb-4">{t('myTickets.title')}</h1>

          {/* Year Filter */}
          <div className="flex items-center gap-4 mb-4">
            <label htmlFor="year" className="text-sm font-medium">
              {t('myTickets.year')}
            </label>
            <select
              id="year"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              style={{
                background: 'var(--surface)',
                borderColor: 'var(--border)',
                color: 'var(--foreground)'
              }}
            >
              {getAvailableYears().map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          {/* Token Expiry Warning */}
          {tokenExpiryWarning && (
            <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 mb-4">
              <p className="font-medium">{t('myTickets.tokenExpiryWarning')}</p>
            </div>
          )}

          {/* Download Notification */}
          {downloadNotification && (
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 mb-4 border border-blue-200 dark:border-blue-800">
              <div className="flex items-start">
                <svg className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-medium">{t('myTickets.downloadInfo')}</p>
              </div>
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 mb-4">
            {error}
          </div>
        )}

        {/* Tickets List */}
        {!loading && !error && (
          <>
            {tickets.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-lg opacity-70 mb-4">{t('myTickets.noTickets', { year: selectedYear })}</p>
                <p className="text-sm opacity-50">{t('myTickets.tryDifferentYear')}</p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {tickets.map((ticket) => {
                  const eventDate = new Date(ticket.event.eventDate);
                  const isPast = eventDate < new Date();

                  return (
                    <div
                      key={ticket._id}
                      className="border rounded-lg p-6 hover:shadow-lg transition-shadow"
                      style={{
                        background: 'var(--surface)',
                        borderColor: 'var(--border)'
                      }}
                    >
                      <h3 className="text-xl font-semibold mb-2">{ticket.event.eventTitle}</h3>

                      <div className="space-y-3 mb-4">
                        <p className="text-sm opacity-70">
                          <strong>{t('myTickets.date')}</strong> {eventDate.toLocaleDateString()} {eventDate.toLocaleTimeString()}
                        </p>
                        <p className="text-sm opacity-70">
                          <strong>{t('myTickets.location')}</strong> {ticket.event.eventLocationAddress || t('myTickets.notAvailable')}
                        </p>

                        {/* Ticket Code - Large and Readable */}
                        <div className="mt-4 p-4 rounded-lg" style={{ background: 'var(--background)', border: '2px solid var(--border)' }}>
                          <p className="text-xs font-medium mb-2 opacity-70">{t('myTickets.ticketCode')}</p>
                          <p className="text-2xl font-bold tracking-wider font-mono" style={{ color: 'var(--foreground)' }}>
                            {ticket.otp}
                          </p>
                        </div>

                        {/* Ticket Type - Readable */}
                        <div className="mt-2">
                          <p className="text-sm opacity-70 mb-1">
                            <strong>{t('myTickets.type')}</strong>
                          </p>
                          <p className="text-base font-semibold capitalize">
                            {ticket.type}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-4">
                        <div className="flex gap-2">
                          {isPast ? (
                            <span className="px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400">
                              {t('myTickets.past')}
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                              {t('myTickets.upcoming')}
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => handleDownload(ticket._id)}
                          disabled={downloadingTicketId === ticket._id}
                          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            downloadingTicketId === ticket._id
                              ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                              : 'bg-indigo-600 text-white hover:bg-indigo-700'
                          }`}
                        >
                          {downloadingTicketId === ticket._id ? t('myTickets.downloading') : t('myTickets.download')}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

