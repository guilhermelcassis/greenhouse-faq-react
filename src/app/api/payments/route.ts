import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { auth } from '@/lib/firebase-admin';

export async function GET(req: NextRequest) {
  try {
    // Get the authorization token from the request header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized', payments: [] }, { status: 401 });
    }
    
    // Extract the token
    const token = authHeader.split('Bearer ')[1];
    
    // Verify the Firebase token
    const decodedToken = await auth.verifyIdToken(token);
    const userEmail = decodedToken.email;
    
    if (!userEmail) {
      return NextResponse.json({ error: 'User email not found', payments: [] }, { status: 400 });
    }
    
    if (!stripe) {
      console.error('Stripe not configured');
      return NextResponse.json({ error: 'Stripe not configured', payments: [] }, { status: 500 });
    }
    
    // Search for payments associated with the user's email
    const paymentIntents = await stripe.paymentIntents.list({
      limit: 1000,
    });
    
    // Filter payment intents by customer email
    const customerPayments = await Promise.all(
      paymentIntents.data.map(async (intent) => {
        if (!intent.customer) return null;
        
        try {
          const customer = await stripe?.customers.retrieve(intent.customer.toString());
          if (customer && 'email' in customer && customer.email === userEmail) {
            return {
              id: intent.id,
              amount: intent.amount / 100, // Convert from cents to dollars/etc
              currency: intent.currency,
              status: intent.status,
              created: new Date(intent.created * 1000).toISOString(),
              description: intent.description
            };
          }
        } catch (error) {
          console.error('Error retrieving customer:', error);
        }
        return null;
      })
    );
    
    // Filter out null values and return the payments
    const userPayments = customerPayments.filter(payment => payment !== null);
    
    return NextResponse.json({ payments: userPayments });
  } catch (error) {
    console.error('Error fetching payment history:', error);
    return NextResponse.json({ error: 'Failed to fetch payment history', payments: [] }, { status: 500 });
  }
} 