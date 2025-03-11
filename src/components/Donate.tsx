'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Minus, CreditCard, Heart, CheckCircle } from 'lucide-react';
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
  userEmail: string;
  userId: string;
}

export default function DonateComponent({ user, userEmail, userId }: DonateProps) {
  const [donations, setDonations] = useState<{[key: number]: number}>({
    50: 0,
    100: 0
  });
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState('');

  // Calculate total donation amount including custom amount with decimal support
  const totalAmount = Object.entries(donations).reduce(
    (total, [amount, quantity]) => total + (Number(amount) * quantity), 
    customAmount ? parseFloat(customAmount) : 0
  );

  const updateQuantity = (amount: number, delta: number) => {
    setDonations(prev => {
      const newQuantity = Math.max(0, (prev[amount] || 0) + delta);
      return { ...prev, [amount]: newQuantity };
    });
  };

  // Updated handler for custom amount with decimal support
  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty input, digits, and one decimal point
    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
      setCustomAmount(value);
    }
  };

  const createPaymentIntent = async (amount: number) => {
    try {
      // Get the auth token from the user object
      const token = await user.getIdToken();
      
      // Use Math.round to ensure we get a clean integer value in cents
      const amountInCents = Math.round(amount * 100);
      
      // Now include the token in the request headers
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: amountInCents, // use the rounded value
          currency: 'eur',
          // Include both userId and email in metadata
          metadata: {
            userId: userId,
            email: userEmail,
            items: JSON.stringify([{ name: `€${amount} Donation`, amount: amountInCents, quantity: 1 }]),
          },
          // Set receipt_email explicitly
          receipt_email: userEmail,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create payment intent');
      }
      
      return data.clientSecret;
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw error;
    }
  };

  return (
    <>
      {!clientSecret ? (
        <div className="p-6">
          <div className="flex items-center justify-center mb-5">
            <div className="p-2 bg-primary/10 rounded-full text-primary mr-2">
              <Heart size={24} />
            </div>
            <h2 className="text-2xl font-bold text-gradient-green">Payment</h2>
          </div>
          
          <div className="space-y-3 mb-6">
            {/* €50 donation row */}
            <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-primary hover:shadow-md transition-all duration-300">
              <div className="font-medium text-base text-gray-800">€50 Payment</div>
              <div className="flex items-center space-x-3">
                <button 
                  onClick={() => updateQuantity(50, -1)}
                  disabled={donations[50] === 0}
                  className="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 transition-colors"
                  aria-label="Decrease quantity"
                >
                  <Minus size={16} />
                </button>
                <span className="w-6 text-center text-base font-medium">{donations[50]}</span>
                <button 
                  onClick={() => updateQuantity(50, 1)}
                  className="p-1.5 rounded-full bg-primary text-white hover:bg-primary/90 transition-colors"
                  aria-label="Increase quantity"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
            
            {/* €100 donation row */}
            <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-primary hover:shadow-md transition-all duration-300">
              <div className="font-medium text-base text-gray-800">€100 Payment</div>
              <div className="flex items-center space-x-3">
                <button 
                  onClick={() => updateQuantity(100, -1)}
                  disabled={donations[100] === 0}
                  className="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 transition-colors"
                  aria-label="Decrease quantity"
                >
                  <Minus size={16} />
                </button>
                <span className="w-6 text-center text-base font-medium">{donations[100]}</span>
                <button 
                  onClick={() => updateQuantity(100, 1)}
                  className="p-1.5 rounded-full bg-primary text-white hover:bg-primary/90 transition-colors"
                  aria-label="Increase quantity"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
            
            {/* Custom amount row with decimal support */}
            <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-primary hover:shadow-md transition-all duration-300">
              <div className="font-medium text-base text-gray-800">Custom Amount (€)</div>
              <div className="w-28">
                <input
                  type="text"
                  value={customAmount}
                  onChange={handleCustomAmountChange}
                  placeholder="0.00"
                  className="w-full p-2 border border-gray-300 rounded-lg text-right focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
                  aria-label="Custom donation amount"
                />
              </div>
            </div>
          </div>
          
          {/* Total amount - format to show 2 decimal places */}
          <div className="text-xl font-bold text-center mb-5 py-3 bg-gradient-to-r from-primary/20 to-primary/5 rounded-lg">
            Total: €{totalAmount.toFixed(2)}
          </div>
          
          <button
            onClick={async () => {
              try {
                setIsLoading(true);
                const secret = await createPaymentIntent(totalAmount);
                setClientSecret(secret);
              } catch (error) {
                console.error('Payment initialization failed:', error);
              } finally {
                setIsLoading(false);
              }
            }}
            disabled={totalAmount <= 0 || isLoading}
            className={`
              w-full py-3 px-5 rounded-lg flex items-center justify-center gap-2 text-base font-medium
              transition-all transform hover:scale-[1.01] ${
                totalAmount <= 0
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-primary text-white hover:bg-primary/90 shadow-md hover:shadow-lg'
              }`}
          >
            <CreditCard size={18} />
            {isLoading ? 'Processing...' : `Pay €${totalAmount.toFixed(2)}`}
          </button>
        </div>
      ) : (
        <div className="p-6">
          <Elements 
            stripe={stripePromise} 
            options={{ 
              clientSecret,
              appearance: {
                theme: 'stripe',
              }
            }}
          >
            <CheckoutFormContent totalAmount={totalAmount} />
          </Elements>
        </div>
      )}
    </>
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-center mb-5">
        <div className="p-2 bg-primary/10 rounded-full text-primary mr-2">
          <CreditCard size={24} />
        </div>
        <h2 className="text-2xl font-bold text-gradient-green">Complete Payment</h2>
      </div>

      <div className="mb-5">
        <div className="flex items-center mb-2">
          <CheckCircle className="text-primary mr-2" size={18} />
          <h3 className="text-base font-semibold">Payment Details</h3>
        </div>
        <div className="border border-gray-200 rounded-lg p-4 hover:border-primary transition-all duration-300 hover:shadow-md bg-white">
          <PaymentElement 
            options={{
              wallets: {
                applePay: 'auto',
                googlePay: 'auto'
              }
            }} 
          />
        </div>
      </div>

      <div className="mb-5">
        <div className="flex items-center mb-2">
          <CheckCircle className="text-primary mr-2" size={18} />
          <h3 className="text-base font-semibold">Billing Address</h3>
        </div>
        <div className="border border-gray-200 rounded-lg p-4 hover:border-primary transition-all duration-300 hover:shadow-md bg-white">
          <AddressElement options={{ 
            mode: 'shipping',
            fields: {
              phone: 'always',
            },
            defaultValues: {
              phone: '',
            }
          }} />
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 bg-red-50 text-red-600 rounded-lg border border-red-200 flex items-start space-x-2 text-sm">
          <span className="flex-shrink-0 mt-0.5">⚠️</span>
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="text-lg font-bold text-center mb-5 py-2.5 bg-gradient-to-r from-primary/20 to-primary/5 rounded-lg">
        Total: €{totalAmount.toFixed(2)}
      </div>

      <button
        type="submit"
        disabled={!stripe || isLoading}
        className="w-full py-3 px-5 rounded-lg bg-primary text-white hover:bg-primary/90 
                 flex items-center justify-center gap-2 text-base font-medium shadow-md hover:shadow-lg
                 transition-all transform hover:scale-[1.01] disabled:opacity-70 disabled:transform-none"
      >
        <CreditCard size={18} />
        {isLoading ? 'Processing...' : 'Complete Payment'}
      </button>
    </form>
  );
} 