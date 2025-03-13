"use client";

import { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { User, Mail, Lock, AlertCircle, ArrowRight } from 'lucide-react';
import { Footer } from '@/components/Footer';

// Create a wrapper component that uses search params
function LoginContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { signIn, signInWithGoogle, loading, error, user } = useAuth();
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      console.log('User already logged in, redirecting to profile page');
      router.push('/profile');
    }
  }, [user, loading, router]);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  
  const redirect = searchParams.get('redirect') || '/profile';
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);
    
    try {
      await signIn(email, password);
      // Allow time for Firebase auth state to update before manual redirect
      setTimeout(() => {
        console.log('Redirecting to:', redirect);
        router.push(redirect);
      }, 500); // Short delay to ensure auth state updates
    } catch (error: unknown) {
      if (error instanceof Error) {
        // Check for Firebase auth/invalid-credential error
        if (error.message.includes('auth/invalid-credential') || 
            error.message.includes('auth/user-not-found')) {
          setFormError("We couldn't find an account with these credentials. Please check your email/password or register for a new account.");
        } else {
          setFormError(error.message);
        }
      } else {
        setFormError('An unknown error occurred');
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleGoogleSignIn = async () => {
    setFormError(null);
    setIsSubmitting(true);
    
    try {
      await signInWithGoogle();
      // Allow time for Firebase auth state to update before manual redirect
      setTimeout(() => {
        console.log('Redirecting to:', redirect);
        router.push(redirect);
      }, 500); // Short delay to ensure auth state updates
    } catch (error: unknown) {
      if (error instanceof Error) {
        // Check for Firebase auth/invalid-credential error
        if (error.message.includes('auth/invalid-credential') || 
            error.message.includes('auth/user-not-found')) {
          setFormError("We couldn't find an account with these credentials. Please register for a new account first.");
        } else {
          setFormError(error.message);
        }
      } else {
        setFormError('An unknown error occurred');
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section with background image */}
      <section className="relative h-[50vh] flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-black/50 z-10"></div>
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: "url('/images/gh2/image (7).jpg')",
              filter: "saturate(1.2)"
            }}
          ></div>
          <div className="absolute inset-0 bg-gradient-to-b from-primary/30 to-primary/10 mix-blend-overlay"></div>
        </div>
        
        <div className="relative z-10 text-center space-y-6 px-4 max-w-4xl mx-auto animate-fade-in">
          <div className="">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-white drop-shadow-lg shadow-black mb-4">
              Sign In
            </h1>
            <p className="text-xl text-white max-w-2xl mx-auto font-medium drop-shadow-md mb-6">
              Welcome back! Enter your credentials to access your account
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 flex justify-center -mt-2 relative z-10">
        <div className="bg-white rounded-xl shadow-lg border-green-subtle card-hover-effect w-full max-w-md overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-center mb-2">
              <div className="p-2 bg-primary/10 rounded-full text-primary mr-3">
                <User size={24} />
              </div>
              <h2 className="text-2xl font-bold text-gradient-green">Account Login</h2>
            </div>
            <p className="text-center text-gray-600">
              Enter your credentials to continue
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6">
            {(formError || error) && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg mb-6 flex items-start">
                <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                <p className="text-sm">{formError || error}</p>
              </div>
            )}
            
            <div className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10 pr-4 py-3 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                  <Link 
                    href="/forgot-password" 
                    className="text-sm text-primary hover:text-primary/70 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
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
                {isSubmitting ? 'Signing in...' : 'Sign in'}
                {!isSubmitting && <ArrowRight size={18} />}
              </button>
              
              <div className="relative mt-3">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or continue with</span>
                </div>
              </div>
              
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isSubmitting || loading}
                className="w-full py-3 px-4 bg-white text-gray-700 rounded-lg border border-gray-300
                         hover:bg-gray-50 flex items-center justify-center gap-2 font-medium
                         transition-all shadow-sm hover:shadow disabled:opacity-70"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Continue with Google
              </button>
            </div>
            
            <div className="mt-8 pt-4 border-t border-gray-100 text-center">
              <p className="text-gray-600">
                {"Don't have an account yet?"}{' '}
                <Link 
                  href={`/register?redirect=${encodeURIComponent(redirect)}`} 
                  className="text-primary font-medium hover:text-primary/70 transition-colors"
                >
                  {"Create an account"}
                </Link>
              </p>
            </div>
          </form>
        </div>
      </section>
      
      {isClient && <Footer />}
    </div>
  );
}

// Main component with Suspense boundary
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse">Loading login...</div>
    </div>}>
      <LoginContent />
    </Suspense>
  );
} 