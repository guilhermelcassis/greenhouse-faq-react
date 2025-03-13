import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebase-admin';
import { db as adminDb } from '@/lib/firebase-admin';
import Stripe from 'stripe';
import { db } from '@/lib/firebase';
import { doc, setDoc, updateDoc, getDoc } from 'firebase/firestore';

// Collection name
const PAYMENTS_COLLECTION = 'payments';

// Define an interface for the sync status data
interface SyncStatusData {
  status: {
    inProgress?: boolean;
    success?: boolean;
    message: string;
  };
  progress: number;
  lastSyncTime?: number;
  isComplete?: boolean;
  lastProcessedId?: string;
}

// Add this helper function to safely update status
async function updateSyncStatus(data: SyncStatusData) {
  try {
    const statusDocRef = doc(db, 'system', 'syncStatus');
    const statusDoc = await getDoc(statusDocRef);
    
    if (!statusDoc.exists()) {
      await setDoc(statusDocRef, data);
    } else {
      // Define possible value types for Firestore fields
      type FirestoreFieldValue = string | number | boolean | null | undefined;
      
      // Flatten the nested status object for updateDoc
      const flattenedData: Record<string, FirestoreFieldValue> = {
        progress: data.progress
      };
      
      // Add non-status fields
      if (data.lastSyncTime !== undefined) flattenedData.lastSyncTime = data.lastSyncTime;
      if (data.isComplete !== undefined) flattenedData.isComplete = data.isComplete;
      if (data.lastProcessedId !== undefined) flattenedData.lastProcessedId = data.lastProcessedId;
      
      // Add status fields with dot notation
      if (data.status.message !== undefined) flattenedData['status.message'] = data.status.message;
      if (data.status.inProgress !== undefined) flattenedData['status.inProgress'] = data.status.inProgress;
      if (data.status.success !== undefined) flattenedData['status.success'] = data.status.success;
      
      await updateDoc(statusDocRef, flattenedData);
    }
  } catch (error) {
    console.error('Error updating sync status:', error);
  }
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

    // Verify admin access
    const { isAuthorized, error, userEmail } = await verifyAdmin(token);
    
    if (!isAuthorized) {
      return NextResponse.json({ error }, { status: 403 });
    }
    
    console.log(`Authenticated admin: ${userEmail}`);

    // Parse request body to get sync options
    const body = await request.json().catch(() => ({}));
    const syncType = body.syncType || 'quick'; // Default to quick sync
    
    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-02-24.acacia',
    });
    
    console.log(`Starting comprehensive sync of ${syncType === 'full' ? 'ALL' : 'recent'} payments to Firestore...`);
    
    // Update sync status to show progress has started
    await updateSyncStatus({
      status: {
        inProgress: true,
        message: `Starting sync of ${syncType === 'full' ? 'all historical' : 'recent'} payments...`
      },
      progress: 5,
      lastSyncTime: Date.now()
    });
    
    // Get the last processed ID if we have one (for resuming pagination)
    const statusDoc = await getDoc(doc(db, 'system', 'syncStatus'));
    let lastProcessedId = statusDoc.exists() ? statusDoc.data().lastProcessedId : undefined;
    
    // For full sync, start from the beginning
    if (syncType === 'full') {
      lastProcessedId = undefined;
    }
    
    // Determine how many records to fetch per batch
    const batchSize = 100; // Stripe API limit is 100
    
    // Process multiple batches if doing a full sync
    const maxBatches = syncType === 'full' ? 50 : 10; // Up to 5000 for full, 1000 for quick
    let processedCount = 0;
    let errorCount = 0;
    
    console.log('Starting to fetch most recent charges first...');
    let chLastProcessedId = null;
    let chCurrentBatch = 1;
    let hasMoreCharges = true;
    
    // Change the sorting to get newest first
    while (hasMoreCharges && chCurrentBatch <= maxBatches) {
      console.log(`Fetching batch ${chCurrentBatch} of charges...`);
      
      const charges: Stripe.ApiList<Stripe.Charge> = await stripe.charges.list({
        limit: batchSize,
        expand: ['data.balance_transaction'],
        // Get charges created in the last 24 hours first
        created: {
          gte: Math.floor(Date.now() / 1000) - (24 * 60 * 60)
        },
        ...(chLastProcessedId ? { starting_after: chLastProcessedId } : {})
      });
      
      if (!charges.data || charges.data.length === 0) {
        hasMoreCharges = false;
        console.log('No more charges to process.');
        continue;
      }
      
      console.log(`Retrieved ${charges.data.length} charges in batch ${chCurrentBatch}`);
      
      // Process charges in this batch
      for (const charge of charges.data) {
        try {
          // Extract email and other processing code remains similar...
          const customer = typeof charge.customer === 'object' ? charge.customer : null;
          let email = charge.billing_details?.email || 
                     (customer && 'email' in customer ? customer.email : '') || 
                     charge.receipt_email || 
                     (charge.metadata?.email as string) || 
                     '';
                     
          if (email) {
            email = email.toLowerCase();
            
            // Create the payment document
            const paymentDoc = {
              id: charge.id,
              stripe_id: charge.id,
              type: 'charge',
              amount: charge.amount,
              currency: charge.currency,
              amount_eur: charge.currency.toLowerCase() === 'eur' ? 
                          charge.amount : 
                          calculateEurAmount(charge),
              status: charge.status,
              refunded: charge.refunded || false,
              created: charge.created,
              email: email,
              description: charge.description || null,
              last_synced: Date.now(),
              customer_id: customer?.id || null,
              billing_details: {
                email: charge.billing_details?.email || (customer && 'email' in customer ? customer.email : ''),
                name: charge.billing_details?.name || (customer && 'name' in customer ? customer.name : ''),
                phone: charge.billing_details?.phone || (customer && 'phone' in customer ? customer.phone : '')
              },
              receipt_url: charge.receipt_url || '',
              payment_method: charge.payment_method || null,
              metadata: charge.metadata || null
            };
            
            // Add or update this record in Firestore (merging with existing data)
            await setDoc(doc(db, PAYMENTS_COLLECTION, charge.id), paymentDoc, { merge: true });
            processedCount++;
            
            // Update the last processed ID
            chLastProcessedId = charge.id;
          }
        } catch (error) {
          console.error(`Error processing charge ${charge.id}:`, error);
          errorCount++;
        }
      }
      
      // If we didn't get a full batch, there are no more charges
      if (charges.data.length < batchSize) {
        hasMoreCharges = false;
        console.log('Reached end of recent charges.');
      } else {
        // Update the last processed ID for pagination
        chLastProcessedId = charges.data[charges.data.length - 1].id;
        chCurrentBatch++;
      }
    }
    
    // After processing the recent charges, fetch any older ones that might be missing
    console.log('Finished processing recent charges, now checking for older missing charges...');
    
    // Reset for the standard sync
    chLastProcessedId = null;
    chCurrentBatch = 1;
    hasMoreCharges = true;
    
    // Now do the standard sync for older charges
    while (hasMoreCharges && chCurrentBatch <= maxBatches) {
      console.log(`Fetching batch ${chCurrentBatch} of charges...`);
      
      const charges: Stripe.ApiList<Stripe.Charge> = await stripe.charges.list({
        limit: batchSize,
        expand: ['data.balance_transaction'],
        ...(chLastProcessedId ? { starting_after: chLastProcessedId } : {})
      });
      
      if (!charges.data || charges.data.length === 0) {
        hasMoreCharges = false;
        console.log('No more charges to process.');
        continue;
      }
      
      console.log(`Retrieved ${charges.data.length} charges in batch ${chCurrentBatch}`);
      
      // Process charges in this batch
      for (const charge of charges.data) {
        try {
          // Extract email and other processing code remains similar...
          const customer = typeof charge.customer === 'object' ? charge.customer : null;
          let email = charge.billing_details?.email || 
                     (customer && 'email' in customer ? customer.email : '') || 
                     charge.receipt_email || 
                     (charge.metadata?.email as string) || 
                     '';
                     
          if (email) {
            email = email.toLowerCase();
            
            // Create the payment document
            const paymentDoc = {
              id: charge.id,
              stripe_id: charge.id,
              type: 'charge',
              amount: charge.amount,
              currency: charge.currency,
              amount_eur: charge.currency.toLowerCase() === 'eur' ? 
                          charge.amount : 
                          calculateEurAmount(charge),
              status: charge.status,
              refunded: charge.refunded || false,
              created: charge.created,
              email: email,
              description: charge.description || null,
              last_synced: Date.now(),
              customer_id: customer?.id || null,
              billing_details: {
                email: charge.billing_details?.email || (customer && 'email' in customer ? customer.email : ''),
                name: charge.billing_details?.name || (customer && 'name' in customer ? customer.name : ''),
                phone: charge.billing_details?.phone || (customer && 'phone' in customer ? customer.phone : '')
              },
              receipt_url: charge.receipt_url || '',
              payment_method: charge.payment_method || null,
              metadata: charge.metadata || null
            };
            
            // Add or update this record in Firestore (merging with existing data)
            await setDoc(doc(db, PAYMENTS_COLLECTION, charge.id), paymentDoc, { merge: true });
            processedCount++;
            
            // Update the last processed ID
            chLastProcessedId = charge.id;
          }
        } catch (error) {
          console.error(`Error processing charge ${charge.id}:`, error);
          errorCount++;
        }
      }
      
      // If we didn't get a full batch, there are no more charges
      if (charges.data.length < batchSize) {
        hasMoreCharges = false;
        console.log('Reached end of older charges.');
      } else {
        // Update the last processed ID for pagination
        chLastProcessedId = charges.data[charges.data.length - 1].id;
        chCurrentBatch++;
      }
    }
    
    // Fetch and process payment intents too for a more complete picture (especially failed payments)
    if (syncType === 'full') {
      console.log('Now fetching PaymentIntents to ensure we have all payment records...');
      
      // Similar logic for payment intents
      let piLastProcessedId: string | undefined = undefined;
      let piHasMore = true;
      let piCurrentBatch = 0;
      
      while (piHasMore && piCurrentBatch < 20) { // Limit to 20 batches (2000 records)
        piCurrentBatch++;
        
        console.log(`Fetching batch ${piCurrentBatch} of payment intents...`);
        
        const paymentIntents: Stripe.ApiList<Stripe.PaymentIntent> = await stripe.paymentIntents.list({
          limit: batchSize,
          ...(piLastProcessedId ? { starting_after: piLastProcessedId } : {})
        });
        
        if (paymentIntents.data.length === 0) {
          console.log('No more payment intents to process');
          break;
        }
        
        console.log(`Retrieved ${paymentIntents.data.length} payment intents in batch ${piCurrentBatch}`);
        
        for (const intent of paymentIntents.data) {
          try {
            // Only store failed/canceled intents that might not have charges
            if (['requires_payment_method', 'requires_action', 'canceled', 'failed'].includes(intent.status)) {
              const intentDoc = {
                id: intent.id,
                stripe_id: intent.id,
                type: 'payment_intent',
                amount: intent.amount,
                currency: intent.currency,
                amount_eur: intent.currency.toLowerCase() === 'eur' ? 
                            intent.amount : 
                            0, // We don't have exchange rate for intents
                status: intent.status,
                created: intent.created,
                email: intent.receipt_email || '',
                description: intent.description || null,
                last_synced: Date.now(),
                billing_details: {
                  email: intent.receipt_email || '',
                  name: '',
                  phone: ''
                }
              };
              
              await setDoc(doc(db, PAYMENTS_COLLECTION, intent.id), intentDoc, { merge: true });
              processedCount++;
            }
            
            piLastProcessedId = intent.id;
          } catch (error) {
            console.error(`Error processing payment intent ${intent.id}:`, error);
            errorCount++;
          }
        }
        
        if (paymentIntents.data.length < batchSize) {
          piHasMore = false;
        }
      }
    }
    
    // Complete the sync process
    await updateSyncStatus({
      status: {
        inProgress: false,
        success: true,
        message: `Successfully synced ${processedCount} payments with ${errorCount} errors.`
      },
      progress: 100,
      isComplete: true,
      lastSyncTime: Date.now(),
      lastProcessedId
    });
    
    console.log(`Comprehensive sync complete! Processed ${processedCount} payments in Firestore with ${errorCount} errors.`);
    
    // Look for any missing recent charges
    console.log('Checking for any specific missing charges...');
    try {
      // Try to retrieve the specific charge you mentioned is missing
      const specificChargeId = 'ch_3QzQDnFaC9x6rmdU17jwMTF9';
      const specificCharge = await stripe.charges.retrieve(specificChargeId, {
        expand: ['customer', 'balance_transaction']
      });
      
      console.log(`Retrieved specific charge: ${specificChargeId}`, specificCharge.status);
      
      if (specificCharge) {
        // First try standard methods to get email
        let email = specificCharge.billing_details?.email || 
                   (specificCharge.customer && typeof specificCharge.customer === 'object' && 'email' in specificCharge.customer ? specificCharge.customer.email : '') || 
                   specificCharge.receipt_email || 
                   (specificCharge.metadata?.email as string) || 
                   '';
        
        // If no email but we have userId in metadata, look up user in Firebase
        if (!email && specificCharge.metadata?.userId) {
          try {
            // Get the user from Firebase Auth
            const userId = specificCharge.metadata.userId;
            console.log(`Looking up Firebase user with ID: ${userId}`);
            
            const userRecord = await auth.getUser(userId);
            
            if (userRecord.email) {
              console.log(`Found email ${userRecord.email} for user ${userId}`);
              email = userRecord.email;
            }
          } catch (userLookupError) {
            console.error('Error looking up Firebase user:', userLookupError);
          }
        }
        
        // Now use the email (or 'unknown' if still not found)
        if (email || specificCharge.billing_details?.name) {
          // Extract customer if it exists
          const customer = specificCharge.customer && typeof specificCharge.customer === 'object' ? specificCharge.customer : null;
          
          // Convert amount to EUR
          const amountInEUR = calculateEurAmount(specificCharge);
          
          // Create the payment document
          const paymentDoc = {
            id: specificCharge.id,
            stripe_id: specificCharge.id,
            type: 'charge',
            amount: specificCharge.amount,
            currency: specificCharge.currency,
            amount_eur: amountInEUR,
            status: specificCharge.status,
            refunded: specificCharge.refunded || false,
            created: specificCharge.created,
            email: email || 'unknown',
            description: specificCharge.description || null,
            last_synced: Date.now(),
            customer_id: customer?.id || null,
            billing_details: {
              email: email || '',
              name: specificCharge.billing_details?.name || '',
              phone: specificCharge.billing_details?.phone || ''
            },
            receipt_url: specificCharge.receipt_url || '',
            payment_method: specificCharge.payment_method || null,
            metadata: specificCharge.metadata || null
          };
          
          // Add this specific charge to Firestore
          await setDoc(doc(db, PAYMENTS_COLLECTION, specificCharge.id), paymentDoc, { merge: true });
          console.log(`Added specific charge ${specificChargeId} to database with email: ${email || 'unknown'}`);
          processedCount++;
        }
      }
    } catch (specificError) {
      console.error('Error fetching specific charge:', specificError);
    }
    
    return NextResponse.json({ 
      success: true, 
      counts: { payments: processedCount, errors: errorCount },
      progress: 100,
      isComplete: true
    });
    
  } catch (error: unknown) {
    const typedError = error as Error & { message?: string };
    console.error('Error syncing payments to Firestore:', typedError);
    
    try {
      // Update sync status to show failure
      await updateSyncStatus({
        status: {
          inProgress: false,
          success: false,
          message: `Sync failed: ${typedError.message || 'Unknown error'}`
        },
        progress: 0,
        isComplete: true,
        lastSyncTime: Date.now()
      });
    } catch (statusError) {
      console.error('Additionally failed to update sync status:', statusError);
    }
    
    return NextResponse.json(
      {
        error: 'An error occurred while syncing payments to Firestore',
        details: typedError.message
      },
      { status: 500 }
    );
  }
}

// Modify the calculateEurAmount function to prioritize Stripe's exchange rates
function calculateEurAmount(charge: Stripe.Charge): number | null {  
  const currency = charge.currency?.toLowerCase() || 'eur';
  const amount = charge.amount || 0;
  
  // If currency is already EUR, no conversion needed
  if (currency === 'eur') {
    return amount;
  }
  
  // APPROACH 1: Get exchange rate from balance_transaction (Stripe's own rate)
  if (charge.balance_transaction && 
      typeof charge.balance_transaction === 'object') {
      
    // Stripe provides the exchange rate they used for this specific transaction
    if (charge.balance_transaction.exchange_rate) {
      console.log(`Using Stripe exchange rate for ${currency}: ${charge.balance_transaction.exchange_rate}`);
      return Math.round(amount * charge.balance_transaction.exchange_rate);
    }
    
    // Alternative method: If net amount in EUR is directly available
    if (charge.balance_transaction.amount && 
        charge.balance_transaction.currency?.toLowerCase() === 'eur') {
      console.log(`Using balance transaction amount directly for ${charge.id}`);
      return charge.balance_transaction.amount;
    }
  }
  
  // APPROACH 2: If we don't have exchange rate from Stripe, log this and return the original amount
  // This will make it obvious which transactions need manual review
  console.warn(`No exchange rate available for charge ${charge.id} (${currency}). Setting amount_eur to null.`);
  return null; // Indicates we couldn't determine the EUR amount
}