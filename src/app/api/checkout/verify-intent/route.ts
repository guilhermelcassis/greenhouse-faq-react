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
    
    // Get payment intent ID from query param
    const { searchParams } = new URL(req.url);
    const paymentIntentId = searchParams.get('payment_intent_id');
    
    if (!paymentIntentId) {
      return NextResponse.json({ error: 'Missing payment intent ID' }, { status: 400 });
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
    
    // Fetch the payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    // Check if the payment intent belongs to this user
    if (paymentIntent.metadata?.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized - Payment does not belong to this user' }, { status: 403 });
    }
    
    // Get payment info from our database
    const paymentDoc = await db.collection('payment_intents').doc(paymentIntentId).get();
    
    if (!paymentDoc.exists) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }
    
    const paymentData = paymentDoc.data();
    
    // Update payment status if needed
    if (paymentIntent.status === 'succeeded' && paymentData?.status !== 'completed') {
      await db.collection('payment_intents').doc(paymentIntentId).update({
        status: 'completed',
        completedAt: new Date().toISOString(),
      });
      
      // Also record the payment in a separate collection
      await db.collection('payments').add({
        userId,
        paymentIntentId,
        amount: paymentData?.amount,
        status: 'completed',
        paymentMethod: 'stripe',
        createdAt: new Date().toISOString(),
      });
    }
    
    return NextResponse.json({
      amount: paymentData?.amount,
      status: paymentIntent.status,
      items: paymentData?.items,
    });
  } catch (error) {
    console.error('Error verifying payment intent:', error);
    return NextResponse.json(
      { error: 'Failed to verify payment intent' },
      { status: 500 }
    );
  }
} 