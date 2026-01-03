import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Simple in-memory rate limiter (for Edge runtime)
// In production, use Redis or similar
const rateLimitMap = new Map<string, { count: number; timestamp: number }>();

const RATE_LIMIT = 100; // requests per window
const RATE_WINDOW = 60 * 1000; // 1 minute in milliseconds

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record) {
    rateLimitMap.set(ip, { count: 1, timestamp: now });
    return false;
  }

  // Reset if window has passed
  if (now - record.timestamp > RATE_WINDOW) {
    rateLimitMap.set(ip, { count: 1, timestamp: now });
    return false;
  }

  // Increment count
  record.count++;
  
  // Clean up old entries periodically
  if (rateLimitMap.size > 10000) {
    const cutoff = now - RATE_WINDOW;
    for (const [key, value] of rateLimitMap.entries()) {
      if (value.timestamp < cutoff) {
        rateLimitMap.delete(key);
      }
    }
  }

  return record.count > RATE_LIMIT;
}

function getClientIP(request: NextRequest): string {
  // Try various headers that might contain the real IP
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  
  const cfIP = request.headers.get('cf-connecting-ip');
  if (cfIP) {
    return cfIP;
  }
  
  return 'unknown';
}

function addSecurityHeaders(response: NextResponse): NextResponse {
  // Prevent XSS attacks
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  
  // Control referrer information
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions policy
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );
  
  // Basic CSP - allow self and required external resources
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.cdnfonts.com",
    "font-src 'self' https://fonts.gstatic.com https://fonts.cdnfonts.com data:",
    "img-src 'self' data: blob: https: http:",
    "connect-src 'self' ws: wss: http://localhost:* https://localhost:* http://*.caliphdev.com:* https://*.caliphdev.com:* http://*:5000 https://*:5000 https://cdn.discordapp.com https://*.scdn.co https://*.mzstatic.com https://i.ytimg.com https://fonts.cdnfonts.com https://challenges.cloudflare.com https://api-sonora.muhammadzakizn.com https://*.muhammadzakizn.com",
    "frame-src 'self' https://challenges.cloudflare.com",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
  
  response.headers.set('Content-Security-Policy', csp);
  
  return response;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const clientIP = getClientIP(request);

  // Rate limiting for API routes
  if (pathname.startsWith('/api/')) {
    if (isRateLimited(clientIP)) {
      return new NextResponse(
        JSON.stringify({ 
          error: 'Too many requests', 
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: 60
        }),
        { 
          status: 429, 
          headers: { 
            'Content-Type': 'application/json',
            'Retry-After': '60',
            'X-RateLimit-Limit': String(RATE_LIMIT),
            'X-RateLimit-Remaining': '0',
          } 
        }
      );
    }
  }

  // Check for admin session cookie
  const adminSession = request.cookies.get('sonora-admin-session')?.value;
  const mfaVerified = request.cookies.get('sonora-mfa-verified')?.value;
  const devAuth = request.cookies.get('sonora-dev-auth')?.value;

  // Protect /admin routes - require admin session AND MFA verification
  if (pathname.startsWith('/admin')) {
    if (!adminSession) {
      // No session, redirect to login
      const response = NextResponse.redirect(new URL('/login', request.url));
      return addSecurityHeaders(response);
    }
    
    // Check if MFA verification is required
    // Parse session to see if user has MFA enabled
    try {
      const sessionData = JSON.parse(Buffer.from(adminSession, 'base64').toString('utf-8'));
      const hasMfa = sessionData.mfaMethods && sessionData.mfaMethods.length > 0;
      const authState = sessionData.authState;
      
      // If user has MFA enabled or is in mfa_required state, check mfaVerified cookie
      if ((hasMfa || authState === 'mfa_required') && mfaVerified !== 'true') {
        console.log('[Middleware] MFA required but not verified, redirecting to login');
        const response = NextResponse.redirect(
          new URL('/login?flow=verify&mfa_required=true', request.url)
        );
        return addSecurityHeaders(response);
      }
      
      // If new user (needs MFA setup), check mfaVerified
      if (authState === 'new' && mfaVerified !== 'true') {
        console.log('[Middleware] New user MFA setup required, redirecting to login');
        const response = NextResponse.redirect(
          new URL('/login?flow=setup&mfa_required=true', request.url)
        );
        return addSecurityHeaders(response);
      }
    } catch (e) {
      console.error('[Middleware] Failed to parse session:', e);
      // If session is corrupted, clear and redirect
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('sonora-admin-session');
      response.cookies.delete('sonora-mfa-verified');
      return addSecurityHeaders(response);
    }
  }

  // Protect /developer routes - temporarily disabled for debugging
  // The auth is checked on client-side via localStorage
  // if (pathname.startsWith('/developer')) {
  //   if (!devAuth) {
  //     const response = NextResponse.redirect(new URL('/login', request.url));
  //     return addSecurityHeaders(response);
  //   }
  // }

  // Add security headers to all responses
  const response = NextResponse.next();
  return addSecurityHeaders(response);
}

export const config = {
  matcher: [
    // Match all paths except static files and _next
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};

