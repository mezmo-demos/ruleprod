import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  if (request.cookies.has('sessionId')) {
    return NextResponse.next();
  }

  const sessionId = crypto.randomUUID();

  // Setting the cookie on the response alone only helps the *next* request —
  // server components rendering this one still read the original cookie header
  // and getUserKey() throws "No session ID found". So rewrite the cookie header
  // we forward upstream too, and this first render sees the session as well.
  request.cookies.set('sessionId', sessionId);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('cookie', request.cookies.toString());

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.cookies.set('sessionId', sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images/ (public images)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|images/).*)',
  ],
};
