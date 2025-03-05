import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { headers } from 'next/headers';

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature') as string;
  
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }
  
  let event;
  
  try {
    event = stripe?.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  
  // Handle the event
  switch (event?.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      
      // Store payment information in Firestore
      try {
        await addDoc(collection(db, 'payments'), {
          userId: paymentIntent.metadata.userId,
          amount: paymentIntent.amount / 100, // Convert from cents
          currency: paymentIntent.currency,
          status: 'succeeded',
          paymentIntentId: paymentIntent.id,
          paymentMethod: paymentIntent.payment_method_types[0],
          createdAt: serverTimestamp(),
          metadata: paymentIntent.metadata
        });
        
        console.log('Payment recorded successfully');
      } catch (error) {
        console.error('Error recording payment:', error);
      }
      break;
      
    case 'payment_intent.payment_failed':
      const failedPaymentIntent = event.data.object;
      
      // Record failed payment
      try {
        await addDoc(collection(db, 'payments'), {
          userId: failedPaymentIntent.metadata.userId,
          amount: failedPaymentIntent.amount / 100,
          currency: failedPaymentIntent.currency,
          status: 'failed',
          paymentIntentId: failedPaymentIntent.id,
          paymentMethod: failedPaymentIntent.payment_method_types[0],
          createdAt: serverTimestamp(),
          metadata: failedPaymentIntent.metadata
        });
      } catch (error) {
        console.error('Error recording failed payment:', error);
      }
      break;
      
    default:
      console.log(`Unhandled event type ${event?.type}`);
  }
  
  return NextResponse.json({ received: true });
}

// Configure the route to accept raw body
export const config = {
  api: {
    bodyParser: false,
  },
}; 