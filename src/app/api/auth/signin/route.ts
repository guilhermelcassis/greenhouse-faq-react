import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // Extract the callback URL from the query parameters
  const callbackUrl = req.nextUrl.searchParams.get('callbackUrl') || '/';
  
  // Redirect to the login page with the callback URL
  return NextResponse.redirect(new URL(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`, req.url));
} 