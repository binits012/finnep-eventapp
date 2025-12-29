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
  FaHome,
  FaArrowLeft
} from 'react-icons/fa';
import { useTranslation } from '@/hooks/useTranslation';
import { formatEventDateLocale } from '@/utils/common';
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
    // Order information fields
    basePrice?: number;
    serviceFee?: number;
    vatRate?: number;
    vatAmount?: number;
    entertainmentTax?: number;
    entertainmentTaxAmount?: number;
    serviceTax?: number;
    serviceTaxAmount?: number;
    orderFee?: number;
    orderFeeServiceTax?: number;
    country?: string;
    fullName?: string;
    seatTickets?: Array<{ placeId: string; ticketId: string | null; ticketName: string }>;
    placeIds?: string[];
    totalBasePrice?: number;
    totalServiceFee?: number;
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
      const ticketInfo = getTicketInfo(ticketData);
      if (!ticketInfo) {
        alert('Ticket information not available');
        return;
      }

      // Extract order information
      const currency = ticketInfo.currency?.toUpperCase() || 'EUR';
      const currencySymbol = getCurrencySymbol(ticketInfo.country || 'Finland') || currency;
      const quantity = parseInt(ticketInfo.quantity || '1', 10);

      // Helper to safely parse values
      const parseValue = (value: string | number | null | undefined): number => {
        if (typeof value === 'number') return value;
        if (value === null || value === undefined) return 0;
        const parsed = parseFloat(String(value));
        return isNaN(parsed) ? 0 : parsed;
      };

      // Use pre-calculated totals directly (these were calculated correctly before payment)
      // These values come from summaryTotals which correctly sums individual seat prices
      const totalBasePrice = parseValue(ticketInfo.totalBasePrice) || (parseValue(ticketInfo.basePrice) * quantity);
      const totalServiceFee = parseValue(ticketInfo.totalServiceFee) || (parseValue(ticketInfo.serviceFee) * quantity);

      // Tax amounts are already totals (pre-calculated before payment)
      const vatRate = parseValue(ticketInfo.vatRate);
      const vatAmount = parseValue(ticketInfo.vatAmount);
      const entertainmentTax = parseValue(ticketInfo.entertainmentTax);
      const entertainmentTaxAmount = parseValue(ticketInfo.entertainmentTaxAmount);
      const serviceTax = parseValue(ticketInfo.serviceTax);
      const serviceTaxAmount = parseValue(ticketInfo.serviceTaxAmount);
      const orderFee = parseValue(ticketInfo.orderFee);
      const orderFeeServiceTax = parseValue(ticketInfo.orderFeeServiceTax);

      // Unify VAT and Entertainment Tax - they're the same, use whichever is available (if one is 0/null, use the other)
      const unifiedVatAmount = (vatAmount && vatAmount > 0) ? vatAmount : (entertainmentTaxAmount || 0);
      const unifiedVatRate = (vatRate && vatRate > 0) ? vatRate : (entertainmentTax || 0);

      // Round to 3 decimals (use round, not floor, to handle floating-point representation errors)
      const subtotal = Math.round((totalBasePrice + totalServiceFee) * 1000) / 1000;
      const totalTaxes = Math.round((unifiedVatAmount + serviceTaxAmount + orderFeeServiceTax) * 1000) / 1000;
      // Always calculate from components to ensure correct precision (don't use stored ticketInfo.price which may have been truncated)
      const totalAmount = Math.round((subtotal + totalTaxes + orderFee) * 1000) / 1000;

      // Format currency helper - safely handle strings, null, undefined
      // Round to 3 decimal places (use round to handle floating-point errors)
      const formatCurrency = (amount: number | string | null | undefined) => {
        if (amount === null || amount === undefined) return '0.000';
        const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
        if (isNaN(numAmount)) return '0.000';
        // Round to 3 decimal places (use round, not floor, to handle floating-point errors)
        const rounded = Math.round(numAmount * 1000) / 1000;
        return rounded.toFixed(3);
      };

      // Build seat information if available
      let seatInfoHTML = '';
      if (ticketInfo.seatTickets && Array.isArray(ticketInfo.seatTickets) && ticketInfo.seatTickets.length > 0) {
        seatInfoHTML = `
          <div class="order-section">
            <h3>Selected Seats</h3>
            <div class="seat-list">
              ${ticketInfo.seatTickets.map((seat: { ticketName?: string; placeId?: string }, index: number) => `
                <div class="seat-item">
                  ${index + 1}. ${seat.ticketName || `Seat ${seat.placeId || index + 1}`}
                </div>
              `).join('')}
            </div>
          </div>
        `;
      } else if (ticketInfo.placeIds && Array.isArray(ticketInfo.placeIds) && ticketInfo.placeIds.length > 0) {
        seatInfoHTML = `
          <div class="order-section">
            <h3>Selected Seats</h3>
            <div class="seat-list">
              ${ticketInfo.placeIds.map((placeId: string, index: number) => `
                <div class="seat-item">
                  ${index + 1}. Seat ID: ${placeId}
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }

      // Build QR code HTML
      let qrCodeHTML = '';
      if (isFullTicketData(ticketData) && ticketData?.qrCode && ticketData?.qrCode.data && ticketData?.qrCode.data.length > 0) {
        try {
          const dataString = String.fromCharCode(...(ticketData as TicketData).qrCode.data);
          let dataUrl = '';

          if (dataString.startsWith('data:image/')) {
            dataUrl = dataString;
          } else {
            const uint8Array = new Uint8Array(ticketData.qrCode.data);
            let binaryString = '';
            for (let i = 0; i < uint8Array.length; i++) {
              binaryString += String.fromCharCode(uint8Array[i]);
            }
            const base64String = btoa(binaryString);
            dataUrl = `data:image/png;base64,${base64String}`;
          }

          qrCodeHTML = `<img src="${dataUrl}" width="200" height="200" style="border: 2px solid #ccc; border-radius: 8px; padding: 10px; background: white;" />`;
        } catch {
          qrCodeHTML = `<div style="font-size: 32px; color: #4f46e5; font-family: monospace; font-weight: bold; padding: 20px; border: 2px solid #4f46e5; border-radius: 8px; display: inline-block;">${ticketData?.otp}</div>`;
        }
      } else {
        qrCodeHTML = `<div style="font-size: 32px; color: #4f46e5; font-family: monospace; font-weight: bold; padding: 20px; border: 2px solid #4f46e5; border-radius: 8px; display: inline-block;">${isFullTicketData(ticketData) ? ticketData.otp : 'N/A'}</div>`;
      }

      // Create a comprehensive printable ticket HTML with order information
      const ticketHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Ticket & Order - ${ticketInfo.eventName || 'Event'}</title>
          <style>
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
            body {
              font-family: Arial, sans-serif;
              margin: 20px;
              background: #f5f5f5;
            }
            .container {
              max-width: 800px;
              margin: 0 auto;
              background: white;
              padding: 30px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 3px solid #4f46e5;
              padding-bottom: 20px;
            }
            .header h1 {
              margin: 0 0 10px 0;
              color: #1f2937;
              font-size: 28px;
            }
            .header h2 {
              margin: 0;
              color: #6b7280;
              font-size: 18px;
              font-weight: normal;
            }
            .section {
              margin: 25px 0;
              padding: 20px;
              background: #f9fafb;
              border-radius: 8px;
              border-left: 4px solid #4f46e5;
            }
            .section h3 {
              margin: 0 0 15px 0;
              color: #1f2937;
              font-size: 18px;
              border-bottom: 1px solid #e5e7eb;
              padding-bottom: 10px;
            }
            .qr-code {
              text-align: center;
              margin: 30px 0;
              padding: 20px;
              background: white;
              border-radius: 8px;
            }
            .details {
              margin: 15px 0;
            }
            .detail-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              border-bottom: 1px solid #e5e7eb;
            }
            .detail-row:last-child {
              border-bottom: none;
            }
            .label {
              font-weight: 600;
              color: #374151;
            }
            .value {
              color: #1f2937;
              text-align: right;
            }
            .ticket-code {
              font-family: monospace;
              font-size: 20px;
              font-weight: bold;
              color: #4f46e5;
            }
            .order-section {
              margin: 20px 0;
            }
            .pricing-table {
              width: 100%;
              border-collapse: collapse;
              margin: 15px 0;
            }
            .pricing-table td {
              padding: 8px 0;
              border-bottom: 1px solid #e5e7eb;
            }
            .pricing-table .label-col {
              text-align: left;
              color: #6b7280;
            }
            .pricing-table .value-col {
              text-align: right;
              font-weight: 500;
              color: #1f2937;
            }
            .pricing-table .total-row {
              border-top: 2px solid #4f46e5;
              border-bottom: 2px solid #4f46e5;
              font-weight: bold;
              font-size: 16px;
            }
            .pricing-table .total-row td {
              padding: 12px 0;
            }
            .seat-list {
              margin: 10px 0;
            }
            .seat-item {
              padding: 6px 0;
              color: #374151;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 2px solid #e5e7eb;
              color: #6b7280;
              font-size: 12px;
            }
            .order-number {
              background: #f3f4f6;
              padding: 10px;
              border-radius: 6px;
              font-family: monospace;
              font-size: 14px;
              margin: 10px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${ticketInfo.eventName || 'Event'}</h1>
              <h2>${ticketInfo.ticketName || 'Ticket'}</h2>
            </div>

            <!-- Order Information -->
            <div class="section">
              <h3>Order Information</h3>
              <div class="details">
                <div class="detail-row">
                  <span class="label">Order Number:</span>
                  <span class="value order-number">${ticketInfo.paymentIntentId || (isFullTicketData(ticketData) ? ticketData._id : 'N/A') || 'N/A'}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Purchase Date:</span>
                  <span class="value">${formatEventDateLocale(ticketInfo.purchaseDate || (ticketData as TicketData)?.createdAt || '', undefined, locale)}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Email:</span>
                  <span class="value">${ticketInfo.email || 'N/A'}</span>
                </div>
                ${ticketInfo.fullName ? `
                <div class="detail-row">
                  <span class="label">Full Name:</span>
                  <span class="value">${ticketInfo.fullName}</span>
                </div>
                ` : ''}
              </div>
            </div>

            ${seatInfoHTML}

            <!-- Pricing Breakdown -->
            <div class="section">
              <h3>Pricing Breakdown</h3>
              <table class="pricing-table">
                <tr>
                  <td class="label-col">Base Price (x${quantity}):</td>
                  <td class="value-col">${currencySymbol}${formatCurrency(totalBasePrice)}</td>
                </tr>
                ${totalServiceFee > 0 ? `
                <tr>
                  <td class="label-col">Service Fee (x${quantity}):</td>
                  <td class="value-col">${currencySymbol}${formatCurrency(totalServiceFee)}</td>
                </tr>
                ` : ''}
                ${unifiedVatAmount > 0 && unifiedVatRate > 0 ? `
                <tr>
                  <td class="label-col">VAT (${unifiedVatRate}%):</td>
                  <td class="value-col">${currencySymbol}${formatCurrency(unifiedVatAmount)}</td>
                </tr>
                ` : ''}
                ${serviceTaxAmount > 0 ? `
                <tr>
                  <td class="label-col">Service Tax${serviceTax > 0 ? ` (${serviceTax}%)` : ''} on Service Fee:</td>
                  <td class="value-col">${currencySymbol}${formatCurrency(serviceTaxAmount)}</td>
                </tr>
                ` : ''}
                ${orderFee > 0 ? `
                <tr>
                  <td class="label-col">Order Fee (per transaction):</td>
                  <td class="value-col">${currencySymbol}${formatCurrency(orderFee)}</td>
                </tr>
                ` : ''}
                ${orderFeeServiceTax > 0 ? `
                <tr>
                  <td class="label-col">Service Tax${serviceTax > 0 ? ` (${serviceTax}%)` : ''} on Order Fee:</td>
                  <td class="value-col">${currencySymbol}${formatCurrency(orderFeeServiceTax)}</td>
                </tr>
                ` : ''}
                <tr class="total-row">
                  <td class="label-col">Total Amount:</td>
                  <td class="value-col">${currencySymbol}${formatCurrency(totalAmount)}</td>
                </tr>
              </table>
            </div>

            <!-- Ticket Details -->
            <div class="section">
              <h3>Ticket Details</h3>
              <div class="details">
                <div class="detail-row">
                  <span class="label">Ticket Code:</span>
                  <span class="value ticket-code">${isFullTicketData(ticketData) ? ticketData.otp : 'N/A'}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Quantity:</span>
                  <span class="value">${quantity}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Currency:</span>
                  <span class="value">${currency}</span>
                </div>
              </div>
            </div>

            <!-- QR Code -->
            <div class="qr-code">
              ${qrCodeHTML}
              <p style="margin-top: 15px; color: #6b7280; font-size: 14px;">
                ${t('success.qrCodeHint') || 'Show this QR code at the venue entrance'}
              </p>
            </div>

            <div class="footer">
              <p>${t('success.showAtVenue') || 'Please bring this ticket to the event'}</p>
              <p style="margin-top: 10px;">This is your official ticket and order confirmation.</p>
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
      a.download = `ticket-order-${ticketInfo.eventName?.replace(/\s+/g, '-') || 'event'}-${isFullTicketData(ticketData) ? ticketData.otp : 'ticket'}.html`;
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
              {/* Order Information */}
              <div className="mb-6 p-4 rounded-lg" style={{ background: 'var(--surface)', borderColor: 'var(--border)', borderWidth: '1px' }}>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <FaTicketAlt className="text-indigo-600" />
                  {t('success.orderInformation') || 'Order Information'}
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="opacity-70">{t('success.orderNumber') || 'Order Number'}:</span>
                    <span className="font-mono font-medium">{getTicketInfo(ticketData)?.paymentIntentId || (isFullTicketData(ticketData) ? ticketData._id : 'N/A') || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-70">{t('success.purchaseDate')}:</span>
                    <span>{formatEventDateLocale(getTicketInfo(ticketData)?.purchaseDate || (ticketData as TicketData)?.createdAt || '', undefined, locale)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-70">{t('success.email')}:</span>
                    <span>{getTicketInfo(ticketData)?.email || 'N/A'}</span>
                  </div>
                  {getTicketInfo(ticketData)?.fullName && (
                    <div className="flex justify-between">
                      <span className="opacity-70">{t('success.fullName') || 'Full Name'}:</span>
                      <span>{getTicketInfo(ticketData)?.fullName}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Selected Seats */}
              {(() => {
                const ticketInfo = getTicketInfo(ticketData);
                const seatTickets = ticketInfo?.seatTickets;
                const placeIds = ticketInfo?.placeIds;

                if (seatTickets && Array.isArray(seatTickets) && seatTickets.length > 0) {
                  return (
                    <div className="mb-6 p-4 rounded-lg" style={{ background: 'var(--surface)', borderColor: 'var(--border)', borderWidth: '1px' }}>
                      <h3 className="font-semibold mb-3">{t('success.selectedSeats') || 'Selected Seats'}</h3>
                      <div className="space-y-1 text-sm">
                        {seatTickets.map((seat: { ticketName?: string; placeId?: string }, index: number) => (
                          <div key={index} className="flex justify-between">
                            <span className="opacity-70">{index + 1}.</span>
                            <span className="flex-1 ml-2">{seat.ticketName || `Seat ${seat.placeId || index + 1}`}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                } else if (placeIds && Array.isArray(placeIds) && placeIds.length > 0) {
                  return (
                    <div className="mb-6 p-4 rounded-lg" style={{ background: 'var(--surface)', borderColor: 'var(--border)', borderWidth: '1px' }}>
                      <h3 className="font-semibold mb-3">{t('success.selectedSeats') || 'Selected Seats'}</h3>
                      <div className="space-y-1 text-sm">
                        {placeIds.map((placeId: string, index: number) => (
                          <div key={index} className="flex justify-between">
                            <span className="opacity-70">{index + 1}.</span>
                            <span className="flex-1 ml-2">Seat ID: {placeId}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Pricing Breakdown */}
              {(() => {
                const ticketInfo = getTicketInfo(ticketData);
                if (!ticketInfo) return null;

                const currency = ticketInfo.currency?.toUpperCase() || 'EUR';
                const currencySymbol = getCurrencySymbol(ticketInfo.country || 'Finland') || currency;
                const quantity = parseInt(ticketInfo.quantity || '1', 10);

                // Helper to safely parse values
                const parseValue = (value: string | number | null | undefined): number => {
                  if (typeof value === 'number') return value;
                  if (value === null || value === undefined) return 0;
                  const parsed = parseFloat(String(value));
                  return isNaN(parsed) ? 0 : parsed;
                };

                // Use pre-calculated totals directly (these were calculated correctly before payment)
                // These values come from summaryTotals which correctly sums individual seat prices
                const totalBasePrice = parseValue(ticketInfo.totalBasePrice) || (parseValue(ticketInfo.basePrice) * quantity);
                const totalServiceFee = parseValue(ticketInfo.totalServiceFee) || (parseValue(ticketInfo.serviceFee) * quantity);

                // Tax amounts are already totals (pre-calculated before payment)
                const vatRate = parseValue(ticketInfo.vatRate);
                const vatAmount = parseValue(ticketInfo.vatAmount);
                const entertainmentTax = parseValue(ticketInfo.entertainmentTax);
                const entertainmentTaxAmount = parseValue(ticketInfo.entertainmentTaxAmount);
                const serviceTax = parseValue(ticketInfo.serviceTax);
                const serviceTaxAmount = parseValue(ticketInfo.serviceTaxAmount);
                const orderFee = parseValue(ticketInfo.orderFee);
                const orderFeeServiceTax = parseValue(ticketInfo.orderFeeServiceTax);

                // Unify VAT and Entertainment Tax - they're the same, use whichever is available (if one is 0/null, use the other)
                const unifiedVatAmount = (vatAmount && vatAmount > 0) ? vatAmount : (entertainmentTaxAmount || 0);
                const unifiedVatRate = (vatRate && vatRate > 0) ? vatRate : (entertainmentTax || 0);

                // Round to 3 decimals (use round, not floor, to handle floating-point representation errors)
                const subtotal = Math.round((totalBasePrice + totalServiceFee) * 1000) / 1000;
                const totalTaxes = Math.round((unifiedVatAmount + serviceTaxAmount + orderFeeServiceTax) * 1000) / 1000;
                // Always calculate from components to ensure correct precision (don't use stored ticketInfo.price which may have been truncated)
                const totalAmount = Math.round((subtotal + totalTaxes + orderFee) * 1000) / 1000;
                const formatCurrency = (amount: number | string | null | undefined) => {
                  if (amount === null || amount === undefined) return '0.000';
                  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
                  if (isNaN(numAmount)) return '0.000';
                  // Round to 3 decimal places (use round, not floor, to handle floating-point errors)
                  const rounded = Math.round(numAmount * 1000) / 1000;
                  return rounded.toFixed(3);
                };

                return (
                  <div className="mb-6 p-4 rounded-lg" style={{ background: 'var(--surface)', borderColor: 'var(--border)', borderWidth: '1px' }}>
                    <h3 className="font-semibold mb-3">{t('success.pricingBreakdown') || 'Pricing Breakdown'}</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="opacity-70">{t('success.basePrice') || 'Base Price'} (x{quantity}):</span>
                        <span className="font-medium">{currencySymbol}{formatCurrency(totalBasePrice)}</span>
                      </div>
                      {totalServiceFee > 0 && (
                        <div className="flex justify-between">
                          <span className="opacity-70">{t('success.serviceFee') || 'Service Fee'} (x{quantity}):</span>
                          <span className="font-medium">{currencySymbol}{formatCurrency(totalServiceFee)}</span>
                        </div>
                      )}
                      {/* Show unified VAT/Entertainment Tax - they're the same, use whichever is available */}
                      {unifiedVatAmount > 0 && unifiedVatRate > 0 && (
                        <div className="flex justify-between">
                          <span className="opacity-70">{t('success.vat') || 'VAT'} ({unifiedVatRate}%):</span>
                          <span className="font-medium">{currencySymbol}{formatCurrency(unifiedVatAmount)}</span>
                        </div>
                      )}
                      {serviceTaxAmount > 0 && (
                        <div className="flex justify-between">
                          <span className="opacity-70">{t('success.serviceTax') || 'Service Tax'}{serviceTax > 0 ? ` (${serviceTax}%)` : ''} {t('success.onServiceFee') || 'on Service Fee'}:</span>
                          <span className="font-medium">{currencySymbol}{formatCurrency(serviceTaxAmount)}</span>
                        </div>
                      )}
                      {orderFee > 0 && (
                        <>
                          <div className="flex justify-between">
                            <span className="opacity-70">{t('success.orderFee') || 'Order Fee'} ({t('success.perTransaction') || 'per transaction'}):</span>
                            <span className="font-medium">{currencySymbol}{formatCurrency(orderFee)}</span>
                          </div>
                          {orderFeeServiceTax > 0 && (
                            <div className="flex justify-between">
                              <span className="opacity-70">{t('success.serviceTax') || 'Service Tax'}{serviceTax > 0 ? ` (${serviceTax}%)` : ''} {t('success.onOrderFee') || 'on Order Fee'}:</span>
                              <span className="font-medium">{currencySymbol}{formatCurrency(orderFeeServiceTax)}</span>
                            </div>
                          )}
                        </>
                      )}
                      <div className="pt-2 mt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                        <div className="flex justify-between">
                          <span className="opacity-70">{t('success.subtotal') || 'Subtotal'}:</span>
                          <span className="font-medium">{currencySymbol}{formatCurrency(subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-base font-bold mt-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                          <span>{t('success.total') || 'Total'}:</span>
                          <span>{currencySymbol}{formatCurrency(totalAmount)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Ticket Information */}
              <div className="mb-6 p-4 rounded-lg" style={{ background: 'var(--surface)', borderColor: 'var(--border)', borderWidth: '1px' }}>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <FaTicketAlt className="text-indigo-600" />
                  {t('success.ticketInformation')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
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
                    <span className="opacity-70">{t('success.ticketCode')}:</span>
                    <span className="font-mono font-bold text-indigo-600 text-lg">{isFullTicketData(ticketData) ? ticketData.otp : 'N/A'}</span>
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
