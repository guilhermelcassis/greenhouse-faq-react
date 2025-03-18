import { NextRequest } from 'next/server';
import { auth } from '@/lib/firebase-admin';
import { db } from '@/lib/firebase-admin';

// Polyfill for Response.json in environments that might not support it
if (!Response.json) {
  Response.json = function json(data, init) {
    const headers = new Headers(init?.headers);
    headers.set('content-type', 'application/json');
    
    return new Response(
      JSON.stringify(data),
      {
        ...init,
        headers
      }
    );
  };
}

// Define interface for payment data
interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created: number;
  refunded: boolean;
  description?: string;
  amount_eur?: number;
  receipt_url?: string;
  metadata?: {
    email?: string;
    userId?: string;
    [key: string]: string | number | boolean | null | undefined;
  };
  billing_details?: {
    email?: string;
    name?: string;
    phone?: string;
  };
}

// Define interface for user data from Firestore
interface FirestoreUserData {
  email?: string;
  name?: string;
  type?: string;
  roles?: string[];
  phone?: string;
  addedAt?: number | string;
  [key: string]: string | number | boolean | null | undefined | string[];
}

// Verify the user is authenticated and is an admin
async function verifyAdmin(request: NextRequest) {
  try {
    // Extract the authorization token from the request headers
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { isAuthorized: false, error: 'Missing or invalid authorization token' };
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    
    // Get user email from token
    const userEmail = decodedToken.email || '';
    if (!userEmail) {
      return { isAuthorized: false, error: 'User email not found in token' };
    }
    
    // Check if user is admin from Firestore
    const userEmailsRef = db.collection('userEmails');
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
    
    // Check if user is admin either by Firestore or by custom claim
    if (!isAdmin && !decodedToken.isAdmin) {
      return { isAuthorized: false, error: 'Unauthorized: User is not an admin' };
    }

    return { isAuthorized: true, uid: decodedToken.uid };
  } catch (error) {
    console.error('Error verifying admin:', error);
    return { isAuthorized: false, error: 'Error verifying admin status' };
  }
}

// GET: Fetch user details by UID
export async function GET(
  request: NextRequest,
  { params }: { params: { uid: string } }
) {
  try {
    // Ensure uid is properly accessed from params
    const uid = params.uid;
    
    if (!uid) {
      return Response.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    console.log(`Processing request for user ID: ${uid}`);
    
    // Get token from request headers
    let token: string | null = null;
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    // If no token is provided, return unauthorized
    if (!token) {
      return Response.json({ error: 'Unauthorized - No token provided' }, { status: 401 });
    }

    // Verify admin access
    const { isAuthorized, error } = await verifyAdmin(request);
    if (!isAuthorized) {
      return Response.json({ error }, { status: 403 });
    }
    
    // First, get the user data from Firestore using the document ID
    const userDocRef = db.collection('userEmails').doc(uid);
    const userDoc = await userDocRef.get();
    
    if (!userDoc.exists) {
      return Response.json({ error: 'User not found in database' }, { status: 404 });
    }
    
    const firestoreData = userDoc.data() as FirestoreUserData;
    const userEmail = firestoreData.email?.toLowerCase() || '';
    
    if (!userEmail) {
      return Response.json({ error: 'User email not found in database' }, { status: 404 });
    }
    
    let roles: string[] = [];
    // Extract roles data
    if (Array.isArray(firestoreData.roles)) {
      roles = firestoreData.roles;
    } else if (firestoreData.type) {
      roles = [firestoreData.type];
    }
    
    // Fetch user's payment history
    const paymentsRef = db.collection('payments');
    
    console.log(`Fetching payments for user: ${userEmail} (${uid})`);
    
    // Build a set to track unique payment IDs
    const paymentIds = new Set<string>();
    const payments: Payment[] = [];
    
    // Try multiple approaches to find related payments

    try {
      // 1. Try exact email match in metadata
      const paymentsEmailMetadataSnapshot = await paymentsRef
        .where('metadata.email', '==', userEmail)
        .limit(100)
        .get();
      
      paymentsEmailMetadataSnapshot.forEach(doc => {
        const payment = doc.data() as Payment;
        if (!paymentIds.has(payment.id)) {
          paymentIds.add(payment.id);
          payments.push(payment);
        }
      });
      
      console.log(`Found ${paymentsEmailMetadataSnapshot.size} payments matching metadata.email`);
    } catch (error) {
      console.log(`Error querying by metadata.email: ${error}`);
      // Continue with other query methods
    }
    
    try {
      // 2. Try exact email match in billing details
      const paymentsEmailBillingSnapshot = await paymentsRef
        .where('billing_details.email', '==', userEmail)
        .limit(100)
        .get();
      
      paymentsEmailBillingSnapshot.forEach(doc => {
        const payment = doc.data() as Payment;
        if (!paymentIds.has(payment.id)) {
          paymentIds.add(payment.id);
          payments.push(payment);
        }
      });
      
      console.log(`Found ${paymentsEmailBillingSnapshot.size} payments matching billing_details.email`);
    } catch (error) {
      console.log(`Error querying by billing_details.email: ${error}`);
      // Continue with other query methods
    }
    
    try {
      // 3. Try documentId match in metadata
      const paymentsUserIdSnapshot = await paymentsRef
        .where('metadata.userId', '==', uid)
        .limit(100)
        .get();
      
      paymentsUserIdSnapshot.forEach(doc => {
        const payment = doc.data() as Payment;
        if (!paymentIds.has(payment.id)) {
          paymentIds.add(payment.id);
          payments.push(payment);
        }
      });
      
      console.log(`Found ${paymentsUserIdSnapshot.size} payments matching metadata.userId`);
    } catch (error) {
      console.log(`Error querying by metadata.userId: ${error}`);
      // Continue with other query methods
    }
    
    // If we still don't have any payments, try a more general approach
    if (payments.length === 0) {
      try {
        // Get the most recent payments to scan manually
        const recentPaymentsSnapshot = await paymentsRef
          .orderBy('created', 'desc')
          .limit(500)
          .get();
        
        console.log(`Found ${recentPaymentsSnapshot.size} recent payments to scan`);
        
        recentPaymentsSnapshot.forEach(doc => {
          const payment = doc.data() as Payment;
          // Look for any match with the user email or ID in various fields
          const matchesUser = 
            (payment.metadata?.email && payment.metadata.email.toLowerCase() === userEmail.toLowerCase()) ||
            (payment.metadata?.userId && payment.metadata.userId === uid) ||
            (payment.billing_details?.email && payment.billing_details.email.toLowerCase() === userEmail.toLowerCase()) ||
            (payment.description && payment.description.toLowerCase().includes(userEmail.toLowerCase()));
          
          if (matchesUser && !paymentIds.has(payment.id)) {
            paymentIds.add(payment.id);
            payments.push(payment);
          }
        });
      } catch (error) {
        console.log(`Error with general payment query: ${error}`);
      }
    }
    
    console.log(`Total unique payments found for user: ${payments.length}`);
    
    // Sort payments by date (newest first)
    payments.sort((a, b) => b.created - a.created);
    
    // Calculate total spent (successfully, not refunded)
    const totalSpent = payments
      .filter(payment => 
        payment.status === 'succeeded' && 
        !payment.refunded
      )
      .reduce((sum, payment) => {
        // Get EUR amount if available, otherwise convert from other currency
        const amountEur = payment.amount_eur 
          ? payment.amount_eur / 100 
          : payment.currency === 'eur' 
            ? payment.amount / 100 
            : (payment.amount / 100) * 0.85; // Rough conversion to EUR
        
        return sum + amountEur;
      }, 0);
    
    // Assemble the user object
    const userResponse = {
      id: uid,
      email: userEmail,
      displayName: firestoreData.name || null,
      name: firestoreData.name || null,
      phone: firestoreData.phone || null,
      photoURL: null,
      createdAt: firestoreData.addedAt ? 
                  typeof firestoreData.addedAt === 'number' ? 
                    firestoreData.addedAt : 
                    new Date(firestoreData.addedAt as string).getTime() 
                  : undefined,
      lastLoginAt: undefined,
      isAdmin: roles.includes('admin'),
      isStaff: roles.includes('staff'),
      isApproved: roles.includes('approved'),
      roles: roles,
      payments: payments,
      totalSpent: totalSpent,
      paymentCount: payments.length,
      successfulPaymentCount: payments.filter(p => p.status === 'succeeded').length
    };
    
    return Response.json({
      user: userResponse
    });
    
  } catch (error) {
    console.error('Error fetching user details:', error);
    return Response.json({ 
      error: `Error fetching user details: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
} 