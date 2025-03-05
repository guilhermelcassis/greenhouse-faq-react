import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { auth } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    // Get the session cookie
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('firebaseAuth')?.value;
    
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify the session cookie
    let decodedClaims;
    try {
      decodedClaims = await auth().verifySessionCookie(sessionCookie);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }
    
    const { amount, currency = 'usd', metadata = {} } = await req.json();
    
    // Validate the amount
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }
    
    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      metadata: {
        userId: decodedClaims.uid,
        ...metadata
      },
    });
    
    return NextResponse.json({ 
      clientSecret: paymentIntent.client_secret 
    });
    
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 