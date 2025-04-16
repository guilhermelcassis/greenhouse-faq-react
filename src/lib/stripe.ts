import { loadStripe } from '@stripe/stripe-js';
import Stripe from 'stripe';

// Define more specific types instead of using 'any'
export interface PaymentMethodDetails {
  card?: {
    brand?: string | null;
    exp_month?: number;
    exp_year?: number;
    last4?: string | null;
  };
  type?: string;
}

// Define a standardized interface for payment data returned by our helper functions
export interface StripePaymentData {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created: number;
  email: string;
  userId?: string;
  description: string | null;
  receipt_url: string | null;
  refunded: boolean;
  balance_transaction: Stripe.BalanceTransaction | string | null;
  billing_details: {
    email?: string | null;
    name?: string | null;
    phone?: string | null;
  };
  payment_method_details?: PaymentMethodDetails;
  metadata?: Record<string, string>;
  // Add specific field for EUR conversion
  amount_eur?: number;
}

// Frontend Stripe instance - safely handle missing keys
export const getStripe = async () => {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!key) {
    console.error('Missing Stripe publishable key');
    return null;
  }
  return loadStripe(key);
};

// Backend Stripe instance (for API routes)
export const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-02-24.acacia', // Use a standard API version
    })
  : null;

// For client components
const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

export default stripePromise;

/**
 * Convert amount from source currency to EUR
 * @param amount Amount in the smallest unit of currency (cents, etc.)
 * @param currency Currency code
 * @param balanceTransaction Optional balance transaction with exchange rate
 * @returns Amount in EUR cents
 */
export function convertToEur(
  amount: number, 
  currency: string,
  balanceTransaction?: Stripe.BalanceTransaction | null
): number {
  // If already in EUR, no conversion needed
  if (currency.toLowerCase() === 'eur') {
    return amount;
  }
  
  // If we have a balance transaction with exchange rate, use it
  if (balanceTransaction && typeof balanceTransaction !== 'string' && balanceTransaction.exchange_rate) {
    console.log(`Converting ${amount} ${currency} to EUR using exchange rate ${balanceTransaction.exchange_rate}`);
    return Math.round(amount * balanceTransaction.exchange_rate);
  }
  
  // Fallback conversion rates for common currencies
  const conversionRates: Record<string, number> = {
    'usd': 0.92, // USD to EUR approximate rate
    'gbp': 1.15, // GBP to EUR approximate rate
    'brl': 0.17, // BRL to EUR approximate rate
  };
  
  if (conversionRates[currency.toLowerCase()]) {
    const rate = conversionRates[currency.toLowerCase()];
    const converted = Math.round(amount * rate);
    console.log(`Converting ${amount} ${currency} to ${converted} EUR using fallback rate ${rate}`);
    return converted;
  }
  
  // If we don't have a conversion rate, just return the original amount
  console.warn(`No conversion rate found for ${currency}, returning original amount`);
  return amount;
}

/**
 * Process a Stripe charge into our standard format
 * @param charge Stripe charge object
 * @param defaultEmail Default email to use if not found in charge
 * @returns Standardized payment data
 */
function processCharge(charge: Stripe.Charge, defaultEmail: string = ''): StripePaymentData {
  // Get the email from one of the possible locations, with fallbacks
  const email = 
    charge.metadata?.email ||
    charge.receipt_email ||
    charge.billing_details?.email ||
    defaultEmail;
  
  // Calculate EUR amount
  const amountEur = convertToEur(
    charge.amount,
    charge.currency,
    typeof charge.balance_transaction === 'string' ? null : charge.balance_transaction
  );
  
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
    metadata: charge.metadata,
    amount_eur: amountEur
  };
}

/**
 * Search for payments by email address, with improved pagination
 * @param email Email address to search for
 * @returns Array of standardized payment data
 */
export async function getPaymentsByEmail(email: string): Promise<StripePaymentData[]> {
  if (!stripe) {
    console.error('Stripe instance not initialized');
    return [];
  }
  
  try {
    console.log(`Searching payments for email: ${email}`);
    
    const emailNormalized = email.toLowerCase().trim();
    let allMatchingCharges: Stripe.Charge[] = [];
    
    // APPROACH 1: Try to use Stripe search API if available (much faster)
    try {
      if (stripe.charges.search) {
        console.log('Using Stripe search API to find charges by email...');
        
        // Search by email in metadata
        const emailSearchResults = await stripe.charges.search({
          query: `metadata['email']:'${emailNormalized}'`,
          limit: 100,
          expand: ['data.balance_transaction']
        });
        
        console.log(`Found ${emailSearchResults.data.length} charges with metadata.email=${emailNormalized}`);
        allMatchingCharges = [...allMatchingCharges, ...emailSearchResults.data];
        
        // Search by receipt_email
        const receiptEmailSearchResults = await stripe.charges.search({
          query: `receipt_email:'${emailNormalized}'`,
          limit: 100,
          expand: ['data.balance_transaction']
        });
        
        console.log(`Found ${receiptEmailSearchResults.data.length} charges with receipt_email=${emailNormalized}`);
        
        // Add any new charges not already in our list
        receiptEmailSearchResults.data.forEach(charge => {
          if (!allMatchingCharges.some(c => c.id === charge.id)) {
            allMatchingCharges.push(charge);
          }
        });
      }
    } catch (searchError) {
      console.error('Error using Stripe search API:', searchError);
    }
    
    // APPROACH 2: If search didn't work or didn't find anything, try paginated list
    if (allMatchingCharges.length === 0) {
      let hasMore = true;
      let startingAfter: string | undefined = undefined;
      const maxPages = 50; // Increase to handle more historical data
      let currentPage = 0;
      
      // Paginate through charges to find all matches
      while (hasMore && currentPage < maxPages) {
        currentPage++;
        const options: Stripe.ChargeListParams = {
          limit: 100,
          expand: ['data.balance_transaction']
        };
        
        if (startingAfter) {
          options.starting_after = startingAfter;
        }
        
        const charges = await stripe.charges.list(options);
        
        // Find charges with any matching email info
        const matchingCharges = charges.data.filter(charge => {
          return (
            (charge.receipt_email && charge.receipt_email.toLowerCase() === emailNormalized) ||
            (charge.billing_details?.email && charge.billing_details.email.toLowerCase() === emailNormalized) ||
            (charge.metadata?.email && charge.metadata.email.toLowerCase() === emailNormalized)
          );
        });
        
        allMatchingCharges = [...allMatchingCharges, ...matchingCharges];
        
        // Continue pagination if we have more results
        hasMore = charges.has_more;
        if (hasMore && charges.data.length > 0) {
          startingAfter = charges.data[charges.data.length - 1].id;
        }
        
        // If we found a reasonable number of matches already, we might stop pagination early
       // if (allMatchingCharges.length >= 5 && currentPage >= 3) {
          //  hasMore = false;
        //}
      }
    }
    
    // APPROACH 3: Try to find the user as a customer and get their payment history
    if (allMatchingCharges.length === 0) {
      try {
        console.log('Looking up customer by email...');
        
        // Look for a customer with this email
        const customers = await stripe.customers.list({
          email: emailNormalized,
          limit: 10 // Check up to 10 customers with this email
        });
        
        if (customers.data.length > 0) {
          console.log(`Found ${customers.data.length} customers with email ${emailNormalized}`);
          
          // Get payment history for each customer
          for (const customer of customers.data) {
            console.log(`Checking payment history for customer ${customer.id}`);
            
            // Get charges for this customer
            const customerCharges = await stripe.charges.list({
              customer: customer.id,
              limit: 100,
              expand: ['data.balance_transaction']
            });
            
            console.log(`Found ${customerCharges.data.length} charges for customer ${customer.id}`);
            
            if (customerCharges.data.length > 0) {
              allMatchingCharges = [...allMatchingCharges, ...customerCharges.data];
            }
          }
        }
      } catch (customerError) {
        console.error('Error looking up customer:', customerError);
      }
    }
    
    console.log(`Found ${allMatchingCharges.length} matching charges for ${email}`);
    
    // Process and return the charges
    return allMatchingCharges.map(charge => processCharge(charge, email));
  } catch (error) {
    console.error('Error searching payments by email:', error);
    return [];
  }
}

/**
 * Search for payments by user ID
 * @param userId User ID to search for
 * @returns Array of standardized payment data
 */
export async function getPaymentsByUserId(userId: string): Promise<StripePaymentData[]> {
    if (!stripe) {
      console.error('Stripe instance not initialized');
      return [];
    }
    
  try {
    console.log(`Searching payments for user ID: ${userId}`);
    
    let allMatchingCharges: Stripe.Charge[] = [];
    
    // APPROACH 1: Try to use Stripe search API if available (much faster)
    try {
      if (stripe.charges.search) {
        console.log('Using Stripe search API to find charges by userId...');
        
        // Search by userId in metadata
        const userIdSearchResults = await stripe.charges.search({
          query: `metadata['userId']:'${userId}'`,
          limit: 100,
          expand: ['data.balance_transaction']
        });
        
        console.log(`Found ${userIdSearchResults.data.length} charges with metadata.userId=${userId}`);
        allMatchingCharges = [...allMatchingCharges, ...userIdSearchResults.data];
      }
    } catch (searchError) {
      console.error('Error using Stripe search API:', searchError);
    }
    
    // APPROACH 2: If search didn't work or didn't find anything, try paginated list
    if (allMatchingCharges.length === 0) {
      let hasMore = true;
      let startingAfter: string | undefined = undefined;
      const maxPages = 50;
      let currentPage = 0;
      
      while (hasMore && currentPage < maxPages) {
        currentPage++;
        const options: Stripe.ChargeListParams = {
          limit: 100,
          expand: ['data.balance_transaction']
        };
        
        if (startingAfter) {
          options.starting_after = startingAfter;
        }
        
        const charges = await stripe.charges.list(options);
        
        // Find charges with matching user ID in metadata
        const matchingCharges = charges.data.filter(charge => 
          charge.metadata?.userId === userId
        );
        
        allMatchingCharges = [...allMatchingCharges, ...matchingCharges];
        
        hasMore = charges.has_more;
        if (hasMore && charges.data.length > 0) {
          startingAfter = charges.data[charges.data.length - 1].id;
        }
        
        if (allMatchingCharges.length >= 5 && currentPage >= 3) {
          hasMore = false;
        }
      }
    }
    
    console.log(`Found ${allMatchingCharges.length} matching charges for user ID ${userId}`);
    
    // Process and return the charges
    return allMatchingCharges.map(charge => processCharge(charge));
  } catch (error) {
    console.error('Error searching payments by user ID:', error);
    return [];
  }
}

/**
 * Search for payments where the email is in billing_details.email 
 * This is needed because Stripe search API can't search in billing_details directly
 * @param email Email address to search for
 * @returns Array of standardized payment data
 */
export async function getPaymentsByBillingEmail(email: string): Promise<StripePaymentData[]> {
  if (!stripe) {
    console.error('Stripe instance not initialized');
    return [];
  }
  
  try {
    console.log(`Searching payments with billing_details.email: ${email}`);
    const emailNormalized = email.toLowerCase().trim();
    
    // Since Stripe search API can't search in billing_details.email directly,
    // we have to use the list API and filter manually
    let allMatchingCharges: Stripe.Charge[] = [];
    let hasMore = true;
    let startingAfter: string | undefined = undefined;
    const maxPages = 50; // Limit how deep we go
    let currentPage = 0;
    
    while (hasMore && currentPage < maxPages) {
      currentPage++;
      console.log(`Searching billing_details.email page ${currentPage}...`);
      
      const options: Stripe.ChargeListParams = {
        limit: 100, // Max limit per page
        expand: ['data.balance_transaction']
      };
      
      if (startingAfter) {
        options.starting_after = startingAfter;
      }
      
      const charges = await stripe.charges.list(options);
      
      // Look specifically for matches in billing_details.email
      const matchingCharges = charges.data.filter(charge => {
        // Check billing_details.email if it exists
        if (charge.billing_details?.email) {
          const matches = charge.billing_details.email.toLowerCase().trim() === emailNormalized;
          if (matches) {
            console.log(`Found charge ${charge.id} with matching billing_details.email`);
          }
          return matches;
        }
        return false;
      });
      
      allMatchingCharges = [...allMatchingCharges, ...matchingCharges];
      
      // Continue pagination if we have more results
      hasMore = charges.has_more;
      if (hasMore && charges.data.length > 0) {
        startingAfter = charges.data[charges.data.length - 1].id;
      }
      
      // Stop early if we found enough matches already
      if (allMatchingCharges.length >= 5 && currentPage >= 3) {
        console.log(`Found ${allMatchingCharges.length} matches, stopping pagination early`);
        hasMore = false;
      }
    }
    
    console.log(`Found ${allMatchingCharges.length} charges with matching billing_details.email`);
    
    // Process and return the charges
    return allMatchingCharges.map(charge => processCharge(charge, email));
  } catch (error) {
    console.error('Error searching payments by billing_details.email:', error);
    return [];
  }
}

/**
 * Search for payments using multiple criteria (email, userId, etc.)
 * @param params Search parameters
 * @returns Array of standardized payment data
 */
export async function searchPayments(params: {
  email?: string;
  userId?: string;
  limit?: number;
  includeAll?: boolean; // Whether to include failed/refunded payments
  customerId?: string; // Direct customer ID if known
}): Promise<StripePaymentData[]> {
  if (!stripe) {
    console.error('Stripe instance not initialized');
    return [];
  }
  
  const limit = params.limit || 100;
  let allResults: StripePaymentData[] = [];
  
  try {
    // PRIORITY 1: If we have a specific customer ID, search by that first
    if (params.customerId) {
      console.log(`Searching for payments with customer ID: ${params.customerId}`);
      const customerPayments = await getPaymentsByCustomerId(params.customerId);
      allResults = [...allResults, ...customerPayments];
    }
    
    // PRIORITY 2: If we have an email, try to find the customer record first
    // This helps with cases where the email is in the customer record but not in the payment
    if (params.email && (!params.customerId || allResults.length === 0)) {
      const emailNormalized = params.email.toLowerCase().trim();
      console.log(`Looking for customers with email: ${emailNormalized}`);
      
      try {
        // Look for customers with this email
        const customers = await stripe.customers.list({
          email: emailNormalized,
          limit: 10
        });
        
        if (customers.data.length > 0) {
          console.log(`Found ${customers.data.length} customers with email ${emailNormalized}`);
          console.log(`Customer details: ${customers.data.map(c => `${c.id} (${c.email})`).join(', ')}`);
          
          // Get payments for all customers with this email
          for (const customer of customers.data) {
            console.log(`Getting payments for customer ${customer.id} (${customer.email || 'no-email'})`);
            const customerPayments = await getPaymentsByCustomerId(customer.id);
            
            // Add to results, avoiding duplicates
            const existingIds = new Set(allResults.map(r => r.id));
            const newResults = customerPayments.filter(r => !existingIds.has(r.id));
            
            allResults = [...allResults, ...newResults];
            console.log(`Added ${newResults.length} payments from customer ${customer.id}`);
          }
        } else {
          console.log(`No customers found with email ${emailNormalized}`);
        }
      } catch (customerError) {
        console.error('Error finding customers by email:', customerError);
      }
    }
    
    // PRIORITY 3: Search for payments by email directly
    if (params.email && allResults.length < limit) {
      const emailResults = await getPaymentsByEmail(params.email);
      
      // Add to results, avoiding duplicates
      const existingIds = new Set(allResults.map(r => r.id));
      const newEmailResults = emailResults.filter(r => !existingIds.has(r.id));
      
      allResults = [...allResults, ...newEmailResults];
      console.log(`Added ${newEmailResults.length} payments from email search`);
      
      // PRIORITY 3.5: Specific search for billing_details.email
      // This is a separate function since the Stripe search API can't search in billing_details directly
      if (allResults.length < limit) {
        const billingEmailResults = await getPaymentsByBillingEmail(params.email);
        
        // Add to results, avoiding duplicates
        const existingIds = new Set(allResults.map(r => r.id));
        const newBillingEmailResults = billingEmailResults.filter(r => !existingIds.has(r.id));
        
        allResults = [...allResults, ...newBillingEmailResults];
        console.log(`Added ${newBillingEmailResults.length} payments from billing_details.email search`);
      }
    }
    
    // PRIORITY 4: Search by userId
    if (params.userId && allResults.length < limit) {
      const userIdResults = await getPaymentsByUserId(params.userId);
      
      // Add to results, avoiding duplicates
      const existingIds = new Set(allResults.map(r => r.id));
      const newResults = userIdResults.filter(r => !existingIds.has(r.id));
      
      allResults = [...allResults, ...newResults];
      console.log(`Added ${newResults.length} payments from userId search`);
    }
    
    // Filter out failed or refunded payments unless includeAll is true
    if (!params.includeAll) {
      const originalCount = allResults.length;
      allResults = allResults.filter(payment => 
        payment.status === 'succeeded' && 
        !payment.refunded && 
        !(payment.description?.toLowerCase().includes('refund'))
      );
      console.log(`Filtered out ${originalCount - allResults.length} failed/refunded payments`);
    }
    
    // Special handling for BRL conversion
    allResults = allResults.map(payment => {
      // Make a copy to avoid modifying the original
      const processedPayment = { ...payment };
      
      // Handle BRL conversion specifically
      if (processedPayment.currency.toLowerCase() === 'brl' && !processedPayment.amount_eur) {
        console.log(`Processing BRL payment ${processedPayment.id} with amount ${processedPayment.amount}`);
        
        // Figure out the correct scale for this BRL amount
        let amountEur: number;
        
        // Check if this is possibly a large amount that needs scaling
        if (processedPayment.amount > 10000) {
          // Case 1: Large BRL amount that might need scaling
          const brlRate = 0.17; // BRL to EUR rate
          
          // Try to detect if this is already properly scaled or needs adjustment
          if (processedPayment.amount > 1000000) {
            // This is a very large amount, likely needs double scaling
            amountEur = Math.round((processedPayment.amount / 10000) * brlRate);
            console.log(`BRL amount is very large (${processedPayment.amount}), applying double scaling: ${amountEur} EUR`);
          } else {
            // Normal case for large BRL amounts
            amountEur = Math.round((processedPayment.amount / 100) * brlRate);
            console.log(`Large BRL amount (${processedPayment.amount}), applying scaling: ${amountEur} EUR`);
          }
        } else {
          // Case 2: Normal BRL amount
          amountEur = Math.round(processedPayment.amount * 0.17);
          console.log(`Normal BRL amount (${processedPayment.amount}), converted to ${amountEur} EUR`);
        }
        
        processedPayment.amount_eur = amountEur;
      }
      
      return processedPayment;
    });
    
    // Sort by most recent first and limit results
    const sortedResults = allResults
      .sort((a, b) => b.created - a.created)
      .slice(0, limit);
      
    console.log(`Returning ${sortedResults.length} payments after sorting and limiting`);
    return sortedResults;
  } catch (error) {
    console.error('Error searching payments:', error);
    return [];
  }
}

/**
 * Get all payments from a specific customer
 * @param customerId Stripe customer ID
 * @returns Array of standardized payment data
 */
export async function getPaymentsByCustomerId(customerId: string): Promise<StripePaymentData[]> {
  if (!stripe) {
    console.error('Stripe instance not initialized');
    return [];
  }
  
  try {
    console.log(`Getting payments for customer ID: ${customerId}`);
    
    // Get charges for this customer
    const charges = await stripe.charges.list({
      customer: customerId,
      limit: 100,
      expand: ['data.balance_transaction']
    });
    
    console.log(`Found ${charges.data.length} charges for customer ${customerId}`);
    
    if (charges.data.length > 0) {
      // Log brief summary of each payment to help debugging
      charges.data.forEach((charge, index) => {
        console.log(`Payment ${index + 1}: ID=${charge.id}, Amount=${charge.amount} ${charge.currency}, Status=${charge.status}, Created=${new Date(charge.created * 1000).toISOString()}`);
      });
    } else {
      console.log(`No payments found for customer ${customerId}`);
    }
    
    // Process and return the charges
    return charges.data.map(charge => processCharge(charge));
  } catch (error) {
    console.error('Error getting payments by customer ID:', error);
    return [];
  }
}