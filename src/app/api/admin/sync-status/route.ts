import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebase-admin';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

// Same admin emails
const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS 
  ? process.env.NEXT_PUBLIC_ADMIN_EMAILS.split(',').map(email => email.trim().toLowerCase()) 
  : [];

export async function GET(request: NextRequest) {
  try {
    // Get token from request headers
    let token: string | null = null;
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    // If no token is provided, return unauthorized
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 });
    }

    // Verify the token
    let userEmail: string;
    try {
      const user = await auth.verifyIdToken(token);
      userEmail = user.email || '';
    } catch (error) {
      console.error('Error verifying Firebase token:', error);
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }

    // Check if user is admin
    if (!userEmail || !adminEmails.includes(userEmail.toLowerCase())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get the sync status from Firestore
    const syncStatusDoc = await getDoc(doc(db, 'system', 'syncStatus'));
    
    if (!syncStatusDoc.exists()) {
      return NextResponse.json({
        status: { message: 'No sync has been performed' },
        progress: 0,
        isComplete: true
      });
    }
    
    const syncStatus = syncStatusDoc.data();
    
    return NextResponse.json({
      status: syncStatus.status || { message: 'Status unknown' },
      progress: syncStatus.progress || 0,
      isComplete: syncStatus.isComplete || false,
      lastSyncTime: syncStatus.lastSyncTime || null,
      lastProcessedId: syncStatus.lastProcessedId || null
    });
  } catch (error: unknown) {
    const typedError = error as Error & { message?: string };
    console.error('Error getting sync status:', typedError);
    return NextResponse.json(
      {
        error: 'An error occurred while getting sync status',
        details: typedError.message
      },
      { status: 500 }
    );
  }
} 
