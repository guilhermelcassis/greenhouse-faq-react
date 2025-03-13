import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebase-admin';
import { db as adminDb } from '@/lib/firebase-admin';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

// Verify the user is authenticated and is an admin
async function verifyAdmin(token: string) {
  try {
    // Verify the Firebase token
    const decodedToken = await auth.verifyIdToken(token);
    
    // Get user email from token
    const userEmail = decodedToken.email || '';
    if (!userEmail) {
      return { isAuthorized: false, error: 'User email not found in token' };
    }
    
    // Check if user is admin from Firestore
    const userEmailsRef = adminDb.collection('userEmails');
    // Query for users with admin role
    const adminQuery = userEmailsRef
      .where('email', '==', userEmail.toLowerCase());
    
    const adminSnapshot = await adminQuery.get();
    
    // Check if any of the user's roles includes 'admin'
    let isAdmin = false;
    if (!adminSnapshot.empty) {
      const userData = adminSnapshot.docs[0].data();
      // Look for admin role in either the legacy 'type' field or the new 'roles' array
      isAdmin = (userData.type === 'admin') || 
                (Array.isArray(userData.roles) && userData.roles.includes('admin'));
    }
    
    console.log('Admin verification from Firestore:', { 
      userEmail, 
      isAdmin,
      hasCustomClaim: decodedToken.isAdmin
    });
    
    // Check if user is admin either by Firestore or by custom claim
    if (!isAdmin && !decodedToken.isAdmin) {
      return { isAuthorized: false, error: 'Unauthorized: User is not an admin' };
    }

    return { isAuthorized: true, userEmail };
  } catch (error) {
    console.error('Error verifying admin:', error);
    return { isAuthorized: false, error: 'Error verifying admin status' };
  }
}

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

    // Verify admin access
    const { isAuthorized, error, userEmail } = await verifyAdmin(token);
    
    if (!isAuthorized) {
      return NextResponse.json({ error }, { status: 403 });
    }
    
    console.log(`Authenticated admin: ${userEmail}`);

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
