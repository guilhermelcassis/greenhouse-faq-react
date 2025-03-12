"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, RefreshCw, CheckCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import Link from 'next/link';
import { sendEmailVerification } from 'firebase/auth';
import { Footer } from '@/components/Footer';

// Separate client component that uses useSearchParams
function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [emailSent, setEmailSent] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  
  const email = searchParams.get('email') || '';
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Check if email is verified on load and when currentUser changes
  useEffect(() => {
    if (user?.emailVerified) {
      router.push('/profile');
    }
    
    // Set up a timer to check verification status periodically
    const checkVerificationStatus = async () => {
      if (user) {
        // Force refresh the token to get the latest email verification status
        await user.reload();
        if (user.emailVerified) {
          router.push('/profile');
        }
      }
    };
    
    const interval = setInterval(checkVerificationStatus, 5000);
    return () => clearInterval(interval);
  }, [user, router]);
  
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
      if (user) {
        await sendEmailVerification(user);
        setEmailSent(true);
        setResendDisabled(true);
      }
    } catch (error: unknown) {
      const typedError = error as Error & { message?: string };
      setError(typedError.message || 'Failed to resend verification email');
    }
  };
  
  // Show loading state
  if (loading) {
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
              backgroundImage: "url('/images/gh2/image (5).jpg')",
              filter: "saturate(1.2)"
            }}
          ></div>
          <div className="absolute inset-0 bg-gradient-to-b from-primary/30 to-primary/10 mix-blend-overlay"></div>
        </div>
        
        <div className="relative z-10 text-center space-y-6 px-4 max-w-4xl mx-auto animate-fade-in">
          <div className="flex justify-center mb-4">
            <div className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
              <Mail className="h-16 w-16 text-white" />
            </div>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-white drop-shadow-lg shadow-black mb-4">
            Verify Your Email
          </h1>
          <p className="text-xl text-white max-w-2xl mx-auto font-medium drop-shadow-md mb-6">
            Just one more step to complete your registration
          </p>
        </div>
      </section>
      
      <section className="py-16 px-4 -mt-2 relative z-10">
        <div className="max-w-md mx-auto">
          <div className="bg-white p-8 rounded-xl shadow-lg border-green-subtle card-hover-effect">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-gradient-green mb-2">Check Your Inbox</h2>

              <p className="text-gray-600 mt-2">
                {"We've sent a verification email to:"}
              </p>
              <p className="font-medium text-gray-800 mt-1">{email}</p>
            </div>
            
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-blue-800 text-sm flex items-start">
                <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                <span>
                  {"If you don't see the email in your inbox, please check your spam or junk folder. Sometimes, verification emails can end up there."}
                </span>
              </p>
            </div>
            
            {error && (
              <div className="mt-6 bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg text-sm">
                {error}
              </div>
            )}
            
            {emailSent && (
              <div className="mt-6 bg-green-50 border border-green-200 text-green-600 p-4 rounded-lg text-sm">
                Verification email sent! Check your inbox.
              </div>
            )}
            
            <div className="mt-8 space-y-4">
              <button
                onClick={handleResendVerification}
                disabled={resendDisabled || loading}
                className="w-full py-3 px-4 bg-primary text-white rounded-lg hover:bg-primary/90 
                         flex items-center justify-center gap-2 text-lg font-medium
                         shadow-md hover:shadow-lg transition-all transform hover:scale-[1.02]
                         disabled:opacity-70 disabled:transform-none disabled:shadow-none
                         disabled:cursor-not-allowed"
              >
                {resendDisabled 
                  ? `Resend available in ${countdown}s` 
                  : 'Resend Verification Email'}
                {!resendDisabled && <RefreshCw size={18} className="ml-2" />}
              </button>
              
              <Link 
                href="/login"
                className="w-full py-3 px-4 bg-white border border-primary text-primary rounded-lg hover:bg-secondary/80 
                         transition-colors flex items-center justify-center gap-2 text-lg font-medium
                         shadow-md hover:shadow-lg"
              >
                <ArrowLeft size={18} className="mr-2" />
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </section>
      
      {isClient && <Footer />}
    </div>
  );
}

// Main page component with Suspense
export default function VerifyEmailPage() {
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