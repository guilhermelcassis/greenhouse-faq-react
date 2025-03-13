import { NextResponse } from 'next/server';
import { auth } from '@/lib/firebase-admin';
import { db as firebaseDb } from '@/lib/firebase';
import { db as adminDb } from '@/lib/firebase-admin';
import { collection, getDocs, query, limit, startAfter, DocumentData, QueryDocumentSnapshot, getDoc, doc } from 'firebase/firestore';
import { stripe } from '@/lib/stripe';

interface BillingDetails {
  email: string;
  name: string;
  phone: string;
}

interface CardDetails {
  brand?: string;
  last4?: string;
}

interface PaymentMethodDetails {
  card?: CardDetails;
  type?: string;
}

interface BalanceTransaction {
  exchange_rate?: number;
  currency: string;
  amount: number;
}

interface LastPaymentError {
  message?: string;
  code?: string;
  type?: string;
}

interface Charge {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created: number;
  billing_details: BillingDetails;
  payment_method_details: PaymentMethodDetails | null;
  receipt_url: string | null;
  balance_transaction: BalanceTransaction | null;
  last_payment_error: LastPaymentError | null;
  refunded: boolean;
  description: string | null;
}

// Collection name
const PAYMENTS_COLLECTION = 'payments';

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

export async function GET(request: Request) {
  try {
    // Get the authorization token from the request headers
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    
    // If no token is provided, return unauthorized
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized - No token provided' }, { status: 401 });
    }
    
    // Verify admin access
    const { isAuthorized, error, userEmail } = await verifyAdmin(token);
    
    if (!isAuthorized) {
      return NextResponse.json({ error }, { status: 403 });
    }
    
    console.log(`Authenticated admin: ${userEmail}`);
    
    // Fetch from Firestore instead of Stripe
    console.log('Fetching ALL payment data from Firestore database');
    
    try {
      // Get all payments from the Firestore collection using pagination
      // to handle potentially large datasets
      const allPayments: DocumentData[] = [];
      const batchSize = 500; // Firestore can handle up to 1000, but we'll use 500 to be safe
      
      // Initial query - don't use 'created' field as it might be missing in some documents
      // Use document ID instead which every document has
      let q = query(
        collection(firebaseDb, PAYMENTS_COLLECTION),
        limit(batchSize)
      );
      
      let lastDoc: QueryDocumentSnapshot | null = null;
      let batchCount = 0;
      
      // Keep fetching until we get an empty batch
      let continueLoop = true;
      
      while (continueLoop) {
        batchCount++;
        console.log(`Fetching batch #${batchCount}...`);
        
        // If we have a last document from previous batch, start after it
        if (lastDoc) {
          q = query(
            collection(firebaseDb, PAYMENTS_COLLECTION),
            startAfter(lastDoc),
            limit(batchSize)
          );
        }
        
        const snapshot = await getDocs(q);
        
        console.log(`Batch #${batchCount} has ${snapshot.docs.length} documents`);
        
        // Stop if we got an empty batch
        if (snapshot.empty || snapshot.docs.length === 0) {
          console.log('Received empty batch, ending pagination');
          continueLoop = false;
          break;
        }
        
        // Get the last visible document for next batch
        lastDoc = snapshot.docs[snapshot.docs.length - 1];
        
        // Add documents to our array
        snapshot.docs.forEach(doc => {
          allPayments.push({
            ...doc.data(),
            firestoreId: doc.id // Keep the Firestore document ID
          });
        });
        
        console.log(`Retrieved batch of ${snapshot.docs.length} payments, total so far: ${allPayments.length}`);
      }
      
      console.log(`Pagination complete. Retrieved ${allPayments.length} total payments from database`);
      
      // Transform payment data to match the expected structure
      const charges = allPayments.map(data => {
        // Ensure refunded status is properly set as a boolean
        const isRefunded = data.refunded === true || 
                          data.status?.toLowerCase() === 'refunded' || 
                          (data.description?.toLowerCase() || '').includes('refund');
        
        return {
          id: data.id || data.stripe_id || data.firestoreId,
          amount: data.amount || 0,
          currency: data.currency || 'eur',
          status: data.status || 'unknown',
          refunded: isRefunded, // Set refunded status explicitly
          created: data.created || 0,
          description: data.description || null,
          billing_details: {
            email: data.billing_details?.email || data.email || '',
            name: data.billing_details?.name || '',
            phone: data.billing_details?.phone || ''
          },
          payment_method_details: data.payment_method_details || null,
          receipt_url: data.receipt_url || '',
          // Include the Firestore balance_transaction structure if it exists
          balance_transaction: data.balance_transaction || 
            (data.amount_eur && data.amount ? 
              { 
                exchange_rate: data.amount_eur / data.amount,
                currency: data.currency || 'eur',
                amount: data.amount_eur || data.amount
              } : undefined),
          last_payment_error: null
        };
      });
      
      console.log(`Transformed ${charges.length} payment records for client display`);
      
      // When retrieving charges, expand the payment_intent field
      const stripeCharges = await stripe?.charges.list({
        limit: 10000,
        expand: ['data.balance_transaction', 'data.payment_intent']
      });
      
      const processedCharges = stripeCharges?.data.map(charge => {
        // Extract error information from payment_intent if available
        let last_payment_error = null;
        
        if (charge.payment_intent && typeof charge.payment_intent !== 'string') {
          last_payment_error = charge.payment_intent.last_payment_error || null;
        }
        
        // Fall back to other error fields on the charge if payment_intent isn't available
        if (!last_payment_error && charge.failure_message) {
          last_payment_error = {
            message: charge.failure_message,
            code: charge.failure_code
          };
        }
        
        return {
          id: charge.id,
          amount: charge.amount,
          currency: charge.currency,
          status: charge.status,
          refunded: charge.refunded || false,
          created: charge.created,
          description: charge.description || null,
          billing_details: charge.billing_details,
          payment_method_details: charge.payment_method_details,
          receipt_url: charge.receipt_url,
          balance_transaction: charge.balance_transaction,
          last_payment_error: last_payment_error
        } as Charge;
      });
      
      // When returning payment history data, include the last sync time
      const syncStatusDoc = await getDoc(doc(firebaseDb, 'system', 'syncStatus'));
      const lastSyncTime = syncStatusDoc.exists() ? syncStatusDoc.data()?.lastSyncTime : null;
      
      // Combine both data sources
      const combinedCharges = [...charges];
      
      // Add Stripe charges but avoid duplicates
      if (processedCharges && processedCharges.length > 0) {
        processedCharges.forEach(stripeCharge => {
          // Check if we already have this charge from Firestore
          const existingChargeIndex = combinedCharges.findIndex(c => c.id === stripeCharge.id);
          
          if (existingChargeIndex >= 0) {
            // If we have this payment in Firestore, ensure refund status is consistent
            // Priority to "refunded" status (if either source says it's refunded, treat it as refunded)
            (combinedCharges[existingChargeIndex] as Charge).refunded = 
              (combinedCharges[existingChargeIndex] as Charge).refunded || 
              stripeCharge.refunded || 
              false;
          } else {
            // If not in Firestore, add from Stripe with proper casting
            // Create a modified version with null for last_payment_error to match expected type
            const compatibleCharge = {
              ...stripeCharge,
              last_payment_error: null // Force to null to match expected type
            };
            combinedCharges.push(compatibleCharge);
          }
        });
      }
      
      // Create a Map to handle uniqueness properly
      const uniqueChargesMap = new Map();
      
      // Process all charges to ensure refund status is correctly set
      combinedCharges.forEach(charge => {
        // Convert description to lowercase for case-insensitive checking if it exists
        const description = charge.description?.toLowerCase() || '';
        
        // Define a proper refunded flag considering multiple conditions
        const shouldBeMarkedAsRefunded = 
          charge.refunded === true || 
          charge.status?.toLowerCase() === 'refunded' ||
          description.includes('refund');
        
        // Create a charge with proper refunded status
        const processedCharge = {
          ...charge,
          refunded: shouldBeMarkedAsRefunded
        };
        
        // Use the Map to store the charge, overwriting any previous version of the same charge
        uniqueChargesMap.set(charge.id, processedCharge);
      });
      
      // Convert the Map back to an array
      const uniqueCharges = Array.from(uniqueChargesMap.values());
      
      return NextResponse.json({ 
        charges: uniqueCharges,
        lastSyncTime
      });
    } catch (firestoreError) {
      console.error('Firestore error:', firestoreError);
      throw new Error('Failed to fetch payment data from database');
    }
  } catch (error: unknown) {
    // More detailed error logging
    if (error instanceof Error) {
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

