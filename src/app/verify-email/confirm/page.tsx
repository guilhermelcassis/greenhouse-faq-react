"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { auth } from '@/lib/firebase';
import { applyActionCode } from 'firebase/auth';

// Create a wrapper component that uses search params
function VerifyEmailConfirmContent() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  
  const [verifying, setVerifying] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Get the verification parameters from the URL
  const oobCode = searchParams.get('oobCode');
  const mode = searchParams.get('mode');
  
  useEffect(() => {
    const verifyEmail = async () => {
      try {
        // First check if the current user is already verified
        if (user && user.emailVerified) {
          // The user is already verified, no need to process the code again
          setSuccess(true);
          setError('Your email has been verified successfully!');
          return;
        }
        
        // If we're on the confirmation page without a code, but coming from Firebase email verification flow
        if (mode === 'verifyEmail' && !oobCode) {
          // Assume Firebase has already processed the verification
          setSuccess(true);
          setError('Your email has been verified. Please sign in to access your account.');
          return;
        }
        
        // If we have an oobCode, try to apply it
        if (oobCode) {
          try {
            await applyActionCode(auth, oobCode);
            setSuccess(true);
            setError('Your email has been verified successfully!');
            
            // If user is logged in, reload their profile
            if (user) {
              await user.reload();
            }
          } catch (verifyError: unknown) {
            // If verification fails, but it's because the email is already verified
            // (this can happen if Firebase auto-processes the verification)
            if (verifyError instanceof Error && 'code' in verifyError && verifyError.code === 'auth/invalid-action-code') {
              // Check if user is logged in and already verified
              if (user) {
                await user.reload();
                if (user.emailVerified) {
                  setSuccess(true);
                  setError('Your email has already been verified. You can now access your account.');
                  return;
                }
              }
              
              // Otherwise, it's truly an invalid code
              setError('The verification link has expired or already been used. Please request a new one.');
            } else {
              throw verifyError; // Re-throw to be caught by outer catch
            }
          }
        } else {
          // No code found - could be Firebase already processed it
          // Check if the user is verified
          if (user) {
            await user.reload();
            if (user.emailVerified) {
              setSuccess(true);
              setError('Your email has been verified successfully!');
            } else {
              setError('Invalid verification link. Please request a new verification email.');
            }
          } else {
            // No user and no code - show a more generic message
            setSuccess(true);
            setError('If your email was verified, you can now sign in with your account.');
          }
        }
      } catch (error: unknown) {
        console.error('Verification error:', error);
        
        // Handle specific Firebase errors
        const typedError = error as Error & { code?: string };
        if (typedError.code === 'auth/user-not-found') {
          setError('User account not found. Please sign up again.');
        } else {
          setError(`Verification failed: ${typedError.message || 'Unknown error'}`);
        }
      } finally {
        setVerifying(false);
      }
    };
    
    verifyEmail();
  }, [searchParams, user, mode, oobCode]);
  
  return (
    <div className="min-h-screen bg-background">
      <section className="relative h-[30vh] flex items-center justify-center bg-green-gradient-radial">
        <div className="relative text-center space-y-6 px-4 max-w-4xl mx-auto animate-fade-in">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-gradient-green">
            Email Verification
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {verifying ? 'Processing your verification...' : 
             success ? 'Your account is ready!' : 
             error ? error : 'Verification issue'}
          </p>
        </div>
      </section>
      
      <section className="py-16 px-4 flex justify-center">
        <div className="bg-white rounded-xl shadow-md border-green-subtle card-hover-effect w-full max-w-md overflow-hidden">
          <div className="p-8 space-y-6">
            {verifying && (
              <div className="flex flex-col items-center justify-center text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                <p className="mt-4 text-gray-600">Verifying your email address...</p>
              </div>
            )}
            
            {success && (
              <div className="flex flex-col items-center justify-center text-center">
                <div className="p-4 bg-green-100 rounded-full text-green-600 mb-4">
                  <CheckCircle size={40} />
                </div>
                <h2 className="text-2xl font-bold text-gradient-green mb-2">Email Verified!</h2>
                <p className="text-gray-600">{error}</p>
                
                <div className="mt-8 p-4 bg-green-50 rounded-lg w-full">
                  <p className="text-green-800 text-sm">
                    Your account is now active and you can access all features of Greenhouse 2025.
                  </p>
                </div>
                
                <div className="mt-8 w-full">
                  <Link 
                    href="/profile"
                    className="block w-full py-3 px-4 bg-primary text-white rounded-lg 
                             hover:bg-primary/90 flex items-center justify-center gap-2 font-medium
                             shadow-md hover:shadow-lg transition-all"
                  >
                    Continue to Profile <ArrowRight size={18} />
                  </Link>
                </div>
              </div>
            )}
            
            {error && (
              <div className="flex flex-col items-center justify-center text-center">
                <div className="p-4 bg-red-100 rounded-full text-red-600 mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="15" y1="9" x2="9" y2="15"></line>
                    <line x1="9" y1="9" x2="15" y2="15"></line>
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-red-600 mb-2">Verification Failed</h2>
                <p className="text-gray-600">{error}</p>
                
                <div className="mt-8 w-full space-y-4">
                  <Link 
                    href="/verify-email"
                    className="block w-full py-3 px-4 bg-primary text-white rounded-lg 
                             hover:bg-primary/90 flex items-center justify-center gap-2 font-medium
                             shadow-md hover:shadow-lg transition-all"
                  >
                    Try Again
                  </Link>
                  
                  <Link 
                    href="/help"
                    className="block w-full py-3 px-4 bg-gray-100 text-gray-700 rounded-lg 
                             hover:bg-gray-200 flex items-center justify-center gap-2 font-medium
                             transition-all"
                  >
                    Get Help
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

// Main component with Suspense boundary
export default function VerifyEmailConfirmPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse">Loading verification...</div>
    </div>}>
      <VerifyEmailConfirmContent />
    </Suspense>
  );
} 