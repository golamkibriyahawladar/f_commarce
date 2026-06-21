'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-4 sm:px-6 py-12">
      <div className="max-w-md w-full bg-white border border-zinc-200 rounded-2xl p-8 text-center shadow-sm">
        {/* Warning Icon with Glow */}
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-50 text-red-500 mb-6 shadow-inner">
          <AlertTriangle className="h-8 w-8 animate-pulse" />
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight mb-2 sm:text-3xl">
          Something went wrong!
        </h1>
        
        {/* Description */}
        <p className="text-sm text-zinc-500 mb-8 max-w-xs mx-auto leading-relaxed">
          An unexpected error occurred while processing your request. Please try reloading or head back to the dashboard.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-zinc-300 rounded-xl text-sm font-semibold text-zinc-700 bg-white hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors w-full sm:w-auto"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
          
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-transparent rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors w-full sm:w-auto"
          >
            <Home className="w-4 h-4" />
            Go to Previous Page
          </button>
        </div>

      </div>
    </div>
  );
}
