"use client";

// src/app/greenhouse/page.tsx
import Link from 'next/link';
import Image from 'next/image';
import React, { useState, useEffect } from 'react';
import { featuredGreenhouseImages, featuredMissionImages } from '@/data/greenhouseImages';
import { Footer } from '@/components/Footer';

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
    text: "The teachings and community at Greenhouse are amazing. I highly recommend it!",
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
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

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

  const greenhouseImagesToShow = featuredGreenhouseImages.slice(0, 16);
  const missionImagesToShow = featuredMissionImages.slice(0, 16);

  return (
    <div className="min-h-screen bg-background">
      {/* Modal */}
      {selectedImage && <ImageModal image={selectedImage} onClose={closeModal} />}

      {/* Hero Section */}
      <section className="relative h-[70vh] flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-black/50 z-10"></div>
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: "url('/images/greenhouse/image (15).jpg')",
              filter: "saturate(1.2)"
            }}
          ></div>
          <div className="absolute inset-0 bg-gradient-to-b from-primary/30 to-primary/10 mix-blend-overlay"></div>
        </div>
        
        <div className="relative z-10 text-center space-y-6 px-4 max-w-4xl mx-auto animate-fade-in">
          <div className="">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-white drop-shadow-lg shadow-black mb-4">
              Dunamis Greenhouse 2025
            </h1>
            <p className="text-xl text-white max-w-2xl mx-auto font-medium drop-shadow-md mb-6">
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
        </div>
      </section>

      {/* Details Section */}
      <section className="py-20 px-4 bg-white relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/5 rounded-full -ml-32 -mb-32"></div>
        
        <div className="max-w-7xl mx-auto space-y-16 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-emerald-500 inline-block">Key Information</h2>
            <div className="w-24 h-1 bg-gradient-to-r from-primary to-emerald-500 mx-auto mt-4"></div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: "Date", content: "July 9-19, 2025", icon: "📅" },
              { title: "Location", content: "Palermo, Italy", icon: "📍" },
              { title: "Investment", content: "€850 (All Inclusive)", icon: "💰" }
            ].map((item, index) => (
              <div key={index} className="rounded-xl bg-white text-card-foreground shadow-lg border border-primary/10 hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 overflow-hidden group">
                <div className="flex flex-col items-center p-8 relative">
                  <div className="text-3xl mb-4">{item.icon}</div>
                  <h3 className="text-2xl font-semibold text-primary mb-2">{item.title}</h3>
                  <p className="text-xl text-muted-foreground text-center">{item.content}</p>
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-primary/0 via-primary/50 to-primary/0 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="relative py-24 overflow-hidden bg-gradient-to-b from-white to-primary/5">
        {/* Background Elements */}
        <div className="absolute inset-0 z-0 opacity-5">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary rounded-full -mr-48 -mt-48"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary rounded-full -ml-48 -mb-48"></div>
        </div>
        
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          {/* Semi-transparent color overlay */}
          <div className="absolute inset-0 bg-primary/5 dark:bg-primary/10 mix-blend-multiply z-10"></div>
          
          {/* Image */}
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-70 dark:opacity-10"
            style={{
              backgroundImage: "url('/images/greenhouse/image (1).jpg')",
              filter: "saturate(0.7) brightness(1.1)",
              mixBlendMode: "soft-light"
            }}
          ></div>
          
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-white/90 dark:from-slate-900/40 dark:to-slate-900/90 z-20"></div>
        </div>
        
        {/* Content Container */}
        <div className="relative z-10 container mx-auto px-4">
          {/* Section Header */}
          <div className="max-w-2xl mx-auto text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary to-emerald-500">What to Expect</h2>
            <div className="w-24 h-1 bg-gradient-to-r from-primary to-emerald-500 mx-auto mb-6"></div>
            <p className="text-xl text-slate-600 dark:text-slate-300">Our immersive program is built on three foundational pillars</p>
          </div>
          
          {/* Cards Container - Full width on all screens */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
            {/* Card 1 - COMMUNITY */}
            <div className="group relative overflow-hidden bg-white dark:bg-slate-800/50 backdrop-blur-sm p-8 md:p-10 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 border border-slate-200/50 dark:border-slate-700/50 hover:border-primary/30 dark:hover:border-primary/30 hover:-translate-y-2">                  
              {/* Card Content */}
              <div className="relative z-10">
                <div className="flex items-center mb-6">
                  <div className="w-16 h-16 flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl text-primary group-hover:from-primary/30 group-hover:to-primary/20 transition-colors duration-300 mr-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-primary dark:text-primary group-hover:text-primary transition-colors duration-300 flex items-center">COMMUNITY</h3>
                </div>
                <p className="text-lg text-slate-600 dark:text-slate-300 group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-colors duration-300 leading-relaxed">
                  We have students from all over the world. Connection is one of the main pillars of our school.
                </p>
              </div>
            </div>
            
            {/* Card 2 - CONTENT */}
            <div className="group relative overflow-hidden bg-white dark:bg-slate-800/50 backdrop-blur-sm p-8 md:p-10 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 border border-slate-200/50 dark:border-slate-700/50 hover:border-primary/30 dark:hover:border-primary/30 hover:-translate-y-2">                 
              {/* Card Content */}
              <div className="relative z-10">
                <div className="flex items-center mb-6">
                  <div className="w-16 h-16 flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl text-primary group-hover:from-primary/30 group-hover:to-primary/20 transition-colors duration-300 mr-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-primary dark:text-primary group-hover:text-primary transition-colors duration-300 flex items-center">CONTENT</h3>
                </div>
                <p className="text-lg text-slate-600 dark:text-slate-300 group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-colors duration-300 leading-relaxed">
                  More than 20 classes with teachers from Dunamis and guest speakers.
                </p>
              </div>
            </div>
            
            {/* Card 3 - POWERMENT */}
            <div className="group relative overflow-hidden bg-white dark:bg-slate-800/50 backdrop-blur-sm p-8 md:p-10 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 border border-slate-200/50 dark:border-slate-700/50 hover:border-primary/30 dark:hover:border-primary/30 hover:-translate-y-2">
              {/* Card Content */}
              <div className="relative z-10">
                <div className="flex items-center mb-6">
                  <div className="w-16 h-16 flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl text-primary group-hover:from-primary/30 group-hover:to-primary/20 transition-colors duration-300 mr-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-primary dark:text-primary group-hover:text-primary transition-colors duration-300 flex items-center">EMPOWERMENT</h3>
                </div>
                <p className="text-lg text-slate-600 dark:text-slate-300 group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-colors duration-300 leading-relaxed">
                  Specific classes for each sphere of society with leaders who are already established in these areas.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <div className="max-w-7xl mx-auto space-y-16 mt-14 mb-16 px-4">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-emerald-500 inline-block">Enrollment Process</h2>
              <div className="w-24 h-1 bg-gradient-to-r from-primary to-emerald-500 mx-auto mt-4"></div>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                { title: "Step 1", content: "Submit your Application", icon: "📝" },
                { title: "Step 2", content: "Schedule a call with our team", icon: "📞" },
                { title: "Step 3", content: "After approval, register", icon: "✅" }
              ].map((item, index) => (
                <div key={index} className="rounded-xl bg-white text-card-foreground shadow-lg border border-primary/10 hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 overflow-hidden group">
                  <div className="flex flex-col items-center p-8 relative">
                    <div className="text-3xl mb-4">{item.icon}</div>
                    <h3 className="text-2xl font-semibold text-primary mb-2">{item.title}</h3>
                    <p className="text-xl text-muted-foreground text-center">{item.content}</p>
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-primary/0 via-primary/50 to-primary/0 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>


      {/* Testimonials Section */}
      <section className="py-14 px-4 bg-white relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 bg-primary/5 opacity-30"></div>

        <div className="relative z-10 max-w-7xl mx-auto space-y-12">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-emerald-500 inline-block">Testimonials</h2>
            <div className="w-24 h-1 bg-gradient-to-r from-primary to-emerald-500 mx-auto mt-4"></div>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white p-8 rounded-xl shadow-lg border border-primary/10 hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 group">
                        <p className="text-slate-600 italic mb-6 text-lg">{testimonial.text}</p>
                <div className="flex items-center space-x-4">
                  <div className="relative w-14 h-14 rounded-full overflow-hidden ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all duration-300">
                    <Image 
                      src={testimonial.image} 
                      alt={testimonial.name} 
                      fill 
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="font-semibold text-primary">{testimonial.name}</h4>
                    <p className="text-sm text-slate-500">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* Gallery Section */}
      <section className="py-20 bg-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-white to-primary/5"></div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 space-y-20">
          {/* Greenhouse Gallery */}
          <div className="space-y-12">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-emerald-500 inline-block">Photo Gallery</h2>
              <div className="w-24 h-1 bg-gradient-to-r from-primary to-emerald-500 mx-auto mt-4"></div>
            </div>
            
            {isClient && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {greenhouseImagesToShow.map((image, index) => (
                  <div 
                    key={index} 
                    className="relative aspect-square rounded-lg overflow-hidden shadow-lg border border-primary/10 hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 cursor-pointer group"
                    onClick={() => openModal(image)}
                  >
                    <Image
                      src={image.src}
                      alt={image.alt || `Greenhouse image ${index + 1}`}
                      fill
                      className="object-cover transition-transform group-hover:scale-110 duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end">
                      <div className="p-4 w-full text-white text-center">
                        <span className="inline-flex items-center text-sm">
                          View Image
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                            <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                          </svg>
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Mission Trips Gallery */}
          <div className="space-y-12">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-emerald-500 inline-block">Mission Trips</h2>
              <div className="w-24 h-1 bg-gradient-to-r from-primary to-emerald-500 mx-auto mt-4"></div>
            </div>
            
            {isClient && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {missionImagesToShow.map((image, index) => (
                  <div 
                    key={index} 
                    className="relative aspect-square rounded-lg overflow-hidden shadow-lg border border-primary/10 hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 cursor-pointer group"
                    onClick={() => openModal(image)}
                  >
                    <Image
                      src={image.src}
                      alt={image.alt || `Mission trip image ${index + 1}`}
                      fill
                      className="object-cover transition-transform group-hover:scale-110 duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end">
                      <div className="p-4 w-full text-white text-center">
                        <span className="inline-flex items-center text-sm">
                          View Image
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                            <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                          </svg>
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Core Values Section */}
      <section className="py-20 px-4 bg-white relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 bg-gradient-to-b from-white to-primary/5"></div>
        <div className="relative z-10 max-w-6xl mx-auto text-center">
          <div className="mb-16">
            <h2 className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-emerald-500 inline-block">Core Values</h2>
            <div className="w-24 h-1 bg-gradient-to-r from-primary to-emerald-500 mx-auto mt-4"></div>
          </div>
          
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
              <div key={index} className="bg-white p-8 rounded-xl shadow-lg border border-primary/10 hover:border-primary/30 transition-all duration-300 hover:-translate-y-2 group">
                <div className="text-5xl mb-6 text-primary w-20 h-20 flex items-center justify-center rounded-full mx-auto group-hover:bg-primary/20 transition-colors duration-300">{feature.icon}</div>
                <h3 className="text-2xl font-semibold mb-4 text-primary">{feature.title}</h3>
                <p className="text-slate-600 text-lg">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}