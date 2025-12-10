"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { FaCalendarAlt, FaTicketAlt, FaUser, FaCreditCard, FaLock } from 'react-icons/fa';
import { getCurrencySymbol, getCurrencyCode } from '@/utils/currency';
import { useTranslation } from '@/hooks/useTranslation';
import SuccessPage from '../success/page';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface CheckoutData {
  email: string;
  quantity: number;
  eventId: string;
  merchantId: string;
  externalMerchantId: string;
  ticketId: string | null;
  ticketName: string;
  price: number;
  serviceFee: number;
  vat: number;
  entertainmentTax?: number;
  serviceTax?: number;
  orderFee?: number;
  eventName: string;
  marketingOptIn: boolean;
  country: string;
  // Pre-calculated values from EventDetail component
  perUnitSubtotal?: number;
  perUnitVat?: number;
  total?: number;
  // Seat selection
  placeIds?: string[];
  seatTickets?: Array<{ placeId: string; ticketId: string | null; ticketName: string }>;
  sessionId?: string;
  fullName?: string;
}

// Add this function to detect theme
const getThemeColors = () => {
  const isDark = document.documentElement.classList.contains('dark') ||
                 window.matchMedia('(prefers-color-scheme: dark)').matches;

  return {
    textColor: isDark ? '#ffffff' : '#000000',
    placeholderColor: isDark ? '#9ca3af' : '#6b7280',
    iconColor: isDark ? '#ffffff' : '#000000',
  };
};

interface TicketData {
  ticketId: string;
  eventId: string;
  quantity: number;
  total: number;
  email: string;
}

function CheckoutForm({ checkoutData, onSuccess }: { checkoutData: CheckoutData; onSuccess: (ticketData: TicketData) => void }) {
  const { t } = useTranslation();
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [themeColors, setThemeColors] = useState(getThemeColors());
  const [cardComplete, setCardComplete] = useState(false); // Add this state

  // Use pre-calculated values from EventDetail component, fallback to calculation if not provided
  const perUnitSubtotal = checkoutData.perUnitSubtotal ?? (checkoutData.price + checkoutData.serviceFee);
  const perUnitVat = checkoutData.perUnitVat ?? (perUnitSubtotal * (checkoutData.vat / 100));
  const total = checkoutData.total ?? Math.round((perUnitSubtotal + perUnitVat) * checkoutData.quantity * 100) / 100;

  // Helper functions for payment flow
  const createPaymentIntentPayload = () => ({
    amount: Math.round(total * 100), // Convert to cents
    currency: getCurrencyCode(checkoutData.country || 'Finland').toLowerCase(),
    metadata: {
      eventId: checkoutData.eventId,
      ticketId: checkoutData.ticketId,
      email: checkoutData.email,
      quantity: checkoutData.quantity.toString(),
      eventName: checkoutData.eventName,
      ticketName: checkoutData.ticketName,
      merchantId: checkoutData.merchantId,
      externalMerchantId: checkoutData.externalMerchantId,
      // Detailed pricing breakdown
      basePrice: checkoutData.price.toString(),
      serviceFee: checkoutData.serviceFee.toString(),
      vatRate: checkoutData.vat.toString(),
      vatAmount: perUnitVat.toString(),
      perUnitSubtotal: perUnitSubtotal.toString(),
      perUnitTotal: (perUnitSubtotal + perUnitVat).toString(),
      totalBasePrice: (checkoutData.price * checkoutData.quantity).toString(),
      totalServiceFee: (checkoutData.serviceFee * checkoutData.quantity).toString(),
      totalVatAmount: (perUnitVat * checkoutData.quantity).toString(),
      totalAmount: total.toString(),
      country: checkoutData.country || 'Finland',
      marketingOptIn: checkoutData.marketingOptIn || false,
      // Seat selection
      placeIds: checkoutData.placeIds ? JSON.stringify(checkoutData.placeIds) : undefined,
    }
  });

  const createPaymentIntent = async () => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/front'}/create-payment-intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createPaymentIntentPayload())
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error( err.error);
    }

    return await response.json();
  };

  const confirmPaymentWithStripe = async (clientSecret: string) => {
    if (!stripe || !elements) {
      throw new Error('Stripe not initialized');
    }

    return await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: elements.getElement(CardElement)!,
        billing_details: {
          email: checkoutData.email,
          name: checkoutData.email.split('@')[0],
        },
      },
      receipt_email: checkoutData.email,
    });
  };

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    const successResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/front'}/payment-success`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentIntentId,
        metadata: {
          eventId: checkoutData.eventId,
          ticketId: checkoutData.ticketId,
          merchantId: checkoutData.merchantId,
          email: checkoutData.email,
          quantity: checkoutData.quantity.toString(),
          eventName: checkoutData.eventName,
          ticketName: checkoutData.ticketName,
          externalMerchantId: checkoutData.externalMerchantId,
          marketingOptIn: checkoutData.marketingOptIn || false,
          placeIds: checkoutData.placeIds || [],
        }
      })
    });

    if (!successResponse.ok) {
      throw new Error('Failed to create ticket record');
    }

    return await successResponse.json();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) return;

    setLoading(true);
    setError(null);

    try {
      // 1. Create payment intent
      const { clientSecret } = await createPaymentIntent();

      // 2. Confirm payment with Stripe
      const { error: stripeError, paymentIntent } = await confirmPaymentWithStripe(clientSecret);

      if (stripeError) {
        setError(stripeError.message || 'Payment failed');
        return;
      }

      if (paymentIntent.status === 'succeeded') {
        // 3. Handle payment success
        const response = await handlePaymentSuccess(paymentIntent.id);

        // 4. Show success page with full ticket data
        onSuccess(response.data);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred during payment';
      setError(errorMessage);
      console.error('Payment error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Add card change handler
  const handleCardChange = (event: { complete: boolean; error?: { message: string } }) => {
    setCardComplete(event.complete);
    if (event.error) {
      setError(event.error.message);
    } else {
      setError(null);
    }
  };

  useEffect(() => {
    const updateColors = () => setThemeColors(getThemeColors());

    // Listen for theme changes
    const observer = new MutationObserver(updateColors);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', updateColors);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', updateColors);
    };
  }, []);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Customer Information */}
      <div className="rounded-xl p-6 shadow" style={{ background: 'var(--surface)', borderColor: 'var(--border)', borderWidth: 1 }}>
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <FaUser className="mr-2 text-indigo-600" />
          {t('checkout.customerInformation')}
        </h2>
        <div className="space-y-3">
          <div>
            <div className="text-sm opacity-80">{t('checkout.email')}</div>
            <div className="text-base font-medium">{checkoutData.email}</div>
          </div>
        </div>
      </div>

      {/* Payment Information */}
      <div className="rounded-xl p-6 shadow" style={{ background: 'var(--surface)', borderColor: 'var(--border)', borderWidth: 1 }}>
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <FaCreditCard className="mr-2 text-indigo-600" />
          {t('checkout.paymentDetails')}
        </h2>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">{t('checkout.cardNumber')}</label>
          <div className="p-3 border rounded-lg bg-transparent" style={{ borderColor: 'var(--border)' }}>
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: themeColors.textColor,
                    backgroundColor: 'transparent',
                    '::placeholder': {
                      color: themeColors.placeholderColor,
                    },
                    iconColor: themeColors.iconColor,
                  },
                  invalid: {
                    color: '#ef4444',
                    iconColor: '#ef4444',
                  },
                  complete: {
                    color: themeColors.textColor,
                    iconColor: '#10b981',
                  },
                },
                hidePostalCode: true,
                disabled: false,
              }}
              onChange={handleCardChange} // Add this handler
            />
          </div>
        </div>

        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-4">
          <FaLock className="mr-2" />
          <span>{t('checkout.securePaymentText')}</span>
        </div>

        {error && (
          <div className="text-red-600 text-sm mb-4">{error}</div>
        )}

        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg mb-6">
          <div className="flex items-start">
            <div className="text-blue-600 dark:text-blue-400 text-sm">
              {t('checkout.cardNote')}
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 px-4 py-3 rounded-lg border font-medium transition-colors"
            style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
          >
{t('common.back')}
          </button>
          <button
            type="submit"
            disabled={!stripe || loading || !cardComplete} // Add !cardComplete to disabled condition
            className={`flex-1 px-4 py-3 rounded-lg font-medium text-white transition-colors ${
              !stripe || loading || !cardComplete
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {loading ? t('checkout.processing') : `${t('checkout.completePurchase')} ${total.toFixed(2)} ${' '} ${getCurrencySymbol(checkoutData.country || 'Finland')}`}
          </button>
        </div>
      </div>
    </form>
  );
}

function CheckoutContent() {
  const { t } = useTranslation();
  const search = useSearchParams();
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successTicketData, setSuccessTicketData] = useState<TicketData | null>(null);

  useEffect(() => {
    try {
      const encodedData = search.get('data');
      if (encodedData) {
        const decodedData = JSON.parse(atob(encodedData)) as CheckoutData;
        setCheckoutData(decodedData);
      } else {
        setError(t('checkout.invalidData'));
      }
    } catch {
      setError(t('checkout.decodeError'));
    }
  }, [search, t]);

  // Handle success state - show success page
  if (successTicketData) {
    return <SuccessPage ticketData={successTicketData} />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">{t('checkout.error')}</h1>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!checkoutData) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">{t('checkout.loading')}</h1>
        </div>
      </div>
    );
  }

  const perUnitSubtotal = checkoutData.price + checkoutData.serviceFee;
  const perUnitVat = perUnitSubtotal * (checkoutData.vat / 100);
  const total = Math.round((perUnitSubtotal + perUnitVat) * checkoutData.quantity * 100) / 100;

  return (
    <Elements stripe={stripePromise}>
      <div className="min-h-screen" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
        <div className="container mx-auto px-4 py-12 max-w-4xl">
          <h1 className="text-3xl font-bold mb-8 text-center">{t('checkout.title')}</h1>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Order Summary */}
            <div className="space-y-6">
              {/* Event Information */}
              <div className="rounded-xl p-6 shadow" style={{ background: 'var(--surface)', borderColor: 'var(--border)', borderWidth: 1 }}>
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  <FaCalendarAlt className="mr-2 text-indigo-600" />
                  {t('checkout.eventDetails')}
                </h2>
                <div className="space-y-3">
                  <div>
                    <div className="text-sm opacity-80">{t('checkout.event')}</div>
                    <div className="text-lg font-medium">{checkoutData.eventName}</div>
                  </div>
                  <div>
                    <div className="text-sm opacity-80">{t('checkout.ticketType')}</div>
                    <div className="text-base font-medium">{checkoutData.ticketName}</div>
                  </div>
                  <div>
                    <div className="text-sm opacity-80">{t('checkout.quantity')}</div>
                    <div className="text-base font-medium">{checkoutData.quantity} {t('checkout.tickets')}</div>
                  </div>
                </div>
              </div>

              {/* Pricing Breakdown */}
              <div className="rounded-xl p-6 shadow" style={{ background: 'var(--surface)', borderColor: 'var(--border)', borderWidth: 1 }}>
                <h2 className="text-xl font-semibold mb-4 flex items-center">
                  <FaTicketAlt className="mr-2 text-indigo-600" />
                  {t('checkout.pricing')}
                </h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="opacity-80">{t('checkout.subtotal')}</span>
                    <span>{checkoutData.price.toFixed(2)} {' '} {getCurrencySymbol(checkoutData.country || 'Finland')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-80">{t('checkout.serviceFee')}</span>
                    <span>{checkoutData.serviceFee.toFixed(2)} {' '} {getCurrencySymbol(checkoutData.country || 'Finland')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-80">{t('checkout.vat')} ({checkoutData.vat}%)</span>
                    <span>{perUnitVat.toFixed(2)} {' '} {getCurrencySymbol(checkoutData.country || 'Finland')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-80">{t('checkout.quantity')}</span>
                    <span>{checkoutData.quantity}</span>
                  </div>
                  <div className="border-t pt-3 flex justify-between text-lg font-semibold" style={{ borderColor: 'var(--border)' }}>
                    <span>{t('checkout.total')}</span>
                    <span>{total.toFixed(2)} {' '} {getCurrencySymbol(checkoutData.country || 'Finland')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Payment Form */}
            <div>
              <CheckoutForm
                checkoutData={checkoutData}
                onSuccess={(ticketData) => setSuccessTicketData(ticketData)}
              />
            </div>
          </div>
        </div>
      </div>
    </Elements>
  );
}

function CheckoutLoading() {
  const { t } = useTranslation();
  return <div>{t('common.loading')}</div>;
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<CheckoutLoading />}>
      <CheckoutContent />
    </Suspense>
  );
}