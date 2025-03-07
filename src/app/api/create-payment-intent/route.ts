import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebase-admin';
import Stripe from 'stripe';

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-02-24.acacia', // Use the latest API version
});

export async function POST(request: NextRequest) {
  try {
    // Get token from request headers
    let token: string | null = null;
    const authHeader = request.headers.get('Authorization');
    
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    // If no token is provided, return unauthorized
    if (!token) {
      console.error('No auth token provided for payment intent creation');
      return NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 });
    }

    // Verify the token
    try {
      const user = await auth.verifyIdToken(token);
      console.log(`Authenticated user ${user.email} for payment intent creation`);
      
      // Parse request body
      const { amount, currency, metadata, receipt_email } = await request.json();
      
      if (!amount || !currency) {
        return NextResponse.json(
          { error: 'Bad request - amount and currency are required' },
          { status: 400 }
        );
      }

      // Fix: Ensure amount is an integer by rounding it
      const roundedAmount = Math.round(amount);

      // Create a payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: roundedAmount, // Use the rounded integer instead of raw amount
        currency,
        metadata: {
          ...metadata,
          // Ensure userId is included
          userId: user.uid,
          // Ensure email is captured even if not in metadata
          email: receipt_email || user.email || metadata?.email || '',
        },
        receipt_email: receipt_email || user.email || metadata?.email || '',
        automatic_payment_methods: {
          enabled: true,
        },
      });

      console.log(`Created payment intent ${paymentIntent.id} for ${amount} ${currency}`);

      return NextResponse.json({ 
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      });
    } catch (authError) {
      console.error('Firebase auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }
  } catch (error: unknown) {
    console.error('Error creating payment intent:', error);
    
    // Type assertion to access the message property safely
    const typedError = error as Error & { message?: string };
    
    return NextResponse.json(
      {
        error: 'Failed to create payment intent',
        details: typedError.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
} 