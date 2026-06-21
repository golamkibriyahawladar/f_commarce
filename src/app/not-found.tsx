'use client';

import React from 'react';
import Link from 'next/link';
import { Home, Compass } from 'lucide-react';


export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-4 sm:px-6 py-12">
      <div className="max-w-md w-full bg-white border border-zinc-200 rounded-2xl p-8 text-center shadow-sm">
        {/* Animated Compass Icon */}
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-emerald-50 text-emerald-600 mb-6 shadow-inner">
          <Compass className="h-8 w-8 animate-spin-slow" />
        </div>

        {/* Heading */}
        <span className="text-emerald-500 font-bold text-xs uppercase tracking-wider">Error 404</span>
        <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight mt-1 mb-2 sm:text-3xl">
          Page Not Found
        </h1>
        
        {/* Description */}
        <p className="text-sm text-zinc-500 mb-8 max-w-xs mx-auto leading-relaxed">
          The page you are looking for doesn't exist or has been moved. Use the button below to navigate to the safe zone.
        </p>

        {/* Navigation Action Button */}
        <div className="flex justify-center">
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 border border-transparent rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors w-full sm:w-auto"
          >
            <Home className="w-4 h-4" />
            Go to Previous Page
          </button>
        </div>

      </div>
    </div>
  );
}
