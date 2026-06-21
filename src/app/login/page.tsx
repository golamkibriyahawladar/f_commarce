'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('golamkibriya@gmail.com');
  const [password, setPassword] = useState('123');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { user, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    // Predefined credential verification logic (mock login bypass)
    if (email === 'golamkibriya@gmail.com' && password === '123') {
      // Mock log in state update in Zustand store
      useAuthStore.setState({
        user: {
          id: 'mock-user-id',
          email: 'golamkibriya@gmail.com',
          aud: 'authenticated',
          role: 'authenticated',
          created_at: new Date().toISOString(),
          app_metadata: {},
          user_metadata: { full_name: 'Golam Kibriya' }
        },
        profile: {
          id: 'mock-user-id',
          email: 'golamkibriya@gmail.com',
          full_name: 'Golam Kibriya',
          role: 'owner',
          company_id: 'mock-company-id'
        },
        loading: false
      });
      router.push('/dashboard');
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      // Zustand auth state changes will automatically pick up user updates
      router.push('/dashboard');
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };


  const handleOAuthSignIn = async (provider: 'google' | 'facebook') => {
    try {
      setErrorMsg('');
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setErrorMsg(err.message || `Failed to sign in with ${provider}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl border border-zinc-200 shadow-sm">
        <div>
          <div className="flex justify-center">
            <span className="text-emerald-500 font-bold text-3xl tracking-tight">AiChat<span className="text-zinc-900">Suite</span></span>
          </div>
          <h2 className="mt-6 text-center text-2xl font-bold tracking-tight text-zinc-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-zinc-600">
            Or{' '}
            <Link href="/register" className="font-medium text-emerald-600 hover:text-emerald-500">
              create a new workspace
            </Link>
          </p>
        </div>

        {/* Social Authentication Buttons */}
        <div className="grid grid-cols-2 gap-3 mt-6">
          <button
            onClick={() => handleOAuthSignIn('google')}
            className="flex w-full justify-center items-center gap-2 py-2 px-4 border border-zinc-300 rounded-lg text-sm font-medium text-zinc-700 bg-white hover:bg-zinc-50 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.58 15.02 1 12 1 7.24 1 3.2 3.74 1.25 7.72l3.8 2.94C6.01 7.23 8.78 5.04 12 5.04z"/>
              <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.44h6.44c-.28 1.48-1.12 2.73-2.38 3.58v2.98h3.84c2.25-2.07 3.59-5.12 3.59-8.66z"/>
              <path fill="#FBBC05" d="M5.05 10.66c-.25-.72-.39-1.49-.39-2.29s.14-1.57.39-2.29L1.25 7.14C.45 8.78 0 10.59 0 12.5s.45 3.72 1.25 5.36l3.8-2.94c-.25-.72-.39-1.49-.39-2.29z"/>
              <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.84-2.98c-1.1.74-2.5 1.18-4.12 1.18-3.22 0-5.99-2.19-6.95-5.14l-3.8 2.94C3.2 20.26 7.24 23 12 23z"/>
            </svg>
            Google
          </button>
          <button
            onClick={() => handleOAuthSignIn('facebook')}
            className="flex w-full justify-center items-center gap-2 py-2 px-4 border border-zinc-300 rounded-lg text-sm font-medium text-zinc-700 bg-white hover:bg-zinc-50 transition-colors"
          >
            <svg className="w-5 h-5 fill-sky-600" viewBox="0 0 24 24">
              <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z"/>
            </svg>
            Facebook
          </button>
        </div>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-200"></div></div>
          <div className="relative flex justify-center text-xs font-semibold uppercase"><span className="bg-white px-2 text-zinc-500">Or continue with</span></div>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>

          {errorMsg && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-200">
              {errorMsg}
            </div>
          )}

          <div className="rounded-md space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-zinc-500 mb-1">Email Address</label>
              <input
                type="email"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-zinc-300 placeholder-zinc-400 text-zinc-900 rounded-lg focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 focus:z-10 sm:text-sm"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-zinc-500 mb-1">Password</label>
              <input
                type="password"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-zinc-300 placeholder-zinc-400 text-zinc-900 rounded-lg focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 focus:z-10 sm:text-sm"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-zinc-300 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-zinc-900">
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <a href="#" className="font-medium text-emerald-600 hover:text-emerald-500">
                Forgot your password?
              </a>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-semibold rounded-lg text-white bg-emerald-600 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
