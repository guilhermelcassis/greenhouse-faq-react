"use client";

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { User, Mail, Lock, AlertCircle, UserPlus } from 'lucide-react';

// Create a wrapper component that uses search params
function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signUp, loading } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  
  const redirect = searchParams.get('redirect') || '/profile';
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    
    if (formData.password !== confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await signUp(formData.email, formData.password, '');
      router.push('/verify-email?email=' + encodeURIComponent(formData.email));
    } catch (error: unknown) {
      const typedError = error as Error & { message?: string };
      setFormError(typedError.message || 'Failed to sign up');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section with gradient background */}
      <section className="relative h-[30vh] flex items-center justify-center bg-green-gradient-radial">
        <div className="relative text-center space-y-6 px-4 max-w-4xl mx-auto animate-fade-in">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-gradient-green">
            Create Account
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Join our community and be part of the Greenhouse 2025 initiative
          </p>
        </div>
      </section>
      
      <section className="py-16 px-4 flex justify-center">
        <div className="bg-white rounded-xl shadow-md border-green-subtle card-hover-effect w-full max-w-md overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-center mb-2">
              <div className="p-2 bg-primary/10 rounded-full text-primary mr-3">
                <UserPlus size={24} />
              </div>
              <h2 className="text-2xl font-bold text-gradient-green">Sign Up</h2>
            </div>
            <p className="text-center text-gray-600">
              Create your account to get started
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6">
            {(formError) && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg mb-6 flex items-start">
                <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                <p className="text-sm">{formError}</p>
              </div>
            )}
            
            <div className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Full Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="name"
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Full Name"
                    required
                    className="pl-10 pr-4 py-3 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="name@example.com"
                    required
                    className="pl-10 pr-4 py-3 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    minLength={6}
                    className="pl-10 pr-4 py-3 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Password must be at least 6 characters</p>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Confirm Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="pl-10 pr-4 py-3 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
                  />
                </div>
              </div>
              
              <button
                type="submit"
                disabled={isSubmitting || loading}
                className="w-full py-3 px-4 bg-primary text-white rounded-lg hover:bg-primary/90 
                         flex items-center justify-center gap-2 text-lg font-medium
                         shadow-md hover:shadow-lg transition-all transform hover:scale-[1.02]
                         disabled:opacity-70 disabled:transform-none disabled:shadow-none"
              >
                {isSubmitting ? 'Creating account...' : 'Create account'}
              </button>
            </div>
            
            <div className="mt-8 pt-4 border-t border-gray-100 text-center">
              <p className="text-gray-600">
                Already have an account?{' '}
                <Link 
                  href={`/login?redirect=${encodeURIComponent(redirect)}`} 
                  className="text-primary font-medium hover:text-primary/70 transition-colors"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}

// Main component with Suspense boundary
export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse">Loading registration form...</div>
    </div>}>
      <RegisterContent />
    </Suspense>
  );
} 