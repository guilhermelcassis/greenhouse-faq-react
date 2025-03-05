'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/lib/utils';
// Import Firebase auth (you should have something like this)
import { getAuth, onAuthStateChanged } from 'firebase/auth';
// import { firebaseApp } from '@/lib/firebase'; // Adjust import based on your firebase setup

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

interface User {
  name?: string | null;
  email?: string | null;
  uid?: string;
}

export default function ProfileClient({ payments }: ProfileClientProps) {
  // Replaced useSession with Firebase auth state
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          name: firebaseUser.displayName,
          email: firebaseUser.email,
          uid: firebaseUser.uid
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    
    // Cleanup subscription
    return () => unsubscribe();
  }, []);
  
  if (loading) {
    return <div>Loading profile...</div>;
  }
  
  if (!user) {
    return <div>Please sign in to view your profile.</div>;
  }
  
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
              <p><strong>Name:</strong> {user?.name || 'N/A'}</p>
              <p><strong>Email:</strong> {user?.email || 'N/A'}</p>
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