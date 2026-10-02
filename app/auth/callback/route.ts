import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/lessons';
  const origin = requestUrl.origin;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Forward to target page after successful token verification
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error('Supabase exchangeCodeForSession failed:', error.message);
  }

  // Fallback to login with error indication
  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`);
}
