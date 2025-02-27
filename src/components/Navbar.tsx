"use client";

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

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
              onClick={() => setIsOpen(!isOpen)}
              className="text-primary focus:outline-none"
              aria-label="Toggle menu"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d={isOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16m-7 6h7"}
                />
              </svg>
            </button>
          </div>

          {/* Navigation Links (Desktop) */}
          <div className="hidden md:flex items-center space-x-8">
            <NavLink href="/greenhouse" currentPath={pathname} label="About" />
            <NavLink href="/" currentPath={pathname} label="Ask AI" />
            <NavLink href="/faq" currentPath={pathname} label="FAQ" />
            <Link 
              href="https://form.respondi.app/hefJH0HK" 
              target="_blank"
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
            >
              Apply Now
            </Link>
          </div>
        </div>

        {/* Mobile Menu (Dropdown) */}
        {isOpen && (
          <div className="md:hidden py-4 border-t border-gray-100">
            <div className="flex flex-col space-y-4">
              <NavLink href="/greenhouse" currentPath={pathname} label="About" mobile />
              <NavLink href="/" currentPath={pathname} label="Ask AI" mobile />
              <NavLink href="/faq" currentPath={pathname} label="FAQ" mobile />
              <Link 
                href="https://form.respondi.app/hefJH0HK" 
                target="_blank"
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors inline-block"
              >
                Apply Now
              </Link>
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