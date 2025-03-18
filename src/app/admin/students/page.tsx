"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { User, Search, CreditCard, FileText, Clock, ArrowLeft, Mail, Phone, Eye, RefreshCw, Info } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Footer } from '@/components/Footer';
import { getCache, setCache, clearCache } from '@/lib/cache-utils';

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
      
      // Check cache first
      const cacheKey = 'all_users_cache';
      const cachedUsers = getCache<UserProfile[]>(cacheKey);
      
      if (cachedUsers) {
        console.log(`Using cached data for all users (${cachedUsers.length} users)`);
        setAllUsers(cachedUsers);
        setSearchResults(cachedUsers);
        setIsLoading(false);
        return;
      }
      
      // No valid cache, fetch from API
      console.log('No valid cache found, fetching users from API');
      
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
      
      // Cache the result
      if (data.users && Array.isArray(data.users)) {
        setCache(cacheKey, data.users);
      }
      
      setAllUsers(data.users || []);
      setSearchResults(data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while fetching users');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Fetch user details with payments
  const fetchUserDetails = useCallback(async (userId: string) => {
    try {
      setIsLoading(true);
      setError(null); // Clear any previous errors
      
      // Check cache first
      const cacheKey = `user_details_${userId}`;
      const cachedUserDetails = getCache<UserProfile>(cacheKey);
      
      if (cachedUserDetails) {
        console.log(`Using cached data for user ${userId}`);
        setSelectedUser(cachedUserDetails);
        setIsLoading(false);
        return;
      }
      
      // No valid cache, fetch from API
      console.log(`No valid cache found, fetching details for user ${userId} from API`);
      
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
      
      // Cache the result
      setCache(cacheKey, data.user);
      
      setSelectedUser(data.user);
      console.log(`Loaded ${data.user.payments?.length || 0} payments for user ${data.user.email}`);
    } catch (error) {
      console.error('Error fetching user details:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while fetching user details');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Refresh all users data
  const refreshAllUsers = async () => {
    // Clear the cache for all users
    clearCache('all_users_cache');
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
    
    fetchUserDetails(userId);
  };

  // Format currency
  const formatCurrency = (amount: number, currency = 'EUR') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  // Calculate payment completion percentage for students
  const calculatePaymentPercentage = (profile: UserProfile) => {
    let requiredTotal = 0;
    
    if (profile.isApproved) requiredTotal = 850;
    else if (profile.isStaff) requiredTotal = 550;
    
    if (requiredTotal === 0 || profile.totalSpent === undefined) return 0;
    return Math.min(100, Math.round((profile.totalSpent / requiredTotal) * 100));
  };

  // Back to search results
  const backToSearch = () => {
    setSelectedUser(null);
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

  // Refresh user data - bypass cache and force refresh
  const refreshUserData = async () => {
    if (!selectedUser) return;
    
    setIsRefreshing(true);
    
    try {
      // Clear the cache for this user
      clearCache(`user_details_${selectedUser.id}`);
      
      // Fetch fresh data
      await fetchUserDetails(selectedUser.id);
    } finally {
      setIsRefreshing(false);
    }
  };


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
                onClick={backToSearch}
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
                      <span className="font-medium text-green-800">Total Spent</span>
                    </div>
                    <p className="text-2xl font-bold text-gradient-green">
                      {formatCurrency(selectedUser.totalSpent || 0)}
                    </p>
                    
                    {(selectedUser.isApproved || selectedUser.isStaff) && (
                      <div className="mt-4">
                        <div className="h-3 w-full bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-primary to-emerald-500 rounded-full"
                            style={{ width: `${calculatePaymentPercentage(selectedUser)}%` }}
                          ></div>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {calculatePaymentPercentage(selectedUser)}% of required amount
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="bg-blue-50 p-5 rounded-xl border border-blue-200">
                    <div className="flex items-center mb-2">
                      <Clock className="text-blue-600 mr-2" size={18} />
                      <span className="font-medium text-blue-800">Completed Payments</span>
                    </div>
                    <p className="text-2xl font-bold text-gradient-green">
                      {selectedUser.payments?.filter(p => p.status === 'succeeded').length || 0}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Total payments: {selectedUser.payments?.length || 0}
                    </p>
                  </div>
                  
                  <div className="bg-yellow-50 p-5 rounded-xl border border-yellow-200">
                    <div className="flex items-center mb-2">
                      <FileText className="text-yellow-600 mr-2" size={18} />
                      <span className="font-medium text-yellow-800">Recent Activity</span>
                    </div>
                    <p className="text-md text-gray-700">
                      {selectedUser.payments && selectedUser.payments.length > 0 ? (
                        `Last payment: ${new Date(Number(selectedUser.payments[0].created) * 1000).toLocaleDateString()}`
                      ) : (
                        'No payment history'
                      )}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Payment history */}
              <div>
                <h3 className="text-xl font-bold mb-4">Payment History</h3>
                <div className="bg-white rounded-lg border overflow-hidden">
                  {!selectedUser.payments || !Array.isArray(selectedUser.payments) || selectedUser.payments.filter(p => 
                    p.status === 'succeeded' && 
                    !p.refunded && 
                    !(p.description?.toLowerCase().includes('refund'))
                  ).length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <CreditCard size={32} className="mx-auto mb-2 text-gray-400" />
                      <p>No successful payment records found for this user.</p>
                      {selectedUser.payments && Array.isArray(selectedUser.payments) && selectedUser.payments.length > 0 && (
                        <p className="mt-2 text-sm text-gray-400">
                          Note: {selectedUser.payments.length} total payment records exist, but none are successful and non-refunded.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <div className="bg-blue-50 p-3 border-b text-sm text-blue-800">
                        <Info className="inline-block h-4 w-4 mr-1 -mt-0.5" />
                        Showing only successful payments that have not been refunded.
                      </div>
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receipt</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {Array.isArray(selectedUser.payments) && selectedUser.payments
                            .filter(payment => 
                              payment && payment.status === 'succeeded' && 
                              !payment.refunded && 
                              !(payment.description?.toLowerCase().includes('refund'))
                            )
                            .sort((a, b) => Number(b.created) - Number(a.created)) // Sort by date, newest first
                            .map(payment => (
                              <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">
                                    {new Date(Number(payment.created) * 1000).toLocaleDateString()}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {formatDistanceToNow(new Date(Number(payment.created) * 1000), { addSuffix: true })}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900">
                                    {formatCurrency(
                                      payment.amount_eur ? payment.amount_eur / 100 : payment.amount / 100,
                                      payment.currency?.toUpperCase() || 'EUR'
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                    payment.status === 'succeeded' ? 'bg-green-100 text-green-800' : 
                                    payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    {payment.status}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {payment.receipt_url ? (
                                    <a 
                                      href={payment.receipt_url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-primary hover:text-primary-dark flex items-center gap-1"
                                    >
                                      <Eye size={14} />
                                      View
                                    </a>
                                  ) : 'N/A'}
                                </td>
                              </tr>
                            ))
                          }
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Debug information for admins */}
              <div className="mt-8 border-t pt-8">
                <details className="text-sm text-gray-500">
                  <summary className="cursor-pointer font-medium mb-2">Debug information (Admin only)</summary>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="mb-4">
                      <p className="font-medium mb-1">User information:</p>
                      <ul className="list-disc list-inside pl-4">
                        <li>ID: {selectedUser.id}</li>
                        <li>Email: {selectedUser.email}</li>
                        <li>Display Name: {selectedUser.displayName || 'Not provided'}</li>
                        <li>Name: {selectedUser.name || 'Not provided'}</li>
                      </ul>
                    </div>
                    <div>
                      <p className="font-medium mb-1">Payment information:</p>
                      <ul className="list-disc list-inside pl-4">
                        <li>Total payments loaded: {Array.isArray(selectedUser.payments) ? selectedUser.payments.length : 0}</li>
                        <li>Successful payments: {Array.isArray(selectedUser.payments) ? 
                          selectedUser.payments.filter(p => p && p.status === 'succeeded').length : 0}</li>
                        <li>Successful non-refunded payments: {Array.isArray(selectedUser.payments) ? 
                          selectedUser.payments.filter(p => 
                            p && p.status === 'succeeded' && 
                            !p.refunded && 
                            !(p.description?.toLowerCase().includes('refund'))
                          ).length : 0}
                        </li>
                        <li>Pending payments: {Array.isArray(selectedUser.payments) ? 
                          selectedUser.payments.filter(p => p && p.status === 'pending').length : 0}</li>
                        <li>Failed payments: {Array.isArray(selectedUser.payments) ? 
                          selectedUser.payments.filter(p => p && p.status === 'failed').length : 0}</li>
                        <li>Refunded payments: {Array.isArray(selectedUser.payments) ? 
                          selectedUser.payments.filter(p => 
                            p && (p.refunded || (p.description?.toLowerCase().includes('refund')))
                          ).length : 0}
                        </li>
                        <li>Payment IDs: {Array.isArray(selectedUser.payments) && selectedUser.payments.length > 0 ? 
                          selectedUser.payments
                            .filter(p => p && p.id)
                            .map(p => p.id)
                            .join(', ')
                            .substring(0, 100) + '...' : 'None'}
                        </li>
                      </ul>
                    </div>
                  </div>
                </details>
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
    </div>
  );
} 