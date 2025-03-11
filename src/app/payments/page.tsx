'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import DonateComponent from '@/components/Donate';
import { Footer } from '@/components/Footer';

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
        router.push('/login?callbackUrl=/donate');
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
  
  // Don't render anything if not authenticated - the useEffect will redirect
  if (!user || !userMetadata) {
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
              backgroundImage: "url('/images/gh2/image (3).jpg')",
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

      {/* Features Section */}
      <section className="py-16 bg-green-pattern-light relative z-10">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-12 text-gradient-green">Dunamis Greenhouse 2025</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Revival",
                description: "The revival of the Church is the revival of Europe. God is calling for revivalists.",
                icon: "🔥"
              },
              {
                title: "Reformation",
                description: "We believe in the power of revival and transformation. Spread the Gospel of Kingdom of God.",
                icon: "📖"
              },
              {
                title: "Supernatural",
                description: "The gifts of the Holy Spirit are for today. Let's see them manifested in our generation.",
                icon: "💥"
              }
            ].map((feature, index) => (
              <div key={index} className="bg-white p-6 rounded-xl shadow-lg border-green-subtle card-hover-effect transform transition-all duration-300 hover:-translate-y-1">
                <div className="text-4xl mb-4 text-primary">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {isClient && <Footer />}
    </div>
  );
} 