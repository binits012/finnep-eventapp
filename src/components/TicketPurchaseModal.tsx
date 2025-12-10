"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import SeatSelectionModal from './SeatSelectionModal';

interface TicketInfoLite {
  _id: string;
  name: string;
  price: number;
  serviceFee?: number;
  vat?: number; // percent
}

interface TicketPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProceed: (payload: { email: string; quantity: number; ticket: TicketInfoLite; eventId: string; merchantId?: string; externalMerchantId?: string; marketingOptIn: boolean; total: number; perUnitSubtotal: number; perUnitVat: number; placeIds?: string[] }) => void;
  ticket: TicketInfoLite;
  eventId: string;
  merchantId?: string;
  externalMerchantId?: string;
  hasSeatSelection?: boolean;
  currency?: string;
}

export default function TicketPurchaseModal({ isOpen, onClose, onProceed, ticket, eventId, merchantId, externalMerchantId, hasSeatSelection = false, currency = 'EUR' }: TicketPurchaseModalProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [quantity, setQuantity] = useState<number>(1);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [showSeatSelection, setShowSeatSelection] = useState(false);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);

  useEffect(() => {
    // Disable body scroll while modal is open
    const prevOverflow = document.body.style.overflow;
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setEmail("");
      setConfirmEmail("");
      setQuantity(1);
      setMarketingOptIn(false);
      setShowSeatSelection(false);
      setSelectedSeats([]);
    }
  }, [isOpen]);

  const isEmailValid = useMemo(() => /.+@.+\..+/.test(email), [email]);
  const emailsMatch = useMemo(() => email.trim() !== "" && email === confirmEmail, [email, confirmEmail]);
  const isQuantityValid = useMemo(() => quantity >= 1 && quantity <= 10, [quantity]);

  const perUnitSubtotal = useMemo(() => {
    const base = Number(ticket?.price ?? 0);
    const fee = Number(ticket?.serviceFee ?? 0);
    return base + fee;
  }, [ticket]);
  const perUnitVat = useMemo(() => {
    const rate = Number(ticket?.vat ?? 0);
    return perUnitSubtotal * (rate / 100);
  }, [ticket, perUnitSubtotal]);
  const perUnitTotal = useMemo(() => perUnitSubtotal + perUnitVat, [perUnitSubtotal, perUnitVat]);
  const total = useMemo(() => Math.max(0, Math.round(perUnitTotal * quantity * 100) / 100), [perUnitTotal, quantity]);

  // For seat-based events, require seat selection
  const seatsSelected = !hasSeatSelection || selectedSeats.length === quantity;
  const canProceed = isEmailValid && emailsMatch && isQuantityValid && Boolean(ticket?._id) && Boolean(eventId) && seatsSelected;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop (no click-to-close to avoid accidental dismiss) */}
      <div className="absolute inset-0 bg-black/60" aria-hidden="true" />
      <div className="relative z-50 w-[92vw] max-w-md rounded-xl p-5 sm:p-6 shadow-xl"
        style={{ background: 'var(--surface)', color: 'var(--foreground)', borderColor: 'var(--border)', borderWidth: 1 }}
        role="dialog" aria-modal="true" aria-label="Ticket purchase"
      >
        <h2 className="text-xl font-semibold mb-2">{t('ticketModal.title')}</h2>
        <div className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium"
          style={{ borderColor: 'var(--border)', color: 'var(--foreground)', background: 'color-mix(in srgb, var(--foreground) 8%, var(--surface))' }}
        >
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-indigo-600"></span>
          <span>{ticket?.name}</span>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t('ticketModal.email')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              style={{ background: 'var(--surface)', color: 'var(--foreground)', borderColor: 'var(--border)', borderWidth: 1 }}
              placeholder={t('ticketModal.emailPlaceholder')}
            />
            {!isEmailValid && email.length > 0 && (
              <p className="mt-1 text-xs text-red-600">{t('ticketModal.validEmail')}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t('ticketModal.confirmEmail')}</label>
            <input
              type="email"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              className="w-full rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              style={{ background: 'var(--surface)', color: 'var(--foreground)', borderColor: 'var(--border)', borderWidth: 1 }}
              placeholder={t('ticketModal.confirmEmailPlaceholder')}
            />
            {confirmEmail.length > 0 && !emailsMatch && (
              <p className="mt-1 text-xs text-red-600">{t('ticketModal.emailsMatch')}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t('ticketModal.quantity')}</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const newQuantity = Math.max(1, quantity - 1);
                  setQuantity(newQuantity);
                  // If seat selection is enabled and quantity changed, clear seats
                  if (hasSeatSelection && newQuantity !== quantity) {
                    setSelectedSeats([]);
                  }
                }}
                disabled={quantity <= 1}
                className="flex items-center justify-center w-10 h-10 rounded-md border font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:bg-opacity-10"
                style={{
                  borderColor: 'var(--border)',
                  color: 'var(--foreground)',
                  background: quantity <= 1 ? 'transparent' : 'color-mix(in srgb, var(--foreground) 8%, var(--surface))'
                }}
                aria-label="Decrease quantity"
              >
                −
              </button>
              <input
                type="text"
                value={quantity}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '') {
                    setQuantity(0);
                  } else {
                    const num = parseInt(value, 10);
                    if (!isNaN(num)) {
                      const newQuantity = Math.min(Math.max(1, num), 10); // Enforce min 1 and max 10
                      setQuantity(newQuantity);
                      // If seat selection is enabled and quantity changed, clear seats
                      if (hasSeatSelection && newQuantity !== quantity) {
                        setSelectedSeats([]);
                      }
                    }
                  }
                }}
                onFocus={(e) => e.target.select()} // Select all text when focused
                className="flex-1 rounded-md px-3 py-2 text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                style={{ background: 'var(--surface)', color: 'var(--foreground)', borderColor: 'var(--border)', borderWidth: 1 }}
                placeholder={t('ticketModal.quantityPlaceholder')}
              />
              <button
                type="button"
                onClick={() => {
                  const newQuantity = Math.min(10, quantity + 1);
                  setQuantity(newQuantity);
                  // If seat selection is enabled and quantity changed, clear seats
                  if (hasSeatSelection && newQuantity !== quantity) {
                    setSelectedSeats([]);
                  }
                }}
                disabled={quantity >= 10}
                className="flex items-center justify-center w-10 h-10 rounded-md border font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:bg-opacity-10"
                style={{
                  borderColor: 'var(--border)',
                  color: 'var(--foreground)',
                  background: quantity >= 10 ? 'transparent' : 'color-mix(in srgb, var(--foreground) 8%, var(--surface))'
                }}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('ticketModal.quantityHint')}</p>
          </div>

          {/* Seat Selection Button */}
          {hasSeatSelection && (
            <div>
              <button
                type="button"
                onClick={() => setShowSeatSelection(true)}
                className="w-full px-4 py-2 rounded-md border-2 border-dashed hover:border-solid transition-colors"
                style={{
                  borderColor: selectedSeats.length === quantity ? 'var(--border)' : 'var(--border)',
                  color: 'var(--foreground)',
                  background: selectedSeats.length === quantity ? 'color-mix(in srgb, var(--foreground) 8%, var(--surface))' : 'transparent'
                }}
              >
                {selectedSeats.length === 0
                  ? `Select ${quantity} Seat${quantity !== 1 ? 's' : ''}`
                  : `${selectedSeats.length} Seat${selectedSeats.length !== 1 ? 's' : ''} Selected`}
              </button>
              {selectedSeats.length > 0 && selectedSeats.length !== quantity && (
                <p className="mt-1 text-xs text-yellow-600">
                  Please select exactly {quantity} seat{quantity !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          )}

          <div className="pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
            <div className="flex justify-between text-sm mb-1">
              <span className="opacity-80">{t('ticketModal.price')} (x{quantity})</span>
              <span className="opacity-90">{((ticket?.price ?? 0) * quantity).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm mb-1">
              <span className="opacity-80">{t('ticketModal.serviceFee')} (x{quantity})</span>
              <span className="opacity-90">{((ticket?.serviceFee ?? 0) * quantity).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="opacity-80">{t('ticketModal.vat')} ({ticket?.vat ?? 0}%)</span>
              <span className="opacity-90">{(perUnitVat * quantity).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-semibold">
              <span>{t('ticketModal.total')}</span>
              <span>{total.toFixed(2)}</span>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={marketingOptIn} onChange={(e) => setMarketingOptIn(e.target.checked)} />
            <span>
              {t('ticketModal.marketingOptIn')}
            </span>
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-md border"
            style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
{t('ticketModal.cancel')}
          </button>
          <button
            disabled={!canProceed}
            onClick={() => onProceed({
              email,
              quantity,
              ticket,
              eventId,
              merchantId,
              externalMerchantId,
              marketingOptIn,
              total,
              perUnitSubtotal,
              perUnitVat,
              placeIds: hasSeatSelection ? selectedSeats : undefined
            })}
            className={`px-4 py-2 rounded-md text-white ${canProceed ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-400 cursor-not-allowed'}`}
          >
            {t('ticketModal.proceed')}
          </button>
        </div>
      </div>

      {/* Seat Selection Modal */}
      {hasSeatSelection && (
        <SeatSelectionModal
          isOpen={showSeatSelection}
          onClose={() => setShowSeatSelection(false)}
          onConfirm={(placeIds) => {
            setSelectedSeats(placeIds);
            setShowSeatSelection(false);
          }}
          eventId={eventId}
          quantity={quantity}
          currency={currency}
        />
      )}
    </div>
  );
}
