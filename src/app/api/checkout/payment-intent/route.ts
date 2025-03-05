import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db, auth } from '@/lib/firebase-admin';
import Stripe from 'stripe';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-02-24.acacia',
});

export async function POST(req: NextRequest) {
  try {
    // Get authorization token from the request headers
    const authHeader = req.headers.get('authorization');
    const token = authHeader ? authHeader.split('Bearer ')[1] : null;
    
    if (!token) {
      // Fallback to cookie
      const cookieStore = cookies();
      const idToken = cookieStore.get('firebaseIdToken')?.value;
      
      if (!idToken) {
        return NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 });
      }
    }
    
    // Parse the request data
    const data = await req.json();
    const { items, amount } = data;
    
    if (!items || !Array.isArray(items) || items.length === 0 || !amount) {
      return NextResponse.json({ error: 'Invalid request - Missing required fields' }, { status: 400 });
    }
    
    // Verify the Firebase ID token
    let userId;
    try {
      if (token) {
        const decodedToken = await auth.verifyIdToken(token);
        userId = decodedToken.uid;
      }
    } catch (verifyError) {
      console.error('Token verification failed:', verifyError);
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized - User not identified' }, { status: 401 });
    }
    
    // Create a PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'eur',
      metadata: {
        userId,
        items: JSON.stringify(items),
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });
    
    // Store payment intent info in database
    await db.collection('payment_intents').doc(paymentIntent.id).set({
      userId,
      items,
      amount: amount / 100, // Store in euros
      status: 'created',
      createdAt: new Date().toISOString(),
    });
    
    return NextResponse.json({ 
      clientSecret: paymentIntent.client_secret 
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    );
  }
} 