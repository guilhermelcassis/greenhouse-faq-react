'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function DonationSuccessPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const paymentIntentId = searchParams.get('payment_intent');
  const [paymentInfo, setPaymentInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login?callbackUrl=/donate/success');
      return;
    }

    if (user && (sessionId || paymentIntentId)) {
      const fetchPaymentInfo = async () => {
        try {
          const token = await user.getIdToken();
          let endpoint = sessionId 
            ? `/api/checkout/verify?session_id=${sessionId}` 
            : `/api/checkout/verify-intent?payment_intent_id=${paymentIntentId}`;
          
          const response = await fetch(endpoint, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            setPaymentInfo(data);
          } else {
            console.error('Failed to fetch payment info');
          }
        } catch (error) {
          console.error('Error fetching payment info:', error);
        } finally {
          setIsLoading(false);
        }
      };

      fetchPaymentInfo();
    }
  }, [user, loading, router, sessionId, paymentIntentId]);

  if (loading || (user && isLoading)) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[60vh]">
        <div className="animate-pulse text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null; // The useEffect will handle the redirect
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
        <div className="flex flex-col items-center mb-6">
          <CheckCircle className="text-green-500 w-16 h-16 mb-4" />
          <h1 className="text-2xl font-bold text-center">Donation Successful!</h1>
        </div>

        {paymentInfo ? (
          <div className="space-y-4">
            <p className="text-center">
              Thank you for your donation of <span className="font-bold">€{paymentInfo.amount}</span>
            </p>
            <p className="text-center text-gray-600">
              Your contribution helps us continue our mission.
            </p>
          </div>
        ) : (
          <p className="text-center">
            Thank you for your donation. Your contribution helps us continue our mission.
          </p>
        )}

        <div className="mt-8 flex flex-col space-y-3">
          <Link 
            href="/donate" 
            className="py-2 px-4 bg-green-600 text-white rounded-md text-center hover:bg-green-700 transition-colors"
          >
            Make Another Donation
          </Link>
          <Link 
            href="/" 
            className="py-2 px-4 bg-gray-100 text-gray-800 rounded-md text-center hover:bg-gray-200 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
} 