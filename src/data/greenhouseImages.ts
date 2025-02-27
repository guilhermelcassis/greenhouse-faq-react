// Greenhouse images array with all images from the folder
export const greenhouseGalleryImages = Array.from({ length: 44 }, (_, i) => ({
  src: `/images/greenhouse/image (${i + 1}).jpg`,
  alt: `Greenhouse event image ${i + 1}`,
  width: 1200,
  height: 800
}));

// Mission trip images array with all images from the folder
export const missionTripImages = Array.from({ length: 10 }, (_, i) => ({
  src: `/images/mission-trip/mt (${i + 1}).jpg`,
  alt: `Mission trip image ${i + 1}`,
  width: 1200,
  height: 800
}));

// Combined images for background mosaics
export const allImages = [
  ...greenhouseGalleryImages,
  ...missionTripImages
];

// Function to get a subset of images for specific sections
export function getRandomImages(sourceArray: typeof greenhouseGalleryImages, count: number) {
  const shuffled = [...sourceArray].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// Curated selections for different sections
export const featuredGreenhouseImages = getRandomImages(greenhouseGalleryImages, 44);
export const featuredMissionImages = getRandomImages(missionTripImages, 10);

// Categorized images for specific themes
export const worshipImages = [1, 5, 12, 18, 24, 30].map(i => greenhouseGalleryImages[i - 1]);
export const teachingImages = [2, 8, 15, 22, 28, 35].map(i => greenhouseGalleryImages[i - 1]);
export const communityImages = [3, 10, 17, 25, 32, 38].map(i => greenhouseGalleryImages[i - 1]);
export const ministryImages = [4, 11, 20, 27, 34, 40].map(i => greenhouseGalleryImages[i - 1]); 