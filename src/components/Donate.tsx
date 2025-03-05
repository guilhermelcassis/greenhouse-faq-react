'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Minus, CreditCard, Heart } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
  AddressElement
} from '@stripe/react-stripe-js';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

// Fix type error by defining user type from auth
interface User {
  getIdToken: () => Promise<string>;
  // Add other properties you need from the user object
}

interface DonateProps {
  user: User; // Use the User interface instead of ExtendedUser
}

export default function DonateComponent({ user }: DonateProps) {
  const [donations, setDonations] = useState<{[key: number]: number}>({
    50: 0,
    100: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const router = useRouter();

  // Calculate total donation amount
  const totalAmount = Object.entries(donations).reduce(
    (total, [amount, quantity]) => total + (Number(amount) * quantity), 
    0
  );

  const updateQuantity = (amount: number, delta: number) => {
    setDonations(prev => {
      const newQuantity = Math.max(0, (prev[amount] || 0) + delta);
      return { ...prev, [amount]: newQuantity };
    });
  };

  const createPaymentIntent = async () => {
    if (totalAmount === 0) return;
    
    setIsLoading(true);
    
    try {
      // Create a payment intent
      const response = await fetch('/api/checkout/payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user.getIdToken()}`
        },
        body: JSON.stringify({
          items: Object.entries(donations)
            .filter(([_, quantity]) => quantity > 0)
            .map(([amount, quantity]) => ({
              name: `€${amount} Donation`,
              amount: Number(amount) * 100, // Stripe uses cents
              quantity,
            })),
          amount: totalAmount * 100, // Convert to cents for Stripe
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create payment intent');
      }
      
      const { clientSecret } = await response.json();
      setClientSecret(clientSecret);
    } catch (error) {
      console.error('Error creating payment intent:', error);
      alert('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md border-green-subtle card-hover-effect overflow-hidden">
      {!clientSecret ? (
        <div className="p-8">
          <div className="flex items-center justify-center mb-6">
            <Heart className="text-primary mr-2" size={28} />
            <h2 className="text-2xl font-bold text-gradient-green">Payment</h2>
          </div>
          
          <p className="text-center text-gray-600 mb-8">
            Choose an amount to pay. Be part of Dunamis Greenhouse 2025!
          </p>
          
          <div className="space-y-4 mb-8">
            {/* €50 donation row */}
            <div className="flex items-center justify-between p-4 border rounded-lg hover:border-primary transition-colors">
              <div className="font-medium text-lg">€50 Payment</div>
              <div className="flex items-center space-x-3">
                <button 
                  onClick={() => updateQuantity(50, -1)}
                  disabled={donations[50] === 0}
                  className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 transition-colors"
                >
                  <Minus size={16} />
                </button>
                <span className="w-8 text-center text-lg font-medium">{donations[50]}</span>
                <button 
                  onClick={() => updateQuantity(50, 1)}
                  className="p-2 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
            
            {/* €100 donation row */}
            <div className="flex items-center justify-between p-4 border rounded-lg hover:border-primary transition-colors">
              <div className="font-medium text-lg">€100 Payment</div>
              <div className="flex items-center space-x-3">
                <button 
                  onClick={() => updateQuantity(100, -1)}
                  disabled={donations[100] === 0}
                  className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 transition-colors"
                >
                  <Minus size={16} />
                </button>
                <span className="w-8 text-center text-lg font-medium">{donations[100]}</span>
                <button 
                  onClick={() => updateQuantity(100, 1)}
                  className="p-2 rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          </div>
          
          {/* Total amount */}
          <div className="text-2xl font-bold text-center mb-6 py-3 bg-secondary/20 rounded-lg">
            Total: €{totalAmount}
          </div>
          
          <button
            onClick={createPaymentIntent}
            disabled={totalAmount === 0 || isLoading}
            className={`
              w-full py-4 px-6 rounded-lg flex items-center justify-center gap-3 text-lg font-medium
              transition-all transform hover:scale-[1.02] ${
                totalAmount === 0
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-primary text-white hover:bg-primary/90 shadow-lg hover:shadow-xl'
              }`}
          >
            <CreditCard size={22} />
            {isLoading ? 'Processing...' : `Donate €${totalAmount}`}
          </button>
        </div>
      ) : (
        <div className="p-8">
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <CheckoutFormContent totalAmount={totalAmount} />
          </Elements>
        </div>
      )}
    </div>
  );
}

// Checkout form with embedded Stripe Elements
function CheckoutFormContent({ totalAmount }: { totalAmount: number }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/donate/success`,
        },
        redirect: 'if_required',
      });

      if (error) {
        setErrorMessage(error.message || 'An error occurred with your payment');
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Payment successful
        router.push(`/donate/success?payment_intent=${paymentIntent.id}`);
      }
    } catch (err) {
      console.error('Payment error:', err);
      setErrorMessage('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-center mb-6">
        <CreditCard className="text-primary mr-2" size={28} />
        <h2 className="text-2xl font-bold text-gradient-green">Be part of the revival of Europe</h2>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-medium mb-3">Payment Details</h3>
        <div className="border rounded-lg p-4 hover:border-primary transition-colors">
          <PaymentElement />
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-medium mb-3">Billing Address</h3>
        <div className="border rounded-lg p-4 hover:border-primary transition-colors">
          <AddressElement options={{ mode: 'billing' }} />
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-100 text-red-700 rounded-lg border border-red-200">
          {errorMessage}
        </div>
      )}

      <div className="text-2xl font-bold text-center mb-6 py-3 bg-secondary/20 rounded-lg">
        Total: €{totalAmount}
      </div>

      <button
        type="submit"
        disabled={!stripe || isLoading}
        className="w-full py-4 px-6 rounded-lg bg-primary text-white hover:bg-primary/90 
                 flex items-center justify-center gap-3 text-lg font-medium shadow-lg hover:shadow-xl
                 transition-all transform hover:scale-[1.02] disabled:opacity-70 disabled:scale-100"
      >
        <CreditCard size={22} />
        {isLoading ? 'Processing...' : 'Complete Payment'}
      </button>
    </form>
  );
} 