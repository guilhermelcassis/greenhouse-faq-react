"use client";

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/lib/auth';
import { Menu, X, User, LogOut, LogIn } from 'lucide-react';

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
    <nav className="w-full bg-white border-b-2 border-primary/20 fixed top-0 z-20 bg-[url('/images/pattern-light.png')] bg-repeat">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo - simplified */}
          <Link href="/" className="flex items-center">
            <div className="relative h-9 w-32">
              <Image
                src="/dunamis-logo.png"
                alt="Dunamis Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
          </Link>

          {/* Hamburger Menu (Mobile) - simplified */}
          <div className="flex md:hidden">
            <button
              onClick={toggleMenu}
              className="text-primary hover:text-primary/80 p-2 bg-transparent hover:bg-transparent focus:bg-transparent active:bg-transparent focus:ring-0 focus:outline-none"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {/* Navigation Links (Desktop) - simplified */}
          <div className="hidden md:flex items-center space-x-8">
            <NavLink href="/greenhouse" currentPath={pathname} label="About" />
            <NavLink href="/" currentPath={pathname} label="Ask AI" />
            <NavLink href="/faq" currentPath={pathname} label="FAQ" />
            {user && (user.isApproved || user.isStaff) && (
              <NavLink href="/payments" currentPath={pathname} label="Payment" />
            )}
            {user && user.isAdmin && (
              <NavLink href="/payments/history" currentPath={pathname} label="Payment History" />
            )}
            {user && user.isAdmin && (
              <NavLink href="/payments/failed" currentPath={pathname} label="Failed Payments" />
            )}
            {user && user.isAdmin && (
              <NavLink href="/admin" currentPath={pathname} label="Admin" />
            )}
            {user && user.isAdmin && (
              <NavLink href="/admin/students" currentPath={pathname} label="Students" />
            )}
            <Link 
              href="https://form.respondi.app/hefJH0HK" 
              target="_blank"
              className="px-4 py-1.5 bg-gradient-to-r from-primary to-emerald-500 text-white text-sm rounded-md hover:from-emerald-500 hover:to-primary transition-all duration-300 transform hover:scale-105 shadow-sm hover:shadow"
            >
              Apply Now
            </Link>
          </div>

          {/* Auth and Cart Buttons - Desktop - simplified */}
          <div className="hidden md:flex items-center space-x-3">
            
            {loading ? (
              <div className="h-8 w-8 rounded-full bg-gray-100 animate-pulse"></div>
            ) : user ? (
              <div className="flex items-center space-x-3">
                <Link 
                  href="/profile" 
                  className="px-3 py-1.5 bg-gradient-to-r from-primary to-emerald-500 text-white text-sm rounded-md hover:from-emerald-500 hover:to-primary transition-all duration-300 transform hover:scale-105 shadow-sm hover:shadow flex items-center"
                >
                  <User className="h-4 w-4 mr-1" />
                  {user.displayName?.split(' ')[0] || 'Profile'}
                </Link>
                <button 
                  onClick={handleSignOut} 
                  className="px-3 py-1.5 bg-gradient-to-r from-primary to-emerald-500 text-white text-sm rounded-md hover:from-emerald-500 hover:to-primary transition-all duration-300 transform hover:scale-105 shadow-sm hover:shadow flex items-center"
                >
                  <LogOut className="h-4 w-4 mr-1" />
                  Sign out
                </button>
              </div>
            ) : (
              <>
                <button 
                  onClick={handleSignIn} 
                  className="px-4 py-1.5 bg-gradient-to-r from-primary to-emerald-500 text-white text-sm rounded-md hover:from-emerald-500 hover:to-primary transition-all duration-300 transform hover:scale-105 shadow-sm hover:shadow flex items-center"
                >
                  <LogIn className="h-4 w-4 mr-1" />
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>

        {/* Mobile Menu (Dropdown) - simplified */}
        {isMenuOpen && (
          <div className="sm:hidden bg-white border-t-2 border-primary/30">
            <div className="py-2 space-y-1">
              <NavLink href="/greenhouse" currentPath={pathname} label="About" mobile />
              <NavLink href="/" currentPath={pathname} label="Ask AI" mobile />
              <NavLink href="/faq" currentPath={pathname} label="FAQ" mobile />
              {user && (user.isApproved || user.isStaff) && (
                <NavLink href="/payments" currentPath={pathname} label="Payment" mobile />
              )}
              {user && user.isAdmin && (
                <NavLink href="/payments/history" currentPath={pathname} label="Payment History" mobile />
              )}
              {user && user.isAdmin && (
                <NavLink href="/payments/failed" currentPath={pathname} label="Failed Payments" mobile />
              )}
              {user && user.isAdmin && (
                <NavLink href="/admin" currentPath={pathname} label="Admin" mobile />
              )}
              {user && user.isAdmin && (
                <NavLink href="/admin/students" currentPath={pathname} label="Students" mobile />
              )}
              <Link 
                href="https://form.respondi.app/hefJH0HK" 
                target="_blank"
                className="mx-2 mt-2 px-3 py-1.5 bg-gradient-to-r from-primary to-emerald-500 text-white text-sm rounded-md hover:from-emerald-500 hover:to-primary transition-all duration-300 transform hover:scale-105 shadow-sm hover:shadow inline-block"
              >
                Apply Now
              </Link>              
              {user ? (
                <div className="pt-2 mt-2 border-t-2 border-primary/30">
                  <Link 
                    href="/profile" 
                    className="mx-2 px-3 py-1.5 bg-gradient-to-r from-primary to-emerald-500 text-white text-sm rounded-md hover:from-emerald-500 hover:to-primary transition-all duration-300 inline-flex items-center"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <User className="h-4 w-4 mr-1" />
                    Profile
                  </Link>
                  <div className="mt-2 mx-2">
                    <button 
                      onClick={handleSignOut} 
                      className="px-3 py-1.5 bg-gradient-to-r from-primary to-emerald-500 text-white text-sm rounded-md hover:from-emerald-500 hover:to-primary transition-all duration-300 transform hover:scale-105 shadow-sm hover:shadow inline-flex items-center"
                    >
                      <LogOut className="h-4 w-4 mr-1" />
                      Sign out
                    </button>
                  </div>
                </div>
              ) : (
                <div className="pt-2 mt-2 border-t-2 border-primary/30">
                  <div className="mx-2">
                    <button 
                      onClick={handleSignIn} 
                      className="px-3 py-1.5 bg-gradient-to-r from-primary to-emerald-500 text-white text-sm rounded-md hover:from-emerald-500 hover:to-primary transition-all duration-300 transform hover:scale-105 shadow-sm hover:shadow inline-flex items-center"
                    >
                      <LogIn className="h-4 w-4 mr-1" />
                      Sign in
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

// Helper component for navigation links - simplified
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
  
  if (mobile) {
    return (
      <Link
        href={href}
        className={`
          block px-3 py-1.5 mx-2 rounded-md text-sm transition-all duration-300
          ${isActive 
            ? 'bg-gradient-to-r from-primary/20 to-primary/5 text-primary font-medium' 
            : 'text-gray-600 hover:text-primary hover:bg-gradient-to-r hover:from-primary/10 hover:to-transparent'
          }
        `}
      >
        {label}
      </Link>
    );
  }
  
  return (
    <Link
      href={href}
      className={`
        relative py-1 text-sm transition-all duration-300 hover:scale-105
        ${isActive 
          ? 'text-primary font-medium' 
          : 'text-gray-600 hover:text-primary'
        }
      `}
    >
      {label}
      {isActive && <span className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-emerald-500 rounded-t-md"></span>}
    </Link>
  );
}