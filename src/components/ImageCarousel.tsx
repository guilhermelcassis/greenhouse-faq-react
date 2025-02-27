"use client";

import { useState, useEffect, useCallback } from 'react';
import OptimizedImage from './OptimizedImage';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CarouselImage {
  src: string;
  alt: string;
  width: number;
  height: number;
}

interface ImageCarouselProps {
  images: CarouselImage[];
  autoplay?: boolean;
  interval?: number;
  className?: string;
  shuffle?: boolean;
}

export default function ImageCarousel({ 
  images, 
  autoplay = true, 
  interval = 5000,
  className = "",
  shuffle = true
}: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const [shuffledImages, setShuffledImages] = useState<CarouselImage[]>([]);

  // Shuffle images on component mount
  useEffect(() => {
    if (shuffle) {
      const shuffled = [...images].sort(() => Math.random() - 0.5);
      setShuffledImages(shuffled);
    } else {
      setShuffledImages(images);
    }
  }, [images, shuffle]);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex === shuffledImages.length - 1 ? 0 : prevIndex + 1));
  }, [shuffledImages.length]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex === 0 ? shuffledImages.length - 1 : prevIndex - 1));
  }, [shuffledImages.length]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  useEffect(() => {
    if (autoplay && !isHovering) {
      const timer = setTimeout(nextSlide, interval);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, autoplay, interval, nextSlide, isHovering]);

  if (!shuffledImages.length) return null;

  return (
    <div 
      className={`relative overflow-hidden rounded-xl shadow-xl ${className}`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="relative aspect-video bg-primary/5">
        {shuffledImages.map((image, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
          >
            <OptimizedImage
              src={image.src}
              alt={image.alt}
              fill
              objectFit="contain"
              className="object-contain"
              priority={index === 0}
            />
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      <button
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full transition-colors"
        onClick={prevSlide}
        aria-label="Previous image"
      >
        <ChevronLeft size={24} />
      </button>
      
      <button
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full transition-colors"
        onClick={nextSlide}
        aria-label="Next image"
      >
        <ChevronRight size={24} />
      </button>

      {/* Indicators */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex space-x-2">
        {shuffledImages.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-2.5 h-2.5 rounded-full transition-colors ${
              index === currentIndex ? 'bg-white' : 'bg-white/50'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
} 