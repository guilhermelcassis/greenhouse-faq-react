import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebase-admin';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, DocumentData } from 'firebase/firestore';
import { stripe } from '@/lib/stripe';

export async function GET(request: NextRequest) {
  try {
    // Get token from request headers
    let userEmail: string | undefined;
    const authHeader = request.headers.get('Authorization');
    
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decodedToken = await auth.verifyIdToken(token);
        userEmail = decodedToken.email;
        console.log('Authenticated user:', userEmail);
      } catch (error) {
        console.error('Error verifying Firebase token:', error);
      }
    }

    if (!userEmail) {
      console.log('No user email found, returning unauthorized');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('Fetching payments for email:', userEmail);
    
    try {
      // Get payments from Firestore filtered by user email
      // This is more secure as we only query for the current user's data
      const paymentsQuery = query(
        collection(db, 'payments'),
        where('email', '==', userEmail)
      );
      
      const emailFieldSnapshot = await getDocs(paymentsQuery);
      const userPayments: DocumentData[] = [];
      
      // Add payments where email field matches
      emailFieldSnapshot.docs.forEach(doc => {
        userPayments.push({
          ...doc.data(),
          firestoreId: doc.id
        });
      });
      
      // Also check billing_details.email field which is used in newer records
      const billingDetailsQuery = query(
        collection(db, 'payments'),
        where('billing_details.email', '==', userEmail)
      );
      
      const billingDetailsSnapshot = await getDocs(billingDetailsQuery);
      
      // Add payments where billing_details.email field matches
      billingDetailsSnapshot.docs.forEach(doc => {
        // Check if this document is already added to avoid duplicates
        if (!userPayments.some(payment => payment.firestoreId === doc.id)) {
          userPayments.push({
            ...doc.data(),
            firestoreId: doc.id
          });
        }
      });
      
      console.log(`Found ${userPayments.length} payments for user ${userEmail}`);
      
      // Get recent Stripe payments for this user to ensure we have the latest data
      const stripeCharges = await stripe?.charges.list({
        limit: 100,
        expand: ['data.balance_transaction', 'data.payment_intent']
      });
      
      // Process payments to match expected format
      const processedPayments = userPayments.map(data => {
        // Ensure refunded status is properly set as a boolean
        const isRefunded = data.refunded === true || 
                          data.status?.toLowerCase() === 'refunded' || 
                          (data.description?.toLowerCase() || '').includes('refund');
        
        return {
          id: data.id || data.stripe_id || data.firestoreId,
          amount: data.amount || 0,
          currency: data.currency || 'eur',
          status: data.status || 'unknown',
          refunded: isRefunded,
          created: data.created || 0,
          description: data.description || null,
          email: data.email || data.billing_details?.email || userEmail,
          billing_details: {
            email: data.billing_details?.email || data.email || userEmail,
            name: data.billing_details?.name || '',
            phone: data.billing_details?.phone || ''
          },
          payment_method_details: data.payment_method_details || null,
          receipt_url: data.receipt_url || '',
          balance_transaction: data.balance_transaction || 
            (data.amount_eur && data.amount ? 
              { 
                exchange_rate: data.amount_eur / data.amount,
                currency: data.currency || 'eur',
                amount: data.amount_eur || data.amount
              } : undefined),
          amount_eur: data.amount_eur || data.amount
        };
      });
      
      // Add any Stripe charges that weren't already in Firestore
      if (stripeCharges?.data.length) {
        // Filter charges to only include those for the current user
        const userStripeCharges = stripeCharges.data.filter(charge => 
          charge.billing_details?.email?.toLowerCase() === userEmail?.toLowerCase()
        );
        
        // Add filtered charges that weren't already in Firestore
        userStripeCharges.forEach(charge => {
          // Only add if we don't already have this payment
          if (!processedPayments.some(p => p.id === charge.id)) {
            processedPayments.push({
              id: charge.id,
              amount: charge.amount,
              currency: charge.currency,
              status: charge.status,
              refunded: charge.refunded || false,
              created: charge.created,
              description: charge.description || null,
              email: charge.billing_details?.email || userEmail,
              billing_details: charge.billing_details,
              payment_method_details: charge.payment_method_details,
              receipt_url: charge.receipt_url,
              balance_transaction: charge.balance_transaction,
              amount_eur: charge.amount
            });
          }
        });
      }
      
      // Return the processed payments
      return NextResponse.json({ payments: processedPayments });
      
    } catch (firestoreError: unknown) {
      console.error('Detailed Firestore error:', firestoreError);
      return NextResponse.json({ error: 'Error accessing payment database', details: (firestoreError as Error).message }, { status: 500 });
    }
    
  } catch (error: unknown) {
    console.error('Error fetching user payments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payments', details: (error as Error).message },
      { status: 500 }
    );
  }
} 