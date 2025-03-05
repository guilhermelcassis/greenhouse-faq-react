"use client";

import { ReactNode } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function ProfileLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute requireVerified={true}>
      {children}
    </ProtectedRoute>
  );
} 