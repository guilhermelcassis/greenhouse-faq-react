'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import DonateComponent from '@/components/Donate';

export default function DonatePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [userMetadata, setUserMetadata] = useState<{ email: string; uid: string } | null>(null);
  
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
      {/* Hero Section with gradient background */}
      <section className="relative h-[40vh] flex items-center justify-center bg-green-gradient-radial">
        <div className="relative text-center space-y-6 px-4 max-w-4xl mx-auto animate-fade-in">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-gradient-green">
            Be part of the revival of Europe
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          &quot;Also I heard the voice of the Lord, saying, Whom shall I send, and who will go for us? Then said I, Here am I; send me.&quot; (Isaiah 6:8)
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Pass explicit email and userId to ensure they're used in payment */}
          <DonateComponent 
            user={user} 
            userEmail={userMetadata.email}
            userId={userMetadata.uid}
          />          
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-green-pattern-light">
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
              <div key={index} className="bg-white p-6 rounded-xl shadow-md border-green-subtle card-hover-effect">
                <div className="text-4xl mb-4 text-primary">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
} 