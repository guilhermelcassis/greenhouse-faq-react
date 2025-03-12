import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebase-admin';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

// Utility function to convert text to proper case (capitalize first letter of each word)
function toProperCase(text: string | null): string | null {
  if (!text) return null;
  
  // Check if the text is all uppercase
  const isAllUppercase = text === text.toUpperCase();
  
  if (!isAllUppercase) return text; // Don't modify if not all uppercase
  
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export async function GET(request: NextRequest) {
  try {
    // Get token from request headers
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const token = authHeader.substring(7);
    let userEmail: string;
    
    try {
      const decodedToken = await auth.verifyIdToken(token);
      userEmail = decodedToken.email || '';
      
      if (!userEmail) {
        return NextResponse.json(
          { error: 'No email found in token' },
          { status: 400 }
        );
      }
      
      console.log('Looking up user details for email:', userEmail);
    } catch (error) {
      console.error('Error verifying Firebase token:', error);
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }
    
    // First, try to find user in the users collection
    const usersQuery = query(
      collection(db, 'users'),
      where('email', '==', userEmail)
    );
    
    const usersSnapshot = await getDocs(usersQuery);
    
    if (!usersSnapshot.empty) {
      const userData = usersSnapshot.docs[0].data();
      console.log('Found user data in users collection:', userData);
      
      return NextResponse.json({
        name: toProperCase(userData.name) || toProperCase(userData.fullName) || toProperCase(userData.displayName) || null,
        email: userEmail,
        id: usersSnapshot.docs[0].id,
        metadata: userData
      });
    }
    
    // If not found in users collection, try payments collection
    const paymentsQuery = query(
      collection(db, 'payments'),
      where('email', '==', userEmail)
    );
    
    const paymentsSnapshot = await getDocs(paymentsQuery);
    
    // Try billing_details.email field which is used in newer records
    const billingDetailsQuery = query(
      collection(db, 'payments'),
      where('billing_details.email', '==', userEmail)
    );
    
    const billingDetailsSnapshot = await getDocs(billingDetailsQuery);
    
    // Combine results from both payment queries
    const paymentDocs = [...paymentsSnapshot.docs];
    
    // Add billing details docs if not already present
    billingDetailsSnapshot.docs.forEach(doc => {
      if (!paymentDocs.some(existingDoc => existingDoc.id === doc.id)) {
        paymentDocs.push(doc);
      }
    });
    
    if (paymentDocs.length > 0) {
      const paymentData = paymentDocs[0].data();
      console.log('Found user data in payments collection:', paymentData);
      
      // Extract name from payment - usually in billing_details.name or name field
      const name = toProperCase(paymentData.billing_details?.name) || 
                  toProperCase(paymentData.name) ||
                  toProperCase(paymentData.customer_name) || 
                  null;
      
      return NextResponse.json({
        name: name,
        email: userEmail,
        paymentId: paymentDocs[0].id,
        metadata: { source: 'payments' }
      });
    }
    
    // If no user data found, return null values
    return NextResponse.json({
      name: null,
      email: userEmail,
      metadata: { source: 'none' }
    });
    
  } catch (error) {
    console.error('Error fetching user details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user details', details: (error as Error).message },
      { status: 500 }
    );
  }
} 