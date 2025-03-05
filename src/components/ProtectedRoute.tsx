"use client";

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

interface ProtectedRouteProps {
  children: ReactNode;
  requireVerified?: boolean;
}

export default function ProtectedRoute({ 
  children, 
  requireVerified = true 
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (requireVerified && !user.emailVerified) {
        router.push('/verify-email');
      }
    }
  }, [user, loading, router, requireVerified]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (requireVerified && !user.emailVerified) {
    return null;
  }

  return <>{children}</>;
} 