'use client';
import { useEffect, useRef, useState, useCallback } from 'react';

// Type definitions for CapJS
declare global {
  interface Window {
    __capjsLoaded?: boolean;
    CAP_CUSTOM_FETCH?: (url: string, options?: RequestInit) => Promise<Response>;
    CAP_DONT_SKIP_REDEFINE?: boolean;
  }
}

interface CustomEventDetail {
  message?: string;
  [key: string]: unknown;
}

interface CapjsWidgetProps {
  serverUrl?: string;
  onVerify?: (detail: CustomEventDetail) => void;
  onError?: (error: string) => void;
  theme?: string;
}

const CapjsWidget = ({
  serverUrl = process.env.NEXT_PUBLIC_CAP_SERVER_URL,
  onVerify = () => {},
  onError = () => {},
  theme = 'light'
}: CapjsWidgetProps) => {
  const widgetRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const renderWidget = useCallback(() => {
    if (!window.customElements.get('cap-widget')) {
      window.customElements.whenDefined('cap-widget').then(renderWidget);
      return;
    }

    if (widgetRef.current && !isInitialized) {
      setIsInitialized(true);

      // Replace any previous widget cleanly
      widgetRef.current.innerHTML = '';
      window.CAP_CUSTOM_FETCH = function (url: string, options: RequestInit = {}) {
        const headers = {
          ...(options.headers as Record<string, string> || {}),
          'X-API-Key': process.env.NEXT_PUBLIC_CAPJS_API_KEY || '',
        };

        return fetch(url, {
          ...options,
          headers
        });
      };
      const capWidget = document.createElement('cap-widget');
      capWidget.setAttribute('data-cap-api-endpoint', `${serverUrl}/api/`);
      capWidget.setAttribute('theme', theme);

      // ✅ Use correct event name
      capWidget.addEventListener('solve', (e: Event) => {
        const customEvent = e as CustomEvent<CustomEventDetail>;
        setIsVerified(true);
        setError(null);
        onVerify(customEvent.detail);
      });

      capWidget.addEventListener('error', (e: Event) => {
        const customEvent = e as CustomEvent<CustomEventDetail>;
        const err = customEvent.detail?.message ||
                   (typeof customEvent.detail === 'string' ? customEvent.detail : 'Unknown error');
        setError(err);
        setIsVerified(false);
        onError(err);
      });

      widgetRef.current.appendChild(capWidget);

      // Inject style to hide the Cap link
      setTimeout(() => {
        if (capWidget.shadowRoot) {
          const style = document.createElement('style');
          style.textContent = `.credits { display: none !important; }`;
          capWidget.shadowRoot.appendChild(style);
        }
      }, 0);
    }
  }, [serverUrl, theme, onVerify, onError, isInitialized]);

  useEffect(() => {
    // Validate server URL
    if (!serverUrl) {
      setError('CAPTCHA service is not configured. Please contact support or try again later.');
      // In development, we could potentially bypass CAPTCHA here
      // For production, we should require proper configuration
      return;
    }

    // Set flag to prevent redefinition warning - must be set before script loads
    window.CAP_DONT_SKIP_REDEFINE = false;
    if (!window.__capjsLoaded) {
      const script = document.createElement('script');
      script.src = `${serverUrl}/assets/cap.min.js`;
      script.async = true;
      script.onload = () => {
        window.__capjsLoaded = true;
        setTimeout(() => renderWidget(), 0); // Yield for DOM stability
      };
      script.onerror = () => {
        console.error('CAPTCHA script failed to load from:', `${serverUrl}/assets/cap.min.js`);
        setError('Failed to load CAPTCHA service. Please try again later.');
      };
      document.head.appendChild(script);
    } else {
      setTimeout(() => renderWidget(), 0);
    }
  }, [renderWidget, serverUrl]);

  const resetWidget = () => {
    setIsVerified(false);
    setError(null);
    if (widgetRef.current) {
      widgetRef.current.innerHTML = '';
      renderWidget();
    }
  };

  return (
    <div className="w-full">
      {error && (
        <p className="text-red-600 dark:text-red-400 text-sm mb-1">
          {error}
        </p>
      )}

      {isVerified && (
        <p className="text-green-600 dark:text-green-400 text-sm mb-1">
          ✓ Verified
        </p>
      )}

      <div
        ref={widgetRef}
        className={`min-h-[80px] ${isVerified ? 'hidden' : 'flex justify-center items-center'}`}
      />

      {isVerified && (
        <button
          type="button"
          onClick={resetWidget}
          className="mt-1 px-3 py-1.5 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
        >
          Reset CAPTCHA
        </button>
      )}
    </div>
  );
};

export default CapjsWidget;
