"use client";

import React from 'react';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import StripeProvider from '@/components/StripeProvider';
import PaymentForm from '@/components/PaymentForm';
import { useAuth } from '@/lib/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Product } from '@/types/payment';
import { ErrorBoundary } from 'react-error-boundary';

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stripeError, setStripeError] = useState<boolean>(false);
  
  const productId = searchParams.get('productId');
  
  useEffect(() => {
    // Redirect if not logged in
    if (!loading && !user) {
      router.push('/login?redirect=/checkout');
      return;
    }
    
    // Fetch product details
    if (productId) {
      const fetchProduct = async () => {
        try {
          const productDoc = await getDoc(doc(db, 'products', productId));
          
          if (productDoc.exists()) {
            setProduct({ id: productDoc.id, ...productDoc.data() } as Product);
          } else {
            setError('Product not found');
          }
        } catch (err) {
          console.error('Error fetching product:', err);
          setError('Failed to load product details');
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchProduct();
    } else {
      setError('No product specified');
      setIsLoading(false);
    }
  }, [productId, user, loading, router]);
  
  const handlePaymentSuccess = () => {
    router.push('/payment-success');
  };
  
  const handlePaymentError = (errorMessage: string) => {
    console.error('Payment error:', errorMessage);
    // Error is already displayed in the PaymentForm component
  };
  
  if (loading || isLoading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-2xl font-bold text-red-500 mb-4">Error</h1>
        <p>{error}</p>
        <button 
          onClick={() => router.push('/')}
          className="mt-4 px-4 py-2 bg-primary text-white rounded-md"
        >
          Return to Home
        </button>
      </div>
    );
  }
  
  if (!product) {
    return null;
  }
  
  return (
    <div className="container mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-8 text-center">Checkout</h1>
      
      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
            
            <div className="flex items-center space-x-4 mb-4">
              {product.images && product.images.length > 0 && (
                <img 
                  src={product.images[0]} 
                  alt={product.name} 
                  className="w-20 h-20 object-cover rounded-md"
                />
              )}
              
              <div>
                <h3 className="font-medium">{product.name}</h3>
                <p className="text-sm text-gray-500">{product.description}</p>
              </div>
            </div>
            
            <div className="border-t pt-4 mt-4">
              <div className="flex justify-between font-medium">
                <span>Total</span>
                <span>{new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: product.currency.toUpperCase(),
                }).format(product.price)}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div>
          <CustomErrorBoundary
            fallback={
              <div className="bg-red-50 border border-red-200 p-6 rounded-lg">
                <h3 className="text-lg font-medium text-red-800 mb-2">Payment System Unavailable</h3>
                <p className="text-red-700 mb-4">
                  We're experiencing issues with our payment system. This might be due to missing configuration.
                </p>
                <p className="text-sm text-red-600">
                  Please ensure that the Stripe API key is properly configured in your environment variables.
                </p>
                <button 
                  onClick={() => router.push('/')}
                  className="mt-4 px-4 py-2 bg-primary text-white rounded-md"
                >
                  Return to Home
                </button>
              </div>
            }
          >
            <StripeProvider>
              <PaymentForm 
                amount={product.price}
                currency={product.currency}
                productName={product.name}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
              />
            </StripeProvider>
          </CustomErrorBoundary>
        </div>
      </div>
    </div>
  );
}

// Simple error boundary component
class CustomErrorBoundary extends React.Component<{
  children: React.ReactNode;
  fallback: React.ReactNode;
}> {
  state = { hasError: false };
  
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  
  componentDidCatch(error: any, errorInfo: any) {
    console.error("Payment system error:", error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    
    return this.props.children;
  }
} 