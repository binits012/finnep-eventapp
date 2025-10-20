"use client";

import React, { useMemo, useState, useEffect } from 'react';

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
  onProceed: (payload: { email: string; quantity: number; ticket: TicketInfoLite; eventId: string; merchantId?: string; externalMerchantId?: string; marketingOptIn: boolean; total: number; perUnitSubtotal: number; perUnitVat: number }) => void;
  ticket: TicketInfoLite;
  eventId: string;
  merchantId?: string;
  externalMerchantId?: string;
}

export default function TicketPurchaseModal({ isOpen, onClose, onProceed, ticket, eventId, merchantId, externalMerchantId }: TicketPurchaseModalProps) {
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [quantity, setQuantity] = useState<number>(1);
  const [marketingOptIn, setMarketingOptIn] = useState(false);

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

  const canProceed = isEmailValid && emailsMatch && isQuantityValid && Boolean(ticket?._id) && Boolean(eventId);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop (no click-to-close to avoid accidental dismiss) */}
      <div className="absolute inset-0 bg-black/60" aria-hidden="true" />
      <div className="relative z-50 w-[92vw] max-w-md rounded-xl p-5 sm:p-6 shadow-xl"
        style={{ background: 'var(--surface)', color: 'var(--foreground)', borderColor: 'var(--border)', borderWidth: 1 }}
        role="dialog" aria-modal="true" aria-label="Ticket purchase"
      >
        <h2 className="text-xl font-semibold mb-2">Purchase Ticket</h2>
        <div className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium"
          style={{ borderColor: 'var(--border)', color: 'var(--foreground)', background: 'color-mix(in srgb, var(--foreground) 8%, var(--surface))' }}
        >
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-indigo-600"></span>
          <span>{ticket?.name}</span>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              style={{ background: 'var(--surface)', color: 'var(--foreground)', borderColor: 'var(--border)', borderWidth: 1 }}
              placeholder="you@example.com"
            />
            {!isEmailValid && email.length > 0 && (
              <p className="mt-1 text-xs text-red-600">Enter a valid email</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Confirm Email</label>
            <input
              type="email"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              className="w-full rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              style={{ background: 'var(--surface)', color: 'var(--foreground)', borderColor: 'var(--border)', borderWidth: 1 }}
              placeholder="re-enter email"
            />
            {confirmEmail.length > 0 && !emailsMatch && (
              <p className="mt-1 text-xs text-red-600">Emails do not match</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Quantity</label>
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
                    setQuantity(Math.min(num, 10)); // Enforce max 10
                  }
                }
              }}
              onFocus={(e) => e.target.select()} // Select all text when focused
              className="w-full rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              style={{ background: 'var(--surface)', color: 'var(--foreground)', borderColor: 'var(--border)', borderWidth: 1 }}
              placeholder="1"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Enter quantity between 1 and 10</p>
          </div>

          <div className="pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
            <div className="flex justify-between text-sm mb-1">
              <span className="opacity-80">Price (x{quantity})</span>
              <span className="opacity-90">{((ticket?.price ?? 0) * quantity).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm mb-1">
              <span className="opacity-80">Service Fee (x{quantity})</span>
              <span className="opacity-90">{((ticket?.serviceFee ?? 0) * quantity).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="opacity-80">VAT ({ticket?.vat ?? 0}%)</span>
              <span className="opacity-90">{(perUnitVat * quantity).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-semibold">
              <span>Total</span>
              <span>{total.toFixed(2)}</span>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={marketingOptIn} onChange={(e) => setMarketingOptIn(e.target.checked)} />
            <span>
              Would you like to be contacted for marketing material?{' '}
              <LinkLike href="/marketing">Read more</LinkLike>
            </span>
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-md border"
            style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
            Cancel
          </button>
          <button
            disabled={!canProceed}
            onClick={() => onProceed({ email, quantity, ticket, eventId, merchantId, externalMerchantId, marketingOptIn, total, perUnitSubtotal, perUnitVat })}
            className={`px-4 py-2 rounded-md text-white ${canProceed ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-400 cursor-not-allowed'}`}
          >
            Proceed
          </button>
        </div>
      </div>
    </div>
  );
}

function LinkLike({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} className="underline text-indigo-600 dark:text-indigo-400 hover:opacity-90" target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
} 