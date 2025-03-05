import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import Image from 'next/image';

// Hardcoded exchange rates for fallback
const EXCHANGE_RATES: Record<string, number> = {
  'usd': 0.85,
  'gbp': 1.15,
  'jpy': 0.0075,
  'cad': 0.68,
  'aud': 0.63,
  'chf': 0.94,
  'brl': 0.17, // BRL to EUR
  'mxn': 0.043,
  'eur': 1.0
};

export default function Profile() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalSpent, setTotalSpent] = useState(0);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  
  // Function to convert to EUR if needed
  const convertToEUR = (amount: number, currency: string): number => {
    if (!amount) return 0;
    const currencyLower = (currency || 'eur').toLowerCase();
    const rate = EXCHANGE_RATES[currencyLower] || 1;
    const converted = Math.round(amount * rate);
    console.log(`Currency conversion: ${amount} ${currency} → ${converted} EUR (rate: ${rate})`);
    return converted;
  };

  useEffect(() => {
    const fetchUserPayments = async () => {
      try {
        console.log('🔍 PROFILE: Starting to fetch user payments...');
        setIsLoading(true);
        
        console.log(`🔍 PROFILE: Current user email: ${user?.email}`);
        const response = await fetch('/api/payments/user');
        
        console.log(`🔍 PROFILE: API response status: ${response.status}`);
        
        if (!response.ok) {
          console.error(`🔍 PROFILE: API error - ${response.status}: ${response.statusText}`);
          throw new Error('Failed to fetch user payments');
        }
        
        const data = await response.json();
        console.log(`🔍 PROFILE: Received ${data.payments?.length || 0} payments from API`, data);
        
        // Store raw data for debugging
        setDebugInfo({
          rawData: data,
          timestamp: new Date().toISOString()
        });
        
        // Log the first payment in detail if available
        if (data.payments && data.payments.length > 0) {
          console.log('🔍 PROFILE: First payment sample:', JSON.stringify(data.payments[0], null, 2));
        }
        
        // Use the payments directly - DON'T MODIFY THE DATA
        const processedPayments = data.payments || [];
        
        // Log each payment for debugging
        processedPayments.forEach((payment: any, index: number) => {
          console.log(`🔍 PROFILE: Payment ${index + 1}:`, {
            id: payment.id,
            amount: payment.amount,
            currency: payment.currency,
            amount_eur: payment.amount_eur,
            status: payment.status
          });
        });
        
        setPayments(processedPayments);
        
        // Calculate total spent in EUR directly from amount_eur
        console.log('🔍 PROFILE: Calculating total spent...');
        let total = 0;
        processedPayments.forEach((payment: any, index: number) => {
          if (payment.status === 'succeeded') {
            // Always use amount_eur from server - it's already converted
            const amountInEUR = payment.amount_eur;
            console.log(`🔍 PROFILE: Payment ${index + 1} (${payment.id}): ${amountInEUR/100} EUR (${payment.status})`);
            total += amountInEUR;
            console.log(`🔍 PROFILE: Running total: ${total/100} EUR`);
          } else {
            console.log(`🔍 PROFILE: Skipping payment ${index + 1} (${payment.id}): Status is ${payment.status}`);
          }
        });
        
        setTotalSpent(total);
        console.log(`🔍 PROFILE: Final total spent: ${total / 100} EUR`);
      } catch (error) {
        console.error('🔍 PROFILE: Error fetching user payments:', error);
      } finally {
        setIsLoading(false);
        console.log('🔍 PROFILE: Finished loading payment data');
      }
    };
    
    fetchUserPayments();
  }, [user?.email]);

  // Use a proper Euro format for a payment
  function formatEuroAmount(amountInCents: number) {
    return new Intl.NumberFormat('en-EU', {
      style: 'currency', 
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(amountInCents / 100);
  }

  if (isLoading) {
    return <div className="text-center py-10">Loading profile data...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center">
          <div>
            <h1 className="text-2xl font-bold">{user?.displayName || 'User'}</h1>
            <p className="text-gray-600">{user?.email}</p>
            <p className="mt-2">
              <span className="font-semibold">Total spent:</span>{' '}
              {formatEuroAmount(totalSpent)}
            </p>
            <p className="text-sm text-gray-500">
              Total Purchases: {payments.filter(p => p.status === 'succeeded').length}
            </p>
          </div>
        </div>
      </div>

      {/* Debug information section (collapsible) */}
      <div className="bg-gray-100 rounded-lg p-4 mb-6 text-xs">
        <details>
          <summary className="font-bold cursor-pointer">Debug Information</summary>
          <div className="mt-2 overflow-auto max-h-60">
            <p>Data fetched at: {debugInfo?.timestamp || 'N/A'}</p>
            <p>Total payments: {payments.length}</p>
            <p>Successful payments: {payments.filter(p => p.status === 'succeeded').length}</p>
            <p>Total amount (EUR): {totalSpent/100}</p>
            <p>User email: {user?.email}</p>
            <pre className="mt-2 bg-gray-800 text-green-400 p-2 rounded text-xs">
              {debugInfo ? JSON.stringify(debugInfo.rawData, null, 2) : 'No data'}
            </pre>
          </div>
        </details>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">Payment History</h2>
        
        {payments.length === 0 ? (
          <p className="text-gray-500">No payment history found.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left pb-2">Date</th>
                <th className="text-left pb-2">Email</th>
                <th className="text-right pb-2">Amount</th>
                <th className="text-left pb-2">Description</th>
                <th className="text-left pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment: any) => (
                <tr key={payment.id} className="border-b">
                  <td className="py-2">
                    {new Date(payment.created * 1000).toLocaleDateString()}
                    <br />
                    <span className="text-xs text-gray-500">
                      {new Date(payment.created * 1000).toLocaleTimeString()}
                    </span>
                  </td>
                  <td className="py-2">{payment.email}</td>
                  <td className="py-2 text-right">
                    {/* Show Euro amount */}
                    <div className="font-medium">
                      {formatEuroAmount(payment.amount_eur)}
                    </div>
                    {/* Show original amount as secondary */}
                    <div className="text-xs text-gray-500">
                      {new Intl.NumberFormat('en-EU', {
                        style: 'currency',
                        currency: payment.currency.toUpperCase(),
                      }).format(payment.amount / 100)}
                    </div>
                  </td>
                  <td className="py-2">{payment.description || 'N/A'}</td>
                  <td className="py-2">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                      payment.status === 'succeeded' ? 'bg-green-100 text-green-800' :
                      payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {payment.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
} 