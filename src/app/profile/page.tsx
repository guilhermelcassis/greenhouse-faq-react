"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { formatDistanceToNow } from 'date-fns';
import { User, LogOut, CreditCard, Clock, FileText } from 'lucide-react';
import { Footer } from '@/components/Footer';


// Utility function to convert name to proper case
function formatName(name: string | null | undefined): string | null | undefined {
  if (!name) return name;
  
  // Check if the name is all uppercase
  const isAllUppercase = name === name.toUpperCase();
  
  if (!isAllUppercase) return name; // Return as is if not all uppercase
  
  return name
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

interface StripePayment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created: string;
  email: string;
  refunded: boolean;
  description: string | null;
  amount_eur: number | null;
  receipt_url: string | null;
  billing_details?: {
    email?: string;
  };
  balance_transaction?: {
    id: string;
    amount: number;
    available_on: number;
    created: number;
    currency: string;
    description: string | null;
    exchange_rate: number | null;
    fee: number;
    net: number;
    status: string;
    type: string;
  };
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading, signOut: firebaseSignOut } = useAuth();
  
  const [payments, setPayments] = useState<StripePayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalSpent, setTotalSpent] = useState<number>(0);
  const [isClient, setIsClient] = useState(false);
  const [dbUserName, setDbUserName] = useState<string | null>(null);
  const [isLoadingName, setIsLoadingName] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState<string>('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [toast, setToast] = useState<{message: string; type: 'success' | 'error' | 'info'; visible: boolean}>({
    message: '',
    type: 'info',
    visible: false
  });
  
  // Get required total based on user type
  const getRequiredTotal = () => {
    if (!user) return 0;
    if (user.isApproved) return 850;
    if (user.isStaff) return 550;
    return 0;
  };
  
  // Calculate payment completion percentage
  const calculatePaymentPercentage = () => {
    const requiredTotal = getRequiredTotal();
    if (requiredTotal === 0) return 0;
    return Math.min(100, Math.round((totalSpent / requiredTotal) * 100));
  };
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const fetchStripePayments = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Get the Firebase auth token
      const token = user ? await user.getIdToken() : null;
      
      const response = await fetch('/api/payments/user', {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch payment history');
      }
      
      const data = await response.json();
      
      // Add detailed logging
      console.log('API Response:', data);
      console.log('Payments count:', data.payments?.length);
      
      // Log each payment with its details
      if (data.payments?.length > 0) {
        data.payments.forEach((payment: StripePayment, index: number) => {
          console.log(`Payment ${index + 1}:`, {
            id: payment.id,
            amount: payment.amount,
            amount_eur: payment.amount_eur,
            currency: payment.currency,
            status: payment.status,
            email: payment.email || payment.billing_details?.email,
            receipt_url: payment.receipt_url
          });
        });
      } else {
        console.log('No payments returned from API');
      }
      
      setPayments(data.payments || []);
      
      // Calculate total spent in euros only - with detailed logging
      let totalEuros = 0;
      if (data.payments?.length > 0) {
        // Log each payment processing step
        data.payments
          .filter((payment: StripePayment) => {
            // Check if the payment status is 'succeeded'
            if (payment.status === 'succeeded' && !payment.refunded && !(payment.description?.toLowerCase().includes('refund'))) {
              const isSucceeded = payment.status === 'succeeded';
              console.log(`Payment ${payment.id} status:`, payment.status, isSucceeded ? 'COUNTED' : 'SKIPPED');
              return isSucceeded;
            }
          })
          .forEach((payment: StripePayment) => {
            // Check if the payment status is 'succeeded'
            if (payment.status === 'succeeded' && !payment.refunded && !(payment.description?.toLowerCase().includes('refund'))) {
              // Log the detailed payment information for debugging
              console.log('Payment details for calculation:', {
                paymentId: payment.id,
                currency: payment.currency,
                amount: payment.amount,
                amount_eur: payment.amount_eur,
                balance_transaction: payment.balance_transaction ? {
                  currency: payment.balance_transaction.currency,
                  amount: payment.balance_transaction.amount,
                  exchange_rate: payment.balance_transaction.exchange_rate
                } : 'N/A'
              });
              
              // Use balance_transaction.amount when available for the actual EUR amount
              const amount = payment.balance_transaction?.currency === 'eur' 
                ? payment.balance_transaction.amount / 100 
                : (payment.currency === 'eur' ? payment.amount / 100 : (payment.amount_eur || payment.amount) / 100);
              
              console.log(`Adding amount to total: €${amount}`);
              totalEuros += amount;
            }
          });
      }
      
      console.log('Final calculated total euros:', totalEuros);
      
      // Set just the euro total
      setTotalSpent(totalEuros);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);
  
  useEffect(() => {
    // Redirect if not logged in (using Firebase only)
    if (!loading && !user) {
      router.push('/login?redirect=/profile');
    }
  }, [user, loading, router]);
  
  // Separate useEffect for fetching payments after auth is confirmed
  useEffect(() => {
    // If user is authenticated, fetch payments
    if (user) {
      fetchStripePayments();
    }
  }, [user, fetchStripePayments]);
  
  // Fetch user name from database when email is available but display name is not
  const fetchUserNameFromDB = useCallback(async () => {
    if (!user?.email || user?.displayName) return; // Skip if email not available or display name exists
    
    try {
      setIsLoadingName(true);
      console.log('Fetching user name from database for email:', user.email);
      
      // Get the Firebase auth token for authorization
      const token = await user.getIdToken();
      
      // Call the API to fetch user details from database
      const response = await fetch('/api/user/details', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch user details');
      }
      
      const data = await response.json();
      console.log('User details from database:', data);
      
      // Set the user's name from database if available
      if (data.name) {
        const formattedName = formatName(data.name);
        if (formattedName) {
          setDbUserName(formattedName);
        } else {
          setDbUserName(data.name);
        }
      }
    } catch (error) {
      console.error('Error fetching user name from database:', error);
    } finally {
      setIsLoadingName(false);
    }
  }, [user]);
  
  // Call fetchUserNameFromDB when user is available
  useEffect(() => {
    if (user && !user.displayName) {
      fetchUserNameFromDB();
    }
  }, [user, fetchUserNameFromDB]);
  
  // Handle update of user name
  const handleUpdateName = async () => {
    if (!user || !nameInput.trim()) return;
    
    try {
      setIsSavingName(true);
      
      // Get the Firebase auth token for authorization
      const token = await user.getIdToken();
      
      // Call the API to update user details in database
      const response = await fetch('/api/user/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: nameInput.trim()
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update user name');
      }
      
      const data = await response.json();
      console.log('User name update response:', data);
      
      // Update the local state with the new name
      setDbUserName(formatName(data.name) || data.name);
      setIsEditingName(false);
      
      // Show personalized success notification
      setToast({ 
        message: `Your name has been updated to ${formatName(data.name) || data.name}!`, 
        type: 'success', 
        visible: true 
      });
    } catch (error) {
      console.error('Error updating user name:', error);
      setToast({ 
        message: 'There was a problem updating your name. Please try again.', 
        type: 'error', 
        visible: true 
      });
    } finally {
      setIsSavingName(false);
    }
  };
  
  // Initialize name input when entering edit mode
  useEffect(() => {
    if (isEditingName) {
      setNameInput(user?.displayName || dbUserName || '');
    }
  }, [isEditingName, user?.displayName, dbUserName]);
  
  // Auto-hide toast after delay
  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(() => {
        setToast(prev => ({ ...prev, visible: false }));
      }, 3000); // Hide after 3 seconds
      
      return () => clearTimeout(timer);
    }
  }, [toast.visible]);
  
  const handleSignOut = async () => {
    try {
      // Sign out from Firebase only
      if (user) await firebaseSignOut();
      
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex justify-center items-center">
        <div className="animate-pulse text-lg">Loading...</div>
      </div>
    );
  }
  
  // Use data from Firebase auth and database
  const email = user?.email;

  return (
    <div className="min-h-screen bg-background">
      {/* Toast Notification */}
      <div 
        className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-xl max-w-md transform transition-all duration-500 ease-in-out
          ${toast.visible 
            ? 'translate-x-0 opacity-100' 
            : 'translate-x-full opacity-0 pointer-events-none'
          }
          ${toast.type === 'success' ? 'bg-gradient-to-r from-green-500 to-green-600 text-white' : 
            toast.type === 'error' ? 'bg-gradient-to-r from-red-500 to-red-600 text-white' : 
            'bg-gradient-to-r from-primary to-primary-dark text-white'}`}
      >
        <div className="flex items-center">
          {toast.type === 'success' && (
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/20 mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
          {toast.type === 'error' && (
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/20 mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          )}
          {toast.type === 'info' && (
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/20 mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          )}
          <div>
            <p className="font-medium">{toast.message}</p>
          </div>
          <button
            onClick={() => setToast(prev => ({ ...prev, visible: false }))}
            className="ml-auto text-white/80 hover:text-white transition-colors p-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Hero Section with background image */}
      <section className="relative h-[50vh] flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-black/50 z-10"></div>
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: "url('/images/gh2/image (6).jpg')",
              filter: "saturate(1.2)"
            }}
          ></div>
          <div className="absolute inset-0 bg-gradient-to-b from-primary/30 to-primary/10 mix-blend-overlay"></div>
        </div>
        
        <div className="relative z-10 text-center space-y-6 px-4 max-w-4xl mx-auto animate-fade-in">
          <div className="">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-white drop-shadow-lg shadow-black mb-4">
              Revivalist Profile
            </h1>
            <p className="text-xl text-white max-w-2xl mx-auto font-medium drop-shadow-md mb-6">
              Manage your account and view your payment history
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 -mt-2 relative z-10">
        <div className="max-w-5xl mx-auto">
          {/* Profile Card */}
          <div className="bg-white rounded-xl shadow-lg border-green-subtle card-hover-effect p-8 mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between">
              <div className="flex items-center space-x-4 mb-6 md:mb-0">
                <div className="p-3 bg-primary/10 rounded-full text-primary">
                  <User size={36} />
                </div>
                <div className={`${isEditingName ? 'w-full' : ''}`}>
                  {isEditingName ? (
                    <div className="flex flex-col space-y-2">
                      <div className="relative">
                        <input
                          type="text"
                          value={nameInput}
                          onChange={(e) => setNameInput(e.target.value)}
                          className="w-full text-lg font-medium border border-green-300 rounded-lg px-3 py-2 
                            focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white shadow-sm"
                          placeholder="Enter your name"
                          disabled={isSavingName}
                          autoFocus
                        />
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={handleUpdateName}
                          disabled={isSavingName || !nameInput.trim()}
                          className={`flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            isSavingName || !nameInput.trim()
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-primary hover:bg-primary/90 text-white'
                          }`}
                          aria-label="Save name"
                        >
                          {isSavingName ? (
                            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                              <path d="M20 6L9 17l-5-5"></path>
                            </svg>
                          )}
                          Save
                        </button>
                        <button
                          onClick={() => setIsEditingName(false)}
                          disabled={isSavingName}
                          className={`flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium
                            ${isSavingName ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 
                              'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                          aria-label="Cancel editing"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <h2 className="text-2xl font-bold text-gradient-green mr-2">
                        {formatName(user?.displayName) || formatName(dbUserName) || (
                          isLoadingName ? (
                            <span className="flex items-center">
                              <span className="animate-pulse bg-secondary/20 h-6 w-32 inline-block rounded mr-2"></span>
                              <span className="text-gray-500 text-sm font-normal">Loading name...</span>
                            </span>
                          ) : 'No Name Provided'
                        )}
                      </h2>
                      {!isLoadingName && (
                        <button
                          onClick={() => setIsEditingName(true)}
                          className="flex items-center justify-center p-1.5 rounded-full bg-primary hover:bg-primary/90 text-white transition-colors"
                          title="Edit name"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                          </svg>
                        </button>
                      )}
                    </div>
                  )}
                  <p className="text-gray-600 mt-1">{email}</p>
                </div>
              </div>
              
              <button
                onClick={handleSignOut}
                className="flex items-center justify-center gap-2 py-2 px-4 bg-red-50 hover:bg-red-100 
                          text-red-600 rounded-lg transition-colors"
              >
                <LogOut size={18} />
                Sign Out
              </button>
            </div>
            
            <div className="mt-8 pt-6 border-t border-gray-100">
              <h3 className="text-xl font-semibold mb-4">Account Summary</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-secondary/10 p-6 rounded-xl border border-green-subtle">
                  <div className="flex items-center mb-2">
                    <CreditCard className="text-primary mr-2" size={20} />
                    <p className="text-sm font-medium text-gray-600">Total Spent</p>
                  </div>
                  {isLoading ? (
                    <div className="animate-pulse bg-secondary/20 h-8 w-24 rounded mb-2"></div>
                  ) : (
                    <>
                      <p className="text-3xl font-bold text-gradient-green">
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'EUR',
                        }).format(totalSpent)}
                        {(user?.isApproved || user?.isStaff) && (
                          <span className="text-lg ml-1 font-medium text-gray-500">
                            /{new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: 'EUR',
                            }).format(getRequiredTotal())}
                          </span>
                        )}
                      </p>
                      
                      {(user?.isApproved || user?.isStaff) && getRequiredTotal() > 0 && (
                        <div className="mt-4">
                          <div className="h-3 w-full bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-primary to-emerald-500 rounded-full transition-all duration-500"
                              style={{ width: `${calculatePaymentPercentage()}%` }}
                            ></div>
                          </div>
                          <p className="text-sm text-gray-600 mt-1 font-medium">
                            {calculatePaymentPercentage()}% completed
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
                
                <div className="bg-secondary/10 p-6 rounded-xl border border-green-subtle">
                  <div className="flex items-center mb-2">
                    <Clock className="text-primary mr-2" size={20} />
                    <p className="text-sm font-medium text-gray-600">Total Payments</p>
                  </div>
                  <p className="text-3xl font-bold text-gradient-green">
                    {isLoading ? (
                      <span className="animate-pulse bg-secondary/20 h-8 w-12 inline-block rounded"></span>
                    ) : payments.length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Payment History */}
      <div className="max-w-5xl mx-auto px-4 mb-16">
        <div className="bg-white rounded-xl shadow-lg border-green-subtle card-hover-effect overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center">
            <FileText className="text-primary mr-3" size={24} />
            <h2 className="text-2xl font-bold text-gradient-green">Payment History</h2>
          </div>
          
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="animate-pulse flex space-x-4 mb-4 justify-center">
                <div className="rounded-full bg-secondary/20 h-12 w-12"></div>
                <div className="flex-1 space-y-4 max-w-md">
                  <div className="h-4 bg-secondary/20 rounded w-3/4"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-secondary/20 rounded"></div>
                    <div className="h-4 bg-secondary/20 rounded w-5/6"></div>
                  </div>
                </div>
              </div>
              <p className="text-gray-500">Loading payment history...</p>
            </div>
          ) : payments.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mb-4 text-primary opacity-50">
                <CreditCard size={48} className="mx-auto" />
              </div>
              <p className="text-lg text-gray-500">{"You haven't made any payments yet."}</p>
            </div>
          ) : (
            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
              <table className="w-full">
                <thead className="bg-secondary/10">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-primary uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-primary uppercase tracking-wider">Email</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-primary uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-primary uppercase tracking-wider">Receipt</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-primary uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {payments
                  .filter(payment => payment.status !== 'failed' && !payment.refunded && !(payment.description?.toLowerCase().includes('refund')))
                  .map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-800">
                          {new Date(Number(payment.created) * 1000).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(Number(payment.created) * 1000), { addSuffix: true })}
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-600">{payment.email}</td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm font-medium text-gray-800">
                        {payment.balance_transaction?.currency === 'eur' ? (
                          new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'EUR',
                          }).format(payment.balance_transaction.amount / 100)
                        ) : (
                          new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: payment.currency.toUpperCase(),
                          }).format((payment.amount_eur || payment.amount) / 100)
                        )}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm">
                        {payment.receipt_url ? ( 
                          <a 
                            href={payment.receipt_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 hover:bg-primary/20 
                                      text-primary rounded-full transition-colors"
                          >
                            <FileText size={14} />
                            View Receipt
                          </a>
                        ) : (
                          'N/A'
                        )}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          payment.status === 'succeeded' ? 'bg-green-100 text-green-800 px-3 py-1' : 
                          payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800 px-3 py-1' : 
                          'bg-red-100 text-red-800 px-3 py-1'
                        }`}>
                          {payment.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Additional Info Section */}
      <section className="py-12 bg-green-pattern-light relative z-10">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-6 text-gradient-green">Be ready for Revival</h2>          
          <div className="flex justify-center">
            <button
              onClick={() => router.push('/payments')}
              className="py-3 px-6 bg-primary text-white rounded-lg hover:bg-primary/90 
                        transition-colors shadow-md hover:shadow-lg flex items-center gap-2"
            >
              <CreditCard size={18} />
              Make Another Payment
            </button>
          </div>
        </div>
      </section>
      
      {isClient && <Footer />}
    </div>
  );
} 