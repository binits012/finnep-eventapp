'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { surveyAPI, type SurveyPublic, type SurveyQuestion } from '@/services/apiClient';

export default function SurveyPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const surveyId = params?.surveyId as string;
  const merchantId = searchParams?.get('merchantId') ?? undefined;
  const [survey, setSurvey] = useState<SurveyPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [responses, setResponses] = useState<Record<string, string | number | string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!surveyId) return;
    if (!merchantId) {
      setError('Survey link is invalid (missing merchant).');
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    surveyAPI
      .getSurvey(surveyId, merchantId)
      .then((data) => {
        if (!cancelled) {
          setSurvey(data);
          if (!data.active) setError('This survey is no longer accepting responses.');
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load survey');
          setSurvey(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [surveyId, merchantId]);

  const setAnswer = (questionId: string, value: string | number | string[]) => {
    setResponses((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!survey || !surveyId) return;
    const mId = survey.merchantId ?? merchantId;
    if (!mId) {
      setSubmitError('Cannot submit: merchant not set.');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      await surveyAPI.submitResponse(surveyId, {
        merchantId: mId,
        responses: responses as Record<string, unknown>
      });
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit');
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

  return (
    <div className="min-h-screen py-12 px-4" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold mb-2">{survey.name}</h1>
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
          {submitError && <p className="text-sm text-red-600 dark:text-red-400">{submitError}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 rounded-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting ? 'Submitting…' : 'Submit'}
          </button>
        </form>
      </div>
    </div>
  );
}
