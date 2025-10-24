"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  FaCheckCircle,
  FaTicketAlt,
  FaDownload,
  FaQrcode,
  FaEnvelope,
  FaHome,
  FaArrowLeft
} from 'react-icons/fa';
import { useTranslation } from '@/hooks/useTranslation';
import { formatEventDateLocale } from '@/utils/common';

interface TicketData {
  _id: string;
  qrCode: {
    type: string;
    data: number[];
  };
  ics: {
    type: string;
    data: number[];
  };
  ticketFor: string;
  event: string;
  isSend: boolean;
  active: boolean;
  isRead: boolean;
  type: string;
  ticketInfo: {
    eventName: string;
    ticketName: string;
    quantity: string;
    price: number;
    currency: string;
    purchaseDate: string;
    paymentIntentId: string;
    email: string;
    merchantId: string;
    eventId: string;
    ticketId: string;
  };
  merchant: string;
  externalMerchantId: string;
  otp: string;
  createdAt: string;
  __v: number;
}

interface SimpleTicketData {
  ticketId: string;
  eventId: string;
  quantity: number;
  total: number;
  email: string;
}

interface SuccessPageProps {
  ticketData?: TicketData | SimpleTicketData;
  ticketId?: string;
}

// Type guard to check if ticketData is a full TicketData object
function isFullTicketData(ticketData: TicketData | SimpleTicketData | null): ticketData is TicketData {
  return ticketData !== null && 'ticketInfo' in ticketData;
}

// Helper function to safely get ticketInfo
function getTicketInfo(ticketData: TicketData | SimpleTicketData | null) {
  return isFullTicketData(ticketData) ? ticketData.ticketInfo : null;
}

export default function SuccessPage({ ticketData: propTicketData}: SuccessPageProps = {}) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const [ticketData, setTicketData] = useState<TicketData | SimpleTicketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);



  useEffect(() => {
    if (propTicketData) {
      // Use provided ticket data directly
      setTicketData(propTicketData);
      setLoading(false);
    }  else {
      setError(t('success.ticketNotFound'));
      setLoading(false);
    }
  }, [propTicketData, t]);



  const handleDownloadTicket = () => {
    try {
      // Create a printable ticket HTML
      const ticketHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Ticket - ${isFullTicketData(ticketData) ? ticketData.ticketInfo?.eventName : 'Event'}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .ticket { border: 2px solid #000; padding: 20px; max-width: 400px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 20px; }
            .qr-code { text-align: center; margin: 20px 0; }
            .details { margin: 10px 0; }
            .label { font-weight: bold; }
            .value { margin-left: 10px; }
            .ticket-code { font-family: monospace; font-size: 18px; font-weight: bold; color: #4f46e5; }
          </style>
        </head>
        <body>
          <div class="ticket">
            <div class="header">
              <h1>${isFullTicketData(ticketData) ? ticketData.ticketInfo?.eventName : 'Event'}</h1>
              <h2>${isFullTicketData(ticketData) ? ticketData.ticketInfo?.ticketName : 'Ticket'}</h2>
            </div>

            <div class="qr-code">
              ${isFullTicketData(ticketData) && ticketData?.qrCode && ticketData?.qrCode.data && ticketData?.qrCode.data.length > 0 ?
                (() => {
                  try {
                    const dataString = String.fromCharCode(...(ticketData as TicketData).qrCode.data);
                    let dataUrl = '';

                    if (dataString.startsWith('data:image/')) {
                      // It's already a complete data URL
                      dataUrl = dataString;
                    } else {
                      // Convert to base64 and create data URL
                      const uint8Array = new Uint8Array(ticketData.qrCode.data);
                      let binaryString = '';
                      for (let i = 0; i < uint8Array.length; i++) {
                        binaryString += String.fromCharCode(uint8Array[i]);
                      }
                      const base64String = btoa(binaryString);
                      dataUrl = `data:image/png;base64,${base64String}`;
                    }

                    return `<img src="${dataUrl}" width="200" height="200" style="border: 2px solid #ccc; border-radius: 8px; padding: 10px; background: white;" />`;
                  } catch {
                    return `<div style="font-size: 32px; color: #4f46e5; font-family: monospace; font-weight: bold; padding: 20px; border: 2px solid #4f46e5; border-radius: 8px; display: inline-block;">${ticketData?.otp}</div>`;
                  }
                })() :
                `<div style="font-size: 32px; color: #4f46e5; font-family: monospace; font-weight: bold; padding: 20px; border: 2px solid #4f46e5; border-radius: 8px; display: inline-block;">${isFullTicketData(ticketData) ? ticketData.otp : 'N/A'}</div>`
              }
            </div>

            <div class="details">
              <div><span class="label">${t('success.ticketCode')}:</span><span class="value ticket-code">${isFullTicketData(ticketData) ? ticketData.otp : 'N/A'}</span></div>
              <div><span class="label">${t('success.quantity')}:</span><span class="value">${getTicketInfo(ticketData)?.quantity || 'N/A'}</span></div>
              <div><span class="label">${t('success.total')}:</span><span class="value">${getTicketInfo(ticketData)?.price || 'N/A'} ${getTicketInfo(ticketData)?.currency?.toUpperCase() || ''}</span></div>
              <div><span class="label">${t('success.email')}:</span><span class="value">${getTicketInfo(ticketData)?.email || 'N/A'}</span></div>
              <div><span class="label">${t('success.purchaseDate')}:</span><span class="value">${formatEventDateLocale(getTicketInfo(ticketData)?.purchaseDate || (ticketData as TicketData)?.createdAt || '', undefined, locale)}</span></div>
            </div>

            <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #666;">
              ${t('success.showAtVenue')}
            </div>
          </div>
        </body>
        </html>
      `;

      // Create and download the file
      const blob = new Blob([ticketHTML], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ticket-${getTicketInfo(ticketData)?.eventName?.replace(/\s+/g, '-') || 'event'}-${isFullTicketData(ticketData) ? ticketData.otp : 'ticket'}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading ticket:', error);
      alert('Failed to download ticket. Please try again.');
    }
  };



  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-lg" style={{ color: 'var(--foreground)' }}>{t('success.loading')}</p>
        </div>
      </div>
    );
  }

  if (error || !ticketData) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold mb-4" style={{ color: 'var(--foreground)' }}>{t('success.error')}</h1>
          <p className="mb-6" style={{ color: 'var(--foreground)' }}>{error || t('success.ticketNotFound')}</p>
          <Link href="/events">
            <span className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors">
{t('success.browseEvents')}
            </span>
          </Link>
        </div>
      </div>
    );
  }



  return (
    <div className="min-h-screen" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white py-8">
        <div className="container mx-auto px-4 text-center">
          <FaCheckCircle className="text-6xl mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-2">{t('success.title')}</h1>
          <p className="text-lg opacity-90">{t('success.subtitle')}</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Ticket Card */}
        <div className="max-w-2xl mx-auto">
          <div
            className="rounded-2xl overflow-hidden shadow-2xl border-2 border-green-200"
            style={{ background: 'var(--surface)' }}
          >
            {/* Ticket Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{getTicketInfo(ticketData)?.eventName || 'Event'}</h2>
                  <p className="opacity-90">{getTicketInfo(ticketData)?.ticketName || 'Ticket'}</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold">
                    {getTicketInfo(ticketData)?.price || 'N/A'} {getTicketInfo(ticketData)?.currency?.toUpperCase() || ''}
                  </div>
                  <div className="text-sm opacity-90">{t('success.totalPaid')}</div>
                </div>
              </div>
            </div>

            {/* Event Image - Remove for now since we don't have event data */}
            <div className="relative h-48 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <div className="text-center text-white">
                <FaTicketAlt className="text-6xl mx-auto mb-4 opacity-80" />
                <h3 className="text-xl font-bold">{getTicketInfo(ticketData)?.eventName || 'Event'}</h3>
                <p className="opacity-90">{t('success.ticketConfirmed')}</p>
              </div>
            </div>

            {/* Ticket Details */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <FaTicketAlt className="text-indigo-600" />
{t('success.ticketInformation')}
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="opacity-70">{t('success.ticketName')}:</span>
                      <span className="font-medium">{getTicketInfo(ticketData)?.ticketName || 'Ticket'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-70">{t('success.quantity')}:</span>
                      <span>{getTicketInfo(ticketData)?.quantity || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-70">{t('success.status')}:</span>
                      <span className="text-green-600 font-medium capitalize">Active</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-70">{t('success.purchaseDate')}:</span>
                      <span>{formatEventDateLocale(getTicketInfo(ticketData)?.purchaseDate || (ticketData as TicketData)?.createdAt || '', undefined, locale)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-70">{t('success.ticketCode')}:</span>
                      <span className="font-mono font-bold text-indigo-600 text-lg">{isFullTicketData(ticketData) ? ticketData.otp : 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <FaEnvelope className="text-indigo-600" />
{t('success.contactInformation')}
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="opacity-70">{t('success.email')}:</span>
                      <span>{getTicketInfo(ticketData)?.email || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* QR Code Section */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 text-center mb-6">
                {isFullTicketData(ticketData) && ticketData.qrCode && ticketData.qrCode.data && ticketData.qrCode.data.length > 0 ? (
                  <div>
                    {(() => {
                      // Convert Buffer data to data URL
                      let dataUrl = '';
                      try {
                        // Convert the array of bytes to a string
                        const dataString = String.fromCharCode(...(ticketData as TicketData).qrCode.data);

                        if (dataString.startsWith('data:image/')) {
                          // It's already a complete data URL
                          dataUrl = dataString;
                          console.log('Using complete data URL');
                        } else {
                          // Convert to base64 and create data URL
                          const uint8Array = new Uint8Array(ticketData.qrCode.data);
                          let binaryString = '';
                          for (let i = 0; i < uint8Array.length; i++) {
                            binaryString += String.fromCharCode(uint8Array[i]);
                          }
                          const base64String = btoa(binaryString);
                          dataUrl = `data:image/png;base64,${base64String}`;
                          console.log('Created data URL from base64');
                        }
                      } catch (error) {
                        console.error('Data URL conversion error:', error);
                        dataUrl = '';
                      }

                      return dataUrl ? (
                        <Image
                          src={dataUrl}
                          alt="QR Code"
                          width={256}
                          height={256}
                          className="mx-auto mb-4 border-2 border-gray-300 rounded-lg bg-white p-4"
                          onError={(e) => {
                            console.error('QR Code image failed to load:', e);
                            console.error('Data URL preview:', dataUrl.substring(0, 100));
                            e.currentTarget.style.display = 'none';
                            const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                            if (nextElement) nextElement.style.display = 'block';
                          }}
                        />
                      ) : null;
                    })()}
                    <div style={{ display: 'none' }}>
                      <FaQrcode className="text-6xl text-indigo-600 mx-auto mb-4" />
                      <p className="text-lg font-bold text-indigo-600 font-mono">{ticketData.otp}</p>
                      <p className="text-sm opacity-70 mt-2">{t('success.ticketCodeEntry')}</p>
                    </div>
                    <p className="text-sm opacity-70">{t('success.qrCode')}</p>
                    <p className="text-xs opacity-50 mt-1">{t('success.qrCodeHint')}</p>
                  </div>
                ) : (
                  <div>
                    <FaQrcode className="text-6xl text-indigo-600 mx-auto mb-4" />
                    <p className="text-lg font-bold text-indigo-600 font-mono">{isFullTicketData(ticketData) ? ticketData.otp : 'N/A'}</p>
                    <p className="text-sm opacity-70 mt-2">{t('success.ticketCodeEntry')}</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleDownloadTicket}
                  className="flex-1 bg-indigo-600 text-white px-4 py-3 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                >
                  <FaDownload />
{t('success.downloadTicket')}
                </button>
              </div>
            </div>
          </div>

          {/* Important Information */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h3 className="font-semibold mb-2 text-blue-800 dark:text-blue-200">{t('success.importantInfo')}</h3>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>• {t('success.arriveEarly')}</li>
              <li>• {t('success.bringId')}</li>
              <li>• {t('success.contactOrganizer')}</li>
              <li>• {t('success.nonRefundable')}</li>
            </ul>
          </div>

          {/* Navigation */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/events">
              <span className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors">
                <FaHome />
{t('success.browseMoreEvents')}
              </span>
            </Link>
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border transition-colors"
              style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
            >
              <FaArrowLeft />
{t('success.goBack')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
