import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';

// Session expiration time (2 weeks)
const SESSION_EXPIRATION_TIME = 60 * 60 * 24 * 14 * 1000;

export async function POST(req: NextRequest) {
  try {
    const { idToken } = await req.json();
    
    if (!idToken) {
      return NextResponse.json({ error: 'No ID token provided' }, { status: 400 });
    }
    
    // Verify the ID token
    await auth.verifyIdToken(idToken);
    
    // Create a session cookie
    const sessionCookie = await auth.createSessionCookie(idToken, {
      expiresIn: SESSION_EXPIRATION_TIME,
    });
    
    // Set the cookie - make sure to await the cookies() call
    const cookieStore = await cookies();
    cookieStore.set('session', sessionCookie, {
      maxAge: SESSION_EXPIRATION_TIME / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
} 