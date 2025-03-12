import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebase-admin';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, addDoc } from 'firebase/firestore';

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

export async function POST(request: NextRequest) {
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
    let userId: string;
    
    try {
      const decodedToken = await auth.verifyIdToken(token);
      userEmail = decodedToken.email || '';
      userId = decodedToken.uid || '';
      
      if (!userEmail) {
        return NextResponse.json(
          { error: 'No email found in token' },
          { status: 400 }
        );
      }
      
      console.log('Updating user details for email:', userEmail);
    } catch (error) {
      console.error('Error verifying Firebase token:', error);
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }
    
    // Get request body
    const body = await request.json();
    
    if (!body.name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }
    
    const newName = body.name;
    const formattedName = toProperCase(newName) || newName;
    
    console.log(`Updating name for ${userEmail} to: ${formattedName}`);
    
    // First, try to find user in the users collection
    const usersQuery = query(
      collection(db, 'users'),
      where('email', '==', userEmail)
    );
    
    const usersSnapshot = await getDocs(usersQuery);
    
    if (!usersSnapshot.empty) {
      // User exists, update their name
      const userDoc = usersSnapshot.docs[0];
      
      console.log('Found existing user in users collection, updating name');
      
      // Update the user document
      await updateDoc(doc(db, 'users', userDoc.id), {
        name: formattedName,
        displayName: formattedName,
        updatedAt: new Date().toISOString()
      });
      
      console.log('User name updated successfully');
      
      return NextResponse.json({
        success: true,
        name: formattedName,
        id: userDoc.id
      });
    } else {
      // User doesn't exist in users collection, create a new record
      console.log('User not found in users collection, creating new user record');
      
      // Create a new user document
      const newUserRef = await addDoc(collection(db, 'users'), {
        email: userEmail,
        name: formattedName,
        displayName: formattedName,
        uid: userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      console.log('New user record created with ID:', newUserRef.id);
      
      return NextResponse.json({
        success: true,
        name: formattedName,
        id: newUserRef.id,
        isNewUser: true
      });
    }
  } catch (error) {
    console.error('Error updating user name:', error);
    return NextResponse.json(
      { error: 'Failed to update user name', details: (error as Error).message },
      { status: 500 }
    );
  }
} 