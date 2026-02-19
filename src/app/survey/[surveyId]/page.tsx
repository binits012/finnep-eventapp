'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { surveyAPI, type SurveyPublic, type SurveyQuestion } from '@/services/apiClient';
import CapjsWidget from '@/components/CapjsWidget';

export default function SurveyPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const surveyId = params?.surveyId as string;
  const tokenFromUrl = searchParams?.get('token') ?? undefined;
  const [token, setToken] = useState<string | undefined>(tokenFromUrl);
  const [survey, setSurvey] = useState<SurveyPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [responses, setResponses] = useState<Record<string, string | number | string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | undefined>(undefined);

  useEffect(() => {
    setToken(tokenFromUrl);
  }, [tokenFromUrl]);

  useEffect(() => {
    if (!surveyId) return;
    const currentToken = token ?? tokenFromUrl;
    if (!currentToken) {
      setError('Survey link is invalid (missing token). Please use the link from your email.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    surveyAPI
      .getSurvey(surveyId, currentToken)
      .then((data) => {
        if (!cancelled) {
          setSurvey(data);
          if (data.submitted) setSubmitted(true);
          if (!data.active && !data.submitted) setError('This survey is no longer accepting responses.');
        }
      })
      .catch((err) => {
        if (!cancelled) {
          const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
          setError(msg ?? (err instanceof Error ? err.message : 'Failed to load survey'));
          setSurvey(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [surveyId, token, tokenFromUrl]);

  const setAnswer = (questionId: string, value: string | number | string[]) => {
    setResponses((prev) => ({ ...prev, [questionId]: value }));
  };

  const isRequiredQuestionAnswered = (q: SurveyQuestion): boolean => {
    const value = responses[q.id];
    if (!q.required) return true;
    switch (q.type) {
      case 'text':
        return typeof value === 'string' && value.trim().length > 0;
      case 'rating': {
        const n = Number(value);
        return Number.isInteger(n) && n >= 1 && n <= 5;
      }
      case 'single_choice':
        return typeof value === 'string' && value.trim().length > 0;
      case 'multiple_choice':
        return Array.isArray(value) && value.length > 0;
      default:
        return true;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!survey || !surveyId) return;
    const submitToken = token ?? tokenFromUrl;
    if (!submitToken) {
      setSubmitError('Cannot submit: survey link is invalid (missing token). Please use the link from your email.');
      return;
    }
    if (!captchaVerified) {
      setSubmitError('Please complete the captcha.');
      return;
    }
    const requiredMissing = (survey.questions || []).filter((q) => !isRequiredQuestionAnswered(q));
    if (requiredMissing.length > 0) {
      setSubmitError(
        requiredMissing.length === 1
          ? `Please answer the required question: "${requiredMissing[0].label}"`
          : `Please answer all required questions (${requiredMissing.length} missing).`
      );
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      await surveyAPI.submitResponse(surveyId, {
        token: submitToken,
        ...(captchaToken ? { captchaToken } : {}),
        responses: responses as Record<string, unknown>
      });
      setSubmitted(true);
      router.replace(`/survey/${surveyId}?token=${encodeURIComponent(submitToken)}`);
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setSubmitError(msg ?? (err instanceof Error ? err.message : 'Failed to submit'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
        <p>Loading survey…</p>
      </div>
    );
  }

  if (error || !survey) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400">{error || 'Survey not found.'}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
        <div className="max-w-md w-full text-center">
          <h1 className="text-2xl font-bold mb-4">Thank you</h1>
          <p>Your response has been submitted.</p>
        </div>
      </div>
    );
  }

  const context = survey.context;
  const hasContext = context && (context.eventTitle || context.eventDate || context.merchantName);

  return (
    <div className="min-h-screen py-12 px-4" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
      <div className="max-w-lg mx-auto">
        {hasContext && (
          <div className="mb-6 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            {context.eventTitle && (
              <p className="text-base font-medium text-gray-800 dark:text-gray-200">
                {context.eventTitle}
              </p>
            )}
            {context.eventDate && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                {new Date(context.eventDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}
              </p>
            )}
            {context.merchantName && (
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                by {context.merchantName}
              </p>
            )}
          </div>
        )}
        <h1 className="text-2xl font-bold mb-6">{survey.name}</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          {(survey.questions || []).map((q: SurveyQuestion) => (
            <div key={q.id}>
              <label className="block text-sm font-medium mb-2">
                {q.label}
                {q.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {q.type === 'text' && (
                <input
                  type="text"
                  value={(responses[q.id] as string) ?? ''}
                  onChange={(e) => setAnswer(q.id, e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent"
                  required={q.required}
                />
              )}
              {q.type === 'rating' && (
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setAnswer(q.id, n)}
                      className={`w-10 h-10 rounded-lg border ${
                        responses[q.id] === n
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              )}
              {q.type === 'single_choice' && (
                <select
                  value={(responses[q.id] as string) ?? ''}
                  onChange={(e) => setAnswer(q.id, e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent"
                  required={q.required}
                >
                  <option value="">Select…</option>
                  {(q.options || []).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              )}
              {q.type === 'multiple_choice' && (
                <div className="space-y-2">
                  {(q.options || []).map((opt) => {
                    const current = (responses[q.id] as string[]) || [];
                    const checked = current.includes(opt);
                    return (
                      <label key={opt} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...current, opt]
                              : current.filter((x) => x !== opt);
                            setAnswer(q.id, next);
                          }}
                        />
                        <span>{opt}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
          <div>
            <CapjsWidget
              onVerify={(detail) => {
                setCaptchaVerified(true);
                setSubmitError(null);
                const t = detail && typeof detail === 'object' && 'token' in detail && typeof (detail as { token?: string }).token === 'string'
                  ? (detail as { token: string }).token
                  : undefined;
                if (t) setCaptchaToken(t);
              }}
              onError={() => setCaptchaVerified(false)}
            />
          </div>
          {submitError && <p className="text-sm text-red-600 dark:text-red-400">{submitError}</p>}
          <button
            type="submit"
            disabled={submitting || !captchaVerified}
            className="w-full py-3 px-4 rounded-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting ? 'Submitting…' : 'Submit'}
          </button>
        </form>
      </div>
    </div>
  );
}
