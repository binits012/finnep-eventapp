"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { 
  FaCheckCircle, 
  FaTicketAlt, 
  FaCalendarAlt, 
  FaMapMarkerAlt, 
  FaDownload,
  FaShare,
  FaQrcode,
  FaEnvelope,
  FaHome,
  FaArrowLeft
} from 'react-icons/fa';
import { getCurrencySymbol } from '@/utils/currency';

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

interface SuccessPageProps {
  ticketData?: any;
  ticketId?: string;
}

export default function SuccessPage({ ticketData: propTicketData}: SuccessPageProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [ticketData, setTicketData] = useState<TicketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

 

  useEffect(() => {
    if (propTicketData) {
      // Use provided ticket data directly
      setTicketData(propTicketData);
      setLoading(false);
    }  else {
      setError('No ticket information found');
      setLoading(false);
    }
  }, [propTicketData]);
 


  const handleDownloadTicket = () => {
    try {
      // Create a printable ticket HTML
      const ticketHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Ticket - ${ticketData?.ticketInfo?.eventName ?? 'Event'}</title>
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
              <h1>${ticketData?.ticketInfo?.eventName}</h1>
              <h2>${ticketData?.ticketInfo?.ticketName}</h2>
            </div>
            
            <div class="qr-code">
              ${ticketData?.qrCode && ticketData?.qrCode.data && ticketData?.qrCode.data.length > 0 ? 
                (() => {
                  try {
                    const dataString = String.fromCharCode(...ticketData.qrCode.data);
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
                  } catch (error) {
                    return `<div style="font-size: 32px; color: #4f46e5; font-family: monospace; font-weight: bold; padding: 20px; border: 2px solid #4f46e5; border-radius: 8px; display: inline-block;">${ticketData?.otp}</div>`;
                  }
                })() :
                `<div style="font-size: 32px; color: #4f46e5; font-family: monospace; font-weight: bold; padding: 20px; border: 2px solid #4f46e5; border-radius: 8px; display: inline-block;">${ticketData?.otp}</div>`
              }
            </div>
            
            <div class="details">
              <div><span class="label">Ticket Code:</span><span class="value ticket-code">${ticketData?.otp}</span></div>
              <div><span class="label">Quantity:</span><span class="value">${ticketData?.ticketInfo?.quantity}</span></div>
              <div><span class="label">Price:</span><span class="value">${ticketData?.ticketInfo?.price} ${ticketData?.ticketInfo?.currency?.toUpperCase()}</span></div>
              <div><span class="label">Email:</span><span class="value">${ticketData?.ticketInfo?.email}</span></div>
              <div><span class="label">Purchase Date:</span><span class="value">${new Date(ticketData?.ticketInfo?.purchaseDate || ticketData?.createdAt || '').toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</span></div>
            </div>
            
            <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #666;">
              Show this ticket at the venue entrance
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
      a.download = `ticket-${ticketData?.ticketInfo?.eventName?.replace(/\s+/g, '-')}-${ticketData?.otp}.html`;
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
          <p className="text-lg" style={{ color: 'var(--foreground)' }}>Loading your ticket...</p>
        </div>
      </div>
    );
  }

  if (error || !ticketData) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold mb-4" style={{ color: 'var(--foreground)' }}>Oops!</h1>
          <p className="mb-6" style={{ color: 'var(--foreground)' }}>{error || 'Ticket not found'}</p>
          <Link href="/events">
            <span className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors">
              Browse Events
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
          <h1 className="text-3xl font-bold mb-2">Payment Successful!</h1>
          <p className="text-lg opacity-90">Your ticket has been confirmed</p>
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
                  <h2 className="text-2xl font-bold">{ticketData.ticketInfo?.eventName}</h2>
                  <p className="opacity-90">{ticketData.ticketInfo?.ticketName}</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold">
                    {ticketData.ticketInfo?.price} {ticketData.ticketInfo?.currency?.toUpperCase()}
                  </div>
                  <div className="text-sm opacity-90">Total Paid</div>
                </div>
              </div>
            </div>

            {/* Event Image - Remove for now since we don't have event data */}
            <div className="relative h-48 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <div className="text-center text-white">
                <FaTicketAlt className="text-6xl mx-auto mb-4 opacity-80" />
                <h3 className="text-xl font-bold">{ticketData.ticketInfo?.eventName}</h3>
                <p className="opacity-90">Your ticket is confirmed</p>
              </div>
            </div>

            {/* Ticket Details */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <FaTicketAlt className="text-indigo-600" />
                    Ticket Information
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="opacity-70">Ticket Name:</span>
                      <span className="font-medium">{ticketData.ticketInfo?.ticketName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-70">Quantity:</span>
                      <span>{ticketData.ticketInfo?.quantity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-70">Status:</span>
                      <span className="text-green-600 font-medium capitalize">Active</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-70">Purchase Date:</span>
                      <span>{new Date(ticketData.ticketInfo?.purchaseDate || ticketData.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-70">Ticket Code:</span>
                      <span className="font-mono font-bold text-indigo-600 text-lg">{ticketData.otp}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <FaEnvelope className="text-indigo-600" />
                    Contact Information
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="opacity-70">Email:</span>
                      <span>{ticketData.ticketInfo?.email}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* QR Code Section */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 text-center mb-6">
                {ticketData.qrCode && ticketData.qrCode.data && ticketData.qrCode.data.length > 0 ? (
                  <div>
                    {(() => {
                      // Convert Buffer data to data URL
                      let dataUrl = '';
                      try {
                        // Convert the array of bytes to a string
                        const dataString = String.fromCharCode(...ticketData.qrCode.data);
                        
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
                        <img 
                          src={dataUrl}
                          alt="QR Code"
                          className="mx-auto mb-4 w-64 h-64 border-2 border-gray-300 rounded-lg bg-white p-4"
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
                      <p className="text-sm opacity-70 mt-2">Use this ticket code for entry</p>
                    </div>
                    <p className="text-sm opacity-70">QR Code for entry</p>
                    <p className="text-xs opacity-50 mt-1">Show this QR code at the venue entrance</p>
                  </div>
                ) : (
                  <div>
                    <FaQrcode className="text-6xl text-indigo-600 mx-auto mb-4" />
                    <p className="text-lg font-bold text-indigo-600 font-mono">{ticketData.otp}</p>
                    <p className="text-sm opacity-70 mt-2">Use this ticket code for entry</p>
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
                  Download Ticket
                </button>
              </div>
            </div>
          </div>

          {/* Important Information */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h3 className="font-semibold mb-2 text-blue-800 dark:text-blue-200">Important Information</h3>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>• Please arrive 15 minutes before the event starts</li>
              <li>• Bring a valid ID and this ticket (digital or printed)</li>
              <li>• Contact the organizer if you have any questions</li>
              <li>• Tickets are non-refundable unless otherwise stated</li>
            </ul>
          </div>

          {/* Navigation */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/events">
              <span className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors">
                <FaHome />
                Browse More Events
              </span>
            </Link>
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border transition-colors"
              style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
            >
              <FaArrowLeft />
              Go Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
