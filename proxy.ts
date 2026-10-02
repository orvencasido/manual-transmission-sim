import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Edge Middleware for Route Protection
 * Redirects unauthenticated requests to /auth/login.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static assets, public data, Next.js internal files, and auth pages are public
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/data') ||
    pathname.startsWith('/auth') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Check for the access token cookie or Supabase project auth cookie
  const accessToken =
    request.cookies.get('sb-access-token')?.value ||
    request.cookies.get('sb-uaixxnvrlvsjceswhduw-auth-token')?.value;

  // Root landing page redirects to /simulator if logged in, or /auth/login if not
  if (pathname === '/') {
    if (accessToken) {
      return NextResponse.redirect(new URL('/simulator', request.url));
    }
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // For protected routes (/simulator, /lessons, /map, /progress)
  if (!accessToken) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, images, sound files
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
