import { loadStripe } from '@stripe/stripe-js';
import Stripe from 'stripe';



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

// Define the function to get payments by email
export async function getPaymentsByEmail(email: string) {
  try {
    if (!stripe) {
      console.error('Stripe instance not initialized');
      return [];
    }
    
    console.log('Looking for payments with email:', email);
    
    // First, try to find a customer with this email
    const customers = await stripe.customers.list({
      email: email,
      limit: 10 // We'll check up to 10 customers with this email
    });
    
    console.log(`Found ${customers.data.length} customers with email ${email}`);
    
    // If no customers found, try an alternative approach
    if (customers.data.length === 0) {
      console.log('No customers found with that email, trying direct charge search');
      
      // Try a more direct search with metadata (this is less efficient but helps for testing)
      const charges = await stripe.charges.list({
        limit: 1000,
        expand: ['data.customer']
      });
      
      // Filter charges that might contain this email in metadata
      const filteredCharges = charges.data.filter(charge => {
        const metadata = charge.metadata || {};
        const hasEmailInMetadata = Object.values(metadata).some(
          val => typeof val === 'string' && val.toLowerCase().includes(email.toLowerCase())
        );
        
        const customerEmail = charge.customer && typeof charge.customer !== 'string' 
          ? (charge.customer as Stripe.Customer).email 
          : null;
          
        const hasMatchingCustomerEmail = customerEmail && 
          customerEmail.toLowerCase() === email.toLowerCase();
        
        return hasEmailInMetadata || hasMatchingCustomerEmail;
      });
      
      console.log(`Found ${filteredCharges.length} charges containing email in metadata or customer`);
      
      return filteredCharges.map(charge => ({
        id: charge.id,
        amount: charge.amount,
        currency: charge.currency,
        status: charge.status,
        created: charge.created,
        email: email, // Force the email to match what we're searching for
        description: charge.description
      }));
    }
    
    // Get all customer IDs
    const customerIds = customers.data.map(customer => customer.id);
    
    // Fetch charges for these customers
    let allCharges: Stripe.Charge[] = [];
    
    // Process each customer ID separately to get charges
    for (const customerId of customerIds) {
      const customerCharges = await stripe.charges.list({
        customer: customerId,
        limit: 25 // Get up to 25 charges per customer
      });
      
      console.log(`Found ${customerCharges.data.length} charges for customer ${customerId}`);
      allCharges = [...allCharges, ...customerCharges.data];
    }
    
    console.log(`Total charges found for all matching customers: ${allCharges.length}`);
    
    // Map charges to our format
    return allCharges.map(charge => ({
      id: charge.id,
      amount: charge.amount,
      currency: charge.currency,
      status: charge.status,
      created: charge.created,
      email: email, // We're getting charges by customer email, so use the email directly
      description: charge.description
    }));
  } catch (error) {
    console.error('Error fetching payments by email:', error);
    return [];
  }
}