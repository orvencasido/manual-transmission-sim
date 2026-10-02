'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get('redirect') || '/simulator';
  const urlError = searchParams.get('error');

  const { signIn, isAuthenticated, isLoading } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Surface callback errors if any
  useEffect(() => {
    if (urlError === 'auth_callback_failed') {
      setErrorMessage('Verification link was invalid or expired. Please sign in or request a new link.');
    }
  }, [urlError]);

  // If already authenticated, redirect
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push(redirectTarget);
    }
  }, [isAuthenticated, isLoading, router, redirectTarget]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    const { error } = await signIn(email.trim(), password);
    setSubmitting(false);

    if (error) {
      setErrorMessage(error.message);
    } else {
      router.push(redirectTarget);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Brand Header */}
      <div className="text-center mb-8">
        <Link href="/" className="inline-flex items-center gap-2 mb-3 group">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-mono font-bold text-lg group-hover:border-cyan-400 group-hover:shadow-[0_0_15px_rgba(6,182,212,0.4)] transition">
            ⛭
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-100 group-hover:text-cyan-300 transition">
            Manual Driving Trainer
          </span>
        </Link>
        <h2 className="text-2xl font-bold tracking-tight text-slate-100">
          Sign In to Your Cockpit
        </h2>
        <p className="text-xs text-slate-400 mt-1.5">
          Access your cloud-synced stars, smoothness telemetry, and driving sessions
        </p>
      </div>

      {/* Main Glass Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800/90 backdrop-blur-xl shadow-2xl space-y-6">
        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
            <span className="text-base leading-none">⚠️</span>
            <div className="flex-1 font-medium">{errorMessage}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono flex items-center justify-between">
              <span>Email Address</span>
            </label>
            <div className="relative">
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="driver@track.com"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition font-mono"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
                Password
              </label>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition font-mono pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs font-mono"
              >
                {showPassword ? 'HIDE' : 'SHOW'}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-bold text-sm shadow-lg shadow-cyan-900/30 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Authorizing Driver...</span>
              </>
            ) : (
              <>
                <span>Sign In to Cockpit</span>
                <span className="font-mono text-cyan-200">→</span>
              </>
            )}
          </button>
        </form>

        {/* Footer Link to Register */}
        <div className="pt-4 mt-2 border-t border-slate-800/80 text-center text-xs text-slate-400">
          Don&apos;t have an account yet?{' '}
          <Link
            href={`/auth/register${redirectTarget !== '/simulator' ? `?redirect=${encodeURIComponent(redirectTarget)}` : ''}`}
            className="text-cyan-400 hover:text-cyan-300 font-semibold underline underline-offset-4"
          >
            Create Driver Account
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
      <Suspense fallback={
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="w-8 h-8 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono">Initializing Cockpit Auth...</span>
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}
