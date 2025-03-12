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
import { auth } from './firebase';
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
          // If user is logged in but you're in the login page, redirect to profile
          if (window.location.pathname === '/login') {
            router.push('/profile');
          }
          
          // Check if user is admin
          const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS 
            ? process.env.NEXT_PUBLIC_ADMIN_EMAILS.split(',').map(email => email.trim().toLowerCase()) 
            : [];
          
          // Check if user is approved for payments
          const approvedEmails = process.env.NEXT_PUBLIC_APPROVED_EMAILS
            ? process.env.NEXT_PUBLIC_APPROVED_EMAILS.split(',').map(email => email.trim().toLowerCase())
            : [];
          
          // Check if user is staff
          const staffEmails = process.env.NEXT_PUBLIC_STAFF_EMAILS
            ? process.env.NEXT_PUBLIC_STAFF_EMAILS.split(',').map(email => email.trim().toLowerCase())
            : [];
          
          console.log('Admin emails from env:', adminEmails);
          console.log('Approved emails from env:', approvedEmails);
          console.log('Staff emails from env:', staffEmails);
          console.log('Current user email:', firebaseUser.email);
          
          const isAdmin = adminEmails.includes((firebaseUser.email || '').toLowerCase());
          const isApproved = approvedEmails.includes((firebaseUser.email || '').toLowerCase());
          const isStaff = staffEmails.includes((firebaseUser.email || '').toLowerCase());
          
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
          console.error('Error checking admin status:', error);
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