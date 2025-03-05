import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db, auth } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  try {
    // Get authorization token from the request headers instead of cookies
    const authHeader = req.headers.get('authorization');
    const token = authHeader ? authHeader.split('Bearer ')[1] : null;
    
    if (!token) {
      // Fallback to cookie if no auth header
      const cookieStore = await cookies();
      const idToken = cookieStore.get('firebaseIdToken')?.value;
      
      if (!idToken) {
        return NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 });
      }
    }
    
    // Parse the request data
    const data = await req.json();
    
    // If we're in development mode, allow bypassing auth for testing
    let userId = process.env.NODE_ENV === 'development' ? data.userId : null;
    
    // Verify the Firebase ID token if we don't have a userId yet
    if (!userId && token) {
      try {
        const decodedToken = await auth.verifyIdToken(token);
        userId = decodedToken.uid;
      } catch (verifyError) {
        console.error('Token verification failed:', verifyError);
        return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
      }
    }
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized - User not identified' }, { status: 401 });
    }
    
    // Store donation info in database
    await db.collection('cart').add({
      userId,
      type: data.type,
      amount: data.amount,
      quantity: data.quantity || 1,
      createdAt: new Date().toISOString()
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error adding to cart:', error);
    return NextResponse.json(
      { error: 'Failed to add item to cart' },
      { status: 500 }
    );
  }
} 