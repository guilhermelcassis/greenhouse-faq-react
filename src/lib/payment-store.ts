// Enhanced payment storage system
// For production, replace file storage with a database

import { promises as fs } from 'fs';
import path from 'path';
import Stripe from 'stripe';

// Define types
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
  receipt_url?: string;
  last_synced: number;
}

interface PaymentStore {
  payments: Payment[];
  lastSyncTime: number;
  emailIndex: Record<string, string[]>; // Maps emails to payment IDs
}

// Path to store file
const storePath = path.join(process.cwd(), 'payment-store.json');

// In-memory store
let paymentStore: PaymentStore = {
  payments: [],
  lastSyncTime: 0,
  emailIndex: {}
};

// Load store from disk at startup
async function initStore() {
  try {
    const data = await fs.readFile(storePath, 'utf8');
    paymentStore = JSON.parse(data);
    console.log(`Payment store loaded with ${paymentStore.payments.length} payments`);
  } catch (error) {
    console.error('Error loading payment store:', error);
    console.log('No payment store found or error loading, starting fresh');
    paymentStore = { payments: [], lastSyncTime: 0, emailIndex: {} };
  }
}

// Call this once during app initialization
initStore();

// Save store to disk
async function saveStore() {
  try {
    await fs.writeFile(storePath, JSON.stringify(paymentStore, null, 2));
  } catch (error) {
    console.error('Error writing payment store to disk:', error);
  }
}

// Rebuild the email index
function rebuildEmailIndex() {
  const emailIndex: Record<string, string[]> = {};
  
  for (const payment of paymentStore.payments) {
    // Index primary email
    if (payment.email) {
      if (!emailIndex[payment.email.toLowerCase()]) {
        emailIndex[payment.email.toLowerCase()] = [];
      }
      emailIndex[payment.email.toLowerCase()].push(payment.id);
    }
    
    // Index billing email if different
    if (payment.billing_details?.email && 
        payment.billing_details.email.toLowerCase() !== payment.email.toLowerCase()) {
      if (!emailIndex[payment.billing_details.email.toLowerCase()]) {
        emailIndex[payment.billing_details.email.toLowerCase()] = [];
      }
      emailIndex[payment.billing_details.email.toLowerCase()].push(payment.id);
    }
  }
  
  paymentStore.emailIndex = emailIndex;
}

// Get payments for a specific user
export async function getUserPayments(email: string): Promise<Payment[]> {
  // Look up payment IDs for this email
  const paymentIds = paymentStore.emailIndex[email.toLowerCase()] || [];
  
  // Get the actual payments
  const userPayments = paymentIds.map(id => 
    paymentStore.payments.find(p => p.id === id)
  ).filter(Boolean) as Payment[];
  
  return userPayments;
}

// Admin function to sync all payments from Stripe
export async function syncAllPayments(): Promise<{ count: number, timestamp: number }> {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-02-24.acacia',
  });
  
  // Track all payments we've found
  const syncedPayments: Record<string, Payment> = {};
  
  // First, fetch all customers
  let hasMore = true;
  let startingAfter: string | undefined = undefined;
  
  console.log("Starting to sync customers and their charges...");
  
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
        
        // Map charges to our format
        for (const charge of charges.data) {
          syncedPayments[charge.id] = {
            id: charge.id,
            amount: charge.amount,
            currency: charge.currency,
            status: charge.status,
            created: charge.created,
            email: customer.email,
            description: charge.description,
            customer_id: customer.id,
            billing_details: {
              email: customer.email,
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
  hasMore = true;
  startingAfter = undefined;
  
  console.log("Syncing charges not associated with customers...");
  
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
          email: email,
          description: charge.description,
          billing_details: {
            email: charge.billing_details?.email || undefined, // Ensure email is undefined if null
            name: charge.billing_details?.name as string,
            phone: charge.billing_details?.phone as string
          },
          receipt_url: charge.receipt_url || undefined,
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
  
  // Update our store with the synced payments
  paymentStore.payments = Object.values(syncedPayments);
  paymentStore.lastSyncTime = Date.now();
  
  // Rebuild the email index
  rebuildEmailIndex();
  
  // Save to disk
  await saveStore();
  
  console.log(`Sync complete. ${paymentStore.payments.length} payments stored.`);
  
  return {
    count: paymentStore.payments.length,
    timestamp: paymentStore.lastSyncTime
  };
} 