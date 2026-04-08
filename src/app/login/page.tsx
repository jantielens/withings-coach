'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

const ERROR_MESSAGES: Record<string, string> = {
  missing_code: 'Authorization was not completed. Please try again.',
  state_mismatch: 'Security check failed (state mismatch). Please try again.',
  missing_config: 'Server configuration error. Contact the administrator.',
  token_exchange_failed: 'Failed to complete authorization with Withings. Please try again.',
  token_exchange_error: 'An error occurred during authorization. Please try again.',
};

function LoginContent() {
  const searchParams = useSearchParams();
  const errorCode = searchParams.get('error');
  const errorMessage = errorCode
    ? ERROR_MESSAGES[errorCode] ?? `Authorization error: ${errorCode}`
    : null;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-sm w-full text-center space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Withings Coach</h1>
          <p className="mt-2 text-sm text-gray-500">
            Connect your Withings account to view your health data.
          </p>
        </div>

        {errorMessage && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4">
            <p className="text-sm text-red-700">{errorMessage}</p>
          </div>
        )}

        <a
          href="/api/auth/withings"
          className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          Connect with Withings
        </a>

        <p className="text-xs text-gray-400">
          You&apos;ll be redirected to Withings to authorize access to your health metrics.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
