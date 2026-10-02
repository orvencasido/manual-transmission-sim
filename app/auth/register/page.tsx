'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get('redirect') || '/simulator';

  const { signUp, isAuthenticated, isLoading } = useAuthStore();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);

  // If already authenticated, redirect
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push(redirectTarget);
    }
  }, [isAuthenticated, isLoading, router, redirectTarget]);

  // Compute password strength
  const calculateStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score; // 0 to 5
  };

  const strength = calculateStrength(password);
  const getStrengthLabel = () => {
    if (password.length === 0) return { label: 'Empty', color: 'bg-slate-800' };
    if (strength <= 2) return { label: 'Weak', color: 'bg-rose-500' };
    if (strength <= 3) return { label: 'Fair', color: 'bg-amber-500' };
    if (strength <= 4) return { label: 'Good', color: 'bg-cyan-500' };
    return { label: 'Strong', color: 'bg-emerald-500' };
  };

  const strengthMeta = getStrengthLabel();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !email.trim() || !password) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    const { error, needsConfirmation } = await signUp(
      email.trim(),
      password,
      username.trim()
    );

    setSubmitting(false);

    if (error) {
      setErrorMessage(error.message);
    } else if (needsConfirmation) {
      setConfirmationSent(true);
    } else {
      router.push(redirectTarget);
    }
  };

  if (confirmationSent) {
    return (
      <div className="w-full max-w-md mx-auto p-6 sm:p-8 rounded-3xl bg-slate-900/95 border border-slate-800 backdrop-blur-xl shadow-2xl text-center space-y-6 animate-in fade-in duration-300">
        <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-3xl mx-auto text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
          ✉️
        </div>

        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-100">
            Confirmation Email Sent!
          </h2>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            We sent a verification link to <span className="font-mono text-cyan-300 font-semibold">{email}</span>.
            Please check your inbox (powered by <span className="font-semibold text-slate-200">Resend</span>) to activate your cloud account.
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 text-slate-400 text-xs text-left space-y-1">
          <div className="font-semibold text-slate-300">Next Steps:</div>
          <p className="text-[11px] leading-relaxed">
            1. Open the verification email and click the confirmation link.<br />
            2. Your browser will return here and automatically merge any local guest stars and times into your new account.
          </p>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <Link
            href="/auth/login"
            className="w-full py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition shadow-lg shadow-cyan-950/40"
          >
            Back to Sign In
          </Link>
          <Link
            href={redirectTarget}
            className="w-full py-2 px-4 rounded-xl text-slate-400 hover:text-slate-200 text-xs transition font-mono"
          >
            Continue as Guest in meantime →
          </Link>
        </div>
      </div>
    );
  }

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
          Create Pilot Account
        </h2>
        <p className="text-xs text-slate-400 mt-1.5">
          Persist telemetry, lock in lesson masteries, and sync across any device
        </p>
      </div>

      {/* Main Glass Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800/90 backdrop-blur-xl shadow-2xl space-y-5">
        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
            <span className="text-base leading-none">⚠️</span>
            <div className="flex-1 font-medium">{errorMessage}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
              Driver Call-Sign (Username)
            </label>
            <input
              type="text"
              required
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="TrackMaster99"
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition font-mono"
            />
          </div>

          {/* Email Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
              Email Address
            </label>
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

          {/* Password Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
                Password
              </label>
              {password.length > 0 && (
                <span className="text-[10px] font-mono text-slate-400">
                  Strength: <span className="font-semibold text-slate-200">{strengthMeta.label}</span>
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
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

            {/* Strength Meter Bar */}
            {password.length > 0 && (
              <div className="w-full h-1 bg-slate-950 rounded-full overflow-hidden mt-1">
                <div
                  className={`h-full ${strengthMeta.color} transition-all duration-200`}
                  style={{ width: `${Math.min(100, (strength / 5) * 100)}%` }}
                />
              </div>
            )}
          </div>

          {/* Confirm Password Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
              Confirm Password
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition font-mono"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-3 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-bold text-sm shadow-lg shadow-cyan-900/30 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Registering Pilot...</span>
              </>
            ) : (
              <>
                <span>Register & Merge Progress</span>
                <span className="font-mono text-cyan-200">→</span>
              </>
            )}
          </button>
        </form>

        {/* Footer Link to Login */}
        <div className="pt-4 mt-2 border-t border-slate-800/80 text-center text-xs text-slate-400">
          Already registered?{' '}
          <Link
            href={`/auth/login${redirectTarget !== '/simulator' ? `?redirect=${encodeURIComponent(redirectTarget)}` : ''}`}
            className="text-cyan-400 hover:text-cyan-300 font-semibold underline underline-offset-4"
          >
            Sign In to Cockpit
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
      <Suspense fallback={
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="w-8 h-8 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono">Loading Registration...</span>
        </div>
      }>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
