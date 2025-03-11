"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, ArrowRight, AlertTriangle, HelpCircle } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { auth } from '@/lib/firebase';
import { applyActionCode } from 'firebase/auth';
import { Footer } from '@/components/Footer';

// Separate client component that uses useSearchParams
function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  
  const [verifying, setVerifying] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  
  // Get the verification parameters from the URL
  const oobCode = searchParams.get('oobCode');
  const mode = searchParams.get('mode');
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
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
  
  // Show loading state
  if (!isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
          <div className="text-lg text-gray-600">Loading verification page...</div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section with background image */}
      <section className="relative h-[50vh] flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-black/50 z-10"></div>
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: "url('/images/greenhouse/image (16).jpg')",
              filter: "saturate(1.2)"
            }}
          ></div>
          <div className="absolute inset-0 bg-gradient-to-b from-primary/30 to-primary/10 mix-blend-overlay"></div>
        </div>
        
        <div className="relative z-10 text-center space-y-6 px-4 max-w-4xl mx-auto animate-fade-in">
          <div className="flex justify-center mb-4">
            <div className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
              {success ? (
                <CheckCircle className="h-16 w-16 text-green-400" />
              ) : verifying ? (
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent"></div>
              ) : (
                <AlertTriangle className="h-16 w-16 text-yellow-400" />
              )}
            </div>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-white drop-shadow-lg shadow-black mb-4">
            {verifying ? 'Verifying Email' : 
             success ? 'Email Verified!' : 
             'Verification Issue'}
          </h1>
          <p className="text-xl text-white max-w-2xl mx-auto font-medium drop-shadow-md mb-6">
            {verifying ? 'Please wait while we confirm your email address...' : 
             success ? 'Your account is now active and ready to use' : 
             'There was a problem with your verification link'}
          </p>
        </div>
      </section>
      
      <section className="py-16 px-4 -mt-2 relative z-10">
        <div className="max-w-md mx-auto">
          <div className="bg-white p-8 rounded-xl shadow-lg border-green-subtle card-hover-effect">
            {verifying && (
              <div className="flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
                </div>
                <h2 className="text-2xl font-bold text-gradient-green mb-2">Verifying Your Email</h2>
                <p className="text-gray-600 mt-2">
                  This will only take a moment...
                </p>
              </div>
            )}
            
            {!verifying && success && (
              <div className="flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gradient-green mb-2">Email Verified!</h2>
                <p className="text-gray-600 mt-2">{error}</p>
                
                <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-100 w-full">
                  <p className="text-green-800 text-sm flex items-start">
                    <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                    <span>Your account is now active and you can access all features of Greenhouse 2025.</span>
                  </p>
                </div>
                
                <div className="mt-8 w-full">
                  <Link 
                    href="/profile"
                    className="w-full py-3 px-4 bg-primary text-white rounded-lg hover:bg-primary/90 
                             flex items-center justify-center gap-2 text-lg font-medium
                             shadow-md hover:shadow-lg transition-all transform hover:scale-[1.02]"
                  >
                    Continue to Profile 
                    <ArrowRight size={18} className="ml-2" />
                  </Link>
                </div>
              </div>
            )}
            
            {!verifying && !success && error && (
              <div className="flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-gradient-green mb-2">Verification Failed</h2>
                <p className="text-gray-600 mt-2">{error}</p>
                
                <div className="mt-6 p-4 bg-red-50 rounded-lg border border-red-100 w-full">
                  <p className="text-red-800 text-sm flex items-start">
                    <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                    <span>The verification link may have expired or already been used.</span>
                  </p>
                </div>
                
                <div className="mt-8 w-full space-y-4">
                  <Link 
                    href="/verify-email"
                    className="w-full py-3 px-4 bg-primary text-white rounded-lg hover:bg-primary/90 
                             flex items-center justify-center gap-2 text-lg font-medium
                             shadow-md hover:shadow-lg transition-all transform hover:scale-[1.02]"
                  >
                    Try Again
                  </Link>
                  
                  <Link 
                    href="/help"
                    className="w-full py-3 px-4 bg-white border border-primary text-primary rounded-lg 
                             hover:bg-secondary/80 flex items-center justify-center gap-2 text-lg font-medium
                             shadow-md hover:shadow-lg transition-colors"
                  >
                    <HelpCircle size={18} className="mr-2" />
                    Get Help
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
      
      {isClient && <Footer />}
    </div>
  );
}

// Main page component with Suspense
export default function VerifyEmailConfirmPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
          <div className="text-lg text-gray-600">Loading verification page...</div>
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
} 