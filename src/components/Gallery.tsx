"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';

// Completely static image paths - no randomness at all
const GREENHOUSE_IMAGES = [9, 1, 8, 13, 33, 6, 7, 25, 37, 38, 44, 11, 27, 29, 16, 3];
const MISSION_IMAGES = [4, 1, 10, 7, 2, 5, 8, 6, 9, 3];

export default function Gallery() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) {
    return <div className="min-h-[300px] flex items-center justify-center">
      <p className="text-gray-500">Loading gallery...</p>
    </div>;
  }
  
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {GREENHOUSE_IMAGES.map((imageNum, index) => (
          <div key={`greenhouse-${index}`} className="relative h-64">
            <Image
              src={`/images/greenhouse/image (${imageNum}).jpg`}
              alt={`Greenhouse event image ${imageNum}`}
              fill
              className="object-cover rounded-lg"
            />
          </div>
        ))}
      </div>
      
      <h2 className="text-2xl font-bold mb-4">Mission Trip</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {MISSION_IMAGES.map((imageNum, index) => (
          <div key={`mission-${index}`} className="relative h-64">
            <Image
              src={`/images/mission-trip/mt (${imageNum}).jpg`}
              alt={`Mission trip image ${imageNum}`}
              fill
              className="object-cover rounded-lg"
            />
          </div>
        ))}
      </div>
    </>
  );
} 