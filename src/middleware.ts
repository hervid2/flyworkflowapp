/**
 * Edge auth gate. Runs before every matched request and redirects
 * unauthenticated users to `/login`, enforcing route protection server-side
 * (the cookie is set by the auth store) instead of trusting client checks.
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes reachable without a session.
const PUBLIC_PATHS = ['/login'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow public routes through.
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // No session cookie → bounce to login, remembering the intended path.
  const session = request.cookies.get('flyworkflow-session');
  if (!session?.value) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// Match everything except Next.js internals, static assets and the
// generated icon/OG-image routes (favicon.ico, icon.svg, opengraph-image).
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|opengraph-image|public/).*)'],
};
