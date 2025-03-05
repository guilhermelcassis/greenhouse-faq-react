import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { auth } from '@/lib/firebase-admin';
import { getPaymentsByEmail } from '@/lib/firestore-payments';

// Define the payment interface
interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created: number;
  email: string;
  description: string | null;
}

export async function GET(request: NextRequest) {
  try {
    // Authentication logic (unchanged)
    const session = await getServerSession(authOptions);
    let userEmail = session?.user?.email;

    if (!userEmail) {
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
    } catch (firestoreError) {
      console.error('Detailed Firestore error:', firestoreError);
      return NextResponse.json({ error: 'Error accessing payment database', details: firestoreError.message }, { status: 500 });
    }
    
  } catch (error: any) {
    console.error('Error fetching user payments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payments', details: error.message },
      { status: 500 }
    );
  }
} 