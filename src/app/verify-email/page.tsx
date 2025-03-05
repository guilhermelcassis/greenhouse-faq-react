"use client";

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Mail, RefreshCw, CheckCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import Link from 'next/link';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { currentUser, sendEmailVerification, loading } = useAuth();
  const [emailSent, setEmailSent] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [error, setError] = useState<string | null>(null);
  
  const email = searchParams.get('email') || '';
  
  // Check if email is verified on load and when currentUser changes
  useEffect(() => {
    if (currentUser?.emailVerified) {
      router.push('/profile');
    }
    
    // Set up a timer to check verification status periodically
    const checkVerificationStatus = async () => {
      if (currentUser) {
        // Force refresh the token to get the latest email verification status
        await currentUser.reload();
        if (currentUser.emailVerified) {
          router.push('/profile');
        }
      }
    };
    
    const interval = setInterval(checkVerificationStatus, 5000);
    return () => clearInterval(interval);
  }, [currentUser, router]);
  
  // Handle countdown for resend button
  useEffect(() => {
    if (resendDisabled && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setResendDisabled(false);
      setCountdown(60);
    }
  }, [resendDisabled, countdown]);
  
  const handleResendVerification = async () => {
    try {
      setError(null);
      await sendEmailVerification();
      setEmailSent(true);
      setResendDisabled(true);
    } catch (error: any) {
      setError(error.message || 'Failed to resend verification email');
    }
  };
  
  return (
    <div className="min-h-screen bg-background">
      <section className="relative h-[30vh] flex items-center justify-center bg-green-gradient-radial">
        <div className="relative text-center space-y-6 px-4 max-w-4xl mx-auto animate-fade-in">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-gradient-green">
            Verify Your Email
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Just one more step to complete your registration
          </p>
        </div>
      </section>
      
      <section className="py-16 px-4 flex justify-center">
        <div className="bg-white rounded-xl shadow-md border-green-subtle card-hover-effect w-full max-w-md overflow-hidden">
          <div className="p-6 space-y-6">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="p-4 bg-primary/10 rounded-full text-primary mb-4">
                <Mail size={40} />
              </div>
              <h2 className="text-2xl font-bold text-gradient-green mb-2">Check Your Inbox</h2>
              <p className="text-gray-600">
                We've sent a verification email to:
              </p>
              <p className="font-medium text-gray-800 mt-1">{email}</p>
              
              <div className="mt-8 p-4 bg-blue-50 rounded-lg w-full">
                <p className="text-blue-800 text-sm">
                  <CheckCircle className="h-5 w-5 inline-block mr-2" />
                  Click the verification link in the email to activate your account
                </p>
              </div>
            </div>
            
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg flex items-start">
                <p className="text-sm">{error}</p>
              </div>
            )}
            
            {emailSent && (
              <div className="bg-green-50 border border-green-200 text-green-600 p-4 rounded-lg flex items-start">
                <p className="text-sm">Verification email sent! Check your inbox.</p>
              </div>
            )}
            
            <div className="space-y-4">
              <button
                onClick={handleResendVerification}
                disabled={resendDisabled || loading}
                className="w-full py-3 px-4 bg-primary text-white rounded-lg hover:bg-primary/90 
                        flex items-center justify-center gap-2 font-medium
                        shadow-md hover:shadow-lg transition-all
                        disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {resendDisabled 
                  ? `Resend available in ${countdown}s` 
                  : 'Resend Verification Email'}
                {!resendDisabled && <RefreshCw size={18} />}
              </button>
              
              <Link 
                href="/login"
                className="block w-full text-center py-3 px-4 bg-gray-100 text-gray-700 rounded-lg 
                         hover:bg-gray-200 font-medium transition-all"
              >
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
} 