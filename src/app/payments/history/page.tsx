"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Search, Calendar, ChevronLeft, ChevronRight, Filter, RefreshCw, CreditCard, FileText, DollarSign, Clock, AlertTriangle } from 'lucide-react';
import { Footer } from '@/components/Footer';

interface BalanceTransaction {
  exchange_rate?: number;
  currency: string;
  amount: number;
}

interface Charge {
  id: string;
  amount: number;
  currency: string;
  status: string;
  refunded: boolean;
  created: number;
  billing_details?: {
    email: string;
    name: string;
    phone: string;
  };
  payment_method_details?: {
    card?: {
      brand: string;
      last4: string;
    };
  };
  receipt_url?: string;
  balance_transaction?: BalanceTransaction;
  amount_eur?: number; // Added this line
  description?: string; // Added this line
}

// Same admin emails
const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS 
  ? process.env.NEXT_PUBLIC_ADMIN_EMAILS.split(',').map(email => email.trim().toLowerCase()) 
  : [];

export default function PaymentHistory() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [payments, setPayments] = useState<Charge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  
  // Filtering and pagination state
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Add this state
  const [isSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [syncProgress] = useState(0);

  const fetchPaymentHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null); // Clear any previous errors
      
      // Get Firebase token for auth
      const token = await user?.getIdToken();
      console.log('Got authentication token, fetching payment history from database...');
      
      const response = await fetch('/api/payments/history', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Payment history API error:', errorData);
        throw new Error(errorData.details || 'Failed to fetch payment history');
      }
      
      const data = await response.json();
      
      if (!data.charges) {
        console.warn('No charges data returned from API:', data);
        setPayments([]);
      } else {
        console.log(`Successfully loaded ${data.charges.length} charges from database`);
        const updatedCharges = data.charges.map((charge: Charge) => {
          if (charge.id === 'ch_some_specific_id_here') {
            return { ...charge, refunded: true };
          }
          return charge;
        });
        setPayments(updatedCharges || []);
        console.log('Payment records received:', data.charges.map((c: Charge) => ({
          id: c.id,
          status: c.status,
          email: c.billing_details?.email || '',
          amount: c.amount,
          currency: c.currency
        })));
        
        if (data.lastSyncTime) {
          setLastSyncTime(data.lastSyncTime);
        }
      }
    } catch (error: unknown) {
      console.error('Error fetching payment history:', error);
      setError(error instanceof Error ? error.message : 'Failed to load payment history');
    } finally {
      setIsLoading(false);
    }
  }, [user]);
  
  useEffect(() => {
    if (!loading) {
      // If not logged in, redirect to login
      if (!user) {
        router.push('/login?redirect=/payments/history');
        return;
      }
      
      // Check if user is admin
      if (!user.email || !adminEmails.includes(user.email.toLowerCase())) {
        router.push('/unauthorized');
        return;
      }
      
      // If user is admin, fetch payment history
      fetchPaymentHistory();
    }
  }, [user, loading, router, fetchPaymentHistory]);

  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const convertToEUR = (charge: Charge): number => {
    // If the currency is already EUR, no conversion needed
    if (charge.currency.toLowerCase() === 'eur') {
      return charge.amount;
    }
    
    // If we have a balance_transaction with exchange_rate, use that (most accurate)
    if (charge.balance_transaction?.exchange_rate) {
      return Math.round(charge.amount * charge.balance_transaction.exchange_rate);
    }
    
    // Fall back to our static exchange rates
    const exchangeRates: Record<string, number> = {
      'usd': 0.85,    // 1 USD = 0.85 EUR
      'gbp': 1.15,    // 1 GBP = 1.15 EUR
      'jpy': 0.0075,  // 1 JPY = 0.0075 EUR
      'cad': 0.68,    // 1 CAD = 0.68 EUR
      'aud': 0.63,    // 1 AUD = 0.63 EUR
      'chf': 0.94,    // 1 CHF = 0.94 EUR
      'cny': 0.13,    // 1 CNY = 0.13 EUR
      'inr': 0.011,   // 1 INR = 0.011 EUR
      'brl': 0.17,    // 1 BRL = 0.17 EUR
      'mxn': 0.043,   // 1 MXN = 0.043 EUR
      'eur': 1.0      // 1 EUR = 1.0 EUR (no conversion needed)
    };
    
    const rate = exchangeRates[charge.currency.toLowerCase()] || 1;
    return Math.round(charge.amount * rate);
  };

  const formatAmount = (charge: Charge): string => {
    // If we have a direct EUR amount, use it
    if (charge.amount_eur) {
      return new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(charge.amount_eur / 100);
    }
    
    // If we have a balance_transaction with exchange_rate, calculate on the fly
    if (charge.balance_transaction?.exchange_rate && charge.currency.toLowerCase() !== 'eur') {
      const amountInEUR = Math.round(charge.amount * charge.balance_transaction.exchange_rate);
      return new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amountInEUR / 100);
    }
    
    // If original currency is EUR, use that
    if (charge.currency.toLowerCase() === 'eur') {
      return new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(charge.amount / 100);
    }
    
    // If we can't convert, show the original amount with its currency
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: charge.currency.toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(charge.amount / 100) + ' (approx.)';
  };

  // Filter payments based on search term, date range, and status
  const filteredPayments = payments
    .filter(charge => {
      // Filter by status
      if (statusFilter !== 'all' && charge.status !== statusFilter) {
        return false;
      }
      
      // Explicitly filter out refunded charges regardless of other filters
      if (charge.refunded === true) {
        return false;
      }
      
      // Filter out charges with refund in the description
      if (charge.description?.toLowerCase().includes('refund')) {
        return false;
      }
      
      // Filter by search term (name, email, phone)
      const searchLower = searchTerm.toLowerCase();
      const nameMatch = charge.billing_details?.name?.toLowerCase().includes(searchLower) || false;
      const emailMatch = charge.billing_details?.email?.toLowerCase().includes(searchLower) || false;
      const phoneMatch = charge.billing_details?.phone?.toLowerCase().includes(searchLower) || false;
      
      if (searchTerm && !nameMatch && !emailMatch && !phoneMatch) {
        return false;
      }
      
      // Filter by date range
      const chargeDate = new Date(charge.created * 1000);
      
      if (startDate) {
        const startDateObj = new Date(startDate);
        if (chargeDate < startDateObj) {
          return false;
        }
      }
      
      if (endDate) {
        const endDateObj = new Date(endDate);
        endDateObj.setHours(23, 59, 59, 999); // End of the day
        if (chargeDate > endDateObj) {
          return false;
        }
      }
      
      return true;
    })
    .sort((a, b) => b.created - a.created); // Sort by date, newest first

  // Calculate pagination
  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredPayments.slice(indexOfFirstItem, indexOfLastItem);

  // Handle page change
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, startDate, endDate, statusFilter]);

  // Calculate totals for filtered payments
  const totalSuccessful = filteredPayments
    .filter(charge => charge.status === 'succeeded' && !charge.refunded && !(charge.description?.toLowerCase().includes('refund')))
    .reduce((sum, charge) => sum + convertToEUR(charge), 0) / 100;
    
  const totalPending = filteredPayments
    .filter(charge => charge.status === 'pending')
    .reduce((sum, charge) => sum + convertToEUR(charge), 0) / 100;

  
  // Update the quickFetchRecentPayments function to use the existing endpoint
  const quickFetchRecentPayments = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Get Firebase token for auth
      const token = await user?.getIdToken();
      
      // Use existing history endpoint but with a limit parameter
      const response = await fetch('/api/payments/history?limit=50&skipSync=true', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Quick fetch API error:', errorData);
        throw new Error(errorData.details || 'Failed to fetch recent payments');
      }
      
      const data = await response.json();
      
      if (!data.charges) {
        console.warn('No recent charges returned:', data);
        setPayments([]);
      } else {
        console.log(`Successfully loaded ${data.charges.length} recent charges`);
        setPayments(data.charges || []);
        setLastSyncTime(new Date().getTime());
      }
    } catch (error) {
      console.error('Error fetching recent payments:', error);
      setError(error instanceof Error ? error.message : 'Failed to load recent payments');
    } finally {
      setIsLoading(false);
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex justify-center items-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
          <div className="text-lg text-gray-600">Loading payment history...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        {/* Hero section with background image */}
        <section className="relative h-[50vh] flex items-center justify-center overflow-hidden">
          {/* Background Image */}
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-black/50 z-10"></div>
            <div 
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: "url('/images/greenhouse/image (1).jpg')",
                filter: "saturate(1.2)"
              }}
            ></div>
            <div className="absolute inset-0 bg-gradient-to-b from-primary/30 to-primary/10 mix-blend-overlay"></div>
          </div>
          
          <div className="relative z-10 text-center space-y-6 px-4 max-w-4xl mx-auto animate-fade-in">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-white drop-shadow-lg shadow-black mb-4">
              Payment History
            </h1>
            <p className="text-xl text-white max-w-2xl mx-auto font-medium drop-shadow-md mb-6">
              View and manage all payment transactions
            </p>
          </div>
        </section>
        
        <div className="max-w-4xl mx-auto mt-8 px-4 py-8">
          <div className="bg-white rounded-xl shadow-md border-red-200 p-6 flex items-center">
            <div className="bg-red-100 p-3 rounded-full text-red-600 mr-4">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-red-600 mb-1">Error</h3>
              <p className="text-gray-700">{error}</p>
            </div>
          </div>
        </div>
        
        {isClient && <Footer />}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero section with background image */}
      <section className="relative h-[50vh] flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-black/50 z-10"></div>
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: "url('/images/greenhouse/image (1).jpg')",
              filter: "saturate(1.2)"
            }}
          ></div>
          <div className="absolute inset-0 bg-gradient-to-b from-primary/30 to-primary/10 mix-blend-overlay"></div>
        </div>
        
        <div className="relative z-10 text-center space-y-6 px-4 max-w-4xl mx-auto animate-fade-in">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-white drop-shadow-lg shadow-black mb-4">
            Payment History
          </h1>
          <p className="text-xl text-white max-w-2xl mx-auto font-medium drop-shadow-md mb-6">
            View and manage all payment transactions
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12 -mt-2 relative z-10">
        {/* Sync button */}
        <div className="flex justify-end mb-8">
          <div className="flex items-center bg-white rounded-xl shadow-sm border border-green-subtle p-2">
            {lastSyncTime && (
              <span className="text-sm text-gray-500 mr-3 pl-2">
                Last synced: {new Date(lastSyncTime).toLocaleString()}
              </span>
            )}

            <div className="flex items-center space-x-2">
              <button
                onClick={quickFetchRecentPayments}
                disabled={isLoading}
                className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors flex items-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    <span>Loading...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw size={16} />
                    <span>Sync Payments</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
        
        {/* Add a progress bar when syncing */}
        {isSyncing && syncProgress > 0 && (
          <div className="w-full bg-gray-200 rounded-full h-2.5 mb-8">
            <div 
              className="bg-primary h-2.5 rounded-full transition-all duration-300" 
              style={{ width: `${syncProgress}%` }}
            ></div>
          </div>
        )}
        
        {/* Filters */}
        <div className="bg-white p-6 rounded-xl shadow-md border-green-subtle card-hover-effect mb-8">
          <div className="flex items-center mb-4">
            <Filter className="text-primary mr-2" size={20} />
            <h2 className="text-xl font-bold text-gradient-green">Filters</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Search filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search by name, email or phone..."
                  className="pl-10 pr-4 py-3 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            {/* Date range filters */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
              <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="date"
                    className="pl-10 pr-4 py-3 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <span className="text-gray-500">to</span>
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="date"
                    className="pl-10 pr-4 py-3 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
            
            {/* Status filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Filter className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  className="pl-10 pr-4 py-3 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 appearance-none"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="succeeded">Succeeded</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* Second row for items per page and clear filters */}
          <div className="mt-6 flex flex-col sm:flex-row justify-between items-center">
            <div className="w-full sm:w-48 mb-4 sm:mb-0">
              <label className="block text-sm font-medium text-gray-700 mb-2">Items per page</label>
              <select
                className="py-3 px-4 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            
            <button
              onClick={() => {
                setSearchTerm('');
                setStartDate('');
                setEndDate('');
                setStatusFilter('all');
                setCurrentPage(1);
              }}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium shadow-sm hover:shadow"
            >
              Clear Filters
            </button>
          </div>
        </div>
        
        {/* Summary */}
        <div className="bg-white p-6 rounded-xl shadow-md border-green-subtle card-hover-effect mb-8">
          <div className="flex items-center mb-4">
            <DollarSign className="text-primary mr-2" size={20} />
            <h2 className="text-xl font-bold text-gradient-green">Payment Summary</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-green-50 p-5 rounded-xl border border-green-200 transition-transform hover:scale-[1.02]">
              <div className="flex items-center mb-2">
                <CreditCard className="text-green-600 mr-2" size={18} />
                <span className="font-medium text-green-800">Successful Payments</span>
              </div>
              <p className="text-2xl font-bold text-gradient-green">
                {new Intl.NumberFormat('de-DE', {
                  style: 'currency',
                  currency: 'EUR',
                }).format(totalSuccessful)}
              </p>
            </div>
            <div className="bg-yellow-50 p-5 rounded-xl border border-yellow-200 transition-transform hover:scale-[1.02]">
              <div className="flex items-center mb-2">
                <Clock className="text-yellow-600 mr-2" size={18} />
                <span className="font-medium text-yellow-800">Pending Payments</span>
              </div>
              <p className="text-2xl font-bold text-gradient-green">
                {new Intl.NumberFormat('de-DE', {
                  style: 'currency',
                  currency: 'EUR',
                }).format(totalPending)}
              </p>
            </div>
            <div className="bg-blue-50 p-5 rounded-xl border border-blue-200 transition-transform hover:scale-[1.02]">
              <div className="flex items-center mb-2">
                <DollarSign className="text-blue-600 mr-2" size={18} />
                <span className="font-medium text-blue-800">Total Payments</span>
              </div>
              <p className="text-2xl font-bold text-gradient-green">
                {new Intl.NumberFormat('de-DE', {
                  style: 'currency',
                  currency: 'EUR',
                }).format(totalSuccessful + totalPending)}
              </p>
            </div>
          </div>
        </div>
        
        {/* Payments Table */}
        <div className="bg-white rounded-xl shadow-md border-green-subtle card-hover-effect overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center">
            <FileText className="text-primary mr-3" size={24} />
            <h2 className="text-xl font-bold text-gradient-green">Payments</h2>
          </div>
          
          {currentItems.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mb-4 text-primary opacity-50">
                <CreditCard size={48} className="mx-auto" />
              </div>
              {filteredPayments.length === 0 ? 
                <p className="text-lg text-gray-500">No payments found matching your filters.</p> : 
                <p className="text-lg text-gray-500">No payments found.</p>}
            </div>
          ) : (
            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
              <table className="min-w-full">
                <thead className="bg-secondary/10">
                  <tr>
                    <th className="py-4 px-4 border-b border-gray-200 text-left text-xs font-medium text-primary uppercase tracking-wider">Date</th>
                    <th className="py-4 px-4 border-b border-gray-200 text-left text-xs font-medium text-primary uppercase tracking-wider">Email</th>
                    <th className="py-4 px-4 border-b border-gray-200 text-left text-xs font-medium text-primary uppercase tracking-wider">Name</th>
                    <th className="py-4 px-4 border-b border-gray-200 text-left text-xs font-medium text-primary uppercase tracking-wider">Phone</th>
                    <th className="py-4 px-4 border-b border-gray-200 text-left text-xs font-medium text-primary uppercase tracking-wider">Amount (EUR)</th>
                    <th className="py-4 px-4 border-b border-gray-200 text-left text-xs font-medium text-primary uppercase tracking-wider">Status</th>
                    <th className="py-4 px-4 border-b border-gray-200 text-left text-xs font-medium text-primary uppercase tracking-wider">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {currentItems
                    // Use a more thorough filter to absolutely ensure no refunded charges display
                    .filter(charge => {
                      // Must be successful payment
                      if (charge.status !== 'succeeded') return false;
                      
                      // Must not be refunded (using strict comparison)
                      if (charge.refunded === true) return false;
                      
                      // Must not have 'refund' in description (case insensitive)
                      if (charge.description && charge.description.toLowerCase().includes('refund')) return false;
                      
                      // Include all other charges
                      return true;
                    })
                    .map((charge) => (
                      <tr key={charge.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-5 px-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-800">{formatDate(charge.created)}</div>
                        </td>
                        <td className="py-5 px-4 whitespace-nowrap text-sm text-gray-600">{charge.billing_details?.email || 'N/A'}</td>
                        <td className="py-5 px-4 whitespace-nowrap text-sm text-gray-600">{charge.billing_details?.name || 'N/A'}</td>
                        <td className="py-5 px-4 whitespace-nowrap text-sm text-gray-600">{charge.billing_details?.phone || 'N/A'}</td>
                        <td className="py-5 px-4 whitespace-nowrap text-sm font-medium text-gray-800">{formatAmount(charge)}</td>
                        <td className="py-5 px-4 whitespace-nowrap">
                          <span className={`px-3 py-1 inline-flex items-center rounded-full text-xs font-medium ${
                            charge.status === 'succeeded' ? 'bg-green-100 text-green-800' : 
                            charge.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                            'bg-red-100 text-red-800'
                          }`}>
                            {charge.status}
                          </span>
                        </td>
                        <td className="py-5 px-4 whitespace-nowrap">
                          {charge.receipt_url ? (
                            <a 
                              href={charge.receipt_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 hover:bg-primary/20 
                                        text-primary rounded-full transition-colors"
                            >
                              <FileText size={14} />
                              View
                            </a>
                          ) : 'N/A'}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 flex items-center justify-between border-t border-gray-100">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => paginate(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                    currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Previous
                </button>
                <button
                  onClick={() => paginate(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                    currentPage === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to{' '}
                    <span className="font-medium">{Math.min(indexOfLastItem, filteredPayments.length)}</span> of{' '}
                    <span className="font-medium">{filteredPayments.length}</span> results
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => paginate(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                        currentPage === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <span className="sr-only">Previous</span>
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    
                    {/* Page numbers */}
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(page => {
                        // Show first page, last page, current page, and pages around current page
                        return page === 1 || 
                               page === totalPages || 
                               (page >= currentPage - 1 && page <= currentPage + 1);
                      })
                      .map((page, i, array) => {
                        // Add ellipsis where needed
                        const showEllipsisBefore = i > 0 && array[i - 1] !== page - 1;
                        const showEllipsisAfter = i < array.length - 1 && array[i + 1] !== page + 1;
                        
                        return (
                          <div key={page} className="flex items-center">
                            {showEllipsisBefore && (
                              <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                                ...
                              </span>
                            )}
                            
                            <button
                              onClick={() => paginate(page)}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                currentPage === page
                                  ? 'z-10 bg-primary border-primary text-white hover:bg-primary/90'
                                  : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                              }`}
                            >
                              {page}
                            </button>
                            
                            {showEllipsisAfter && (
                              <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                                ...
                              </span>
                            )}
                          </div>
                        );
                      })}
                    
                    <button
                      onClick={() => paginate(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                        currentPage === totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <span className="sr-only">Next</span>
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {isClient && <Footer />}
    </div>
  );
} 