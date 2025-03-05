"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth';

// Create a wrapper component that uses search params
function DonateSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  useEffect(() => {
    // Get the session ID from the URL
    const id = searchParams.get('session_id');
    setSessionId(id);

  }, [searchParams, router, user]);
  
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section with success message */}
      <section className="relative h-[40vh] flex items-center justify-center bg-green-gradient-radial">
        <div className="relative text-center space-y-6 px-4 max-w-4xl mx-auto animate-fade-in">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-24 w-24 text-green-500" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-gradient-green">
            Thank You for Your Payment
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Be part of the Revival of the Church in Europe.
          </p>
        </div>
      </section>

      {/* Success details */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow-md border-green-subtle">
          <h2 className="text-2xl font-semibold mb-6 text-center">Payment Successful</h2>
          
          <div className="space-y-6">
            <p className="text-center">
              Your payment has been successfully processed. Check the receipt in your profile page.
            </p>
            
            {sessionId && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 text-center">
                  Reference: <span className="font-mono">{sessionId}</span>
                </p>
              </div>
            )}
            
            <div className="flex justify-center gap-4 mt-8">
              <Link
                href="/profile"
                className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                View your profile
              </Link>
              <Link
                href="/"
                className="px-6 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Return to home
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// Main component with Suspense boundary
export default function DonateSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse">Loading donation confirmation...</div>
    </div>}>
      <DonateSuccessContent />
    </Suspense>
  );
} 