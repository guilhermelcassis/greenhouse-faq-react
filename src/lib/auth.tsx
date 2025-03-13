"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  sendEmailVerification as firebaseSendEmailVerification,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { auth, db } from './firebase';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { deleteCookie } from 'cookies-next';
import { User as FirebaseUser } from 'firebase/auth';

// Extend the Firebase User type
export interface ExtendedUser extends FirebaseUser {
  isAdmin?: boolean;
  isApproved?: boolean;
  isStaff?: boolean;
}

interface AuthContextType {
  user: ExtendedUser | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  sendEmailVerification: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Function to check user roles from Firestore
  const checkUserRoles = async (email: string): Promise<{isAdmin: boolean, isApproved: boolean, isStaff: boolean}> => {
    try {
      if (!email) {
        return { isAdmin: false, isApproved: false, isStaff: false };
      }
      
      const userEmailsRef = collection(db, 'userEmails');
      
      // Get the user document by email (single query for better performance)
      const userQuery = query(userEmailsRef, where('email', '==', email.toLowerCase()));
      const userDocs = await getDocs(userQuery);
      
      if (userDocs.empty) {
        console.log('No user document found for email:', email);
        return { isAdmin: false, isApproved: false, isStaff: false };
      }
      
      // Get user data and roles
      const userData = userDocs.docs[0].data();
      
      // Check for roles array in the new format or type field in legacy format
      const userRoles: string[] = userData.roles || (userData.type ? [userData.type] : []);
      
      // Check if user has each role
      const isAdmin = userRoles.includes('admin');
      const isApproved = userRoles.includes('approved');
      const isStaff = userRoles.includes('staff');
      
      console.log('User roles check from Firestore:', { email, userRoles, isAdmin, isApproved, isStaff });
      
      return { isAdmin, isApproved, isStaff };
    } catch (error) {
      console.error('Error checking user roles:', error);
      return { isAdmin: false, isApproved: false, isStaff: false };
    }
  };

  useEffect(() => {
    // Set persistence to LOCAL for better session handling
    setPersistence(auth, browserLocalPersistence)
      .then(() => {
        console.log("Auth persistence set to LOCAL");
      })
      .catch((error) => {
        console.error("Error setting persistence:", error);
      });

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // If user is logged in but you're on the login or register page, redirect to profile
          if (window.location.pathname === '/login' || window.location.pathname === '/register') {
            console.log('User is logged in and on login/register page, redirecting to profile');
            router.push('/profile');
          }
          
          // Check user roles from Firestore
          const userEmail = firebaseUser.email || '';
          const { isAdmin, isApproved, isStaff } = await checkUserRoles(userEmail);
          
          console.log(`Setting user roles for ${userEmail}:`, { isAdmin, isApproved, isStaff });
          
          // Instead of creating a new object, add the properties directly
          // This preserves all the original methods
          (firebaseUser as ExtendedUser).isAdmin = isAdmin;
          (firebaseUser as ExtendedUser).isApproved = isApproved;
          (firebaseUser as ExtendedUser).isStaff = isStaff;
          
          // Force refresh to get the latest verification status
          await firebaseUser.reload();
          
          setUser(firebaseUser as ExtendedUser);
          
          const idToken = await firebaseUser.getIdToken();
          
          // Rest of your code for session cookie
          const response = await fetch('/api/auth/session', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ idToken }),
          });
          
          if (response.ok) {
            console.log('Session cookie set successfully');
          }
        } catch (error) {
          console.error('Error checking user roles:', error);
          setUser(firebaseUser as ExtendedUser);
        }
      } else {
        setUser(null);
        // If on a protected route, redirect to login
        if (window.location.pathname.startsWith('/profile')) {
          router.push('/login');
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const signIn = async (email: string, password: string) => {
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: unknown) {
      const typedError = error as Error & { message?: string };
      setError(typedError.message || 'Authentication failed');
      throw error;
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update the user's profile with their name
      if (userCredential.user) {
        await updateProfile(userCredential.user, {
          displayName: name
        });
        
        // Create a user document in Firestore
        try {
          // Check if user already exists in users collection
          const usersQuery = query(
            collection(db, 'users'),
            where('email', '==', email.toLowerCase())
          );
          
          const usersSnapshot = await getDocs(usersQuery);
          
          if (usersSnapshot.empty) {
            // User doesn't exist, create a new record
            console.log('Creating new user record in Firestore for:', email);
            
            await addDoc(collection(db, 'users'), {
              email: email.toLowerCase(),
              name: name,
              displayName: name,
              uid: userCredential.user.uid,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
            
            console.log('User record created successfully');
          }
          
          // Note: We don't create entries in userEmails collection anymore
          // Users must be pre-approved in that collection to register
          
        } catch (firestoreError) {
          console.error('Error creating user record in Firestore:', firestoreError);
          // We don't want to fail registration if Firestore update fails
          // The user can be created later via the profile page
        }
        
        await firebaseSendEmailVerification(userCredential.user);
      }
    } catch (error: unknown) {
      const typedError = error as Error & { message?: string };
      setError(typedError.message || 'Registration failed');
      throw error;
    }
  };

  const signOut = async () => {
    setError(null);
    try {
      await firebaseSignOut(auth);
      deleteCookie('firebaseAuth');
    } catch (error: unknown) {
      const typedError = error as Error & { message?: string };
      setError(typedError.message || 'Sign out failed');
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: unknown) {
      const typedError = error as Error & { message?: string };
      setError(typedError.message || 'Password reset failed');
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: unknown) {
      const typedError = error as Error & { message?: string };
      setError(typedError.message || 'Google sign in failed');
      throw error;
    }
  };

  const sendEmailVerification = async () => {
    if (user) {
      await firebaseSendEmailVerification(user);
    } else {
      throw new Error('No user is currently signed in');
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      error,
      signIn,
      signUp,
      signOut,
      resetPassword,
      signInWithGoogle,
      sendEmailVerification
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 