"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Search, Calendar, ChevronLeft, ChevronRight, Filter, RefreshCw, CreditCard, FileText, DollarSign, Clock, AlertTriangle, X } from 'lucide-react';
import { Footer } from '@/components/Footer';
import { setCache } from '@/lib/cache-utils';

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
  created_date?: string;
  created_formatted?: string;
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
  payment_details?: {
    type: string;
    card?: {
      brand: string;
      last4: string;
      exp_month: number;
      exp_year: number;
    };
  };
  receipt_url?: string;
  balance_transaction?: BalanceTransaction;
  amount_eur?: number;
  description?: string;
  metadata?: {
    email?: string;
    userId?: string;
    items?: string;
    [key: string]: string | number | boolean | null | undefined;
  };
}

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
  const [itemsPerPage] = useState(25); // Fixed at 25 items per page
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Stripe pagination state
  const [hasMore, setHasMore] = useState(false);
  const [nextPageCursor, setNextPageCursor] = useState<string | null>(null);
  const [prevPageCursors, setPrevPageCursors] = useState<string[]>([]);

  // Update these states to properly manage sync status
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [syncProgress, setSyncProgress] = useState(0);
  const [newPaymentsAdded, setNewPaymentsAdded] = useState<number | null>(null);
  const [showToast, setShowToast] = useState(false);

  const fetchPaymentHistory = useCallback(async (startingAfter?: string) => {
    try {
      setIsLoading(true);
      setError(null); // Clear any previous errors
      
      // Get Firebase token for auth
      const token = await user?.getIdToken();
      console.log('Got authentication token, fetching payment history directly from Stripe...');
      
      // Construct the API URL with pagination parameters
      let apiUrl = `/api/payments/stripe-history?limit=${itemsPerPage}`;
      if (startingAfter) {
        apiUrl += `&starting_after=${startingAfter}`;
      }
      
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Payment history API error:', errorData);
        
        // If we get an unauthorized error, try the original API as fallback
        if (response.status === 403) {
          console.log('Falling back to original payments history API...');
          const fallbackResponse = await fetch('/api/payments/history', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (!fallbackResponse.ok) {
            const fallbackErrorData = await fallbackResponse.json().catch(() => ({}));
            console.error('Fallback API error:', fallbackErrorData);
            throw new Error(fallbackErrorData.details || 'Failed to fetch payment history');
          }
          
          const fallbackData = await fallbackResponse.json();
          if (!fallbackData.charges) {
            console.warn('No charges data returned from fallback API:', fallbackData);
            setPayments([]);
          } else {
            console.log(`Successfully loaded ${fallbackData.charges.length} charges from database fallback`);
            
            // Format the data
            const formattedCharges = fallbackData.charges.map((charge: Charge) => {
              return {
                ...charge,
                created_formatted: formatDate(charge.created)
              };
            });
            
            setPayments(formattedCharges || []);
            // Since we're using the fallback, we don't have pagination info from Stripe
            setHasMore(false);
          }
          return;
        }
        
        throw new Error(errorData.details || 'Failed to fetch payment history');
      }
      
      const data = await response.json();
      
      if (!data.charges) {
        console.warn('No charges data returned from API:', data);
        setPayments([]);
      } else {
        console.log(`Successfully loaded ${data.charges.length} charges from Stripe`);
        
        // Update pagination information
        setHasMore(data.has_more);
        setNextPageCursor(data.next_page_cursor);
        
        // Format and process the charges
        const formattedCharges = data.charges.map((charge: Charge) => {
          return {
            ...charge,
            created_formatted: formatDate(charge.created)
          };
        });
        
        setPayments(formattedCharges || []);
      }
    } catch (error) {
      console.error('Error fetching payment history:', error);
      setError(error instanceof Error ? error.message : 'Failed to load payment history');
    } finally {
      setIsLoading(false);
    }
  }, [user, itemsPerPage]);
  
  useEffect(() => {
    if (!loading) {
      // If not logged in, redirect to login
      if (!user) {
        router.push('/login?redirect=/payments/history');
        return;
      }
      
      // Check if user is admin
      if (!user.isAdmin) {
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
  
  const formatDate = (timestamp: number, charge?: Charge) => {
    // If we have the formatted date string, use it
    if (charge && charge.created_formatted) {
      return charge.created_formatted;
    }
    // Otherwise fall back to standard date formatting
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  // Helper function to get the most reliable email for a charge
  const getEmail = (charge: Charge): string => {
    // Check billing_details.email first
    if (charge.billing_details?.email) {
      return charge.billing_details.email;
    }
    
    // Then check metadata.email
    if (charge.metadata?.email) {
      return charge.metadata.email;
    }
    
    // Fall back to any other source that might have email
    return 'No email available';
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

  // Navigate to next page of results
  const nextPage = () => {
    if (hasMore && nextPageCursor) {
      // Store the current cursor for back navigation
      setPrevPageCursors(prev => [...prev, nextPageCursor]);
      
      // Fetch the next page from Stripe
      fetchPaymentHistory(nextPageCursor);
      
      // Update the UI page number
      setCurrentPage(prev => prev + 1);
    }
  };

  // Navigate to previous page of results
  const prevPage = () => {
    if (currentPage > 1) {
      // Get the cursor to use for fetching the previous page
      const newPrevPageCursors = [...prevPageCursors];
      const cursorToUse = newPrevPageCursors.length > 1 ? newPrevPageCursors[newPrevPageCursors.length - 2] : null;
      
      // Remove the last cursor from the array
      newPrevPageCursors.pop();
      setPrevPageCursors(newPrevPageCursors);
      
      // Fetch the previous page
      if (currentPage === 2) {
        // For the first page, don't use a cursor
        fetchPaymentHistory();
      } else {
        // For other pages, use the appropriate cursor
        fetchPaymentHistory(cursorToUse || undefined);
      }
      
      // Update the UI page number
      setCurrentPage(prev => prev - 1);
    }
  };

  // Filter payments based on search term, date range, and status
  const filteredPayments = payments
    .filter(charge => {
      // Filter by status
      if (statusFilter !== 'all' && charge.status !== statusFilter) {
        return false;
      }
      
      // Filter out refunded charges if requested
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
      // Use the getEmail helper to check multiple email fields
      const emailMatch = getEmail(charge).toLowerCase().includes(searchLower);
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
    });

  // If we're applying client-side filtering, we need to handle pagination differently
  const paginatedPayments = filteredPayments;

  // Calculate totals for filtered payments - only count succeeded and pending, not failed
  const totalSuccessful = paginatedPayments
    .filter(charge => charge.status === 'succeeded' && !charge.refunded && !(charge.description?.toLowerCase().includes('refund')))
    .reduce((sum, charge) => sum + convertToEUR(charge), 0) / 100;
    
  const totalPending = paginatedPayments
    .filter(charge => charge.status === 'pending')
    .reduce((sum, charge) => sum + convertToEUR(charge), 0) / 100;

  
  // Update the quickFetchRecentPayments function to use the dedicated sync-payments API
  const quickFetchRecentPayments = async () => {
    try {
      setIsLoading(true);
      setIsSyncing(true);
      setSyncProgress(10); // Start progress
      setError(null);
      setNewPaymentsAdded(null);
      
      // Reset pagination state when syncing
      setPrevPageCursors([]);
      setCurrentPage(1);
      
      // Get Firebase token for auth
      const token = await user?.getIdToken();
      setSyncProgress(20); // Token obtained
      
      // Call the dedicated sync-payments API to update the database
      const response = await fetch('/api/admin/sync-payments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          syncType: 'quick', // 'quick' will sync recent payments
          limit: 50 // Limit to only the 50 most recent payments
        })
      });
      
      setSyncProgress(50); // API call completed
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Payment sync API error:', errorData);
        throw new Error(errorData.details || 'Failed to sync payments from Stripe');
      }
      
      const data = await response.json();
      setSyncProgress(70); // Data received
      
      // Update the last sync time
      setLastSyncTime(Date.now());
      
      // Show number of new payments
      setNewPaymentsAdded(data.newPaymentsAdded || 0);
      
      // Fetch the updated payment history to display
      const historyResponse = await fetch('/api/payments/history', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!historyResponse.ok) {
        throw new Error('Failed to load updated payment history');
      }
      
      const historyData = await historyResponse.json();
      setSyncProgress(90); // Updated data received
      
      if (!historyData.charges) {
        console.warn('No charges data returned from API after sync');
        setPayments([]);
      } else {
        console.log(`Successfully loaded ${historyData.charges.length} charges from database after sync`);
        
        // Cache the updated data
        setCache('payment_history_all_cache', historyData.charges);
        
        setPayments(historyData.charges || []);
      }
      
      // Complete the progress and show success
      setSyncProgress(100);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
    } catch (error) {
      console.error('Error syncing payments:', error);
      setError(error instanceof Error ? error.message : 'Failed to sync payments');
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  };

  // Refresh the data from Stripe
  const refreshPayments = async () => {
    try {
      setIsSyncing(true);
      setSyncProgress(10);
      setError(null);
      // Reset pagination state
      setPrevPageCursors([]);
      setCurrentPage(1);
      
      await fetchPaymentHistory();
      
      setLastSyncTime(Date.now());
      setSyncProgress(100);
      setShowToast(true);
      
      // Hide toast after 3 seconds
      setTimeout(() => {
        setShowToast(false);
      }, 3000);
    } catch (error) {
      console.error('Error refreshing payments:', error);
      setError(error instanceof Error ? error.message : 'Failed to refresh payments');
    } finally {
      setIsSyncing(false);
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
        {/* Toast notification for sync results */}
        {showToast && (
          <div className="fixed top-6 right-6 z-50 transition-opacity duration-300 opacity-100">
            <div className={`px-6 py-4 rounded-lg shadow-lg flex items-center ${
              newPaymentsAdded && newPaymentsAdded > 0 
                ? 'bg-green-100 border border-green-300' 
                : 'bg-blue-100 border border-blue-300'
            }`}>
              <div className={`p-2 rounded-full mr-3 ${
                newPaymentsAdded && newPaymentsAdded > 0 
                  ? 'bg-green-200 text-green-600' 
                  : 'bg-blue-200 text-blue-600'
              }`}>
                {newPaymentsAdded && newPaymentsAdded > 0 ? (
                  <CreditCard size={20} />
                ) : (
                  <RefreshCw size={20} />
                )}
              </div>
              <div className="flex-1">
                <h3 className={`font-medium ${
                  newPaymentsAdded && newPaymentsAdded > 0 
                    ? 'text-green-800' 
                    : 'text-blue-800'
                }`}>
                  {newPaymentsAdded && newPaymentsAdded > 0 
                    ? `Successfully synced ${newPaymentsAdded} payment${newPaymentsAdded > 1 ? 's' : ''}` 
                    : 'Sync complete - Database is up to date'}
                </h3>
                <p className="text-sm text-gray-600">
                  {newPaymentsAdded && newPaymentsAdded > 0 
                    ? 'Your payment database has been updated from Stripe' 
                    : 'All payment records have been verified'}
                </p>
              </div>
              <button 
                onClick={() => setShowToast(false)}
                className="ml-2 p-1 rounded-full hover:bg-gray-200 transition-colors"
              >
                <X size={16} className="text-gray-600" />
              </button>
            </div>
          </div>
        )}
        
        {/* Sync button */}
        <div className="flex justify-end mb-8">
          <div className="flex items-center bg-white rounded-xl shadow-sm border border-green-subtle p-2">
            {lastSyncTime && (
              <span className="text-sm text-gray-500 mr-3 pl-2">
                Last synced: {new Date(lastSyncTime).toLocaleString()}
              </span>
            )}

            <div className="flex gap-3 items-center">
              <button
                onClick={quickFetchRecentPayments}
                disabled={isSyncing || isLoading}
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium shadow-sm hover:shadow flex items-center gap-2"
              >
                <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
                Quick Sync
              </button>
              
              <button
                onClick={refreshPayments} 
                disabled={isSyncing || isLoading}
                className="px-4 py-2 bg-primary/10 text-white rounded-lg hover:bg-primary/20 transition-colors font-medium shadow-sm hover:shadow flex items-center gap-2"
              >
                <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
                Full Refresh
              </button>
              
              {isSyncing && (
                <div className="text-xs text-gray-500 flex items-center gap-2">
                  <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-300 ease-out"
                      style={{ width: `${syncProgress}%` }}
                    ></div>
                  </div>
                  <span>{Math.round(syncProgress)}%</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
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
          
          {/* Second row for clear filters */}
          <div className="mt-6 flex flex-col sm:flex-row justify-between items-center">
            <div className="w-full sm:w-48 mb-4 sm:mb-0">
              <p className="block text-sm font-medium text-gray-700 mb-2">Items per page: 25</p>
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
          
          {/* Table content */}
          <div className="mt-4 overflow-x-auto rounded-lg shadow ring-1 ring-black ring-opacity-5">
            {/* No payments state */}
            {paginatedPayments.length === 0 ? (
              <div className="p-12 text-center">
                <div className="mb-4 text-primary opacity-50">
                  <AlertTriangle className="w-12 h-12 mx-auto" />
                </div>
                <h3 className="mb-1 text-lg font-medium">No payments found</h3>
                <p className="text-sm text-gray-500">
                  {isLoading ? 'Loading payment data...' : 'Try changing your filters or search term'}
                </p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
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
                  {paginatedPayments
                    .map((charge: Charge) => (
                      <tr key={charge.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-5 px-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-800">{formatDate(charge.created, charge)}</div>
                        </td>
                        <td className="py-5 px-4 whitespace-nowrap text-sm text-gray-600">{getEmail(charge)}</td>
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
            )}
          </div>
          
          {/* Pagination Controls */}
          <div className="flex items-center justify-between mt-4 mb-8">
            <div className="text-sm text-gray-500">
              Showing {paginatedPayments.length} payments
              {hasMore && ' (more available)'}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={prevPage}
                disabled={currentPage === 1}
                className={`flex items-center px-3 py-1 text-sm rounded-md ${
                  currentPage === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                }`}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </button>
              <span className="flex items-center px-3 py-1 text-sm bg-gray-100 rounded-md">
                Page {currentPage}
              </span>
              <button
                onClick={nextPage}
                disabled={!hasMore}
                className={`flex items-center px-3 py-1 text-sm rounded-md ${
                  !hasMore
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                }`}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {isClient && <Footer />}
    </div>
  );
} 