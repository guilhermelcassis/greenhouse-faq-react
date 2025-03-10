// Define the interface for image data
export interface ImageData {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
}

// Helper function to create image arrays with consistent naming
function createImageArray(
  basePath: string,
  count: number,
  prefix: string = '',
  dimensions: { width: number; height: number } = { width: 1200, height: 800 }
): ImageData[] {
  return Array.from({ length: count }, (_, i) => ({
    src: `${basePath}${prefix}(${i + 1}).jpg`,
    alt: basePath.includes('greenhouse') 
      ? `Greenhouse event image ${i + 1}` 
      : `Mission trip image ${i + 1}`,
    width: dimensions.width,
    height: dimensions.height
  }));
}

// Create the base image arrays
const greenhouseGalleryImages = createImageArray('/images/greenhouse/image ', 44);
const missionTripImages = createImageArray('/images/mission-trip/mt ', 8);

// Combined images for background mosaics
export const allImages = [
  ...greenhouseGalleryImages,
  ...missionTripImages
];

// Function to get a consistent subset of images for specific sections
export function getConsistentImages(sourceArray: ImageData[], indices: number[]): ImageData[] {
  return indices.map(i => sourceArray[i]);
}

// Function to get a random subset of images (for non-critical UI elements)
export function getRandomImages(sourceArray: ImageData[], count: number): ImageData[] {
  // Use a consistent seed or sorting method if you need deterministic results
  const shuffled = [...sourceArray].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// Export the main image collections
export const featuredGreenhouseImages = greenhouseGalleryImages;
export const featuredMissionImages = missionTripImages;

// Categorized images for specific themes (using zero-based indices)
export const worshipImages = getConsistentImages(greenhouseGalleryImages, [0, 4, 11, 17, 23, 29]);
export const teachingImages = getConsistentImages(greenhouseGalleryImages, [1, 7, 14, 21, 27, 34]);
export const communityImages = getConsistentImages(greenhouseGalleryImages, [2, 9, 16, 24, 31, 37]);
export const ministryImages = getConsistentImages(greenhouseGalleryImages, [3, 10, 19, 26, 33, 39]); 