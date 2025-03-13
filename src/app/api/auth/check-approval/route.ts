import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    // Get email from request body
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check if the email exists in the userEmails collection
    const userEmailsRef = collection(db, 'userEmails');
    const userQuery = query(userEmailsRef, where('email', '==', email.toLowerCase()));
    const userSnapshot = await getDocs(userQuery);

    // If no document found, user is not pre-approved
    if (userSnapshot.empty) {
      console.log(`Email ${email} not found in userEmails collection. Registration not allowed.`);
      return NextResponse.json({ approved: false });
    }

    // Get the user data and check for roles
    const userData = userSnapshot.docs[0].data();
    const userRoles = userData.roles || (userData.type ? [userData.type] : []);

    // Check if user has either approved or staff role
    const isApproved = userRoles.includes('approved') || userRoles.includes('staff') || userRoles.includes('admin');

    console.log(`Email ${email} approval status: ${isApproved}`, { roles: userRoles });

    return NextResponse.json({ approved: isApproved });
  } catch (error) {
    console.error('Error checking email approval status:', error);
    return NextResponse.json(
      { error: 'Failed to check approval status', details: (error as Error).message },
      { status: 500 }
    );
  }
} 