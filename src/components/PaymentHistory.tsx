'use client';

import { useState, useEffect, useCallback } from 'react';
// Import Firebase auth with User type
import { getAuth, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
// You can also use the useAuth hook from Providers if preferred
// import { useAuth } from './Providers';

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created: string;
  description: string | null;
}

// Removed unused User interface

export default function PaymentHistory() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check authentication with Firebase
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      // Once we have the user state, loading will be handled by the payment fetch
      if (!firebaseUser) {
        setLoading(false);
      }
    });
    
    return () => unsubscribe();
  }, []);

  // Define fetchPaymentHistory with useCallback to avoid dependency issues
  const fetchPaymentHistory = useCallback(async () => {
    try {
      setLoading(true);
      // You might need to pass user ID or token in headers for authorization
      if (!user) return;
      
      const response = await fetch('/api/payments', {
        headers: {
          // Optional: Include auth token if your API requires it
          'Authorization': `Bearer ${await user.getIdToken()}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch payment history');
      }
      
      const data = await response.json();
      setPayments(data.payments);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch payment history when user auth state changes
  useEffect(() => {
    if (user) {
      fetchPaymentHistory();
    }
  }, [user, fetchPaymentHistory]);

  if (!user) return <div className="text-center py-4">Please log in to view payment history.</div>;
  if (loading) return <div className="text-center py-4">Loading payment history...</div>;
  if (error) return <div className="text-red-500 py-4">Error: {error}</div>;
  if (payments.length === 0) return <div className="py-4">No payment history found.</div>;

  return (
    <div className="mt-6">
      <h2 className="text-xl font-semibold mb-4">Payment History</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-2 px-4 border-b text-left">Date</th>
              <th className="py-2 px-4 border-b text-left">Description</th>
              <th className="py-2 px-4 border-b text-left">Amount</th>
              <th className="py-2 px-4 border-b text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id} className="hover:bg-gray-50">
                <td className="py-2 px-4 border-b">
                  {new Date(payment.created).toLocaleDateString()}
                </td>
                <td className="py-2 px-4 border-b">
                  {payment.description || 'N/A'}
                </td>
                <td className="py-2 px-4 border-b">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: payment.currency.toUpperCase(),
                  }).format(payment.amount)}
                </td>
                <td className="py-2 px-4 border-b">
                  <span className={`px-2 py-1 rounded text-xs ${
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
      </div>
    </div>
  );
} 