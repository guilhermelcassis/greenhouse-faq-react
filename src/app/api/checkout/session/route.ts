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
    const { items } = data;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Invalid request - No items provided' }, { status: 400 });
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
    
    // Create a Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: items.map((item: any) => ({
        price_data: {
          currency: 'eur',
          product_data: {
            name: item.name,
          },
          unit_amount: item.amount,
        },
        quantity: item.quantity,
      })),
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/donate/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/donate`,
      metadata: {
        userId,
      },
    });
    
    // Store session info in database for reference
    await db.collection('checkout_sessions').doc(session.id).set({
      userId,
      items,
      totalAmount: items.reduce(
        (sum: number, item: any) => sum + (item.amount * item.quantity) / 100, 
        0
      ),
      status: 'created',
      createdAt: new Date().toISOString(),
    });
    
    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
} 