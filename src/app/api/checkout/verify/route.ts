import { NextRequest, NextResponse } from 'next/server';
import { db, auth } from '@/lib/firebase-admin';
import Stripe from 'stripe';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-02-24.acacia',
});

export async function GET(req: NextRequest) {
  try {
    // Get authorization token from the request headers
    const authHeader = req.headers.get('authorization');
    const token = authHeader ? authHeader.split('Bearer ')[1] : null;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get session ID from query param
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('session_id');
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Missing session ID' }, { status: 400 });
    }
    
    // Verify the Firebase ID token
    let userId;
    try {
      const decodedToken = await auth.verifyIdToken(token);
      userId = decodedToken.uid;
    } catch (error) {
      console.error('Token verification failed:', error);
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }
    
    // Fetch the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    // Check if the session belongs to this user
    if (session.metadata?.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized - Session does not belong to this user' }, { status: 403 });
    }
    
    // Get payment info from our database
    const sessionDoc = await db.collection('checkout_sessions').doc(sessionId).get();
    
    if (!sessionDoc.exists) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    
    const sessionData = sessionDoc.data();
    
    // Update session status if needed
    if (session.payment_status === 'paid' && sessionData?.status !== 'completed') {
      await db.collection('checkout_sessions').doc(sessionId).update({
        status: 'completed',
        completedAt: new Date().toISOString(),
      });
      
      // Also record the payment in a separate collection
      await db.collection('payments').add({
        userId,
        sessionId,
        amount: sessionData?.totalAmount,
        status: 'completed',
        paymentMethod: 'stripe',
        createdAt: new Date().toISOString(),
      });
    }
    
    return NextResponse.json({
      amount: sessionData?.totalAmount,
      status: session.payment_status,
      items: sessionData?.items,
    });
  } catch (error) {
    console.error('Error verifying checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to verify checkout session' },
      { status: 500 }
    );
  }
} 