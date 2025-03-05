import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebase-admin';
import Stripe from 'stripe';
import { db } from '@/lib/firebase';
import { collection, doc, setDoc, deleteDoc, getDocs } from 'firebase/firestore';

// Same admin emails
const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS 
  ? process.env.NEXT_PUBLIC_ADMIN_EMAILS.split(',').map(email => email.trim().toLowerCase()) 
  : [];

// Collection name
const PAYMENTS_COLLECTION = 'payments';

// Currency conversion function
// Define a type for the payment object
interface Payment {
  id: string;
  amount: number;
  currency: string;
  balance_transaction?: {
    exchange_rate?: number;
  };
  billing_details?: {
    email?: string;
    name?: string;
    phone?: string;
  };
  receipt_email?: string;
  metadata?: {
    email?: string;
  };
  status: string;
  created: number;
  description?: string;
  customer?: {
    id?: string;
    email?: string;
    name?: string;
    phone?: string;
  };
}

function convertToEUR(payment: Payment): number {
  // Default exchange rates (from major currencies to EUR)
  // In a production app, you would use a real-time exchange rate API
  const exchangeRates: Record<string, number> = {
    'usd': 0.85,    // 1 USD = 0.85 EUR
    'gbp': 1.15,    // 1 GBP = 1.15 EUR
    'jpy': 0.0075,  // 1 JPY = 0.0075 EUR
    'cad': 0.68,    // 1 CAD = 0.68 EUR
    'aud': 0.63,    // 1 AUD = 0.63 EUR
    'chf': 0.94,    // 1 CHF = 0.94 EUR
    'cny': 0.13,    // 1 CNY = 0.13 EUR
    'inr': 0.011,   // 1 INR = 0.011 EUR
    'brl': 0.17,    // 1 BRL = 0.17 EUR
    'mxn': 0.043,   // 1 MXN = 0.043 EUR
    'eur': 1.0      // 1 EUR = 1.0 EUR (no conversion needed)
  };

  // Get the balance transaction for exchange rate if available
  const balanceTransaction = payment.balance_transaction;
  let exchangeRate: number | undefined;
  
  if (balanceTransaction && typeof balanceTransaction === 'object') {
    exchangeRate = balanceTransaction.exchange_rate;
  }

  // Get currency (lowercase for consistency)
  const currency = payment.currency?.toLowerCase() || 'usd';
  
  // Get amount (in cents/smallest currency unit)
  const amount = payment.amount || 0;
  
  // First try to use the exchange rate from the balance transaction
  if (exchangeRate && currency !== 'eur') {
    // If we have a direct exchange rate to EUR
    return Math.round(amount * exchangeRate);
  }
  
  // Otherwise use our hardcoded rates
  if (exchangeRates[currency]) {
    return Math.round(amount * exchangeRates[currency]);
  }
  
  // Default fallback - assume 1:1 exchange rate if currency is unknown
  console.warn(`Unknown currency ${currency}, using 1:1 exchange rate`);
  return amount;
}

export async function POST(request: NextRequest) {
  try {
    // Get token from request headers first
    let token: string | null = null;
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    // If no token is provided, return unauthorized
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 });
    }

    // Verify the token
    let userEmail: string;
    try {
      const user = await auth.verifyIdToken(token);
      userEmail = user.email || '';
    } catch (error) {
      console.error('Error verifying Firebase token:', error);
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }

    // Check if user is admin
    if (!userEmail || !adminEmails.includes(userEmail.toLowerCase())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Add this just before the sync logic to verify token validity
    try {
      // Verify the token and get a fresh one
      const customToken = await auth.createCustomToken(userEmail);
      console.log('Created custom token for verification:', customToken.substring(0, 10) + '...');
      
      // You can use this token if needed for subsequent Firebase operations
    } catch (tokenError) {
      console.error('Error creating Firebase token:', tokenError);
      // Continue anyway, as the user may still have access
    }

    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-02-24.acacia',
    });
    
    console.log('Starting to sync ALL payments to Firestore...');
    
    // Clear existing payments collection
    try {
      // Check if collection exists before trying to clear it
      const existingPayments = await getDocs(collection(db, PAYMENTS_COLLECTION));
      console.log(`Found ${existingPayments.size} existing payment documents`);
      
      if (existingPayments.size > 0) {
        console.log('Clearing existing payments in Firestore...');
        let deleteCount = 0;
        
        for (const doc of existingPayments.docs) {
          try {
            await deleteDoc(doc.ref);
            deleteCount++;
            if (deleteCount % 50 === 0) {
              console.log(`Deleted ${deleteCount} existing payment records...`);
            }
          } catch (deleteError) {
            console.error(`Error deleting document ${doc.id}:`, deleteError);
          }
        }
        console.log(`Deleted ${deleteCount} existing payment records`);
      } else {
        console.log('No existing payments to clear');
      }
    } catch (clearError) {
      console.error('Error clearing existing payments:', clearError);
      // Continue anyway, we can still add new documents
    }
    
    // Function to process and store payments by batch
    type PaymentType = Stripe.Charge | Stripe.PaymentIntent;
    const processPayments = async (payments: PaymentType[], type: string) => {
      console.log(`Processing ${payments.length} ${type}...`);
      let count = 0;
      let errors = 0;
      
      for (const payment of payments) {
        try {
          // Extract email from the payment data
          let email = '';
          
          if (type === 'charges') {
            // For charges, check multiple sources for email
            const customer = typeof payment.customer === 'object' ? payment.customer : null;
            if ('billing_details' in payment) {
              email = payment.billing_details?.email || 
                      (customer && 'email' in customer ? customer.email : '') || 
                      payment.receipt_email || 
                      (payment.metadata?.email as string) || 
                      '';
            } else {
              // For PaymentIntents
              email = payment.receipt_email || 
                    (payment.metadata?.email as string) || 
                    '';
            }
          }
          
          if (email) {
            // Standardize email to lowercase
            email = email.toLowerCase();
            
            // Convert amount to EUR
            const amountInEUR = convertToEUR(payment as Payment);
            
            // Store in Firestore with the original ID to avoid duplicates
            const paymentDoc = {
              id: payment.id,
              stripe_id: payment.id, // Keep original ID for reference
              type: type,
              amount: payment.amount,
              currency: payment.currency,
              amount_eur: amountInEUR, // Add Euro amount
              status: payment.status,
              created: payment.created,
              email: email,
              description: payment.description || null,
              last_synced: Date.now()
            };
            
            // Add extra details for charges
            if (type === 'charges') {
              const customer = typeof payment.customer === 'object' ? payment.customer : null;
              
              // @ts-expect-error - Add these fields only for charges
              paymentDoc.customer_id = customer?.id || null;

              // Create a helper function to safely access billing details
              const getBillingDetails = () => {
                // Check if billing_details exists on the payment object
                if ('billing_details' in payment && payment.billing_details) {
                  return {
                    email: payment.billing_details.email || (customer && 'email' in customer ? customer.email : ''),
                    name: payment.billing_details.name || (customer && 'name' in customer ? customer.name : ''),
                    phone: payment.billing_details.phone || (customer && 'phone' in customer ? customer.phone : '')
                  };
                }
                
                // Fallback when billing_details is not present
                return {
                  email: (customer && 'email' in customer ? customer.email : ''),
                  name: (customer && 'name' in customer ? customer.name : ''),
                  phone: (customer && 'phone' in customer ? customer.phone : '')
                };
              };

              // @ts-expect-error - Add these fields only for charges
              paymentDoc.billing_details = getBillingDetails();

              // @ts-expect-error - Add these fields only for charges
              paymentDoc.receipt_url = 'receipt_url' in payment ? payment.receipt_url || '' : '';
            }
            
            try {
              // Use setDoc with merge to avoid duplicates
              await setDoc(doc(db, PAYMENTS_COLLECTION, payment.id), paymentDoc);
              
              count++;
              if (count % 50 === 0) {
                console.log(`Synced ${count} ${type} to Firestore...`);
              }
            } catch (writeError) {
              console.error(`Error writing payment ${payment.id}:`, writeError);
              errors++;
            }
          }
        } catch (processError) {
          console.error(`Error processing ${type} ${payment.id}:`, processError);
          errors++;
        }
      }
      
      console.log(`Completed processing ${type}: ${count} succeeded, ${errors} failed`);
      return count;
    };
    
    // Fetch ALL charges using pagination - same as in history/route.ts
    const allCharges: Stripe.Charge[] = [];
    let hasMore = true;
    let startingAfter: string | undefined = undefined;
    
    while (hasMore) {
      console.log(`Fetching batch of charges ${startingAfter ? 'after ' + startingAfter : '(first batch)'}`);
      
      const params: Stripe.ChargeListParams = {
        limit: 100,
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
    
    // Fetch ALL payment intents
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
    
    // Process and store all the data
    const chargeCount = await processPayments(allCharges, 'charges');
    const intentCount = await processPayments(allPaymentIntents, 'paymentIntents');
    
    console.log(`Sync complete! Stored ${chargeCount} charges and ${intentCount} payment intents in Firestore.`);
    
    // Make sure updateDoc is imported
    const { updateDoc } = await import('firebase/firestore');
    
    await updateDoc(doc(db, 'system', 'syncStatus'), {
      status: {
        success: true,
        message: `Successfully synced ${chargeCount + intentCount} payments.`
      },
      lastSyncTime: Date.now()
    });
    
    return NextResponse.json({ success: true, counts: { charges: chargeCount, intents: intentCount }});
  } catch (error: unknown) {
    const typedError = error as Error & { message?: string };
    console.error('Error syncing payments to Firestore:', typedError);
    return NextResponse.json(
      {
        error: 'An error occurred while syncing payments to Firestore',
        details: typedError.message
      },
      { status: 500 }
    );
  }
}