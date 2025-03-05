// Simple in-memory cache for payments
// In a production app, you would use Redis, a database, or serverless KV store instead

import { promises as fs } from 'fs';
import path from 'path';

// Define types
interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created: number;
  email: string;
  description: string | null;
}

interface PaymentCache {
  [email: string]: {
    payments: Payment[];
    lastUpdated: number;
  };
}

// Cache expiration time (12 hours)
const CACHE_EXPIRY = 12 * 60 * 60 * 1000;

// Path to cache file
const cachePath = path.join(process.cwd(), 'payment-cache.json');

// Initialize cache
let paymentCache: PaymentCache = {};

// Load cache from disk at startup
async function initCache() {
  try {
    const data = await fs.readFile(cachePath, 'utf8');
    paymentCache = JSON.parse(data);
    console.log('Payment cache loaded from disk');
  } catch (error) {
    console.error('Error loading payment cache:', error);
    console.log('No payment cache found or error loading, starting fresh');
    paymentCache = {};
  }
}

// Call this once during app initialization
initCache();

// Get payments from cache for a specific user
export async function getPaymentCache(email: string): Promise<Payment[] | null> {
  const cacheEntry = paymentCache[email];
  
  // If no cache or expired, return null
  if (!cacheEntry || Date.now() - cacheEntry.lastUpdated > CACHE_EXPIRY) {
    return null;
  }
  
  return cacheEntry.payments;
}

// Update the cache with new payment data
export async function updatePaymentCache(email: string, payments: Payment[]): Promise<void> {
  paymentCache[email] = {
    payments,
    lastUpdated: Date.now()
  };
  
  // Save to disk
  try {
    await fs.writeFile(cachePath, JSON.stringify(paymentCache, null, 2));
  } catch (error) {
    console.error('Error writing payment cache to disk:', error);
  }
}

// Optional: schedule regular refresh of the entire cache 
// (for a real app, you might use a cron job or similar)
export async function refreshPaymentCache(): Promise<void> {
  // Implementation would depend on how you want to refresh the data
  // This could call Stripe APIs for all users in the cache
} 