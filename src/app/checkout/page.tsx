"use client";

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { FaCalendarAlt, FaTicketAlt, FaUser, FaCreditCard, FaLock, FaClock } from 'react-icons/fa';
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
  // Pre-calculated totals (for multiple ticket types)
  totalBasePrice?: number;
  totalServiceFee?: number;
  totalVatAmount?: number;
  totalEntertainmentTaxAmount?: number;
  entertainmentTaxAmount?: number;
  totalServiceTaxAmount?: number;
  serviceTaxAmount?: number;
  orderFeeServiceTax?: number;
  // Seat selection
  placeIds?: string[];
  seatTickets?: Array<{ placeId: string; ticketId: string | null; ticketName: string }>;
  sessionId?: string;
  fullName?: string;
  // Payment provider
  paytrailEnabled?: boolean; // Whether merchant has Paytrail enabled
  // Presale: one-time token to consume on successful payment
  presaleToken?: string;
  // Security
  nonce?: string; // Nonce for duplicate submission protection
}

// Add this function to detect theme - handles browser automatic theme switching
const getThemeColors = () => {
  if (typeof window === 'undefined') {
    // SSR fallback
    return {
      textColor: '#000000',
      placeholderColor: '#6b7280',
      iconColor: '#000000',
    };
  }

  // Check for explicit dark class first (user preference)
  const hasDarkClass = document.documentElement.classList.contains('dark');

  // Check system preference (browser automatic theme switching)
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  // Use explicit class if present, otherwise use system preference
  const isDark = hasDarkClass || (!document.documentElement.classList.contains('light') && prefersDark);

  return {
    textColor: isDark ? '#ffffff' : '#1f2937', // Better contrast in light mode
    placeholderColor: isDark ? '#9ca3af' : '#6b7280',
    iconColor: isDark ? '#ffffff' : '#374151', // Better contrast in light mode
  };
};

interface TicketData {
  _id: string;
  qrCode?: {
    type: string;
    data: number[];
  };
  ics?: {
    type: string;
    data: number[];
  };
  ticketFor?: string;
  event?: string;
  isSend?: boolean;
  active?: boolean;
  isRead?: boolean;
  type?: string;
  ticketInfo?: {
    eventName: string;
    ticketName: string;
    quantity: string;
    price: number;
    currency: string;
    purchaseDate: string;
    paymentIntentId?: string;
    paytrailTransactionId?: string;
    paytrailStamp?: string;
    email: string;
    merchantId: string;
    eventId: string;
    ticketId?: string;
    basePrice?: number;
    serviceFee?: number;
    vatRate?: number;
    vatAmount?: number;
    country?: string;
    fullName?: string;
    placeIds?: string[];
  };
  merchant?: string;
  externalMerchantId?: string;
  otp?: string;
  createdAt?: string;
  __v?: number;
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
  const [paymentProvider, setPaymentProvider] = useState<'stripe' | 'paytrail'>('stripe');
  const [themeKey, setThemeKey] = useState(() => {
    // Generate a key based on current theme to force CardElement re-render
    const isDark = document.documentElement.classList.contains('dark') ||
                   window.matchMedia('(prefers-color-scheme: dark)').matches;
    return `card-element-${isDark ? 'dark' : 'light'}`;
  });

  // Countdown timer state (10 minutes = 600 seconds)
  const [timeRemaining, setTimeRemaining] = useState(600); // 10 minutes in seconds
  const [timerExpired, setTimerExpired] = useState(false);

  // Countdown timer effect
  useEffect(() => {
    if (timerExpired) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setTimerExpired(true);

          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerExpired]);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Generate nonce once when component mounts to prevent duplicate submissions
  const [nonce] = useState(() => {
    // Generate a cryptographically secure random nonce
    const array = new Uint8Array(32);
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(array);
    } else {
      // Fallback for environments without crypto API
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
    }
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  });

  // Use pre-calculated values from EventDetail component, fallback to calculation if not provided
  const perUnitSubtotal = checkoutData.perUnitSubtotal ?? (checkoutData.price + checkoutData.serviceFee);
  // VAT is calculated on base price
  const perUnitVat = checkoutData.perUnitVat ?? (checkoutData.price * (checkoutData.vat / 100));
  // Calculate service tax on service fee (this is the "service VAT")
  const serviceTaxRate = checkoutData.serviceTax ?? 0;
  const perUnitServiceTax = (checkoutData.serviceFee > 0 && serviceTaxRate > 0)
    ? checkoutData.serviceFee * (serviceTaxRate / 100)
    : 0;
  // Calculate service tax on order fee
  const orderFee = checkoutData.orderFee ?? 0;
  const orderFeeServiceTax = (orderFee > 0 && serviceTaxRate > 0)
    ? orderFee * (serviceTaxRate / 100)
    : 0;
  // Total = (basePrice + serviceFee + VAT on price + serviceTax on serviceFee) * quantity + orderFee + serviceTax on orderFee
  const total = checkoutData.total ?? Math.round((checkoutData.price + checkoutData.serviceFee + perUnitVat + perUnitServiceTax) * checkoutData.quantity * 100 + orderFee * 100 + orderFeeServiceTax * 100) / 100;

  // Helper functions for payment flow
  const createPaymentIntentPayload = () => ({
    amount: Math.round(total * 100), // Convert to cents
    currency: getCurrencyCode(checkoutData.country || 'Finland').toLowerCase(),
    paymentProvider: paymentProvider,
    metadata: {
      eventId: checkoutData.eventId,
      ticketId: checkoutData.ticketId,
      email: checkoutData.email,
      quantity: checkoutData.quantity.toString(),
      eventName: checkoutData.eventName,
      ticketName: checkoutData.ticketName,
      merchantId: checkoutData.merchantId,
      externalMerchantId: checkoutData.externalMerchantId,
      // Nonce to prevent duplicate form submissions
      nonce: nonce,
      // Detailed pricing breakdown - all values match the pricing breakdown display
      basePrice: checkoutData.price.toString(),
      subtotal: (checkoutData.price * checkoutData.quantity).toFixed(3),
      serviceFee: checkoutData.serviceFee.toString(),
      totalServiceFee: (checkoutData.serviceFee * checkoutData.quantity).toFixed(3),
      serviceTax: serviceTaxRate.toString(),
      serviceTaxAmount: (perUnitServiceTax * checkoutData.quantity).toFixed(3),
      vatRate: checkoutData.vat.toString(),
      vatAmount: (perUnitVat * checkoutData.quantity).toFixed(3),
      // Calculate entertainmentTaxAmount if entertainmentTax is provided
      entertainmentTax: checkoutData.entertainmentTax ? checkoutData.entertainmentTax.toString() : undefined,
      entertainmentTaxAmount: checkoutData.entertainmentTax ? ((checkoutData.price * checkoutData.entertainmentTax / 100) * checkoutData.quantity).toFixed(3) : undefined,
      orderFee: orderFee.toString(),
      orderFeeServiceTax: orderFeeServiceTax.toFixed(3),
      totalAmount: total.toFixed(3),
      // Legacy fields for backward compatibility
      perUnitSubtotal: perUnitSubtotal.toString(),
      perUnitTotal: (perUnitSubtotal + perUnitVat).toString(),
      totalBasePrice: (checkoutData.price * checkoutData.quantity).toString(),
      totalVatAmount: (perUnitVat * checkoutData.quantity).toString(),
      country: checkoutData.country || 'Finland',
      marketingOptIn: checkoutData.marketingOptIn || false,
      // Seat selection
      placeIds: checkoutData.placeIds ? JSON.stringify(checkoutData.placeIds) : undefined,
      locale: window.localStorage.getItem('locale') || 'en-US',
      // Presale: one-time token to consume on successful payment
      ...(checkoutData.presaleToken && { presaleToken: checkoutData.presaleToken }),
    }
  });

  const createPaymentIntent = async () => {
    if (paymentProvider === 'paytrail') {
      // Create Paytrail payment
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/front'}/create-paytrail-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createPaymentIntentPayload())
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error);
      }

      const paytrailResponse = await response.json();
      // Redirect to Paytrail payment page
      if (paytrailResponse.paymentUrl) {
        // Save full checkout data for after redirect (needed for checkout page)
        if (typeof window !== 'undefined') {
          // Include the calculated total in checkout data so it's available after redirect
          const checkoutDataWithTotal = {
            ...checkoutData,
            total: total // Ensure total is stored
          };
          sessionStorage.setItem('paytrail_original_checkout_data', JSON.stringify(checkoutDataWithTotal));
          // Also save minimal data for verification
          sessionStorage.setItem('paytrail_checkout_data', JSON.stringify({
            eventId: checkoutData.eventId,
            email: checkoutData.email,
            customerName: checkoutData.fullName || checkoutData.email.split('@')[0],
            quantity: checkoutData.quantity,
            ticketTypeId: checkoutData.ticketId,
            seats: checkoutData.placeIds || [],
            amount: Math.round(total * 100), // cents - use calculated total
            currency: 'EUR'
          }));

          console.log('[CheckoutPage] Stored checkout data with total:', { total, checkoutDataWithTotal });
        }
        window.location.href = paytrailResponse.paymentUrl;
        return null;
      }
      throw new Error('Paytrail payment URL not received');
    } else {
      // Create Stripe payment intent
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/front'}/create-payment-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createPaymentIntentPayload())
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error);
      }

      return await response.json();
    }
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
          nonce: nonce, // Include nonce to prevent duplicate submissions
          locale: window.localStorage.getItem('locale') || 'en-US',
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

    // For Paytrail, validation is handled in createPaymentIntent (redirect happens)
    if (paymentProvider === 'stripe' && (!stripe || !elements)) return;

    setLoading(true);
    setError(null);

    try {
      // 1. Create payment intent (or Paytrail payment)
      const paymentResponse = await createPaymentIntent();

      // If Paytrail, redirect already happened, so return early
      if (paymentProvider === 'paytrail' && !paymentResponse) {
        return; // Redirect in progress
      }

      // 2. For Stripe, confirm payment
      if (paymentProvider === 'stripe' && paymentResponse?.clientSecret) {
        const { error: stripeError, paymentIntent } = await confirmPaymentWithStripe(paymentResponse.clientSecret);

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
    const updateColors = () => {
      const newColors = getThemeColors();
      setThemeColors(newColors);

      // Update theme key to force CardElement re-render
      const isDark = document.documentElement.classList.contains('dark') ||
                     window.matchMedia('(prefers-color-scheme: dark)').matches;
      setThemeKey(`card-element-${isDark ? 'dark' : 'light'}`);
    };

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
      {/* Payment Timer */}
      <div className={`rounded-lg p-4 border-2 ${
        timeRemaining < 120
          ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
          : timeRemaining < 300
          ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700'
          : 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FaClock className={`text-lg ${
              timeRemaining < 120
                ? 'text-red-600 dark:text-red-400'
                : timeRemaining < 300
                ? 'text-yellow-600 dark:text-yellow-400'
                : 'text-blue-600 dark:text-blue-400'
            }`} />
            <span className={`font-medium ${
              timeRemaining < 120
                ? 'text-red-700 dark:text-red-300'
                : timeRemaining < 300
                ? 'text-yellow-700 dark:text-yellow-300'
                : 'text-blue-700 dark:text-blue-300'
            }`}>
              {timerExpired
                ? (t('checkout.timerExpired') || 'Payment session expired')
                : (t('checkout.timeRemaining') || 'Time remaining to complete payment')
              }

            </span>
          </div>
          <div className={`text-2xl font-bold font-mono ${
            timeRemaining < 120
              ? 'text-red-700 dark:text-red-300'
              : timeRemaining < 300
              ? 'text-yellow-700 dark:text-yellow-300'
              : 'text-blue-700 dark:text-blue-300'
          }`}>
            {formatTime(timeRemaining)}
          </div>
        </div>
        {timerExpired && (
          <p className="text-sm mt-2 text-red-600 dark:text-red-400">
            {t('checkout.timerExpiredMessage') || 'Please refresh the page to start a new payment session.'}
          </p>
        )}
      </div>

      {/* Customer Information */}
      <section className="rounded-xl p-6 shadow" style={{ background: 'var(--surface)', borderColor: 'var(--border)', borderWidth: 1 }} aria-labelledby="customer-info-heading">
        <h2 id="customer-info-heading" className="text-xl font-semibold mb-4 flex items-center">
          <FaUser className="mr-2 text-indigo-600" aria-hidden="true" />
          {t('checkout.customerInformation')}
        </h2>
        <div className="space-y-3">
          <div>
            <div className="text-sm opacity-80">{t('checkout.email')}</div>
            <div className="text-base font-medium">{checkoutData.email}</div>
          </div>
        </div>
      </section>

      {/* Payment Information */}
      <section className="rounded-xl p-6 shadow" style={{ background: 'var(--surface)', borderColor: 'var(--border)', borderWidth: 1 }} aria-labelledby="payment-info-heading">
        <h2 id="payment-info-heading" className="text-xl font-semibold mb-4 flex items-center">
          <FaCreditCard className="mr-2 text-indigo-600" aria-hidden="true" />
          {t('checkout.paymentDetails')}
        </h2>

        {/* Payment Method Selection */}
        {checkoutData.paytrailEnabled && (
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">{t('checkout.paymentMethod') || 'Payment Method'}</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentProvider('stripe')}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  paymentProvider === 'stripe'
                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-gray-900 dark:text-gray-100'
                    : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                }`}
              >
                <div className="font-medium mb-1">Credit/Debit Card</div>
                <div className="text-xs opacity-70">Powered by Stripe</div>
              </button>
              <button
                type="button"
                onClick={() => setPaymentProvider('paytrail')}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  paymentProvider === 'paytrail'
                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-gray-900 dark:text-gray-100'
                    : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                }`}
              >
                <div className="font-medium mb-1">Finnish Banks</div>
                <div className="text-xs opacity-70">Paytrail</div>
              </button>
            </div>
          </div>
        )}

        {/* Stripe Card Element - Only show for Stripe */}
        {paymentProvider === 'stripe' && (
          <>
            <div className="mb-4">
              <label htmlFor="card-element" className="block text-sm font-medium mb-2">{t('checkout.cardNumber')}</label>
              <div id="card-element" className="p-3 border rounded-lg bg-transparent" style={{ borderColor: 'var(--border)' }} role="group" aria-label={t('checkout.cardNumber')}>
                <CardElement
                  key={themeKey} // Force re-render when theme changes
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
                  onChange={handleCardChange}
                />
              </div>
            </div>

            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-4">
              <FaLock className="mr-2" aria-hidden="true" />
              <span>{t('checkout.securePaymentText')}</span>
            </div>

            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg mb-6">
              <div className="flex items-start">
                <div className="text-blue-600 dark:text-blue-400 text-sm">
                  {t('checkout.cardNote')}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Paytrail Info */}
        {paymentProvider === 'paytrail' && (
          <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="text-green-800 dark:text-green-300 text-sm">
              {t('checkout.paytrailNote') || 'You will be redirected to Paytrail to complete your payment using Finnish bank or mobile payment methods.'}
            </div>
          </div>
        )}

        {error && (
          <div className="text-red-600 text-sm mb-4" role="alert" aria-live="assertive">{error}</div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 px-4 py-3 rounded-lg border font-medium transition-colors"
            style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
          >
{t('common.back')}
          </button>
          { !timerExpired && (
          <button
            type="submit"
            disabled={paymentProvider === 'stripe' && (!stripe || !cardComplete) || loading}
            className={`flex-1 px-4 py-3 rounded-lg font-medium text-white transition-colors ${
              (paymentProvider === 'stripe' && (!stripe || !cardComplete)) || loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {loading
              ? t('checkout.processing')
              : paymentProvider === 'paytrail'
                ? `${t('checkout.continueToPaytrail') || 'Continue to Paytrail'} - ${total.toFixed(2)} ${' '} ${getCurrencySymbol(checkoutData.country || 'Finland')}`
                : `${t('checkout.completePurchase')} ${total.toFixed(2)} ${' '} ${getCurrencySymbol(checkoutData.country || 'Finland')}`
            }
          </button>
          )}
        </div>
      </section>
    </form>
  );
}

function CheckoutContent() {
  const { t } = useTranslation();
  const search = useSearchParams();
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successTicketData, setSuccessTicketData] = useState<TicketData | null>(null);
  const [verifyingPaytrail, setVerifyingPaytrail] = useState(false);
  const hasStartedVerification = useRef(false);

  useEffect(() => {
    try {
      const encodedData = search.get('data');
      if (encodedData) {
        const decodedData = JSON.parse(atob(encodedData)) as CheckoutData;
        setCheckoutData(decodedData);
      } else {
        // Check if this is a Paytrail redirect - try to get data from sessionStorage
        const payment = search.get('payment');
        if (payment === 'paytrail' && typeof window !== 'undefined') {
          const storedData = sessionStorage.getItem('paytrail_checkout_data');
          if (storedData) {
            try {
              const decodedData = JSON.parse(storedData) as CheckoutData;
              // Reconstruct full CheckoutData from stored data
              // We need to get the original checkout data - it should be in sessionStorage from before Paytrail redirect
              const originalCheckoutData = sessionStorage.getItem('paytrail_original_checkout_data');
              if (originalCheckoutData) {
                const fullData = JSON.parse(originalCheckoutData) as CheckoutData;
                setCheckoutData(fullData);
              } else {
                // Fallback: use what we have
                setCheckoutData(decodedData as CheckoutData);
              }
            } catch {
              setError(t('checkout.invalidData'));
            }
          } else {
            setError(t('checkout.invalidData'));
          }
        } else {
          setError(t('checkout.invalidData'));
        }
      }
    } catch {
      setError(t('checkout.decodeError'));
    }
  }, [search, t]);

  // Handle Paytrail payment success redirect
  useEffect(() => {
    // Prevent multiple calls
    if (hasStartedVerification.current) return;

    const payment = search.get('payment');
    const status = search.get('checkout-status') || search.get('status');
    const stamp = search.get('stamp') || search.get('checkout-stamp');
    const transactionId = search.get('transactionId') || search.get('checkout-transaction-id');

    if (payment === 'paytrail' && status === 'ok' && stamp && transactionId && checkoutData) {
      hasStartedVerification.current = true;
      setVerifyingPaytrail(true);

      const verifyPaytrailPayment = async () => {
        try {
          // Use pre-calculated totals from checkoutData (already calculated correctly for multiple ticket types)
          // Don't recalculate from per-unit values - they're wrong when there are different ticket types!
          const quantity = checkoutData.quantity || 1;

          // Prefer pre-calculated totals (correct for multiple ticket types)
          const totalBasePrice = checkoutData.totalBasePrice || (checkoutData.price || 0) * quantity;
          const totalServiceFee = checkoutData.totalServiceFee || (checkoutData.serviceFee || 0) * quantity;
          const totalVatAmount = checkoutData.totalVatAmount || 0;
          const totalEntertainmentTaxAmount = checkoutData.totalEntertainmentTaxAmount || checkoutData.entertainmentTaxAmount || totalVatAmount;
          const totalServiceTaxAmount = checkoutData.totalServiceTaxAmount || checkoutData.serviceTaxAmount || 0;
          const orderFee = checkoutData.orderFee ?? 0;
          const orderFeeServiceTax = checkoutData.orderFeeServiceTax || 0;

          // Per-unit values (for backward compatibility, but totals are preferred)
          const basePrice = checkoutData.price || 0;
          const serviceFee = checkoutData.serviceFee || 0;
          const vatRate = checkoutData.vat || 0;
          const entertainmentTaxRate = checkoutData.entertainmentTax || 0;
          const serviceTaxRate = checkoutData.serviceTax ?? 0;

          // Grand total from pre-calculated components
          const finalTotal = checkoutData.total && checkoutData.total > 0
            ? checkoutData.total
            : (totalBasePrice + totalEntertainmentTaxAmount + totalServiceFee + totalServiceTaxAmount + orderFee + orderFeeServiceTax);

          console.log('[verifyPaytrailPayment] Using pre-calculated totals:', {
            hasPreCalculatedTotals: !!(checkoutData.totalBasePrice && checkoutData.totalServiceFee),
            totalBasePrice,
            totalServiceFee,
            totalEntertainmentTaxAmount,
            totalServiceTaxAmount,
            orderFee,
            orderFeeServiceTax,
            finalTotal,
            checkoutDataTotal: checkoutData.total,
            seatTickets: checkoutData.seatTickets?.length || 0
          });

          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/front'}/verify-paytrail-payment`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                stamp,
                transactionId,
                status,
                // Checkout data from URL
                eventId: checkoutData.eventId,
                email: checkoutData.email,
                customerName: checkoutData.fullName || checkoutData.email.split('@')[0],
                quantity: quantity,
                ticketTypeId: checkoutData.ticketId, // May be null for multiple ticket types
                seats: checkoutData.placeIds || [],
                placeIds: checkoutData.placeIds || [], // Explicitly send placeIds for seat marking
                seatTickets: checkoutData.seatTickets || [], // Include seatTickets for multiple ticket types
                amount: Math.round(finalTotal * 100), // cents - use pre-calculated total
                currency: 'EUR',
                // Pricing breakdown - use pre-calculated totals (correct for multiple ticket types)
                basePrice: basePrice.toString(), // Per-unit (for backward compatibility)
                serviceFee: serviceFee.toString(), // Per-unit (for backward compatibility)
                vatRate: vatRate.toString(),
                vatAmount: totalVatAmount.toFixed(3), // Total VAT amount
                serviceTax: serviceTaxRate.toString(),
                serviceTaxAmount: totalServiceTaxAmount.toFixed(3), // Total service tax amount
                entertainmentTax: entertainmentTaxRate > 0 ? entertainmentTaxRate.toString() : undefined,
                entertainmentTaxAmount: totalEntertainmentTaxAmount.toFixed(3), // Total entertainment tax
                orderFee: orderFee.toString(),
                orderFeeServiceTax: orderFeeServiceTax.toFixed(3),
                // CRITICAL: Use pre-calculated totals (not per-unit * quantity)
                totalBasePrice: totalBasePrice.toFixed(3),
                totalServiceFee: totalServiceFee.toFixed(3),
                country: checkoutData.country || 'Finland',
                fullName: checkoutData.fullName,
                // Security: Include nonce to prevent duplicate submissions
                nonce: checkoutData.nonce,
                locale: window.localStorage.getItem('locale') || 'en-US',
                // Presale: one-time token to consume on successful payment (fallback when Redis expired)
                ...(checkoutData.presaleToken && { presaleToken: checkoutData.presaleToken })
              })
            }
          );

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || errorData.message || 'Payment verification failed');
          }

          const data = await response.json();

          if (data.success && data.ticket) {
            // Pass the full ticket object to SuccessPage (not simplified)
            setSuccessTicketData(data.ticket);
            // Clear checkout data from sessionStorage
            if (typeof window !== 'undefined') {
              sessionStorage.removeItem('paytrail_checkout_data');
              sessionStorage.removeItem('paytrail_original_checkout_data');
            }
          } else {
            throw new Error(data.error || 'Payment verification failed');
          }
        } catch (err) {
          console.error('Error verifying Paytrail payment:', err);
          setError(err instanceof Error ? err.message : 'Payment verification failed');
        } finally {
          setVerifyingPaytrail(false);
        }
      };

      verifyPaytrailPayment();
    } else if (payment === 'paytrail' && (status === 'fail' || status === 'cancel')) {
      hasStartedVerification.current = true;
      setVerifyingPaytrail(true);

      const handlePaymentFailure = async () => {
        try {
          // Get checkout data from sessionStorage
          const storedCheckoutData = typeof window !== 'undefined'
            ? sessionStorage.getItem('paytrail_checkout_data')
            : null;

          const checkoutDataForFailure = storedCheckoutData
            ? JSON.parse(storedCheckoutData)
            : checkoutData;

          if (checkoutDataForFailure) {
            // Call backend to release reservations and clean up
            await fetch(
              `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/front'}/handle-paytrail-payment-failure`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  stamp,
                  transactionId,
                  status,
                  eventId: checkoutDataForFailure.eventId,
                  placeIds: checkoutDataForFailure.placeIds || [],
                  sessionId: checkoutDataForFailure.sessionId,
                  email: checkoutDataForFailure.email
                })
              }
            );

            // Clear checkout data from sessionStorage
            if (typeof window !== 'undefined') {
              sessionStorage.removeItem('paytrail_checkout_data');
              sessionStorage.removeItem('paytrail_original_checkout_data');
            }
          }

          // Set appropriate error message
          if (status === 'cancel') {
            setError(t('payment.cancelled') || 'Payment was cancelled. Your seats have been released.');
          } else {
            setError(t('payment.failed') || 'Payment failed. Your seats have been released. Please try again.');
          }
        } catch (err) {
          console.error('Error handling payment failure:', err);
          setError(t('payment.failed') || 'Payment failed. Please try again.');
        } finally {
          setVerifyingPaytrail(false);
        }
      };

      handlePaymentFailure();
    }
  }, [search, checkoutData, t]);

  // Handle success state - show success page
  if (successTicketData) {
    // Type assertion: checkout TicketData may have optional fields, but SuccessPage can handle it
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return <SuccessPage ticketData={successTicketData as any} />;
  }

  if (error) {
    const eventId = checkoutData?.eventId || search.get('eventId');
    const paymentStatus = search.get('checkout-status') || search.get('status');
    const isPaymentFailure = search.get('payment') === 'paytrail' &&
                            (paymentStatus === 'fail' || paymentStatus === 'cancel');

    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <div className="text-center max-w-md mx-auto px-4">
          <div className="mb-6">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
              <svg className="h-8 w-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text)' }}>
              {isPaymentFailure
                ? (paymentStatus === 'cancel'
                    ? t('payment.cancelled') || 'Payment Cancelled'
                    : t('payment.failed') || 'Payment Failed')
                : t('checkout.error') || 'Error'}
            </h1>
            <p className="text-red-600 dark:text-red-400 mb-6">{error}</p>
          </div>

          {isPaymentFailure && eventId && (
            <div className="space-y-4">
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {t('payment.failure.message') || 'Your seat reservations have been released. You can try again to complete your purchase.'}
              </p>
              <a
                href={`/events/${eventId}/seats`}
                className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                {t('payment.retry') || 'Try Again'}
              </a>
            </div>
          )}

          {!isPaymentFailure && (
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors mt-4"
            >
              {t('checkout.backToHome') || 'Back to Home'}
            </Link>
          )}
        </div>
      </div>
    );
  }

  if (!checkoutData || verifyingPaytrail) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold mb-4">
            {verifyingPaytrail ? (t('payment.verifying') || 'Verifying payment...') : t('checkout.loading')}
          </h1>
        </div>
      </div>
    );
  }

  // VAT is calculated on base price
  const perUnitVat = checkoutData.price * (checkoutData.vat / 100);
  // Calculate service tax on service fee (this is the "service VAT")
  const serviceTaxRate = checkoutData.serviceTax ?? 0;
  const perUnitServiceTax = (checkoutData.serviceFee > 0 && serviceTaxRate > 0)
    ? checkoutData.serviceFee * (serviceTaxRate / 100)
    : 0;
  // Calculate service tax on order fee
  const orderFee = checkoutData.orderFee ?? 0;
  const orderFeeServiceTax = (orderFee > 0 && serviceTaxRate > 0)
    ? orderFee * (serviceTaxRate / 100)
    : 0;
  // Total = (basePrice + serviceFee + VAT on price + serviceTax on serviceFee) * quantity + orderFee + serviceTax on orderFee
  const total = Math.round((checkoutData.price + checkoutData.serviceFee + perUnitVat + perUnitServiceTax) * checkoutData.quantity * 100 + orderFee * 100 + orderFeeServiceTax * 100) / 100;

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
                    <span>{(checkoutData.price * checkoutData.quantity).toFixed(3)} {' '} {getCurrencySymbol(checkoutData.country || 'Finland')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-80">{t('checkout.serviceFee')}</span>
                    <span>{(checkoutData.serviceFee * checkoutData.quantity).toFixed(3)} {' '} {getCurrencySymbol(checkoutData.country || 'Finland')}</span>
                  </div>
                  {serviceTaxRate > 0 && perUnitServiceTax > 0 && (
                    <div className="flex justify-between">
                      <span className="opacity-80">{t('ticketModal.serviceTax') || 'Service Tax'} ({serviceTaxRate}%) {t('ticketModal.onServiceFee') || 'on Service Fee'}</span>
                      <span>{(perUnitServiceTax * checkoutData.quantity).toFixed(3)} {' '} {getCurrencySymbol(checkoutData.country || 'Finland')}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="opacity-80">{t('checkout.vat')} ({checkoutData.vat}%)</span>
                    <span>{(perUnitVat * checkoutData.quantity).toFixed(3)} {' '} {getCurrencySymbol(checkoutData.country || 'Finland')}</span>
                  </div>
                  {orderFee > 0 && (
                    <>
                      <div className="flex justify-between">
                        <span className="opacity-80">{t('ticketModal.orderFee') || 'Order Fee'} {t('ticketModal.perTransaction') || '(per transaction)'}</span>
                        <span>{orderFee.toFixed(3)} {' '} {getCurrencySymbol(checkoutData.country || 'Finland')}</span>
                      </div>
                      {serviceTaxRate > 0 && orderFeeServiceTax > 0 && (
                        <div className="flex justify-between">
                          <span className="opacity-80">{t('ticketModal.serviceTax') || 'Service Tax'} ({serviceTaxRate}%) {t('ticketModal.onOrderFee') || 'on Order Fee'}</span>
                          <span>{orderFeeServiceTax.toFixed(3)} {' '} {getCurrencySymbol(checkoutData.country || 'Finland')}</span>
                        </div>
                      )}
                    </>
                  )}
                  <div className="flex justify-between">
                    <span className="opacity-80">{t('checkout.quantity')}</span>
                    <span>{checkoutData.quantity}</span>
                  </div>
                  <div className="border-t pt-3 flex justify-between text-lg font-semibold" style={{ borderColor: 'var(--border)' }}>
                    <span>{t('checkout.total')}</span>
                    <span>{total.toFixed(3)} {' '} {getCurrencySymbol(checkoutData.country || 'Finland')}</span>
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