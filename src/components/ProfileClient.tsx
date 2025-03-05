'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/lib/utils';

interface Payment {
  id: string;
  amount: number;
  status: string;
  email: string;
  created: number;
}

interface ProfileClientProps {
  payments: Payment[];
}

export default function ProfileClient({ payments }: ProfileClientProps) {
  const { data: session } = useSession();
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Your Profile</h1>
      
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>Name:</strong> {session?.user?.name}</p>
              <p><strong>Email:</strong> {session?.user?.email}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
          </CardHeader>
          <CardContent>
            {payments.length > 0 ? (
              <div className="space-y-4">
                {payments.map((payment) => (
                  <div key={payment.id} className="border-b pb-3">
                    <p><strong>Date:</strong> {formatDate(payment.created)}</p>
                    <p><strong>Amount:</strong> {formatCurrency(payment.amount)}</p>
                    <p><strong>Status:</strong> <span className={`capitalize ${payment.status === 'succeeded' ? 'text-green-600' : 'text-yellow-600'}`}>{payment.status}</span></p>
                  </div>
                ))}
              </div>
            ) : (
              <p>No payment history found.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 