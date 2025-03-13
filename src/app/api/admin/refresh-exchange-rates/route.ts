import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebase-admin';
import { db as adminDb } from '@/lib/firebase-admin';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, doc, updateDoc, where } from 'firebase/firestore';
import Stripe from 'stripe';

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

export async function POST(request: NextRequest) {
  try {
    // Auth verification
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify admin access
    const { isAuthorized, error, userEmail } = await verifyAdmin(token);
    
    if (!isAuthorized) {
      return NextResponse.json({ error }, { status: 403 });
    }
    
    console.log(`Authenticated admin: ${userEmail}`);
    
    // Initialize Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-02-24.acacia',
    });
    
    // Get all charges that are not in EUR
    const paymentsRef = collection(db, PAYMENTS_COLLECTION);
    const q = query(paymentsRef, where('currency', '!=', 'eur'));
    const querySnapshot = await getDocs(q);
    
    console.log(`Found ${querySnapshot.docs.length} payments not in EUR currency`);
    
    let updated = 0;
    let errors = 0;
    
    // Process in batches to respect API rate limits
    for (const docSnapshot of querySnapshot.docs) {
      try {
        const payment = docSnapshot.data();
        
        // Skip if not a Stripe charge or doesn't have an ID
        if (!payment.stripe_id && !payment.id) {
          continue;
        }
        
        const chargeId = payment.stripe_id || payment.id;
        
        // Get the charge with expanded balance_transaction from Stripe
        const charge = await stripe.charges.retrieve(chargeId, {
          expand: ['balance_transaction']
        });
        
        // Calculate EUR amount using Stripe's exchange rate
        let amountEur = null;
        
        if (charge.currency.toLowerCase() === 'eur') {
          amountEur = charge.amount;
        } else if (charge.balance_transaction && 
                  typeof charge.balance_transaction === 'object' && 
                  charge.balance_transaction.exchange_rate) {
          amountEur = Math.round(charge.amount * charge.balance_transaction.exchange_rate);
        }
        
        if (amountEur !== null) {
            // Update the document with the correct EUR amount from Stripe
            await updateDoc(doc(db, PAYMENTS_COLLECTION, docSnapshot.id), {
              amount_eur: amountEur,
              balance_transaction: {
                exchange_rate: typeof charge.balance_transaction === 'object' && charge.balance_transaction !== null 
                  ? charge.balance_transaction.exchange_rate 
                  : null,
                currency: typeof charge.balance_transaction === 'object' && charge.balance_transaction !== null 
                  ? charge.balance_transaction.currency 
                  : charge.currency,
                amount: amountEur
              }
            });
          
          console.log(`Updated ${chargeId}: ${charge.amount} ${charge.currency} → ${amountEur} EUR`);
          updated++;
        } else {
          console.warn(`Couldn't determine EUR amount for ${chargeId}`);
          errors++;
        }
      } catch (error) {
        console.error(`Error updating payment ${docSnapshot.id}:`, error);
        errors++;
      }
      
      // Slight delay to avoid hitting Stripe rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return NextResponse.json({
      success: true,
      message: `Updated ${updated} payments with Stripe exchange rates. Errors: ${errors}`,
      updated,
      errors
    });
    
  } catch (error) {
    console.error('Error updating exchange rates:', error);
    return NextResponse.json({ error: 'Failed to update exchange rates' }, { status: 500 });
  }
} 