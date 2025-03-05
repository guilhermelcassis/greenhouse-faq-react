"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle } from 'lucide-react';

export default function PaymentSuccessPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to profile after 5 seconds
    const timer = setTimeout(() => {
      router.push('/profile');
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [router]);
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        
        <h1 className="text-2xl font-bold mb-2">Payment Successful!</h1>
        <p className="text-gray-600 mb-6">
          Thank you for your purchase. Your payment has been processed successfully.
        </p>
        
        <div className="space-y-3">
          <Link 
            href="/profile"
            className="block w-full px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
          >
            View Your Profile
          </Link>
          
          <Link 
            href="/"
            className="block w-full px-4 py-2 bg-secondary text-primary rounded-md hover:bg-secondary/80 transition-colors"
          >
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
} 