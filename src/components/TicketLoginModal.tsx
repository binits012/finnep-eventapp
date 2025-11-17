'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/services/apiClient';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/hooks/useTranslation';
import CapjsWidget from './CapjsWidget';
import { AxiosError } from 'axios';

interface TicketLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Utility function to obfuscate email for GDPR compliance
const obfuscateEmail = (email: string): string => {
  if (!email || !email.includes('@')) return email;

  const [localPart, domain] = email.split('@');
  if (localPart.length <= 2) {
    // Very short email, show first char only
    return `${localPart[0]}***@${domain}`;
  } else if (localPart.length <= 4) {
    // Short email, show first 2 chars
    return `${localPart.substring(0, 2)}***@${domain}`;
  } else {
    // Normal email, show first 3 chars
    return `${localPart.substring(0, 3)}***@${domain}`;
  }
};

export default function TicketLoginModal({ isOpen, onClose }: TicketLoginModalProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!captchaVerified) {
      setError(t('ticketLogin.errors.captchaRequired'));
      return;
    }

    setError('');
    setLoading(true);

    try {
      // Check if email exists
      const checkResponse = await api.post<{ success: boolean; exists: boolean }>('/guest/check-email', { email });

      if (!checkResponse.exists) {
        setError(t('ticketLogin.errors.emailNotFound'));
        setLoading(false);
        return;
      }

      // Send verification code
      await api.post('/guest/send-code', { email });
      setStep('code');
      setResendTimer(180); // 3  minutes cooldown
      setCaptchaVerified(false); // Reset CAPTCHA for next time
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      setError(axiosError.response?.data?.message || t('ticketLogin.errors.checkEmailError'));
    } finally {
      setLoading(false);
    }
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post<{ success: boolean; token: string; expiresIn: number }>('/guest/verify-code', {
        email,
        code
      });

      if (response.success && response.token) {
        // Store guest token
        localStorage.setItem('guest_token', response.token);
        // Close modal and redirect to tickets page
        onClose();
        router.push('/my-tickets');
      }
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      setError(axiosError.response?.data?.message || t('ticketLogin.errors.invalidCode'));
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendTimer > 0) return;

    setError('');
    setLoading(true);

    try {
      await api.post('/guest/send-code', { email });
      setResendTimer(180); // 3 minutes cooldown
      setError('');
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      setError(axiosError.response?.data?.message || t('ticketLogin.errors.sendCodeError'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('email');
    setEmail('');
    setCode('');
    setError('');
    setResendTimer(0);
    setCaptchaVerified(false);
    onClose();
  };

  const handleCaptchaVerify = () => {
    setCaptchaVerified(true);
    setError('');
  };

  const handleCaptchaError = (error: string) => {
    setCaptchaVerified(false);
    setError(error);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6 md:p-8"
            style={{ color: 'var(--foreground)', background: 'var(--background)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-2xl font-bold mb-6">{t('ticketLogin.title')}</h2>

            {step === 'email' ? (
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-2">
                    {t('ticketLogin.emailLabel')}
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    style={{
                      background: 'var(--surface)',
                      borderColor: 'var(--border)',
                      color: 'var(--foreground)'
                    }}
                    placeholder={t('ticketLogin.emailPlaceholder')}
                    disabled={loading}
                  />
                </div>

                {/* CAPTCHA Widget */}
                <div className="mt-4">
                  <CapjsWidget
                    onVerify={handleCaptchaVerify}
                    onError={handleCaptchaError}
                    theme="light"
                  />
                </div>

                {error && (
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !email || !captchaVerified}
                  className="w-full py-2 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? t('ticketLogin.checking') : t('ticketLogin.continue')}
                </button>
              </form>
            ) : (
              <form onSubmit={handleCodeSubmit} className="space-y-4">
                <div>
                  <label htmlFor="code" className="block text-sm font-medium mb-2">
                    {t('ticketLogin.verificationCodeLabel')}
                  </label>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {t('ticketLogin.codeSentMessage')} <strong>{obfuscateEmail(email)}</strong>
                  </p>
                  <input
                    id="code"
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    required
                    maxLength={8}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-center text-2xl tracking-widest font-mono"
                    style={{
                      background: 'var(--surface)',
                      borderColor: 'var(--border)',
                      color: 'var(--foreground)'
                    }}
                    placeholder={t('ticketLogin.codePlaceholder')}
                    disabled={loading}
                  />
                </div>

                {error && (
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setStep('email')}
                    className="flex-1 py-2 px-4 border rounded-lg font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    style={{ borderColor: 'var(--border)' }}
                    disabled={loading}
                  >
                    {t('ticketLogin.back')}
                  </button>
                  <button
                    type="submit"
                    disabled={loading || code.length !== 8}
                    className="flex-1 py-2 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? t('ticketLogin.verifying') : t('ticketLogin.verify')}
                  </button>
                </div>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={resendTimer > 0 || loading}
                    className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resendTimer > 0 ? t('ticketLogin.resendCodeIn', { seconds: resendTimer }) : t('ticketLogin.resendCode')}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

