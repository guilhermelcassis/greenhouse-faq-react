'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import DonateComponent from '@/components/Donate';
import { Footer } from '@/components/Footer';
import { toast } from 'react-hot-toast';

export default function DonatePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [userMetadata, setUserMetadata] = useState<{ email: string; uid: string } | null>(null);
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  useEffect(() => {
    if (!loading) {
      if (!user) {
        // Redirect to login if not authenticated
        router.push('/login?callbackUrl=/payments');
      } else if (!(user.isApproved || user.isStaff || user.isAdmin)) {
        // Redirect non-approved users to profile page
        toast.error('You need to be an approved student to access payments', {
          duration: 5000,
          id: 'access-denied',
        });
        router.push('/profile');
      } else {
        // Create user metadata to pass to donation component
        setUserMetadata({
          email: user.email || '',
          uid: user.uid || ''
        });
        
        // Log to verify email is being captured
        console.log('User authenticated with email:', user.email);
      }
    }
  }, [user, loading, router]);
  
  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex justify-center items-center">
        <div className="animate-pulse text-lg">Loading...</div>
      </div>
    );
  }
  
  // Don't render anything if not authenticated or not approved - the useEffect will redirect
  if (!user || !userMetadata || !(user.isApproved || user.isStaff || user.isAdmin)) {
    return null;
  }
  
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
              backgroundImage: "url('/images/greenhouse/image (12).jpg')",
              filter: "saturate(1.2)"
            }}
          ></div>
          <div className="absolute inset-0 bg-gradient-to-b from-primary/30 to-primary/10 mix-blend-overlay"></div>
        </div>
        
        <div className="relative z-10 text-center space-y-6 px-4 max-w-4xl mx-auto animate-fade-in">
          <div className="">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-white drop-shadow-lg shadow-black mb-4">
              Be part of the revival of Europe
            </h1>
            <p className="text-xl text-white max-w-2xl mx-auto font-medium drop-shadow-md mb-6">
              &quot;Also I heard the voice of the Lord, saying, Whom shall I send, and who will go for us? Then said I, Here am I; send me.&quot; (Isaiah 6:8)
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 px-4 -mt-2 relative z-20">
        <div className="max-w-3xl mx-auto">
          {/* Pass explicit email and userId to ensure they're used in payment */}
          <div className="bg-white rounded-xl shadow-lg border-green-subtle card-hover-effect p-8">
            <DonateComponent 
              user={user} 
              userEmail={userMetadata.email}
              userId={userMetadata.uid}
            />
          </div>         
        </div>
      </section>     
      {isClient && <Footer />}
    </div>
  );
} 