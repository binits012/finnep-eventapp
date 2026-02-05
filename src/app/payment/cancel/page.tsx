'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function PaytrailCancelPage() {
  const router = useRouter();
  const search = useSearchParams();

  useEffect(() => {
    // Build a query string from the current URL and forward it to /checkout
    const params = new URLSearchParams();

    search.forEach((value, key) => {
      params.set(key, value);
    });

    // Ensure payment type is preserved
    if (!params.get('payment')) {
      params.set('payment', 'paytrail');
    }

    const qs = params.toString();
    const target = qs ? `/checkout?${qs}` : '/checkout';

    router.replace(target);
  }, [router, search]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4" style={{ color: 'var(--text)' }}>
          Redirecting…
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Taking you back to checkout to finalize the payment status.
        </p>
      </div>
    </div>
  );
}

