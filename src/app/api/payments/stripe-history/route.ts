import { NextResponse } from 'next/server';
import { auth } from '@/lib/firebase-admin';
import { stripe } from '@/lib/stripe';
import { StripePaymentData } from '@/lib/stripe';
import { db as adminDb } from '@/lib/firebase-admin';

interface PaginationParams {
  limit: number;
  starting_after?: string;
}

// Verify the user is authenticated and is an admin
async function verifyAdmin(token: string) {
  try {
    // Verify the Firebase token
    const decodedToken = await auth.verifyIdToken(token);
    
    // Get user email from token
    const userEmail = decodedToken.email || '';
    if (!userEmail) {
      return { isAuthorized: false, error: 'User email not found in token' };
    }
    
    // Check if user is admin from Firestore
    const userEmailsRef = adminDb.collection('userEmails');
    // Query for users with admin role
    const adminQuery = userEmailsRef
      .where('email', '==', userEmail.toLowerCase());
    
    const adminSnapshot = await adminQuery.get();
    
    // Check if any of the user's roles includes 'admin'
    let isAdmin = false;
    if (!adminSnapshot.empty) {
      const userData = adminSnapshot.docs[0].data();
      // Look for admin role in either the legacy 'type' field or the new 'roles' array
      isAdmin = (userData.type === 'admin') || 
                (Array.isArray(userData.roles) && userData.roles.includes('admin'));
    }
    
    console.log('Admin verification from Firestore:', { 
      userEmail, 
      isAdmin,
      hasCustomClaim: decodedToken.isAdmin
    });
    
    // Check if user is admin either by Firestore or by custom claim
    if (!isAdmin && !decodedToken.isAdmin) {
      return { isAuthorized: false, error: 'Unauthorized: User is not an admin' };
    }

    return { isAuthorized: true, userEmail };
  } catch (error) {
    console.error('Error verifying admin:', error);
    return { isAuthorized: false, error: 'Error verifying admin status' };
  }
}

// Process a Stripe charge into our standard format
function processCharge(charge: any): StripePaymentData {
  // Get the email from one of the possible locations, with fallbacks
  const email = 
    charge.metadata?.email ||
    charge.receipt_email ||
    charge.billing_details?.email ||
    '';
  
  return {
    id: charge.id,
    amount: charge.amount,
    currency: charge.currency,
    status: charge.status,
    created: charge.created,
    email: email,
    userId: charge.metadata?.userId,
    description: charge.description,
    receipt_url: charge.receipt_url,
    refunded: charge.refunded,
    balance_transaction: charge.balance_transaction,
    billing_details: {
      email: charge.billing_details?.email || email,
      name: charge.billing_details?.name || null,
      phone: charge.billing_details?.phone || null
    },
    payment_method_details: charge.payment_method_details ? {
      card: charge.payment_method_details.card ? {
        brand: charge.payment_method_details.card.brand,
        exp_month: charge.payment_method_details.card.exp_month,
        exp_year: charge.payment_method_details.card.exp_year,
        last4: charge.payment_method_details.card.last4,
      } : undefined,
      type: charge.payment_method_details.type
    } : undefined,
    metadata: charge.metadata
  };
}

export async function GET(request: Request) {
  try {
    // Get the authorization token from the request headers
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    
    // If no token is provided, return unauthorized
    if (!token) {
      console.error('No authorization token provided');
      return NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 });
    }
    
    // Verify admin access
    console.log('Verifying admin access for stripe-history API');
    const { isAuthorized, error, userEmail } = await verifyAdmin(token);
    
    if (!isAuthorized) {
      console.error(`Admin verification failed: ${error}`);
      return NextResponse.json({ error }, { status: 403 });
    }
    
    console.log(`Admin verified: ${userEmail}`);
    
    if (!stripe) {
      console.error('Stripe is not initialized - check if STRIPE_SECRET_KEY is set in environment variables');
      return NextResponse.json({ error: 'Stripe is not initialized - check environment variables' }, { status: 500 });
    }

    // Get the URL parameters
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '25', 10);
    const startingAfter = url.searchParams.get('starting_after') || undefined;
    
    console.log(`Fetching payments from Stripe: limit=${limit}, starting_after=${startingAfter || 'none'}`);
    
    try {
      // Set up pagination params
      const paginationParams: PaginationParams = {
        limit: Math.min(limit, 100) // Ensure we don't exceed Stripe's maximum limit
      };
      
      if (startingAfter) {
        paginationParams.starting_after = startingAfter;
      }
      
      // Fetch charges from Stripe with pagination
      const chargesResponse = await stripe.charges.list({
        ...paginationParams,
        expand: ['data.balance_transaction']
      });
      
      // Process the charges
      const processedCharges = chargesResponse.data.map(charge => processCharge(charge));
      
      // Return the processed data with pagination info
      return NextResponse.json({
        charges: processedCharges,
        has_more: chargesResponse.has_more,
        next_page_cursor: chargesResponse.data.length > 0 ? chargesResponse.data[chargesResponse.data.length - 1].id : null
      });
    } catch (stripeError) {
      console.error('Error fetching data from Stripe:', stripeError);
      return NextResponse.json(
        { error: 'Failed to fetch data from Stripe', details: (stripeError as Error).message },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error fetching payments from Stripe:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payments', details: (error as Error).message },
      { status: 500 }
    );
  }
} 