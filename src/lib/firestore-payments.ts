import { db } from './firebase';
import { collection, addDoc, getDocs, query, where, deleteDoc } from 'firebase/firestore';
import Stripe from 'stripe';

// Payment interface (same as in payment-store.ts)
interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created: number;
  email: string;
  description: string | null;
  customer_id?: string;
  billing_details?: {
    email?: string;
    name?: string;
    phone?: string;
  };
  receipt_url?: string | null;
  last_synced: number;
  stripe_id?: string; // Added stripe_id property
} 

// Collection reference
const paymentsCollection = 'payments';

// Get payments by email
export async function getPaymentsByEmail(email: string): Promise<Payment[]> {
  try {
    if (!email) {
      console.warn('Empty email provided to getPaymentsByEmail');
      return [];
    }
    
    console.log(`Querying Firestore for payments with email: ${email}`);
    const paymentsRef = collection(db, 'payments');
    
    // Create query against the collection
    // Use lowercase email for consistency
    const emailQuery = query(
      paymentsRef, 
      where('email', '==', email.toLowerCase())
    );
    
    console.log('Query created, executing...');
    const querySnapshot = await getDocs(emailQuery);
    console.log(`Query returned ${querySnapshot.size} documents`);
    
    // Map results to Payment objects
    const payments: Payment[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data() as Payment;
      payments.push({
        ...data,
        // Use the original Stripe ID for consistency across systems
        id: data.stripe_id || doc.id
      });
    });
    
    // Sort payments by date, newest first
    payments.sort((a, b) => b.created - a.created);
    
    console.log(`Found ${payments.length} payments for email ${email} in Firestore`);
    return payments;
  } catch (error) {
    console.error('Error querying Firestore:', error);
    // Return empty array instead of throwing to prevent UI breakage
    return [];
  }
}

// Sync payments from Stripe to Firestore
export async function syncPaymentsToFirestore(): Promise<{ count: number, timestamp: number }> {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-02-24.acacia',
    });
    
    // Track all payments we've found
    const syncedPayments: Record<string, Payment> = {};
    
    // First, sync customers with their charges
    console.log("Starting to sync customers and their charges to Firestore...");
    
    let hasMore = true;
    let startingAfter: string | undefined = undefined;
    
    while (hasMore) {
      const params: Stripe.CustomerListParams = {
        limit: 1000,
        expand: ['data.subscriptions']
      };
      
      if (startingAfter) {
        params.starting_after = startingAfter;
      }
      
      const customers = await stripe.customers.list(params);
      
      // Process each customer
      for (const customer of customers.data) {
        if (customer.email) {
          console.log(`Processing customer: ${customer.email}`);
          
          // Get charges for this customer
          const charges = await stripe.charges.list({
            customer: customer.id,
            limit: 1000,
            expand: ['data.balance_transaction']
          });
          
          // Store each charge in syncedPayments
          for (const charge of charges.data) {
            syncedPayments[charge.id] = {
              id: charge.id,
              amount: charge.amount,
              currency: charge.currency,
              status: charge.status,
              created: charge.created,
              email: customer.email.toLowerCase(), // Store emails in lowercase for consistency
              description: charge.description,
              customer_id: customer.id,
              billing_details: {
                email: customer.email.toLowerCase(),
                name: customer.name || undefined,
                phone: customer.phone || undefined
              },
              receipt_url: charge.receipt_url || undefined,
              last_synced: Date.now()
            };
          }
        }
      }
      
      // Check if there are more customers to fetch
      hasMore = customers.has_more;
      
      // Set the starting point for the next batch
      if (hasMore && customers.data.length > 0) {
        startingAfter = customers.data[customers.data.length - 1].id;
      }
    }
    
    // Now fetch payments not associated with customers
    console.log("Syncing charges not associated with customers...");
    
    hasMore = true;
    startingAfter = undefined;
    
    while (hasMore) {
      const params: Stripe.ChargeListParams = {
        limit: 1000,
        expand: ['data.balance_transaction']
      };
      
      if (startingAfter) {
        params.starting_after = startingAfter;
      }
      
      const charges = await stripe.charges.list(params);
      
      for (const charge of charges.data) {
        // Skip if we already processed this charge
        if (syncedPayments[charge.id]) continue;
        
        // Try to get email from various sources
        const email = charge.receipt_email || 
                     (charge.billing_details?.email) ||
                     (charge.metadata?.email as string) || 
                     '';
        
        if (email) {
          syncedPayments[charge.id] = {
            id: charge.id,
            amount: charge.amount,
            currency: charge.currency,
            status: charge.status,
            created: charge.created,
            email: email.toLowerCase(),
            description: charge.description,
            billing_details: {
              email: charge.billing_details?.email?.toLowerCase(),
              name: charge.billing_details?.name as string,
              phone: charge.billing_details?.phone as string
            },
            receipt_url: charge.receipt_url,
            last_synced: Date.now()
          };
        }
      }
      
      // Check if there are more charges to fetch
      hasMore = charges.has_more;
      
      // Set the starting point for the next batch
      if (hasMore && charges.data.length > 0) {
        startingAfter = charges.data[charges.data.length - 1].id;
      }
    }
    
    // Store payments in Firestore
    console.log(`Storing ${Object.keys(syncedPayments).length} payments in Firestore...`);
    
    // Clear existing payments collection
    // This is optional - you could also update existing documents instead
    const existingPayments = await getDocs(collection(db, paymentsCollection));
    const deletePromises = existingPayments.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    
    // Add all payments
    const addPromises = Object.values(syncedPayments).map(payment => 
      addDoc(collection(db, paymentsCollection), {
        ...payment,
        // Store the stripe_id separately from Firestore's auto-generated document ID
        stripe_id: payment.id
      })
    );
    
    await Promise.all(addPromises);
    
    console.log(`Successfully synced ${Object.keys(syncedPayments).length} payments to Firestore`);
    
    return {
      count: Object.keys(syncedPayments).length,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Error syncing payments to Firestore:', error);
    throw error;
  }
} 