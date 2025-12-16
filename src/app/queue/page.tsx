"use client";

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

interface QueueData {
  position: number;
  queueSize: number;
  estimatedWaitMinutes: number;
  isReady?: boolean;
  waitExpired?: boolean;
  gracePeriodActive?: boolean;
  priorityBoost?: {
    newPosition: number;
    reason: string;
  };
}

export default function QueuePage() {
  const searchParams = useSearchParams();
  const [queueData, setQueueData] = useState<QueueData | null>(null);
  const [queueToken, setQueueToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const returnUrl = searchParams.get('return') || '/';
  const tokenFromUrl = searchParams.get('token');

  useEffect(() => {
    // Priority: URL token (new join) > localStorage token (refresh)
    const token = tokenFromUrl || localStorage.getItem('queueToken');

    if (token) {
      setQueueToken(token);
      // Store token in localStorage for refresh scenarios
      if (tokenFromUrl) {
        // New token from URL - store it
        localStorage.setItem('queueToken', token);
      }
      setIsLoading(false);
    } else {
      // No token - should not happen if nginx redirects properly
      // Redirect to join endpoint
      window.location.href = `/api/queue/join-redirect?return=${encodeURIComponent(returnUrl)}`;
      return;
    }
  }, [tokenFromUrl, returnUrl]);

  const checkPosition = async () => {
    if (!queueToken) return;

    try {
      const queueServiceUrl = process.env.NEXT_PUBLIC_QUEUE_SERVICE_URL || 'https://queue.eventapp.finnep.fi';
      const response = await fetch(`${queueServiceUrl}/api/queue/position/${queueToken}`, {
        headers: { 'X-Application-ID': 'customer-app' }
      });

      if (!response.ok) {
        // Token invalid/expired (404) - clear and rejoin
        if (response.status === 404) {
          localStorage.removeItem('queueToken');
          window.location.href = `/api/queue/join-redirect?return=${encodeURIComponent(returnUrl)}`;
          return;
        }
        throw new Error('Failed to check position');
      }

      const data = await response.json();

      // API returns isReady when position <= 3
      if (data.isReady || data.position <= 3) {
        // User is ready! Clear token and redirect to original URL
        localStorage.removeItem('queueToken');
        window.location.href = returnUrl;
        return;
      }

      setQueueData({
        position: data.position || 0,
        queueSize: data.queueSize || 0,
        estimatedWaitMinutes: data.estimatedWaitMinutes || 0,
        waitExpired: data.waitExpired,
        gracePeriodActive: data.gracePeriodActive,
        priorityBoost: data.priorityBoost
      });
    } catch (err) {
      console.error('Position check error:', err);
      setError('Unable to check queue position');
    }
  };

  useEffect(() => {
    if (queueToken) {
      checkPosition();
      // Then check every 15 seconds for better responsiveness
      const interval = setInterval(checkPosition, 15000);
      return () => clearInterval(interval);
    }
  }, [queueToken]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Joining queue...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 text-center">
          <div className="text-red-600 mb-4">
            <svg className="w-16 h-16 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Queue Unavailable</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!queueData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 text-center">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            eventapp.finnep.fi
          </h1>
          <p className="text-lg text-gray-600">
            High traffic detected
          </p>
          <p className="text-sm text-gray-500 mt-2">
            You're being held in queue to ensure fair access
          </p>
        </div>

        {/* Priority Boost Notification */}
        {queueData.priorityBoost && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <svg className="w-6 h-6 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-semibold text-green-800">Priority Access Granted!</span>
            </div>
            <p className="text-green-700 text-sm">
              Due to your wait time, you've been moved to position #{queueData.priorityBoost.newPosition}
            </p>
          </div>
        )}

        {/* Expired Wait Time Notice */}
        {queueData.waitExpired && !queueData.gracePeriodActive && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <svg className="w-6 h-6 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="font-semibold text-yellow-800">Wait Time Expired</span>
            </div>
            <p className="text-yellow-700 text-sm mb-3">
              Your estimated wait time has passed, but we're still processing users.
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="bg-yellow-600 text-white px-4 py-2 rounded text-sm hover:bg-yellow-700 transition-colors"
              >
                Continue Waiting
              </button>
              <button
                onClick={() => window.location.href = '/events'}
                className="bg-gray-600 text-white px-4 py-2 rounded text-sm hover:bg-gray-700 transition-colors"
              >
                Browse Events
              </button>
            </div>
          </div>
        )}

        {/* Grace Period Notice */}
        {queueData.gracePeriodActive && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <svg className="w-6 h-6 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              <span className="font-semibold text-blue-800">Extended Wait Period</span>
            </div>
            <p className="text-blue-700 text-sm">
              You're in a grace period. You'll be processed shortly.
            </p>
          </div>
        )}

        {/* Queue Position */}
        <div className="mb-8">
          <div className="text-6xl font-bold text-indigo-600 mb-2">
            #{queueData.position}
          </div>
          <p className="text-gray-600">Your position in queue</p>
          <p className="text-sm text-gray-500 mt-1">
            {queueData.queueSize} people waiting
          </p>
        </div>

        {/* Progress Visualization */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">Progress</span>
            <span className="text-sm font-medium text-gray-900">
              {Math.max(0, 100 - (queueData.position * 2))}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-indigo-600 h-3 rounded-full transition-all duration-1000"
              style={{
                width: `${Math.max(5, 100 - (queueData.position * 2))}%`
              }}
            />
          </div>
        </div>

        {/* Wait Time */}
        <div className="mb-8 p-4 bg-indigo-50 rounded-lg">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm text-gray-600">Estimated wait time:</span>
            <span className="font-semibold text-indigo-800">
              {queueData.estimatedWaitMinutes} minutes
            </span>
          </div>
          <p className="text-xs text-gray-500">
            This updates automatically every 15 seconds
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => window.location.reload()}
            className="flex-1 px-4 py-3 rounded-lg border border-gray-300 font-medium transition-colors hover:bg-gray-50"
          >
            Refresh Status
          </button>
          <button
            onClick={() => window.location.href = '/events'}
            className="flex-1 px-4 py-3 rounded-lg bg-indigo-600 text-white font-medium transition-colors hover:bg-indigo-700"
          >
            Browse Events
          </button>
        </div>

        {/* Footer */}
        <div className="mt-8 text-xs text-gray-500">
          <p>
            Queue position updates every 15 seconds.
            You'll be automatically redirected when it's your turn.
          </p>
        </div>
      </div>
    </div>
  );
}
