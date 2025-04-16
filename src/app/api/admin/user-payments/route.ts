import { NextRequest } from 'next/server';
import { auth, db } from '@/lib/firebase-admin';
import { stripe, searchPayments, StripePaymentData } from '@/lib/stripe';

// Polyfill for Response.json in environments that might not support it
if (!Response.json) {
  Response.json = function json(data, init) {
    const headers = new Headers(init?.headers);
    headers.set('content-type', 'application/json');
    
    return new Response(
      JSON.stringify(data),
      {
        ...init,
        headers
      }
    );
  };
}

// Verify the user is authenticated and is an admin
async function verifyAdmin(request: NextRequest) {
  try {
    // Extract the authorization token from the request headers
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { isAuthorized: false, error: 'Missing or invalid authorization token' };
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    
    // Get user email from token
    const userEmail = decodedToken.email || '';
    if (!userEmail) {
      return { isAuthorized: false, error: 'User email not found in token' };
    }
    
    // Check if user is admin from Firestore
    const userEmailsRef = db.collection('userEmails');
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
    
    // Check if user is admin either by Firestore or by custom claim
    if (!isAdmin && !decodedToken.isAdmin) {
      return { isAuthorized: false, error: 'Unauthorized: User is not an admin' };
    }

    return { isAuthorized: true, uid: decodedToken.uid };
  } catch (error) {
    console.error('Error verifying admin:', error);
    return { isAuthorized: false, error: 'Error verifying admin status' };
  }
}

// POST: Fetch payments for a user from Stripe
export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const { isAuthorized, error } = await verifyAdmin(request);
    if (!isAuthorized) {
      return Response.json({ error }, { status: 403 });
    }
    
    // Parse request body to get user email
    const body = await request.json();
    const { email, userId } = body;
    
    if (!email && !userId) {
      return Response.json({ error: 'Either email or userId must be provided' }, { status: 400 });
    }
    
    console.log(`Admin requested payment data for user: ${email || userId}`);
    
    if (!stripe) {
      return Response.json({ error: 'Stripe not initialized' }, { status: 500 });
    }
    
    // Set a reasonable search limit
    const searchLimit = 50;
    
    console.log(`Starting payment search for ${email || userId}`);
    
    // Fetch payments from Stripe
    let payments: StripePaymentData[] = [];
    try {
      // Search for payments using the core function from stripe.ts
      payments = await searchPayments({
        email: email,
        userId: userId,
        limit: searchLimit,
        includeAll: true // Include all payments - admin should see everything
      });
      
      console.log(`Successfully found ${payments.length} payments for user ${email || userId}`);
    } catch (error) {
      console.error('Error searching for payments:', error);
      return Response.json({ error: error instanceof Error ? error.message : 'An unknown error occurred' }, { status: 500 });
    }
    
    // Calculate total spent in EUR
    let totalSpent = 0;
    let successfulPaymentCount = 0;
    
    payments.forEach(payment => {
      // Only count successful, non-refunded payments
      if (payment.status === 'succeeded' && !payment.refunded && 
          !(payment.description?.toLowerCase().includes('refund'))) {
        successfulPaymentCount++;
        
        // Use amount_eur if available
        if (payment.amount_eur !== undefined && payment.amount_eur !== null) {
          // Check if amount_eur seems to be in cents or already converted
          if (payment.amount_eur > 100) {
            totalSpent += payment.amount_eur / 100;
          } else {
            totalSpent += payment.amount_eur;
          }
        } else {
          // Try to convert based on currency
          const conversionRates: Record<string, number> = {
            'eur': 1.0,
            'usd': 0.92,
            'gbp': 1.15,
            'brl': 0.17
          };
          
          const currencyKey = payment.currency.toLowerCase();
          const rate = conversionRates[currencyKey] || 1.0;
          
          // Special handling for BRL
          if (currencyKey === 'brl' && payment.amount > 10000) {
            totalSpent += (payment.amount / 100) * rate;
          } else {
            totalSpent += (payment.amount / 100) * rate;
          }
        }
      }
    });
    
    // Return the payment data along with summary stats
    return Response.json({
      payments,
      stats: {
        totalSpent,
        totalPayments: payments.length,
        successfulPayments: successfulPaymentCount
      }
    });
  } catch (error) {
    console.error('Error processing request:', error);
    return Response.json({ 
      error: 'Failed to process request', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 