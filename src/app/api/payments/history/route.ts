import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { auth } from '@/lib/firebase-admin';

// Same admin emails
const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS 
  ? process.env.NEXT_PUBLIC_ADMIN_EMAILS.split(',').map(email => email.trim().toLowerCase()) 
  : [];

export async function GET(request: Request) {
  try {
    // Get the authorization token from the request headers
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    
    // If no token is provided, return unauthorized
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 });
    }
    
    try {
      // Verify the Firebase token
      const decodedToken = await auth.verifyIdToken(token);
      const userEmail = decodedToken.email;
      
      // Check if user is admin
      if (!userEmail || !adminEmails.includes(userEmail.toLowerCase())) {
        return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
      }
      
      console.log(`Authenticated admin: ${userEmail}`);
    } catch (authError) {
      console.error('Firebase auth error:', authError);
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }
    
    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-02-24.acacia',
    });
    
    console.log('Fetching ALL payment data for admin - with proper pagination');
    
    // Fetch ALL charges using pagination
    const allCharges: Stripe.Charge[] = [];
    let hasMore = true;
    let startingAfter: string | undefined = undefined;
    
    while (hasMore) {
      console.log(`Fetching batch of charges ${startingAfter ? 'after ' + startingAfter : '(first batch)'}`);
      
      const params: Stripe.ChargeListParams = {
        limit: 100, // Still use 100 here as that's a good batch size
        expand: ['data.customer', 'data.balance_transaction']
      };
      
      if (startingAfter) {
        params.starting_after = startingAfter;
      }
      
      const charges = await stripe.charges.list(params);
      console.log(`Retrieved ${charges.data.length} charges in this batch`);
      
      allCharges.push(...charges.data);
      
      // Check if there are more charges to fetch
      hasMore = charges.has_more;
      
      // Set the starting point for the next batch
      if (hasMore && charges.data.length > 0) {
        startingAfter = charges.data[charges.data.length - 1].id;
      }
    }
    
    // Similarly fetch ALL payment intents
    const allPaymentIntents: Stripe.PaymentIntent[] = [];
    hasMore = true;
    startingAfter = undefined;
    
    while (hasMore) {
      console.log(`Fetching batch of payment intents ${startingAfter ? 'after ' + startingAfter : '(first batch)'}`);
      
      const params: Stripe.PaymentIntentListParams = {
        limit: 100,
      };
      
      if (startingAfter) {
        params.starting_after = startingAfter;
      }
      
      const paymentIntents = await stripe.paymentIntents.list(params);
      console.log(`Retrieved ${paymentIntents.data.length} payment intents in this batch`);
      
      allPaymentIntents.push(...paymentIntents.data);
      
      // Check if there are more payment intents to fetch
      hasMore = paymentIntents.has_more;
      
      // Set the starting point for the next batch
      if (hasMore && paymentIntents.data.length > 0) {
        startingAfter = paymentIntents.data[paymentIntents.data.length - 1].id;
      }
    }
    
    // Process all the charges (same as before)
    const processedCharges = allCharges.map(charge => {
      const customer = typeof charge.customer === 'object' ? charge.customer : null;
      
      return {
        id: charge.id,
        amount: charge.amount,
        currency: charge.currency,
        status: charge.status,
        created: charge.created,
        description: charge.description,
        billing_details: {
          email: charge.billing_details?.email || (customer && 'email' in customer ? customer.email : ''),
          name: charge.billing_details?.name || (customer && 'name' in customer ? customer.name : ''),
          phone: charge.billing_details?.phone || (customer && 'phone' in customer ? customer.phone : '')
        },
        payment_method_details: charge.payment_method_details,
        receipt_url: charge.receipt_url || '',
        balance_transaction: charge.balance_transaction
      };
    });
    
    // Process all payment intents (same as before)
    const processedPaymentIntents = allPaymentIntents.map(intent => ({
      id: intent.id,
      amount: intent.amount,
      currency: intent.currency,
      status: intent.status,
      created: intent.created,
      description: intent.description || null
    }));
    
    // Log info about total counts
    console.log(`Found TOTAL of ${processedPaymentIntents.length} payment intents and ${processedCharges.length} charges`);
    
    return NextResponse.json({ 
      paymentIntents: processedPaymentIntents,
      charges: processedCharges
    });
    } catch (error: unknown) { // Change 'any' to 'unknown'
      // More detailed error logging
      if (error instanceof Error) { // Check if error is an instance of Error
        console.error('Error fetching payment history:', error.message);
        if (error.stack) console.error(error.stack);
        
        return NextResponse.json({ 
          error: 'Failed to fetch payment history',
          details: error.message 
        }, { status: 500 });
      } else {
        // Handle unexpected error types
        console.error('Unexpected error:', error);
        return NextResponse.json({ 
          error: 'Failed to fetch payment history',
          details: 'An unexpected error occurred' 
        }, { status: 500 });
      }
    }
}