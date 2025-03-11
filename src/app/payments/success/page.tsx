"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Home, User } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Footer } from '@/components/Footer';

// Separate client component that uses useSearchParams
function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
    // Get the session ID from the URL
    const id = searchParams.get('session_id');
    setSessionId(id);
  }, [searchParams]);

  // Function to sync payments data silently in the background
  const syncPaymentsInBackground = async () => {
    if (!user) return;
    
    try {
      // Get Firebase token for auth
      const token = await user.getIdToken();
      
      // Fetch recent payments from the API
      const response = await fetch('/api/payments/history?limit=50&skipSync=true', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        console.error('Background sync failed:', await response.text());
        return;
      }
      
      console.log('Payment data synced successfully in background');
    } catch (error) {
      console.error('Error in background payment sync:', error);
    }
  };
  
  useEffect(() => {
    // Sync payments silently when the component mounts
    if (user) {
      syncPaymentsInBackground();
    }
  }, [user]);
  
  // Show loading state
  if (!isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
          <div className="text-lg text-gray-600">Confirming your payment...</div>
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
              backgroundImage: "url('/images/greenhouse/image (15).jpg')",
              filter: "saturate(1.2)"
            }}
          ></div>
          <div className="absolute inset-0 bg-gradient-to-b from-primary/30 to-primary/10 mix-blend-overlay"></div>
        </div>
        
        <div className="relative z-10 text-center space-y-6 px-4 max-w-4xl mx-auto animate-fade-in">
          <div className="flex justify-center mb-4">
            <div className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
              <CheckCircle className="h-16 w-16 text-green-400" />
            </div>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-white drop-shadow-lg shadow-black mb-4">
            Thank You for Your Payment
          </h1>
          <p className="text-xl text-white max-w-2xl mx-auto font-medium drop-shadow-md mb-6">
          Be part of the Revival of the Church in Europe          </p>
        </div>
      </section>

      {/* Success details */}
      <section className="py-16 px-4 -mt-2 relative z-10">
        <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow-lg border-green-subtle card-hover-effect">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gradient-green mb-2">Payment Successful</h2>
            <p className="text-gray-600">
              Your payment has been processed successfully. A receipt has been sent to your email.
            </p>
          </div>
          
          <div className="space-y-6">            
            {sessionId && (
              <div className="bg-green-50 p-6 rounded-lg border border-green-100">
                <p className="text-center text-gray-700">
                  Transaction Reference:
                </p>
                <p className="text-center font-mono text-sm bg-white p-3 rounded mt-2 border border-green-50 overflow-auto">
                  {sessionId}
                </p>
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8">
              <Link
                href="/profile"
                className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 text-lg font-medium shadow-md hover:shadow-lg"
              >
                <User size={18} />
                View your profile
              </Link>
              <Link
                href="/"
                className="px-6 py-3 bg-white border border-primary text-primary rounded-lg hover:bg-secondary/80 transition-colors flex items-center justify-center gap-2 text-lg font-medium shadow-md hover:shadow-lg"
              >
                <Home size={18} />
                Return to home
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
export default function DonateSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
          <div className="text-lg text-gray-600">Loading payment information...</div>
        </div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}