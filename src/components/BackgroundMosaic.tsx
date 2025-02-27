"use client";

import { useEffect, useState, useRef } from 'react';
import OptimizedImage from './OptimizedImage';

interface MosaicImage {
  src: string;
  alt: string;
  width?: number;
  height?: number;
}

interface BackgroundMosaicProps {
  images: MosaicImage[];
  opacity?: number;
  blur?: number;
  className?: string;
  limit?: number;
  animated?: boolean;
}

export default function BackgroundMosaic({ 
  images, 
  opacity = 0.1, 
  blur = 2,
  className = "",
  limit = 20,
  animated = true
}: BackgroundMosaicProps) {
  const [shuffledImages, setShuffledImages] = useState<MosaicImage[]>([]);
  const animationRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Shuffle the images array and limit the number
    const shuffled = [...images]
      .sort(() => Math.random() - 0.5)
      .slice(0, limit);
    setShuffledImages(shuffled);
  }, [images, limit]);

  useEffect(() => {
    if (!animated || !containerRef.current) return;

    let startTime: number;
    const duration = 60000; // 60 seconds for a full cycle

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = (elapsed % duration) / duration;
      
      if (containerRef.current) {
        containerRef.current.style.transform = `translateY(${progress * -10}%) translateX(${Math.sin(progress * Math.PI * 2) * 5}%)`;
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animated]);

  if (!shuffledImages.length) return null;

  return (
    <div className={`absolute inset-0 -z-10 overflow-hidden ${className}`}>
      <div 
        ref={containerRef}
        className="absolute inset-0 grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-6"
        style={{ 
          opacity, 
          filter: `blur(${blur}px)`,
          transition: 'transform 10s ease-in-out'
        }}
      >
        {shuffledImages.map((image, index) => (
          <div 
            key={index} 
            className="relative aspect-square overflow-hidden rounded-lg"
            style={{ 
              transform: `rotate(${Math.random() * 6 - 3}deg) scale(${0.85 + Math.random() * 0.3})`,
              transformOrigin: 'center',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
            }}
          >
            <OptimizedImage
              src={image.src}
              alt={image.alt}
              fill
              objectFit="cover"
              className="relative h-full w-full"
            />
          </div>
        ))}
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background/80 to-background/95" />
    </div>
  );
} 