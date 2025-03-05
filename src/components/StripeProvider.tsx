"use client";

import { ReactNode } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import stripePromise from '@/lib/stripe';

interface StripeProviderProps {
  children: ReactNode;
}

export default function StripeProvider({ children }: StripeProviderProps) {
  // If Stripe isn't initialized, show a message
  if (!stripePromise) {
    return (
      <div className="bg-red-50 border border-red-200 p-6 rounded-lg">
        <h3 className="text-lg font-medium text-red-800 mb-2">Payment System Unavailable</h3>
        <p className="text-red-700">
          Stripe API key is missing. Please check your environment configuration.
        </p>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      {children}
    </Elements>
  );
} 