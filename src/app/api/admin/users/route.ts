import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebase-admin';
import { db } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

// Interface for user update data that matches Firestore's expectations
interface FirestoreUpdateData {
  [key: string]: string | string[] | FieldValue | undefined;
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
    
    console.log('Admin verification from Firestore:', { 
      userEmail, 
      isAdmin,
      hasCustomClaim: decodedToken.isAdmin
    });
    
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

// GET: Fetch all user emails
export async function GET(request: NextRequest) {
  try {
    // Verify the user is an admin
    const { isAuthorized, error } = await verifyAdmin(request);
    if (!isAuthorized) {
      return NextResponse.json({ error }, { status: 401 });
    }

    // Fetch user emails from Firestore
    const usersRef = db.collection('userEmails');
    const snapshot = await usersRef.get();
    
    const users = snapshot.docs.map(doc => {
      const data = doc.data();
      // Handle both new (roles array) and legacy (type field) formats
      const roles = data.roles || (data.type ? [data.type] : []);
      
      return {
        id: doc.id,
        email: data.email,
        roles,
        addedAt: data.addedAt
      };
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching user emails:', error);
    return NextResponse.json({ error: 'Failed to fetch user emails' }, { status: 500 });
  }
}

// POST: Add a new user email
export async function POST(request: NextRequest) {
  try {
    // Verify the user is an admin
    const { isAuthorized, error } = await verifyAdmin(request);
    if (!isAuthorized) {
      return NextResponse.json({ error }, { status: 401 });
    }

    // Parse the request body
    const body = await request.json();
    const { email, type } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Validate type (now can be string or array of strings)
    let rolesToAdd: string[] = [];
    if (Array.isArray(type)) {
      // If it's an array, validate each role
      if (type.length === 0) {
        return NextResponse.json({ error: 'At least one role is required' }, { status: 400 });
      }
      
      rolesToAdd = type.filter(t => ['admin', 'approved', 'staff'].includes(t));
      if (rolesToAdd.length === 0) {
        return NextResponse.json({ error: 'Invalid user roles' }, { status: 400 });
      }
    } else if (typeof type === 'string') {
      // If it's a single string
      if (!['admin', 'approved', 'staff'].includes(type)) {
        return NextResponse.json({ error: 'Invalid user type' }, { status: 400 });
      }
      rolesToAdd = [type];
    } else {
      return NextResponse.json({ error: 'Invalid roles format' }, { status: 400 });
    }

    // Check if email already exists
    const usersRef = db.collection('userEmails');
    const querySnapshot = await usersRef.where('email', '==', email.toLowerCase()).get();
    
    if (!querySnapshot.empty) {
      // Email exists, update roles instead of creating a new record
      const doc = querySnapshot.docs[0];
      const userData = doc.data();
      
      // Get current roles or initialize an empty array
      const currentRoles = Array.isArray(userData.roles) ? userData.roles : 
                          userData.type ? [userData.type] : [];
      
      // Merge existing and new roles, removing duplicates
      const updatedRoles = [...new Set([...currentRoles, ...rolesToAdd])];
      
      // Update the document with the new roles array
      await doc.ref.update({
        roles: updatedRoles,
        updatedAt: new Date().toISOString()
      });
      
      return NextResponse.json({ 
        message: 'User roles updated successfully',
        user: {
          id: doc.id,
          email: email.toLowerCase(),
          roles: updatedRoles,
          addedAt: userData.addedAt
        }
      });
    }

    // Add new user email to Firestore with roles array
    const newUser = {
      email: email.toLowerCase(),
      roles: rolesToAdd,
      addedAt: new Date().toISOString()
    };

    const docRef = await usersRef.add(newUser);
    
    return NextResponse.json({ 
      message: 'User email added successfully',
      user: {
        id: docRef.id,
        ...newUser
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error adding user email:', error);
    return NextResponse.json({ error: 'Failed to add user email' }, { status: 500 });
  }
}

// PUT: Update a user email or roles
export async function PUT(request: NextRequest) {
  try {
    // Verify the user is an admin
    const { isAuthorized, error } = await verifyAdmin(request);
    if (!isAuthorized) {
      return NextResponse.json({ error }, { status: 401 });
    }

    // Get the user ID from the query parameters
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Parse the request body
    const body = await request.json();
    const { email, roles } = body;

    // Need either email or roles to update
    if (!email && !roles) {
      return NextResponse.json({ error: 'Email or roles are required' }, { status: 400 });
    }

    // Validate email format if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Validate roles if provided
    if (roles) {
      if (!Array.isArray(roles)) {
        return NextResponse.json({ error: 'Roles must be an array' }, { status: 400 });
      }

      if (roles.length === 0) {
        return NextResponse.json({ error: 'At least one role is required' }, { status: 400 });
      }

      const validRoles = roles.filter(role => ['admin', 'approved', 'staff'].includes(role));
      if (validRoles.length === 0) {
        return NextResponse.json({ error: 'Invalid roles provided' }, { status: 400 });
      }
    }

    // Check if the document exists
    const userRef = db.collection('userEmails').doc(id);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if the new email already exists (excluding the current document)
    if (email) {
      const usersRef = db.collection('userEmails');
      const querySnapshot = await usersRef.where('email', '==', email.toLowerCase()).get();
      
      const emailExists = querySnapshot.docs.some(doc => doc.id !== id);
      if (emailExists) {
        return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
      }
    }

    // Build the update data with proper typing
    const updateData: FirestoreUpdateData = {
      updatedAt: new Date().toISOString()
    };
    
    if (email) {
      updateData.email = email.toLowerCase();
    }
    
    if (roles) {
      updateData.roles = roles;
      // Remove legacy type field if it exists (to avoid confusion)
      updateData.type = FieldValue.delete();
    }

    // Update the user
    await userRef.update(updateData);

    // Get the updated document
    const updatedDoc = await userRef.get();
    const updatedData = updatedDoc.data() || {};

    return NextResponse.json({ 
      message: 'User updated successfully',
      user: {
        id,
        email: updatedData.email,
        roles: updatedData.roles || (updatedData.type ? [updatedData.type] : []),
        addedAt: updatedData.addedAt
      }
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

/**
 * DELETE method to remove a user from the database
 */
export async function DELETE(request: NextRequest) {
  try {
    // Verify admin status
    const { isAuthorized, error } = await verifyAdmin(request);
    if (!isAuthorized) {
      return NextResponse.json({ error }, { status: 401 });
    }
    
    // Get the user ID from the query parameters
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    // Reference to the user document
    const userRef = db.collection('userEmails').doc(id);
    
    // Check if the user exists
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Delete the user
    await userRef.delete();
    
    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
} 