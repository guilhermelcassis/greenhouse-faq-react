"use client";

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/lib/auth';
import { Menu, X, User, LogOut, LogIn, ShoppingCart } from 'lucide-react';
import { ExtendedUser } from '@/lib/auth';

export default function Navbar() {
  const { user, loading, signOut } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  
  const handleSignIn = () => {
    router.push('/login');
    setIsMenuOpen(false);
  };
  
  const handleSignOut = async () => {
    await signOut();
    setIsMenuOpen(false);
  };

  return (
    <nav className="w-full bg-white shadow-md fixed top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <div className="relative h-10 w-36">
              <Image
                src="/dunamis-logo.png"
                alt="Dunamis Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
          </Link>

          {/* Hamburger Menu (Mobile) */}
          <div className="flex md:hidden">
            <button
              onClick={toggleMenu}
              className="text-primary focus:outline-none"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {/* Navigation Links (Desktop) */}
          <div className="hidden md:flex items-center space-x-8">
            <NavLink href="/greenhouse" currentPath={pathname} label="About" />
            <NavLink href="/" currentPath={pathname} label="Ask AI" />
            <NavLink href="/faq" currentPath={pathname} label="FAQ" />
            {user && (
              <NavLink href="/donate" currentPath={pathname} label="Payment" />
            )}
            {user && user.isAdmin && (
              <NavLink href="/payments/history" currentPath={pathname} label="Payment History" />
            )}
            <Link 
              href="https://form.respondi.app/hefJH0HK" 
              target="_blank"
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
            >
              Apply Now
            </Link>
          </div>

          {/* Auth and Cart Buttons - Desktop */}
          <div className="hidden md:flex items-center space-x-4">
            
            {loading ? (
              <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse"></div>
            ) : user ? (
              <div className="flex items-center space-x-3">
                <Link 
                  href="/profile" 
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors flex items-center"
                >
                  <User className="h-5 w-5 mr-2" />
                  {user.displayName?.split(' ')[0] || 'Profile'}
                </Link>
                <button 
                  onClick={handleSignOut} 
                  className="px-4 py-2 border border-primary text-white rounded-md hover:bg-primary/90 transition-colors flex items-center"
                >
                  <LogOut className="h-5 w-5 mr-2" />
                  Sign out
                </button>
              </div>
            ) : (
              <>
                <button 
                  onClick={handleSignIn} 
                  className="px-4 py-2 border border-primary text-white rounded-md hover:bg-primary/90 transition-colors flex items-center"
                >
                  <LogIn className="h-5 w-5 mr-1" />
                  Sign in
                </button>
                <Link 
                  href="/register"
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Mobile Menu (Dropdown) */}
        {isMenuOpen && (
          <div className="sm:hidden">
            <div className="pt-2 pb-3 space-y-1">
              <NavLink href="/greenhouse" currentPath={pathname} label="About" mobile />
              <NavLink href="/" currentPath={pathname} label="Ask AI" mobile />
              <NavLink href="/faq" currentPath={pathname} label="FAQ" mobile />
              {user && (
                <NavLink href="/donate" currentPath={pathname} label="Payment" mobile />
              )}
              {user && user.isAdmin && (
                <NavLink href="/payments/history" currentPath={pathname} label="Payment History" mobile />
              )}
              <Link 
                href="https://form.respondi.app/hefJH0HK" 
                target="_blank"
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors inline-block"
              >
                Apply Now
              </Link>              
              {user ? (
                <div className="space-y-2 mt-2">
                  <Link 
                    href="/profile" 
                    className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors inline-flex items-center"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <User className="h-5 w-5 mr-2" />
                    Profile
                  </Link>
                  <div className="block">
                    <button 
                      onClick={handleSignOut} 
                      className="px-4 py-2 border border-primary text-white rounded-md hover:bg-primary/90 transition-colors inline-flex items-center"
                    >
                      <LogOut className="h-5 w-5 mr-2" />
                      Sign out
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button 
                    onClick={handleSignIn} 
                    className="px-4 py-2 border border-primary text-primary rounded-md hover:bg-primary hover:text-white transition-colors inline-flex items-center mt-2"
                  >
                    <LogIn className="h-5 w-5 mr-1" />
                    Sign in
                  </button>
                  <Link 
                    href="/register"
                    className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors inline-block mt-2"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

// Helper component for navigation links
function NavLink({ 
  href, 
  currentPath, 
  label,
  mobile = false
}: { 
  href: string; 
  currentPath: string; 
  label: string;
  mobile?: boolean;
}) {
  const isActive = href === currentPath;
  
  return (
    <Link
      href={href}
      className={`
        ${mobile ? 'block px-2' : ''}
        ${isActive 
          ? 'text-primary font-medium' 
          : 'text-gray-600 hover:text-primary'
        }
        transition-colors font-medium
      `}
    >
      {label}
    </Link>
  );
}