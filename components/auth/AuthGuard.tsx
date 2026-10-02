'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

interface AuthGuardProps {
  children: React.ReactNode;
}

/**
 * AuthGuard Component
 * Guarantees that only authenticated users can access cockpit routes.
 * If the user is unauthenticated or a guest, immediately redirects them to /auth/login.
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, initAuth } = useAuthStore();

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const redirectParam =
        pathname && pathname !== '/' && !pathname.startsWith('/auth')
          ? `?redirect=${encodeURIComponent(pathname)}`
          : '';
      router.replace(`/auth/login${redirectParam}`);
    }
  }, [isAuthenticated, isLoading, router, pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 select-none">
        <div className="flex flex-col items-center gap-4 max-w-sm text-center">
          <div className="relative w-12 h-12 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full border-2 border-slate-800 border-t-cyan-400 animate-spin" />
            <span className="absolute text-sm">🏎️</span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-200">Authenticating Driver</h3>
            <p className="text-xs text-slate-500 mt-1">Verifying vehicle cockpit telemetry credentials...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
