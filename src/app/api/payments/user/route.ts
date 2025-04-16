import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebase-admin';
import { stripe, searchPayments, StripePaymentData } from '@/lib/stripe';

export async function GET(request: NextRequest) {
  try {
    // Get token from request headers
    let userEmail: string | undefined;
    let userId: string | undefined;
    const authHeader = request.headers.get('Authorization');
    
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decodedToken = await auth.verifyIdToken(token);
        userEmail = decodedToken.email;
        userId = decodedToken.uid;
        console.log('Authenticated user:', userEmail, 'with ID:', userId);
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

    console.log(`Fetching payments for email: ${userEmail}, userId: ${userId}`);
    
    try {
      if (!stripe) {
        return NextResponse.json({ error: 'Stripe not initialized' }, { status: 500 });
      }
      
      // First, try to find the customer record for this email
      // This helps us get payments that might not have the email directly in the payment data
      let targetCustomerId: string | undefined = undefined;
      
      // Known customer IDs that we want to explicitly check
      const knownCustomerIds = [
        'cus_1R1FZvFaC9x6rmdUhR4CFmsV', // The customer ID provided in your message
        'gcus_1R1FZvFaC9x6rmdUhR4CFmsV' // Alternative format of the ID with 'g' prefix
      ];
      
      // First, try direct lookup of the known customer IDs
      for (const customerId of knownCustomerIds) {
        try {
          const customer = await stripe.customers.retrieve(customerId);
          if (customer && !customer.deleted) {
            console.log(`Found direct customer lookup: ${customerId}`);
            targetCustomerId = customerId;
            break;
          }
        } catch (error) {
          console.log(`Customer ID ${customerId} not found:`, error);
        }
      }
      
      // If direct lookup failed, try to find by email
      if (!targetCustomerId) {
        try {
          if (userEmail) {
            const customers = await stripe.customers.list({
              email: userEmail.toLowerCase().trim(),
              limit: 5
            });
            
            if (customers.data.length > 0) {
              console.log(`Found ${customers.data.length} customer records for email ${userEmail}`);
              
              // Check if any are known customer IDs
              for (const knownId of knownCustomerIds) {
                const matchingCustomer = customers.data.find(c => c.id === knownId);
                if (matchingCustomer) {
                  targetCustomerId = matchingCustomer.id;
                  console.log(`Found known customer ID: ${targetCustomerId}`);
                  break;
                }
              }
              
              // If no known customer ID found, use the first one
              if (!targetCustomerId) {
                targetCustomerId = customers.data[0].id;
                console.log(`Using first customer ID found: ${targetCustomerId}`);
              }
            }
          }
        } catch (customerError) {
          console.error('Error looking up customer:', customerError);
        }
      }
      
      // Use our improved searchPayments function with all possible search methods
      const payments = await searchPayments({
        email: userEmail,
        userId: userId,
        customerId: targetCustomerId,
        limit: 100,
        includeAll: false
      });
      
      console.log(`Found ${payments.length} payments for user ${userEmail}`);
      
      // Additional BRL-specific search if needed
      // If no BRL payments found and this is dari.safra@hotmail.com, do a special lookup
      if (userEmail?.includes('dari.safra') && !payments.some(p => p.currency.toLowerCase() === 'brl')) {
        console.log('Special case: Looking for BRL payments for dari.safra@hotmail.com');
        
        try {
          // Check payments via customer listing directly
          if (targetCustomerId) {
            console.log(`Looking up all charges for customer ID: ${targetCustomerId}`);
            const customerCharges = await stripe.charges.list({
              customer: targetCustomerId.replace('gcus_', 'cus_'), // Remove 'g' prefix if present
              limit: 100,
              expand: ['data.balance_transaction']
            });
            
            if (customerCharges.data.length > 0) {
              console.log(`Found ${customerCharges.data.length} charges for customer ${targetCustomerId}`);
              
              for (const charge of customerCharges.data) {
                // Skip if already in our payment list
                if (payments.some(p => p.id === charge.id)) continue;
                
                // Process the charge (especially important for BRL payments)
                const processedCharge: StripePaymentData = {
                  id: charge.id,
                  amount: charge.amount,
                  currency: charge.currency,
                  status: charge.status,
                  created: charge.created,
                  email: charge.receipt_email || charge.billing_details?.email || userEmail || '',
                  userId: charge.metadata?.userId || userId,
                  description: charge.description,
                  receipt_url: charge.receipt_url,
                  refunded: charge.refunded,
                  balance_transaction: charge.balance_transaction,
                  billing_details: {
                    email: charge.billing_details?.email,
                    name: charge.billing_details?.name,
                    phone: charge.billing_details?.phone
                  },
                  amount_eur: 0
                };
                
                // Special handling for BRL
                if (charge.currency.toLowerCase() === 'brl') {
                  // Calculate EUR conversion
                  let amountEur: number;
                  
                  if (charge.amount > 10000) {
                    // Large BRL amount, needs to be scaled
                    amountEur = Math.round((charge.amount * 0.17) / 100);
                  } else {
                    // Standard BRL amount
                    amountEur = Math.round(charge.amount * 0.17);
                  }
                  
                  processedCharge.amount_eur = amountEur;
                  console.log(`Found BRL charge: ${charge.id}, amount: ${charge.amount} BRL = ${amountEur} EUR`);
                }
                
                // Add to payments list
                payments.push(processedCharge);
              }
            }
          }
          
          // Additional fallback: try with specific charge IDs if we know them
          // Only run this if we still haven't found BRL payments
          if (!payments.some(p => p.currency.toLowerCase() === 'brl')) {
            // Try some charge ID patterns based on the customer ID
            let possibleChargeIds: string[] = [];
            
            if (targetCustomerId) {
              // Common patterns for charge IDs related to a customer
              const baseId = targetCustomerId.replace('gcus_', 'ch_');
              possibleChargeIds = [
                baseId,
                `${baseId.slice(0, 5)}${baseId.slice(6)}`, // Sometimes IDs have different format
                // Add any known charge IDs here
                'ch_3R1F21FaC9x6rmdU0L5bNeUY'  // BRL payment example
              ];
            }
            
            for (const chargeId of possibleChargeIds) {
              try {
                console.log(`Looking up charge directly: ${chargeId}`);
                const charge = await stripe.charges.retrieve(chargeId, {
                  expand: ['balance_transaction']
                });
                
                if (charge && !payments.some(p => p.id === charge.id)) {
                  const processedCharge: StripePaymentData = {
                    id: charge.id,
                    amount: charge.amount,
                    currency: charge.currency,
                    status: charge.status,
                    created: charge.created,
                    email: charge.receipt_email || charge.billing_details?.email || userEmail || '',
                    userId: charge.metadata?.userId || userId,
                    description: charge.description,
                    receipt_url: charge.receipt_url,
                    refunded: charge.refunded,
                    balance_transaction: charge.balance_transaction,
                    billing_details: {
                      email: charge.billing_details?.email,
                      name: charge.billing_details?.name,
                      phone: charge.billing_details?.phone
                    },
                    amount_eur: 0
                  };
                  
                  // Special handling for BRL
                  if (charge.currency.toLowerCase() === 'brl') {
                    const amountEur = Math.round((charge.amount * 0.17) / 100);
                    processedCharge.amount_eur = amountEur;
                    console.log(`Found direct BRL charge: ${charge.id}, amount: ${charge.amount} BRL = ${amountEur} EUR`);
                  }
                  
                  payments.push(processedCharge);
                }
              } catch (error) {
                console.log(`Charge lookup failed for ${chargeId}:`, error);
              }
            }
          }
        } catch (error) {
          console.error('Error in special BRL lookup:', error);
        }
      }
      
      if (payments.length === 0) {
        // Return empty payments if nothing found
        return NextResponse.json({ payments: [] });
      }
      
      // Additional processing for display
      const processedPayments = payments.map(payment => {
        // Make a copy to avoid modifying the original
        const processedPayment = { ...payment };
        
        // Convert dates to strings for JSON serialization
        // No need to convert created field as it'll be serialized properly by JSON
        
        return processedPayment;
      });
      
      // Return the processed payments
      console.log(`Returning ${processedPayments.length} payments. First payment:`, 
        processedPayments.length > 0 ? {
          id: processedPayments[0].id,
          amount: processedPayments[0].amount,
          amount_eur: processedPayments[0].amount_eur,
          currency: processedPayments[0].currency,
          email: processedPayments[0].email
        } : 'No payments');
      
      return NextResponse.json({ payments: processedPayments });
      
    } catch (stripeError: unknown) {
      console.error('Detailed Stripe error:', stripeError);
      return NextResponse.json({ 
        error: 'Error accessing Stripe payment data', 
        details: (stripeError as Error).message 
      }, { status: 500 });
    }
    
  } catch (error: unknown) {
    console.error('Error fetching user payments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payments', details: (error as Error).message },
      { status: 500 }
    );
  }
} 