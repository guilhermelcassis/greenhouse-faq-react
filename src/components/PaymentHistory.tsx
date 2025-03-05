'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created: string;
  description: string | null;
}

export default function PaymentHistory() {
  const { data: session } = useSession();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session) {
      fetchPaymentHistory();
    }
  }, [session]);

  const fetchPaymentHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/payments');
      
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
  };

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