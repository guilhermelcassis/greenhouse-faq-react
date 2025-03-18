import { NextResponse } from 'next/dist/server/web/spec-extension/response';
import type { NextRequest } from 'next/dist/server/web/spec-extension/request';
import { auth } from '@/lib/firebase-admin';

// This function can be marked `async` if using `await` inside
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Define paths that should redirect to profile if user is logged in
  const authRoutes = ['/register', '/login', '/signup'];
  
  // Check if the path is a protected route
  const protectedPaths = ['/profile', '/checkout'];
  const isPathProtected = protectedPaths.some((path) => 
    pathname === path || pathname.startsWith(`${path}/`)
  );
  
  // Get the session cookie
  const sessionCookie = request.cookies.get('session')?.value;
  
  if (sessionCookie) {
    try {
      // Verify the session cookie
      await auth.verifySessionCookie(sessionCookie);
      
      // If user is logged in and trying to access auth routes, redirect to profile
      if (authRoutes.some(route => pathname.startsWith(route))) {
        return NextResponse.redirect(new URL('/profile', request.url));
      }
    } catch (error) {
      // Invalid session cookie, clear it
      const response = NextResponse.next();
      // Create a new response with the cookie deleted
      response.headers.set('Set-Cookie', 'session=; Max-Age=0; Path=/');
      
      // If trying to access a protected route, redirect to login
      if (isPathProtected) {
        const url = new URL(`/login`, request.url);
        url.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(url);
      }
      
      return response;
    }
  } else if (isPathProtected) {
    // No session cookie and trying to access a protected route, redirect to login
    const url = new URL(`/login`, request.url);
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }
  
  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    '/profile/:path*', 
    '/checkout/:path*', 
    '/register/:path*', 
    '/login/:path*', 
    '/signup/:path*'
  ],
}; 