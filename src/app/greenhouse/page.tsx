// src/app/greenhouse/page.tsx
import Link from 'next/link';
import Image from 'next/image';
import React from 'react';

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
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center bg-gradient-to-b from-primary/20 to-background">
        <div className="absolute inset-0 bg-[url('/images/greenhouse-hero.jpg')] bg-cover bg-center -z-10" />
        
        <div className="relative text-center space-y-8 px-4">
          <div className="space-y-4">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-[#4A7F68]">
              Greenhouse Europe 2025
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
              Transformative 10-day immersion in spiritual leadership and supernatural activation
            </p>
          </div>
          
          <Link 
            href="https://form.respondi.app/hefJH0HK" 
            target="_blank"
            className="inline-flex items-center justify-center h-14 px-8 text-lg bg-primary hover:bg-primary/90 text-white rounded-md font-medium transition-colors"
          >
            Apply Now
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1"><path d="m9 18 6-6-6-6"/></svg>
          </Link>
        </div>
      </section>

      {/* About Section */}
      <section className="py-24 px-4 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="space-y-2">
              <span className="text-sm font-semibold text-primary">About the Program</span>
              <h2 className="text-4xl font-bold tracking-tight">Spiritual Leadership Development</h2>
            </div>
            
            <div className="space-y-4 text-lg text-muted-foreground">
              <p>
              Greenhouse is the Dunamis Movement's school of revival and transformation. 
              It offers an immersive experience focused on leadership development and the activation of the supernatural gifts of the Holy Spirit.
              </p>
              <p>
              The program aims to equip students to influence and impact various spheres of society with the power and radical love of Jesus. 
              Students are encouraged to live out the Great Commission and carry the message of Christ to all nations.
              </p>
            </div>
          </div>

          <div className="relative aspect-video rounded-2xl overflow-hidden shadow-xl">
            <Image
              src="/images/greenhouse-about.jpg"
              alt="Greenhouse participants"
              className="object-cover"
              fill
            />
          </div>
        </div>
      </section>

      {/* Details Section */}
      <section className="bg-primary/5 py-24">
        <div className="max-w-7xl mx-auto px-4 space-y-16">
          <div className="text-center space-y-4">
            <span className="text-sm font-semibold text-primary">Program Details</span>
            <h2 className="text-4xl font-bold tracking-tight">Key Information</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: "Date", content: "July 9-19, 2025" },
              { title: "Location", content: "Palermo, Italy" },
              { title: "Investment", content: "€850 (All Inclusive)" }
            ].map((item, index) => (
              <div key={index} className="rounded-xl border bg-card text-card-foreground shadow hover:shadow-lg transition-shadow">
                <div className="flex flex-col space-y-1.5 p-6">
                  <h3 className="text-2xl font-semibold text-primary">{item.title}</h3>
                </div>
                <div className="p-6 pt-0">
                  <p className="text-lg text-muted-foreground">{item.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 px-4 max-w-7xl mx-auto">
        <div className="space-y-16">
          <div className="text-center space-y-4">
            <span className="text-sm font-semibold text-primary">Testimonials</span>
            <h2 className="text-4xl font-bold tracking-tight">Transformative Experiences</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="rounded-xl border bg-card text-card-foreground shadow group hover:shadow-lg transition-shadow">
                <div className="p-8 space-y-6">
                  <p className="text-lg text-muted-foreground italic">
                    {testimonial.text}
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="relative h-12 w-12 rounded-full overflow-hidden">
                      <Image
                        src={testimonial.image}
                        alt={testimonial.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <p className="font-semibold">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-primary to-[#4A7F68] py-24">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-4xl font-bold tracking-tight text-white">
              Ready for Transformation?
            </h2>
            <p className="text-xl text-white/90">
              Limited spots available for this life-changing experience
            </p>
          </div>
          
          <Link 
            href="https://form.respondi.app/hefJH0HK" 
            target="_blank"
            className="inline-flex items-center justify-center h-14 px-8 text-lg bg-white text-primary hover:bg-white/90 rounded-md font-medium transition-colors"
          >
            Secure Your Spot
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1"><path d="m9 18 6-6-6-6"/></svg>
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