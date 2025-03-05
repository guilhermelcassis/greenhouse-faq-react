"use client";

import { useState } from 'react';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth';

interface PaymentFormProps {
  amount: number;
  currency?: string;
  productName: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export default function PaymentForm({ 
  amount, 
  currency = 'usd', 
  productName,
  onSuccess,
  onError
}: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { user } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!stripe || !elements || !user) {
      return;
    }
    
    setIsLoading(true);
    setErrorMessage(null);
    
    try {
      // Create payment intent on the server
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          currency,
          metadata: {
            productName
          }
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create payment intent');
      }
      
      const { clientSecret } = await response.json();
      
      // Confirm the payment with the card element
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement)!,
          billing_details: {
            email: user.email || undefined,
          },
        },
      });
      
      if (result.error) {
        setErrorMessage(result.error.message || 'Payment failed');
        onError?.(result.error.message || 'Payment failed');
      } else if (result.paymentIntent.status === 'succeeded') {
        // Payment successful
        onSuccess?.();
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'An unexpected error occurred');
      onError?.(error.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle> purchase</CardTitle>
        <CardDescription>
          {productName} - {new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency.toUpperCase(),
          }).format(amount)}
        </CardDescription>
      </CardHeader>
      
      <form onSubmit={handleSubmit}>
        <CardContent>
          <div className="space-y-4">
            <div className="border rounded-md p-4">
              <CardElement 
                options={{
                  style: {
                    base: {
                      fontSize: '16px',
                      color: '#424770',
                      '::placeholder': {
                        color: '#aab7c4',
                      },
                    },
                    invalid: {
                      color: '#9e2146',
                    },
                  },
                }}
              />
            </div>
            
            {errorMessage && (
              <div className="text-sm text-red-500 mt-2">
                {errorMessage}
              </div>
            )}
          </div>
        </CardContent>
        
        <CardFooter>
          <Button 
            type="submit" 
            className="w-full" 
            disabled={!stripe || isLoading}
          >
            {isLoading ? 'Processing...' : 'Pay Now'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
} 