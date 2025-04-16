"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { User, Search, CreditCard, FileText, Clock, ArrowLeft, Mail, Phone, Eye, RefreshCw, Info, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Footer } from '@/components/Footer';
import dynamic from 'next/dynamic';

// Client-side only component for payment refresh button
const PaymentRefreshButton = dynamic(() => Promise.resolve(({ 
  onClick, 
  isLoading, 
  disabled 
}: { 
  onClick: () => void; 
  isLoading: boolean; 
  disabled?: boolean;
}) => (
  <button
    onClick={onClick}
    disabled={isLoading || disabled}
    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
      isLoading || disabled
        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
        : 'bg-primary text-white hover:bg-primary/90'
    }`}
  >
    {isLoading ? (
      <>
        <Loader2 size={16} className="animate-spin" />
        Loading...
      </>
    ) : (
      <>
        <RefreshCw size={16} />
        Refresh Payments
      </>
    )}
  </button>
)), { ssr: false });

interface Payment {
  id: string;
  amount: number;
  currency: string;
  amount_eur?: number;
  status: string;
  created: number;
  created_formatted?: string;
  description?: string;
  refunded: boolean;
  receipt_url?: string | null;
  payment_details?: {
    type: string;
    card?: {
      brand: string;
      last4: string;
      exp_month: number;
      exp_year: number;
    };
  };
  billing_details?: {
    email?: string;
    name?: string;
    phone?: string;
  };
  metadata?: {
    email?: string;
    userId?: string;
    items?: string;
    [key: string]: string | number | boolean | null | undefined;
  };
}

interface UserProfile {
  uid?: string;
  id: string;
  email?: string | null;
  displayName?: string | null;
  name?: string | null;
  phone?: string | null;
  photoURL?: string | null;
  createdAt?: number;
  lastLoginAt?: number;
  isAdmin?: boolean;
  isStaff?: boolean;
  isApproved?: boolean;
  roles?: string[];
  payments?: Payment[];
  totalSpent?: number;
  paymentCount?: number;
  successfulPaymentCount?: number;
}

export default function StudentsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingStripePayments, setIsLoadingStripePayments] = useState(false);
  const [stripePayments, setStripePayments] = useState<Payment[]>([]);
  const [stripePaymentStats, setStripePaymentStats] = useState<{
    totalSpent: number;
    totalPayments: number;
    successfulPayments: number;
  } | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
    visible: boolean;
  }>({
    message: '',
    type: 'info',
    visible: false
  });

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Auth check
  useEffect(() => {
    if (!loading) {
      // If not logged in, redirect to login
      if (!user) {
        router.push('/login?redirect=/admin/students');
        return;
      }
      
      // If not admin, redirect to unauthorized
      if (!user.isAdmin) {
        router.push('/unauthorized');
        return;
      }
    }
  }, [user, loading, router]);

  // Fetch all users
  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Get Firebase token for auth
      const token = await user?.getIdToken();
      
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      
      const data = await response.json();
      console.log('Received users data:', data.users?.[0]); // Log first user to see structure
      
      setAllUsers(data.users || []);
      setSearchResults(data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while fetching users');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Add a function to fetch payments directly from Stripe
  const fetchStripePayments = useCallback(async (userEmail: string, userId?: string, retryCount = 0) => {
    if (!userEmail) {
      setToast({
        message: 'Cannot fetch payments: No email provided',
        type: 'error',
        visible: true
      });
      return;
    }

    try {
      setIsLoadingStripePayments(true);
      
      // Get Firebase token for auth
      const token = await user?.getIdToken();
      
      if (!token) {
        throw new Error('Authentication token not available');
      }
      
      setToast({
        message: 'Fetching payment data from Stripe...',
        type: 'info',
        visible: true
      });
      
      // Set a timeout for fetch (client-side timeout)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 180000); // 3-minute client-side timeout (increased)
      
      try {
        const response = await fetch('/api/admin/user-payments', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: userEmail,
            userId: userId,
            // Request a longer timeout if this is a retry
            requestTimeout: retryCount > 0 ? 150000 : 90000 // Ask for 2.5 minutes on retry, 1.5 minute for first try
          }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        // Handle different error status codes
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          
          // Special handling for timeout errors (504 Gateway Timeout or explicit timeout flag)
          if (response.status === 504 || errorData.isTimeout) {
            if (retryCount < 1) { // Allow one retry
              setToast({
                message: `First attempt timed out. Retrying with a longer timeout...`,
                type: 'info',
                visible: true
              });
              
              // Wait a moment before retrying to allow potential server resources to free up
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              // Recursive call with incremented retry count
              return fetchStripePayments(userEmail, userId, retryCount + 1);
            } else {
              setToast({
                message: `Request timed out after retry. This user may have many transactions that take longer to process. Try again later.`,
                type: 'error',
                visible: true
              });
              return;
            }
          }
          
          // Handle other errors
          throw new Error(errorData.error || `Server responded with status: ${response.status}`);
        }
        
        const data = await response.json();
        
        console.log(`Loaded ${data.payments?.length || 0} payments from Stripe for ${userEmail}`);
        console.log('Payment stats:', data.stats);
        
        setStripePayments(data.payments || []);
        setStripePaymentStats(data.stats || null);
        
        if (data.payments?.length > 0) {
          setToast({
            message: `Successfully loaded ${data.payments.length} payments from Stripe!`,
            type: 'success',
            visible: true
          });
        } else {
          setToast({
            message: `No payments found for ${userEmail}`,
            type: 'info',
            visible: true
          });
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (error) {
      console.error('Error fetching Stripe payments:', error);
      
      // Create user-friendly error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Check for AbortError (client-side timeout)
      if (error instanceof DOMException && error.name === 'AbortError') {
        setToast({
          message: `The request was aborted due to taking too long. The user may have too many transactions to process at once.`,
          type: 'error',
          visible: true
        });
      }
      // Check for timeout-related errors in the error message
      else if (errorMessage.includes('timed out') || errorMessage.includes('timeout')) {
        setToast({
          message: `The request timed out. This user may have too many transactions to process at once. Try again later.`,
          type: 'error',
          visible: true
        });
      } else {
        // Generic error message for other errors
        setToast({
          message: `Failed to fetch Stripe payments: ${errorMessage}`,
          type: 'error',
          visible: true
        });
      }
    } finally {
      setIsLoadingStripePayments(false);
    }
  }, [user, setToast, setIsLoadingStripePayments, setStripePayments, setStripePaymentStats]);

  // Fetch user details with payments
  const fetchUserDetails = useCallback(async (userId: string) => {
    try {
      setIsLoading(true);
      setError(null); // Clear any previous errors
      
      // Reset stripe payment data before fetching new data
      setStripePaymentStats(null);
      setStripePayments([]);
      
      // Get Firebase token for auth
      const token = await user?.getIdToken();
      
      if (!userId) {
        throw new Error('Cannot fetch user details: User ID is missing');
      }
      
      console.log(`Fetching details for user: ${userId}`);
      
      const response = await fetch(`/api/admin/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        // Try to get error details from the response
        let errorMessage = 'Failed to fetch user details';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If we can't parse JSON, use the status text
          errorMessage = `${errorMessage}: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      
      if (!data.user) {
        throw new Error('User data not found in response');
      }
      
      console.log('Received user details:', data.user); // Log detailed user data

      
      setSelectedUser(data.user);
      
      // Only auto-fetch Stripe payments after component is mounted (client-side)
      // This will be handled by a useEffect below instead
    } catch (error) {
      console.error('Error fetching user details:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while fetching user details');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Refresh all users data
  const refreshAllUsers = async () => {
    fetchUsers();
  };

  // Load users on component mount
  useEffect(() => {
    if (user?.isAdmin) {
      fetchUsers();
    }
  }, [user, fetchUsers]);

  // Handle search
  const handleSearch = () => {
    setIsSearching(true);
    
    if (!searchTerm.trim()) {
      setSearchResults(allUsers);
      setIsSearching(false);
      return;
    }
    
    const term = searchTerm.toLowerCase().trim();
    const results = allUsers.filter(
      user => 
        user.email?.toLowerCase().includes(term) || 
        user.displayName?.toLowerCase().includes(term) ||
        user.name?.toLowerCase().includes(term)
    );
    
    setSearchResults(results);
    setIsSearching(false);
  };

  // Handle user selection
  const viewUserProfile = (userId: string) => {
    console.log('ViewUserProfile called with userId:', userId);
    console.log('User object type:', typeof userId);
    
    if (!userId) {
      console.error('User ID is missing or undefined');
      setError('Cannot view profile: User ID is missing');
      return;
    }
    
    // Reset stripe payment stats and payments when selecting a new user
    setStripePaymentStats(null);
    setStripePayments([]);
    
    fetchUserDetails(userId);
  };

  // Format currency
  const formatCurrency = (amount: number, currency = 'EUR') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  // Format user name
  const formatName = (name: string | null | undefined): string => {
    if (!name) return 'No Name Provided';
    
    // Check if name is all uppercase
    const isAllUppercase = name === name.toUpperCase();
    if (!isAllUppercase) return name;
    
    return name
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Refresh user data - force refresh
  const refreshUserData = async () => {
    if (!selectedUser) return;
    
    setIsRefreshing(true);
    
    try {     
      // Fetch fresh data
      await fetchUserDetails(selectedUser.id);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Add this useEffect to hide toast after a delay
  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(() => {
        setToast(prev => ({ ...prev, visible: false }));
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [toast.visible]);

  // Add a useEffect to fetch payments after the component mounts on client side
  useEffect(() => {
    if (isClient && selectedUser && selectedUser.email) {
      fetchStripePayments(selectedUser.email, selectedUser.uid);
    }
  }, [isClient, selectedUser, fetchStripePayments]);

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex justify-center items-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
          <div className="text-lg text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative h-[40vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-black/50 z-10"></div>
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url('/images/greenhouse/image (1).jpg')" }}
          ></div>
          <div className="absolute inset-0 bg-gradient-to-b from-primary/30 to-primary/10 mix-blend-overlay"></div>
        </div>
        
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white drop-shadow-lg shadow-black mb-4">
            Student Management
          </h1>
          <p className="text-lg text-white max-w-2xl mx-auto font-medium drop-shadow-md">
            Search and manage student profiles and payment records
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-16 max-w-6xl -mt-8 relative z-10">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          {/* Error display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              <p className="font-medium mb-1">Error</p>
              <p>{error}</p>
            </div>
          )}

          {selectedUser ? (
            // User profile view
            <div>
              {/* Back button */}
              <button 
                onClick={() => setSelectedUser(null)}
                className="flex items-center gap-2 mb-6 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <ArrowLeft size={16} />
                Back to Search Results
              </button>
              
              {/* User profile header */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 pb-6 border-b">
                <div className="flex items-center mb-4 md:mb-0">
                  <div className="bg-primary/10 p-4 rounded-full mr-4">
                    <User size={32} className="text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gradient-green">
                      {formatName(selectedUser.displayName || selectedUser.name)}
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                      <Mail size={14} className="text-gray-500" />
                      <p className="text-gray-600">{selectedUser.email}</p>
                    </div>
                    {selectedUser.phone && (
                      <div className="flex items-center gap-2 mt-1">
                        <Phone size={14} className="text-gray-500" />
                        <p className="text-gray-600">{selectedUser.phone}</p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <button
                    onClick={refreshUserData}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded flex items-center gap-2 transition-colors"
                    disabled={isRefreshing}
                  >
                    {isRefreshing ? (
                      <span className="flex items-center gap-2">
                        <RefreshCw size={16} className="animate-spin" />
                        Refreshing...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <RefreshCw size={16} />
                        Refresh Data
                      </span>
                    )}
                  </button>
                </div>
              </div>
              
              {/* User status and roles */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                  <h3 className="text-sm uppercase text-gray-500 font-medium mb-2">Account Status</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedUser.isAdmin && (
                      <span key="admin-role" className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                        Admin
                      </span>
                    )}
                    {selectedUser.isStaff && (
                      <span key="staff-role" className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                        Staff
                      </span>
                    )}
                    {selectedUser.isApproved && (
                      <span key="approved-role" className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                        Approved Student
                      </span>
                    )}
                    {!selectedUser.isAdmin && !selectedUser.isStaff && !selectedUser.isApproved && (
                      <span key="basic-role" className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                        Basic User
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                  <h3 className="text-sm uppercase text-gray-500 font-medium mb-2">Joined</h3>
                  <p className="font-medium text-gray-800">
                    {selectedUser.createdAt ? (
                      new Date(selectedUser.createdAt).toLocaleDateString()
                    ) : 'Unknown'}
                  </p>
                  {selectedUser.createdAt && (
                    <p className="text-sm text-gray-500 mt-1">
                      {formatDistanceToNow(new Date(selectedUser.createdAt), { addSuffix: true })}
                    </p>
                  )}
                </div>
                
                <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                  <h3 className="text-sm uppercase text-gray-500 font-medium mb-2">Last Login</h3>
                  <p className="font-medium text-gray-800">
                    {selectedUser.lastLoginAt ? (
                      new Date(selectedUser.lastLoginAt).toLocaleDateString()
                    ) : 'Never'}
                  </p>
                  {selectedUser.lastLoginAt && (
                    <p className="text-sm text-gray-500 mt-1">
                      {formatDistanceToNow(new Date(selectedUser.lastLoginAt), { addSuffix: true })}
                    </p>
                  )}
                </div>
              </div>
              
              {/* Payment summary */}
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-4">Payment Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-green-50 p-5 rounded-xl border border-green-200">
                    <div className="flex items-center mb-2">
                      <CreditCard className="text-green-600 mr-2" size={18} />
                      <span className="font-medium text-green-800">Total Spent (Stripe)</span>
                    </div>
                    <p className="text-2xl font-bold text-gradient-green">
                      {isLoadingStripePayments ? (
                        <span className="flex items-center gap-2">
                          <Loader2 size={18} className="animate-spin text-gray-400" />
                          <span className="text-gray-400">Loading...</span>
                        </span>
                      ) : stripePaymentStats ? (
                        formatCurrency(stripePaymentStats.totalSpent)
                      ) : (
                        <span className="text-gray-400">No data</span>
                      )}
                    </p>
                    
                    {stripePaymentStats && (selectedUser?.isApproved || selectedUser?.isStaff) && (
                      <div className="mt-4">
                        <div className="h-3 w-full bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-primary to-emerald-500 rounded-full"
                            style={{ 
                              width: `${Math.min(100, Math.round((stripePaymentStats.totalSpent / (selectedUser?.isApproved ? 850 : 550)) * 100))}%` 
                            }}
                          ></div>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {Math.min(100, Math.round((stripePaymentStats.totalSpent / (selectedUser?.isApproved ? 850 : 550)) * 100))}% of required amount
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="bg-blue-50 p-5 rounded-xl border border-blue-200">
                    <div className="flex items-center mb-2">
                      <Clock className="text-blue-600 mr-2" size={18} />
                      <span className="font-medium text-blue-800">Successful Payments</span>
                    </div>
                    <p className="text-2xl font-bold text-gradient-green">
                      {isLoadingStripePayments ? (
                        <span className="flex items-center gap-2">
                          <Loader2 size={18} className="animate-spin text-gray-400" />
                          <span className="text-gray-400">Loading...</span>
                        </span>
                      ) : (
                        stripePaymentStats?.successfulPayments || 0
                      )}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Total payments: {isLoadingStripePayments ? (
                        <span className="inline-flex items-center">
                          <Loader2 size={12} className="animate-spin text-gray-400 mr-1" />
                          Loading...
                        </span>
                      ) : (
                        stripePaymentStats?.totalPayments || 0
                      )}
                    </p>
                  </div>
                  
                  <div className="bg-yellow-50 p-5 rounded-xl border border-yellow-200">
                    <div className="flex items-center mb-2">
                      <FileText className="text-yellow-600 mr-2" size={18} />
                      <span className="font-medium text-yellow-800">Recent Activity</span>
                    </div>
                    <p className="text-md text-gray-700">
                      {isLoadingStripePayments ? (
                        <span className="flex items-center gap-2">
                          <Loader2 size={18} className="animate-spin text-gray-400" />
                          <span className="text-gray-400">Loading payment data...</span>
                        </span>
                      ) : stripePayments && stripePayments.length > 0 ? (
                        `Last payment: ${new Date(Number(stripePayments[0].created) * 1000).toLocaleDateString()}`
                      ) : (
                        'No payment history'
                      )}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Payment information message */}
              <div className="mb-8">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start">
                  <Info className="text-blue-500 mr-3 mt-0.5 flex-shrink-0" size={20} />
                  <div>
                    <p className="text-blue-800 font-medium">Payment data is loaded directly from Stripe</p>
                    <p className="text-blue-600 text-sm mt-1">
                      Payment information is fetched in real-time from Stripe rather than from the database.
                      This ensures the most up-to-date payment information is always available.
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Payment History Section - Direct from Stripe */}
              <div className="bg-white rounded-xl shadow-lg overflow-hidden mt-6">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center">
                    <CreditCard className="text-primary mr-3" size={24} />
                    <h2 className="text-2xl font-bold text-primary">Payment History</h2>
                  </div>
                  
                  {isClient && (
                    <PaymentRefreshButton
                      onClick={() => fetchStripePayments(selectedUser.email || '', selectedUser.uid)}
                      isLoading={isLoadingStripePayments}
                    />
                  )}
                </div>
              </div>
            </div>
          ) : (
            // Search interface
            <div>
              <div className="mb-12">
                <h2 className="text-2xl font-bold mb-4">Search Students</h2>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-grow">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
                      placeholder="Search by name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          handleSearch();
                        }
                      }}
                    />
                  </div>
                  <button
                    onClick={handleSearch}
                    disabled={isSearching}
                    className="md:w-auto w-full px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    {isSearching ? 'Searching...' : 'Search'}
                  </button>
                  <button
                    onClick={refreshAllUsers}
                    className="md:w-auto w-full px-6 py-3 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors flex items-center justify-center gap-2"
                  >
                    <RefreshCw size={16} />
                    Refresh Data
                  </button>
                </div>
              </div>
              
              {/* Search results */}
              <div className="mt-6">
                <h3 className="text-xl font-bold mb-4">
                  {searchTerm ? `Search Results (${searchResults.length})` : `All Students (${searchResults.length})`}
                </h3>
                
                {searchResults.length === 0 ? (
                  <div className="bg-gray-50 p-8 rounded-xl text-center">
                    <User size={32} className="mx-auto mb-2 text-gray-400" />
                    <p className="text-gray-500">No students found. Try a different search term.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border rounded-xl">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {searchResults.map((userProfile) => (
                          <tr key={userProfile.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {formatName(userProfile.displayName || userProfile.name)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">{userProfile.email}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-wrap gap-1">
                                {userProfile.isAdmin && (
                                  <span key="admin-badge" className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">
                                    Admin
                                  </span>
                                )}
                                {userProfile.isStaff && (
                                  <span key="staff-badge" className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                                    Staff
                                  </span>
                                )}
                                {userProfile.isApproved && (
                                  <span key="approved-badge" className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                                    Approved
                                  </span>
                                )}
                                {(!userProfile.isAdmin && !userProfile.isStaff && !userProfile.isApproved) || 
                                 (typeof userProfile.isAdmin === 'undefined' && 
                                  typeof userProfile.isStaff === 'undefined' && 
                                  typeof userProfile.isApproved === 'undefined' && 
                                  userProfile.roles && userProfile.roles.length === 0) && (
                                  <span key="basic-badge" className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                                    Basic
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">
                                {userProfile.createdAt ? (
                                  new Date(userProfile.createdAt).toLocaleDateString()
                                ) : 'Unknown'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <button
                                onClick={() => viewUserProfile(userProfile.id)}
                                className="inline-flex items-center px-3 py-1.5 bg-primary/10 hover:bg-primary/20 
                                          text-white rounded-lg transition-colors"
                              >
                                <Eye size={16} className="mr-1" />
                                View Profile
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {isClient && <Footer />}

      {/* Toast Notification */}
      {isClient && (
        <div
          className={`fixed bottom-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-md transition-all duration-300 transform ${
            toast.visible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'
          } ${
            toast.type === 'success'
              ? 'bg-green-500 text-white'
              : toast.type === 'error'
              ? 'bg-red-500 text-white'
              : 'bg-blue-500 text-white'
          }`}
        >
          <div className="flex items-center">
            {toast.type === 'success' && (
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            )}
            {toast.type === 'error' && (
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            )}
            {toast.type === 'info' && (
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
} 