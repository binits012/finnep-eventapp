'use client';

import React from 'react';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { useTranslation } from '@/hooks/useTranslation';
import { api } from '@/services/apiClient';
import { LocaleInfo } from '@/utils/localeUtils';

interface FrontApiResponse {
  setting?: Array<{
    _id: string;
    otherInfo?: {
      locales?: LocaleInfo[];
    };
  }>;
}

export default function HelpPage() {
  const { t, locale } = useTranslation();
  const [manualContent, setManualContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfExists, setPdfExists] = useState<boolean>(false);
  const [pdfPath, setPdfPath] = useState<string>('');
  const [pdfFileName, setPdfFileName] = useState<string>('USER_MANUAL.pdf');

  useEffect(() => {
    const loadHelpData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch locale data from /front API
        const frontData = await api.get<FrontApiResponse>('/');

        // Extract locales from API response
        const locales = frontData.setting?.[0]?.otherInfo?.locales || [];

        // Find current locale or fallback to English
        const currentLocaleInfo = locales.find((loc: LocaleInfo) => loc.code === locale)
          || locales.find((loc: LocaleInfo) => loc.code === 'en-US');

        if (!currentLocaleInfo) {
          throw new Error('No locale data found in API response');
        }

        // Use md and pdf keys from API response
        const manualUrl = currentLocaleInfo.md;
        const pdfUrl = currentLocaleInfo.pdf;
        const pdfName = `USER_MANUAL_${currentLocaleInfo.code}.pdf`;

        if (!manualUrl || !pdfUrl) {
          throw new Error(`Missing manual URLs for locale ${currentLocaleInfo.code}`);
        }

        setPdfPath(pdfUrl);
        setPdfFileName(pdfName);

        // Load the user manual markdown file
        const loadManual = async () => {
          try {
            const response = await fetch(manualUrl, { cache: 'no-store' });
            if (response.ok) {
              const text = await response.text();
              setManualContent(text);
            } else {
              // Fallback to English if current locale fails
              if (currentLocaleInfo.code !== 'en-US') {
                const englishLocale = locales.find((loc: LocaleInfo) => loc.code === 'en-US');
                if (englishLocale?.md) {
                  console.log(`Locale-specific manual not found, falling back to English`);
                  const fallbackResponse = await fetch(englishLocale.md, { cache: 'no-store' });
                  if (fallbackResponse.ok) {
                    const text = await fallbackResponse.text();
                    setManualContent(text);
                  } else {
                    throw new Error('Failed to load user manual');
                  }
                } else {
                  throw new Error('Failed to load user manual');
                }
              } else {
                throw new Error('Failed to load user manual');
              }
            }
          } catch (err) {
            console.error('Error loading user manual:', err);
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            throw new Error(`Failed to load user manual: ${errorMessage}`);
          }
        };

        // Check if PDF exists
        const checkPdf = async () => {
          try {
            const response = await fetch(pdfUrl, { method: 'HEAD', cache: 'no-store' });
            if (response.ok) {
              setPdfExists(true);
            } else {
              // Fallback to English PDF if current locale fails
              if (currentLocaleInfo.code !== 'en-US') {
                const englishLocale = locales.find((loc: LocaleInfo) => loc.code === 'en-US');
                if (englishLocale?.pdf) {
                  const fallbackResponse = await fetch(englishLocale.pdf, { method: 'HEAD', cache: 'no-store' });
                  if (fallbackResponse.ok) {
                    setPdfExists(true);
                    setPdfPath(englishLocale.pdf);
                    setPdfFileName('USER_MANUAL_en-US.pdf');
                  } else {
                    setPdfExists(false);
                  }
                } else {
                  setPdfExists(false);
                }
              } else {
                setPdfExists(false);
              }
            }
          } catch {
            setPdfExists(false);
          }
        };

        // Load manual and check PDF in parallel
        await Promise.all([loadManual(), checkPdf()]);
        setLoading(false);
      } catch (err) {
        console.error('Error loading help data:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to load help data';
        setError(errorMessage);
        setLoading(false);
      }
    };

    loadHelpData();
  }, [locale]);

  if (loading) {
    return (
      <div className="min-h-screen py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center py-20">
              <div className="animate-pulse space-y-4">
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mx-auto"></div>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mx-auto"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mt-8"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6 mx-auto"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center py-20">
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md mx-auto">
                <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-2">
                  {t('help.error.title') || 'Error Loading Manual'}
                </h2>
                <p className="text-red-700 dark:text-red-300 mb-4">
                  {error}
                </p>
                <p className="text-sm text-red-600 dark:text-red-400">
                  {t('help.error.message') || 'Please try refreshing the page or contact support.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header Section */}
          <div className="mb-10 text-center">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4" style={{ color: 'var(--foreground)' }}>
              {t('help.title') || 'User Manual'}
            </h1>
            <p className="text-lg sm:text-xl opacity-80" style={{ color: 'var(--foreground)' }}>
              {t('help.subtitle') || 'Complete guide to using Finnep Event App'}
            </p>
          </div>

          {/* Download PDF Button */}
          {pdfExists ? (
            <div className="mb-10 flex justify-center">
              <a
                href={pdfPath}
                download={pdfFileName}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                {t('help.downloadPdf') || 'Download PDF Version'}
              </a>
            </div>
          ) : (
            <div className="mb-10 flex justify-center">
              <div className="inline-flex items-center px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-medium rounded-lg border border-gray-300 dark:border-gray-700">
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-sm">
                  {t('help.pdfNotAvailable') || 'PDF version will be available soon. Use the print function in your browser to save as PDF.'}
                </span>
              </div>
            </div>
          )}

          {/* Markdown Content */}
          <article
            className="prose prose-lg dark:prose-invert max-w-none
              prose-headings:font-bold
              prose-h1:text-3xl prose-h1:mb-6 prose-h1:mt-10 prose-h1:scroll-mt-24
              prose-h2:text-2xl prose-h2:mb-4 prose-h2:mt-8 prose-h2:scroll-mt-24 prose-h2:border-b prose-h2:pb-2 prose-h2:border-gray-200 dark:prose-h2:border-gray-700
              prose-h3:text-xl prose-h3:mb-3 prose-h3:mt-6 prose-h3:scroll-mt-24
              prose-p:leading-relaxed prose-p:mb-4
              prose-a:no-underline prose-a:font-medium hover:prose-a:underline
              prose-strong:font-semibold
              prose-ul:my-4 prose-ul:space-y-2
              prose-ol:my-4 prose-ol:space-y-2
              prose-li:my-1
              prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono
              prose-blockquote:border-l-4 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:my-6
              prose-table:w-full prose-table:my-6
              prose-th:font-semibold
              prose-img:rounded-lg prose-img:shadow-md prose-img:my-6
              prose-hr:my-8
              rounded-lg p-6 sm:p-8 md:p-10 lg:p-12"
            style={{
              background: 'var(--surface)',
              color: 'var(--foreground)',
              borderWidth: 1,
              borderColor: 'var(--border)',
            }}
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw]}
              components={{
                h1: ({ ...props }) => (
                  <h1 className="text-3xl font-bold mb-6 mt-10 scroll-mt-24" style={{ color: 'var(--foreground)' }} {...props} />
                ),
                h2: ({ ...props }) => (
                  <h2 className="text-2xl font-bold mb-4 mt-8 scroll-mt-24 border-b pb-2" style={{ color: 'var(--foreground)', borderColor: 'var(--border)' }} {...props} />
                ),
                h3: ({ ...props }) => (
                  <h3 className="text-xl font-semibold mb-3 mt-6 scroll-mt-24" style={{ color: 'var(--foreground)' }} {...props} />
                ),
                p: ({ children, ...props }) => {
                  // Extract text content from children to check if it's an FAQ answer
                  const extractText = (children: React.ReactNode): string => {
                    if (typeof children === 'string') return children;
                    if (Array.isArray(children)) {
                      return children.map((c) => {
                        if (typeof c === 'string') return c;
                        if (typeof c === 'object' && c !== null) {
                          const childObj = c as { props?: { children?: React.ReactNode }; children?: React.ReactNode };
                          if (childObj?.props?.children) return extractText(childObj.props.children);
                          if (childObj?.children) return extractText(childObj.children);
                        }
                        return '';
                      }).join('');
                    }
                    if (typeof children === 'object' && children !== null) {
                      const childObj = children as { props?: { children?: React.ReactNode }; children?: React.ReactNode };
                      if (childObj?.props?.children) return extractText(childObj.props.children);
                      if (childObj?.children) return extractText(childObj.children);
                    }
                    return '';
                  };

                  const text = extractText(children);

                  // Check if this is an FAQ answer (starts with "A:")
                  if (text.trim().startsWith('A:')) {
                    return (
                      <p
                        className="mb-6 ml-6 pl-4 border-l-2 leading-relaxed"
                        style={{
                          color: 'var(--foreground)',
                          opacity: 0.9,
                          borderColor: 'var(--border)'
                        }}
                        {...props}
                      >
                        {children}
                      </p>
                    );
                  }

                  return (
                    <p className="mb-4 leading-relaxed" style={{ color: 'var(--foreground)', opacity: 0.9 }} {...props}>
                      {children}
                    </p>
                  );
                },
                strong: ({ children, ...props }) => {
                  const text = typeof children === 'string' ? children :
                    (Array.isArray(children) ? children.map((c) =>
                      typeof c === 'string' ? c : ''
                    ).join('') : '');

                  // Check if this is an FAQ question
                  if (text.includes('Q:')) {
                    return (
                      <strong
                        className="block mb-2 font-semibold"
                        style={{ color: 'var(--foreground)' }}
                        {...props}
                      >
                        {children}
                      </strong>
                    );
                  }

                  return (
                    <strong className="font-semibold" style={{ color: 'var(--foreground)' }} {...props}>
                      {children}
                    </strong>
                  );
                },
                a: ({ ...props }) => (
                  <a className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium" {...props} />
                ),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                code: ({ inline, ...props }: any) => {
                  if (inline) {
                    return (
                      <code
                        className="px-1.5 py-0.5 rounded text-sm font-mono bg-gray-100 dark:bg-gray-800 text-indigo-600 dark:text-indigo-400"
                        {...props}
                      />
                    );
                  }
                  return <code {...props} />;
                },
                ul: ({ ...props }) => (
                  <ul className="my-4 space-y-2 list-disc list-inside" style={{ color: 'var(--foreground)', opacity: 0.9 }} {...props} />
                ),
                ol: ({ ...props }) => (
                  <ol className="my-4 space-y-2 list-decimal list-inside" style={{ color: 'var(--foreground)', opacity: 0.9 }} {...props} />
                ),
                li: ({ ...props }) => (
                  <li className="my-1" style={{ color: 'var(--foreground)', opacity: 0.9 }} {...props} />
                ),
                blockquote: ({ ...props }) => (
                  <blockquote
                    className="border-l-4 pl-4 italic my-6"
                    style={{ borderColor: 'var(--border)', color: 'var(--foreground)', opacity: 0.8 }}
                    {...props}
                  />
                ),
                table: ({ ...props }) => (
                  <div className="overflow-x-auto my-6">
                    <table className="w-full border-collapse" {...props} />
                  </div>
                ),
                th: ({ ...props }) => (
                  <th
                    className="border px-4 py-2 text-left font-semibold bg-gray-100 dark:bg-gray-800"
                    style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
                    {...props}
                  />
                ),
                td: ({ ...props }) => (
                  <td
                    className="border px-4 py-2"
                    style={{ borderColor: 'var(--border)', color: 'var(--foreground)', opacity: 0.9 }}
                    {...props}
                  />
                ),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                img: ({ alt, ...props }: any) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="rounded-lg shadow-md my-6 max-w-full h-auto" alt={alt || ''} {...props} />
                ),
              }}
            >
              {manualContent}
            </ReactMarkdown>
          </article>

          {/* Back to Top Button */}
          <div className="mt-12 text-center">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
              style={{ color: 'var(--foreground)' }}
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 10l7-7m0 0l7 7m-7-7v18"
                />
              </svg>
              {t('help.backToTop') || 'Back to Top'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

