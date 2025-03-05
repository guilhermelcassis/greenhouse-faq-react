import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebase-admin';
import { getPaymentsByEmail } from '@/lib/firestore-payments';


export async function GET(request: NextRequest) {
  try {
    // Remove NextAuth session logic and use only Firebase auth
    let userEmail: string | undefined;

    // Get token from request headers
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decodedToken = await auth.verifyIdToken(token);
        userEmail = decodedToken.email;
        console.log('Authenticated with Firebase:', userEmail);
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

    console.log('Fetching payments for email:', userEmail);
    
    try {
      // Get payments from Firestore
      const userPayments = await getPaymentsByEmail(userEmail);
      
      console.log(`Found ${userPayments.length} payments for user ${userEmail}`);
      
      return NextResponse.json({ payments: userPayments });
    } catch (firestoreError: unknown) {
      console.error('Detailed Firestore error:', firestoreError);
      return NextResponse.json({ error: 'Error accessing payment database', details: (firestoreError as Error).message }, { status: 500 });
    }
    
  } catch (error: unknown) {
    console.error('Error fetching user payments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payments', details: (error as Error).message },
      { status: 500 }
    );
  }
} 