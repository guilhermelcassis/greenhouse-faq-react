"use client";

// src/app/greenhouse/page.tsx
import Link from 'next/link';
import Image from 'next/image';
import React, { useState } from 'react';
import { featuredGreenhouseImages, featuredMissionImages } from '@/data/greenhouseImages';

// Image Modal Component
function ImageModal({ image, onClose }: { image: { src: string; alt?: string }; onClose: () => void }) {
  return (
    <div 
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="relative max-w-4xl max-h-[90vh] w-full">
        <button 
          onClick={onClose}
          className="absolute -top-12 right-0 text-white bg-transparent hover:bg-white/10 rounded-full p-2"
          aria-label="Close modal"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <div className="relative w-full h-[80vh]">
          <Image
            src={image.src}
            alt={image.alt || "Gallery image"}
            fill
            className="object-contain"
            sizes="(max-width: 768px) 100vw, 80vw"
          />
        </div>
      </div>
    </div>
  );
}

const testimonials = [
  {
    name: "Guilherme Assis",
    role: "Alumni 2017",
    text: "Greenhouse was a life-changing experience. I grew so much in my faith and leadership skills!",
    image: "/images/avatar1.jpg"
  },
  {
    name: "Eddie Nunes",
    role: "Ministry Leader",
    text: "The teachings and community at Greenhouse are unparalleled. I highly recommend it!",
    image: "/images/avatar2.jpg"
  },
  {
    name: "João Hudson",
    role: "Missionary",
    text: "I experienced the Holy Spirit in a powerful way. This school is a must for every believer.",
    image: "/images/avatar3.jpg"
  }
];

export default function GreenhousePage() {
  const [selectedImage, setSelectedImage] = useState<{ src: string; alt?: string } | null>(null);

  const openModal = (image: { src: string; alt?: string }) => {
    setSelectedImage(image);
    // Prevent body scrolling when modal is open
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    setSelectedImage(null);
    // Restore body scrolling
    document.body.style.overflow = 'auto';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Modal */}
      {selectedImage && <ImageModal image={selectedImage} onClose={closeModal} />}

      {/* Hero Section - Styled like main page */}
      <section className="relative h-[60vh] flex items-center justify-center bg-green-gradient-radial">
        <div className="relative text-center space-y-6 px-4 max-w-4xl mx-auto animate-fade-in">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-gradient-green">
            Greenhouse 2025
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A 10-day immersive program focused on spiritual leadership development and supernatural activation
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <Link 
              href="https://form.respondi.app/hefJH0HK" 
              target="_blank"
              className="inline-flex items-center justify-center h-12 px-6 text-lg bg-primary text-white hover:bg-primary/90 rounded-md font-medium transition-colors card-hover-effect"
            >
              Apply Now
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-2 h-5 w-5"><path d="m9 18 6-6-6-6"/></svg>
            </Link>
            <Link 
              href="/faq" 
              className="inline-flex items-center justify-center h-12 px-6 text-lg bg-white text-primary hover:bg-secondary rounded-md font-medium transition-colors border-green-subtle card-hover-effect"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Details Section */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <span className="text-sm font-semibold text-primary">Program Details</span>
            <h2 className="text-4xl font-bold tracking-tight text-gradient-green">Key Information</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: "Date", content: "July 9-19, 2025" },
              { title: "Location", content: "Palermo, Italy" },
              { title: "Investment", content: "€850 (All Inclusive)" }
            ].map((item, index) => (
              <div key={index} className="rounded-xl bg-white text-card-foreground shadow-md border-green-subtle card-hover-effect">
                <div className="flex flex-col space-y-1.5 p-6">
                  <h3 className="text-2xl font-semibold text-primary">{item.title}</h3>
                  <p className="text-xl text-muted-foreground">{item.content}</p>
                </div>
              </div>
            ))}
          </div>
          
          {/* About Section */}
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <span className="text-sm font-semibold text-primary">About Greenhouse</span>
              <h3 className="text-3xl font-bold tracking-tight">What to Expect</h3>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  Greenhouse is a 10-day immersive program designed to equip and empower the next generation of leaders. 
                  Through powerful teaching, practical activation, and community living, participants experience 
                  transformational growth in their spiritual lives and leadership abilities.
                </p>
                <p>
                  The program includes daily worship, teaching sessions, small group discussions, 
                  activation exercises, and evening services. There will also be time for personal 
                  reflection, community building, and exploring the beautiful surroundings of Sicily.
                </p>
              </div>
            </div>
            <div className="rounded-xl overflow-hidden shadow-lg">
              <Image 
                src="/images/greenhouse/image (1).jpg" 
                alt="Greenhouse participants" 
                width={600} 
                height={400} 
                className="w-full h-auto object-cover"
              />
            </div>
          </div>
          
          {/* Testimonials */}
          <div className="space-y-8">
            <div className="text-center">
              <span className="text-sm font-semibold text-primary">Testimonials</span>
              <h3 className="text-3xl font-bold tracking-tight text-gradient-green">What Alumni Say</h3>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {testimonials.map((testimonial, index) => (
                <div key={index} className="bg-white p-6 rounded-xl shadow-md border-green-subtle card-hover-effect">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="relative w-12 h-12 rounded-full overflow-hidden">
                      <Image 
                        src={testimonial.image} 
                        alt={testimonial.name} 
                        fill 
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <h4 className="font-semibold">{testimonial.name}</h4>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                  <p className="text-muted-foreground italic">{testimonial.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <section className="py-16 bg-green-pattern-light">
        <div className="max-w-7xl mx-auto px-4 space-y-16">
          {/* Greenhouse Gallery */}
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <span className="text-sm font-semibold text-primary">Photo Gallery</span>
              <h2 className="text-4xl font-bold tracking-tight text-gradient-green">Moments from Previous Editions</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Browse through our gallery to see the Greenhouse experience (click to enlarge)
              </p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {featuredGreenhouseImages.slice(0, 16).map((image, index) => (
                <div 
                  key={index} 
                  className="relative aspect-square rounded-lg overflow-hidden shadow-md border-green-subtle card-hover-effect cursor-pointer"
                  onClick={() => openModal(image)}
                >
                  <Image
                    src={image.src}
                    alt={image.alt || `Greenhouse image ${index + 1}`}
                    fill
                    className="object-cover transition-transform hover:scale-105"
                  />
                </div>
              ))}
            </div>
          </div>
          
          {/* Mission Trips Gallery - Now matching the same layout */}
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <span className="text-sm font-semibold text-primary">Mission Trips</span>
              <h2 className="text-4xl font-bold tracking-tight text-gradient-green">Impact Around the World</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                See how our graduates are making a difference globally (click to enlarge)
              </p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {featuredMissionImages.slice(0, 16).map((image, index) => (
                <div 
                  key={index} 
                  className="relative aspect-square rounded-lg overflow-hidden shadow-md border-green-subtle card-hover-effect cursor-pointer"
                  onClick={() => openModal(image)}
                >
                  <Image
                    src={image.src}
                    alt={image.alt || `Mission trip image ${index + 1}`}
                    fill
                    className="object-cover transition-transform hover:scale-105"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-6">
          <h2 className="text-3xl font-bold text-white">
            Ready to Apply?
          </h2>
          <p className="text-xl text-white/90">
            Limited spots available for this life-changing experience
          </p>
          
          <Link 
            href="https://form.respondi.app/hefJH0HK" 
            target="_blank"
            className="inline-flex items-center justify-center h-14 px-8 text-lg bg-white text-primary hover:bg-white/90 rounded-md font-medium transition-colors card-hover-effect"
          >
            Secure Your Spot
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-2 h-5 w-5"><path d="m9 18 6-6-6-6"/></svg>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-primary/10 py-12">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2025 Dunamis Greenhouse. All rights reserved.</p>
          <p className="mt-2">Via SS 113 Settentrionale Sicula, 90047 Partinico PA, Italy</p>
        </div>
      </footer>
    </div>
  );
}