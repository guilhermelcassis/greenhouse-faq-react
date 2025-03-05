export interface Payment {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: 'succeeded' | 'processing' | 'failed';
  paymentIntentId: string;
  paymentMethod: string;
  createdAt: Date;
  metadata?: Record<string, any>;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  images?: string[];
} 