"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Footer } from '@/components/Footer';
import { User, Plus, Trash2, Save, X, CheckCircle, AlertCircle, PenSquare } from 'lucide-react';
import { getCache, setCache, clearCache } from '@/lib/cache-utils';

// User type interface with roles array instead of type field
interface UserEmail {
  id: string;
  email: string;
  roles: string[];
  added_timestamp: FirebaseTimestamp;
}

// Type for handling various Firebase timestamp formats
type FirebaseTimestamp = {
  toDate?: () => Date;
  seconds?: number;
  nanoseconds?: number;
} | string | number | Date | null | undefined;

export default function AdminPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [isClient, setIsClient] = useState(false);
  
  
  // State for storing emails of each type
  const [adminEmails, setAdminEmails] = useState<UserEmail[]>([]);
  const [approvedEmails, setApprovedEmails] = useState<UserEmail[]>([]);
  const [staffEmails, setStaffEmails] = useState<UserEmail[]>([]);
  
  // State for bulk import
  const [bulkEmail, setBulkEmail] = useState('');
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const [bulkImportStats, setBulkImportStats] = useState<{
    total: number;
    successful: number;
    updated: number;
    duplicates: number;
    failed: number;
  } | null>(null);

  // State for user management
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Editing user state
  const [editingUser, setEditingUser] = useState<UserEmail | null>(null);
  const [editingEmail, setEditingEmail] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  
  // Deleting user state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Active tab for user lists
  const [activeTab, setActiveTab] = useState<'admin' | 'approved' | 'staff'>('admin');
  
  // Toast notification state
  const [toast, setToast] = useState({
    message: '',
    type: 'success' as 'success' | 'error' | 'info',
    visible: false
  });
  
  // Email regex pattern for validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  // Role selection state for adding/editing users
  const [userRoles, setUserRoles] = useState<Record<string, boolean>>({
    admin: false,
    approved: false,
    staff: false
  });

  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    // Redirect if not admin
    if (!loading && (!user || !user.isAdmin)) {
      router.push('/');
    }
  }, [user, loading, router]);

  // Add custom CSS for animations
  useEffect(() => {
    // Add CSS for animations if it doesn't exist yet
    if (!document.getElementById('custom-animations')) {
      const style = document.createElement('style');
      style.id = 'custom-animations';
      style.innerHTML = `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }
        
        .animate-scale-in {
          animation: scaleIn 0.3s ease-out forwards;
        }
        
        .text-gradient-green {
          background: linear-gradient(90deg, #10b981, #059669);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          color: transparent;
        }
        
        .card-hover-effect {
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        
        .card-hover-effect:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }
      `;
      document.head.appendChild(style);
    }
  }, [isClient]);

  // Fetch user emails from the database
  const fetchUserEmails = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Check cache first
      const cacheKey = 'admin_users_cache';
      const cachedUsers = getCache<UserEmail[]>(cacheKey);
      
      if (cachedUsers) {
        console.log(`[Cache] Using cached user data (${cachedUsers.length} users)`);
        processUserData(cachedUsers);
        setIsLoading(false);
        return;
      }
      
      console.log('[Cache] No valid cache found, fetching users from API');
      
      // Get the Firebase auth token
      const token = user ? await user.getIdToken() : null;
      
      // Call the API to fetch user emails
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to fetch user emails:', { 
          status: response.status, 
          statusText: response.statusText,
          errorData 
        });
        throw new Error(`Failed to fetch user emails: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Received user data:', data);
      
      // Cache the users data
      if (data.users && Array.isArray(data.users)) {
        setCache(cacheKey, data.users);
      }
      
      // Process the user data
      processUserData(data.users);
      
    } catch (error) {
      console.error('Error fetching user emails:', error);
      showToast('Failed to load user emails. Please try again.', 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user]);
  
  // Function to process user data and separate by roles
  const processUserData = (users: UserEmail[]) => {
    // Separate emails by type
    const admins: UserEmail[] = [];
    const approved: UserEmail[] = [];
    const staff: UserEmail[] = [];
    
    users.forEach((user: UserEmail) => {
      // Check each role and add to the appropriate arrays
      // This allows users to appear in multiple categories if they have multiple roles
      if (user.roles.includes('admin')) {
        admins.push(user);
      }
      
      if (user.roles.includes('approved')) {
        approved.push(user);
      }
      
      if (user.roles.includes('staff')) {
        staff.push(user);
      }
    });
    
    console.log('Processed user data:', {
      totalUsers: users.length,
      admins: admins.length,
      approved: approved.length,
      staff: staff.length
    });
    
    // Sort all arrays alphabetically by email
    admins.sort((a, b) => a.email.toLowerCase().localeCompare(b.email.toLowerCase()));
    approved.sort((a, b) => a.email.toLowerCase().localeCompare(b.email.toLowerCase()));
    staff.sort((a, b) => a.email.toLowerCase().localeCompare(b.email.toLowerCase()));
    
    setAdminEmails(admins);
    setApprovedEmails(approved);
    setStaffEmails(staff);
  };
  
  // Function to refresh user data by clearing cache
  const refreshUserData = async () => {
    setIsRefreshing(true);
    // Clear the cache
    clearCache('admin_users_cache');
    // Fetch fresh data
    await fetchUserEmails();
  };

  // Fetch user emails when component mounts
  useEffect(() => {
    if (user && user.isAdmin) {
      fetchUserEmails();
    }
  }, [user, fetchUserEmails]);

  // Auto-hide toast after delay
  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(() => {
        setToast(prev => ({ ...prev, visible: false }));
      }, 3000); // Hide after 3 seconds
      
      return () => clearTimeout(timer);
    }
  }, [toast.visible]);

  // Function to show toast notifications
  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({
      message,
      type,
      visible: true
    });
    
    // Hide the toast after 3 seconds
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 3000);
  };


  // Function to edit a user's email or role
  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingEmail) {
      showToast('Please enter an email address.', 'error');
      return;
    }
    
    if (!emailRegex.test(editingEmail)) {
      showToast('Please enter a valid email address.', 'error');
      return;
    }
    
    // Create array from selected roles
    const selectedRoles = Object.keys(userRoles).filter(role => userRoles[role]);
    
    if (selectedRoles.length === 0) {
      showToast('Please select at least one role.', 'error');
      return;
    }
    
    // If email is changed, check it doesn't conflict with existing emails
    if (editingEmail.toLowerCase() !== editingUser?.email.toLowerCase()) {
      const emailExists = [...adminEmails, ...approvedEmails, ...staffEmails]
        .some(user => 
          user.id !== editingUser?.id && 
          user.email.toLowerCase() === editingEmail.toLowerCase()
        );
      
      if (emailExists) {
        showToast('This email is already assigned to another user.', 'error');
        return;
      }
    }
    
    setIsSubmitting(true);
    
    try {
      // Get the Firebase auth token
      const token = user ? await user.getIdToken() : null;
      
      // Call the API to update the user
      const response = await fetch(`/api/admin/users?id=${editingUser?.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: editingEmail,
          roles: selectedRoles
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update user');
      }
      
      showToast(`User updated successfully!`, 'success');
      setIsEditing(false);
      fetchUserEmails();
      
    } catch (error) {
      console.error('Error updating user:', error);
      showToast('Failed to update user. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to handle role changes
  const handleRoleChange = (role: string, checked: boolean) => {
    setUserRoles(prev => ({
      ...prev,
      [role]: checked
    }));
  };

  // Function to reset role selections
  const resetRoleSelections = () => {
    setUserRoles({
      admin: false,
      approved: false,
      staff: false
    });
  };

  // Function to prepare for editing a user
  const handlePrepareEdit = (user: UserEmail) => {
    setEditingUser(user);
    setEditingEmail(user.email);
    
    // Set checkboxes based on user's current roles
    resetRoleSelections();
    user.roles.forEach(role => {
      setUserRoles(prev => ({
        ...prev,
        [role]: true
      }));
    });
    
    setIsEditing(true);
  };

  // Function to handle bulk import of emails
  const handleBulkImport = () => {
    if (!bulkEmail.trim()) {
      showToast('Please enter at least one email address.', 'error');
      return;
    }
    
    setIsBulkImporting(true);
    
    // Process bulk import asynchronously
    const processBulkImport = async () => {
      try {
        // Extract email addresses from the text (split by commas, spaces, newlines)
        const emailsInput = bulkEmail.trim();
        const emails = emailsInput.split(/[\s,;]+/).filter(email => email.trim() !== '');
        
        if (emails.length === 0) {
          showToast('No valid email addresses found.', 'error');
          setIsBulkImporting(false);
          return;
        }
        
        // Create stats object to track results
        const stats = {
          total: emails.length,
          successful: 0,
          updated: 0,
          failed: 0
        };
        
        // Get the Firebase auth token
        const token = user ? await user.getIdToken() : null;
        
        // Create array from selected roles
        const selectedRoles = Object.keys(userRoles).filter(role => userRoles[role]);
        
        if (selectedRoles.length === 0) {
          showToast('Please select at least one role.', 'error');
          setIsBulkImporting(false);
          return;
        }
        
        // Get existing emails to check for updates vs new additions
        const existingUsers = new Map(
          [...adminEmails, ...approvedEmails, ...staffEmails]
            .map(u => [u.email.toLowerCase(), u])
        );
        
        // Process each email
        for (const email of emails) {
          if (!emailRegex.test(email)) {
            stats.failed++;
            continue;
          }
          
          const lowerEmail = email.toLowerCase();
          const existingUser = existingUsers.get(lowerEmail);
          
          try {
            // If the user already exists, we'll update their roles instead of skipping
            const response = await fetch('/api/admin/users', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                email: lowerEmail,
                type: selectedRoles  // The API will merge with existing roles
              })
            });
            
            if (response.ok) {
              if (existingUser) {
                stats.updated++;
              } else {
                stats.successful++;
                // Add to existing emails map to prevent duplicates in the same batch
                existingUsers.set(lowerEmail, {
                  id: '',
                  email: lowerEmail,
                  roles: selectedRoles,
                  added_timestamp: new Date()
                });
              }
            } else {
              stats.failed++;
            }
          } catch (error) {
            console.error('Error adding/updating email:', email, error);
            stats.failed++;
          }
        }
        
        // Update stats and show toast
        setBulkImportStats({
          total: stats.total,
          successful: stats.successful + stats.updated,
          updated: stats.updated,
          duplicates: 0, // No longer counting duplicates but keeping for UI compatibility
          failed: stats.failed
        });
        
        if (stats.successful > 0 || stats.updated > 0) {
          let message = '';
          if (stats.successful > 0 && stats.updated > 0) {
            message = `Successfully added ${stats.successful} and updated ${stats.updated} out of ${stats.total} emails.`;
          } else if (stats.successful > 0) {
            message = `Successfully added ${stats.successful} out of ${stats.total} emails.`;
          } else {
            message = `Successfully updated ${stats.updated} out of ${stats.total} emails.`;
          }
          
          showToast(message, 'success');
          
          // Clear the input field and fetch updated emails
          setBulkEmail('');
          fetchUserEmails();
        } else {
          let message = 'Failed to process any emails. ';
          if (stats.failed > 0) {
            message += `${stats.failed} had errors.`;
          }
          showToast(message, 'error');
        }
        
      } catch (error) {
        console.error('Error in bulk import:', error);
        showToast('An error occurred during bulk import.', 'error');
      } finally {
        setIsBulkImporting(false);
      }
    };
    
    processBulkImport();
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp: FirebaseTimestamp) => {
    if (!timestamp) return 'Unknown';
    
    try {
      // If it's a Firestore timestamp
      if (typeof timestamp === 'object' && timestamp !== null && 'toDate' in timestamp && typeof timestamp.toDate === 'function') {
        return new Date(timestamp.toDate()).toLocaleDateString();
      }
      
      // If it's a Date object
      if (timestamp instanceof Date) {
        return timestamp.toLocaleDateString();
      }
      
      // If it's a string or number
      if (typeof timestamp === 'string' || typeof timestamp === 'number') {
        return new Date(timestamp).toLocaleDateString();
      }
      
      return 'Unknown date format';
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return 'Invalid date';
    }
  };
  
  // Function to format role name for display
  const formatRoleNameForDisplay = (role: string) => {
    return role.charAt(0).toUpperCase() + role.slice(1);
  };
  
  // Handle delete confirmation for a user
  const handleConfirmDelete = (userId: string) => {
    setDeletingId(userId);
    setIsDeleting(true);
  };
  
  // Cancel deleting a user
  const handleCancelDelete = () => {
    setDeletingId(null);
    setIsDeleting(false);
  };
  
  // Delete a user after confirmation
  const handleDeleteUser = async () => {
    if (!deletingId) return;
    
    setIsSubmitting(true);
    
    try {
      // Get the Firebase auth token
      const token = user ? await user.getIdToken() : null;
      
      // Call the API to delete the user
      const response = await fetch(`/api/admin/users?id=${deletingId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete user');
      }
      
      showToast('User deleted successfully!', 'success');
      fetchUserEmails();
      
    } catch (error) {
      console.error('Error deleting user:', error);
      showToast('Failed to delete user. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
      setIsDeleting(false);
      setDeletingId(null);
    }
  };

  // Function to get appropriate badge class for different roles
  const badgeClass = (role: string) => {
    switch(role) {
      case 'admin':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100';
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
      case 'staff':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100';
    }
  };

  if (loading || !isClient) {
    return (
      <div className="min-h-screen bg-background flex justify-center items-center">
        <div className="animate-pulse text-lg">Loading...</div>
      </div>
    );
  }

  if (!user || !user.isAdmin) {
    return null; // Will redirect to home page from useEffect
  }

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
              <CheckCircle className="h-5 w-5" />
            </div>
          )}
          {toast.type === 'error' && (
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/20 mr-3">
              <AlertCircle className="h-5 w-5" />
            </div>
          )}
          {toast.type === 'info' && (
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/20 mr-3">
              <AlertCircle className="h-5 w-5" />
            </div>
          )}
          <div>
            <p className="font-medium">{toast.message}</p>
          </div>
          <button
            onClick={() => setToast(prev => ({ ...prev, visible: false }))}
            className="ml-auto text-white/80 hover:text-white transition-colors p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
      
      {/* Hero Section with background image */}
      <section className="relative h-[40vh] flex items-center justify-center overflow-hidden">
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
              Admin Dashboard
            </h1>
            <p className="text-xl text-white max-w-2xl mx-auto font-medium drop-shadow-md mb-6">
              Manage users, roles, and permissions for your organization
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-10">
        {/* Bulk Import Section */}
        <div className="bg-white rounded-xl shadow-lg border border-green-subtle card-hover-effect p-8 mb-8 transition-all duration-300 mt-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="p-3 bg-primary/10 rounded-full text-primary mr-3">
                <User size={24} />
              </div>
              <h2 className="text-2xl font-bold text-gradient-green">Add New Users</h2>
            </div>
            
            {/* Add Refresh Button here */}
            <button
              onClick={refreshUserData}
              disabled={isRefreshing || isLoading}
              className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors flex items-center space-x-2"
            >
              {isRefreshing ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-blue-700 border-t-transparent rounded-full"></div>
                  <span>Refreshing...</span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Refresh Data</span>
                </>
              )}
            </button>
          </div>
          
          <div className="space-y-6">
            <div>
              <label htmlFor="bulkEmail" className="block text-sm font-medium mb-2 text-gray-700">
                Email Addresses
              </label>
              <div className="relative">
                <textarea
                  id="bulkEmail"
                  value={bulkEmail}
                  onChange={(e) => setBulkEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary min-h-[120px] transition-colors"
                  placeholder="Enter email addresses (separate multiple emails with commas, spaces, or new lines)"
                  disabled={isBulkImporting}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Tip: You can paste emails directly from Excel or other spreadsheet software
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-3 text-gray-700">
                User Role(s)
              </label>
              <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="role-admin"
                    checked={userRoles.admin}
                    onChange={(e) => handleRoleChange('admin', e.target.checked)}
                    className="w-4 h-4 text-primary focus:ring-primary/50 rounded mr-3"
                    disabled={isBulkImporting}
                  />
                  <label htmlFor="role-admin" className="font-medium">Admin</label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="role-approved"
                    checked={userRoles.approved}
                    onChange={(e) => handleRoleChange('approved', e.target.checked)}
                    className="w-4 h-4 text-primary focus:ring-primary/50 rounded mr-3"
                    disabled={isBulkImporting}
                  />
                  <label htmlFor="role-approved" className="font-medium">Student</label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="role-staff"
                    checked={userRoles.staff}
                    onChange={(e) => handleRoleChange('staff', e.target.checked)}
                    className="w-4 h-4 text-primary focus:ring-primary/50 rounded mr-3"
                    disabled={isBulkImporting}
                  />
                  <label htmlFor="role-staff" className="font-medium">Staff</label>
                </div>
                <p className="text-xs text-gray-500 mt-2 italic">
                  Users can have multiple roles. Adding a new role to an existing user will update their permissions.
                </p>
              </div>
            </div>
            
            <button
              type="button"
              onClick={handleBulkImport}
              className="px-6 py-3 bg-gradient-to-r from-primary to-emerald-500 text-white rounded-lg hover:from-emerald-500 hover:to-primary transition-all duration-300 transform hover:scale-105 shadow-sm hover:shadow flex items-center justify-center disabled:opacity-50 disabled:transform-none disabled:hover:scale-100"
              disabled={isBulkImporting || !bulkEmail.trim() || !Object.values(userRoles).some(Boolean)}
            >
              {isBulkImporting ? (
                <span className="flex items-center">
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Importing...
                </span>
              ) : (
                <span className="flex items-center">
                  <Plus size={18} className="mr-2" />
                  Add Users
                </span>
              )}
            </button>
            
            {/* Import Stats */}
            {bulkImportStats && (
              <div className="mt-4 p-6 bg-gray-50 border border-gray-100 rounded-xl animate-fade-in">
                <h3 className="font-semibold text-lg mb-3 text-gradient-green">Import Results:</h3>
                <div className="space-y-2">
                  <div className="flex justify-between border-b border-gray-100 pb-2">
                    <span className="font-medium">Total emails:</span>
                    <span>{bulkImportStats.total}</span>
                  </div>
                  <div className="flex justify-between text-green-600">
                    <span className="font-medium">Successfully added:</span>
                    <span>{bulkImportStats.successful}</span>
                  </div>
                  {bulkImportStats.updated > 0 && (
                    <div className="flex justify-between text-blue-600">
                      <span className="font-medium">Existing users updated:</span>
                      <span>{bulkImportStats.updated}</span>
                    </div>
                  )}
                  {bulkImportStats.duplicates > 0 && (
                    <div className="flex justify-between text-yellow-600">
                      <span className="font-medium">Duplicates skipped:</span>
                      <span>{bulkImportStats.duplicates}</span>
                    </div>
                  )}
                  {bulkImportStats.failed > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span className="font-medium">Failed to add:</span>
                      <span>{bulkImportStats.failed}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* User Lists */}
        <div className="bg-white rounded-xl shadow-lg border border-green-subtle card-hover-effect p-8 transition-all duration-300" id="user-management">
          <div className="flex items-center mb-6">
            <div className="p-3 bg-primary/10 rounded-full text-primary mr-3">
              <User size={24} />
            </div>
            <h2 className="text-2xl font-bold text-gradient-green">User Management</h2>
          </div>
          
          {/* Tab Navigation */}
          <div className="mb-6">
            <div className="flex space-x-2">
              <button 
                key="admin-tab"
                onClick={() => setActiveTab('admin')}
                className={`flex items-center px-5 py-3 font-medium rounded-t-lg transition-all duration-200 ${
                  activeTab === 'admin' 
                    ? 'bg-primary text-white' 
                    : 'text-white opacity-50 hover:text-white'
                }`}
              >
                <User size={18} className="mr-2" />
                Admins 
                <span className="ml-2 bg-white/20 text-white px-2 py-0.5 rounded-full text-xs">
                  {adminEmails.length}
                </span>
              </button>
              <button 
                key="approved-tab"
                onClick={() => setActiveTab('approved')}
                className={`flex items-center px-5 py-3 font-medium rounded-t-lg transition-all duration-200 ${
                  activeTab === 'approved' 
                    ? 'bg-primary text-white' 
                    : 'text-white opacity-50 hover:text-white'
                }`}
              >
                <CheckCircle size={18} className="mr-2" />
                Approved Users
                <span className="ml-2 bg-white/20 text-white px-2 py-0.5 rounded-full text-xs">
                  {approvedEmails.length}
                </span>
              </button>
              <button 
                key="staff-tab"
                onClick={() => setActiveTab('staff')}
                className={`flex items-center px-5 py-3 font-medium rounded-t-lg transition-all duration-200 ${
                  activeTab === 'staff' 
                    ? 'bg-primary text-white' 
                    : 'text-white opacity-50 hover:text-white'
                }`}
              >
                <User size={18} className="mr-2" />
                Staff
                <span className="ml-2 bg-white/20 text-white px-2 py-0.5 rounded-full text-xs">
                  {staffEmails.length}
                </span>
              </button>
            </div>
          </div>
          
          {/* Admin Tab */}
          {activeTab === 'admin' && (
            <div className="space-y-3 animate-fade-in">
              {isLoading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
                </div>
              ) : adminEmails.length === 0 ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 text-gray-400 mb-4">
                    <User size={32} />
                  </div>
                  <p className="text-lg text-gray-500">No admin users found.</p>
                </div>
              ) : (
                <div className="space-y-3 transition-all duration-300">
                  {[...adminEmails]
                    .sort((a, b) => a.email.toLowerCase().localeCompare(b.email.toLowerCase()))
                    .map((user, index) => (
                      <div 
                        key={user.id || `admin-${index}`} 
                        className="bg-white border border-gray-100 hover:border-primary/20 rounded-lg shadow-sm hover:shadow p-5 flex justify-between items-center transition-all duration-300 hover:scale-[1.01]"
                      >
                        <div>
                          <div className="text-lg font-medium text-gradient-green">{user.email}</div>
                          <div className="text-sm text-gray-500">
                            Added: {formatTimestamp(user.added_timestamp)}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {user.roles
                              .slice() // Create a copy of the array to avoid mutating the original
                              .sort((a, b) => a.localeCompare(b)) // Sort roles alphabetically
                              .map((role) => {
                                return (
                                  <span 
                                    key={role} 
                                    className={`text-xs px-2 py-1 rounded-full ${badgeClass(role)}`}
                                  >
                                    {formatRoleNameForDisplay(role)}
                                  </span>
                                );
                              })}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handlePrepareEdit(user)}
                            className="p-2 bg-primary/10 text-white rounded-lg hover:bg-primary/20 transition-colors"
                            title="Edit user"
                          >
                            <PenSquare size={18} className="text-white" />
                          </button>
                          <button
                            onClick={() => handleConfirmDelete(user.id)}
                            className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                            title="Delete user"
                          >
                            <Trash2 size={18} className="text-white" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
          
          {/* Approved Tab */}
          {activeTab === 'approved' && (
            <div className="space-y-3 animate-fade-in">
              {isLoading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
                </div>
              ) : approvedEmails.length === 0 ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 text-gray-400 mb-4">
                    <User size={32} />
                  </div>
                  <p className="text-lg text-gray-500">No approved users found.</p>
                </div>
              ) : (
                <div className="space-y-3 transition-all duration-300">
                  {[...approvedEmails]
                    .sort((a, b) => a.email.toLowerCase().localeCompare(b.email.toLowerCase()))
                    .map((user, index) => (
                      <div 
                        key={user.id || `approved-${index}`} 
                        className="bg-white border border-gray-100 hover:border-primary/20 rounded-lg shadow-sm hover:shadow p-5 flex justify-between items-center transition-all duration-300 hover:scale-[1.01]"
                      >
                        <div>
                          <div className="text-lg font-medium text-gradient-green">{user.email}</div>
                          <div className="text-sm text-gray-500">
                            Added: {formatTimestamp(user.added_timestamp)}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {user.roles
                              .slice() // Create a copy of the array to avoid mutating the original
                              .sort((a, b) => a.localeCompare(b)) // Sort roles alphabetically
                              .map((role) => {
                                return (
                                  <span 
                                    key={role} 
                                    className={`text-xs px-2 py-1 rounded-full ${badgeClass(role)}`}
                                  >
                                    {formatRoleNameForDisplay(role)}
                                  </span>
                                );
                              })}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handlePrepareEdit(user)}
                            className="p-2 bg-primary/10 text-white rounded-lg hover:bg-primary/20 transition-colors"
                            title="Edit user"
                          >
                            <PenSquare size={18} className="text-white" />
                          </button>
                          <button
                            onClick={() => handleConfirmDelete(user.id)}
                            className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                            title="Delete user"
                          >
                            <Trash2 size={18} className="text-white" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
          
          {/* Staff Tab */}
          {activeTab === 'staff' && (
            <div className="space-y-3 animate-fade-in">
              {isLoading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
                </div>
              ) : staffEmails.length === 0 ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 text-gray-400 mb-4">
                    <User size={32} />
                  </div>
                  <p className="text-lg text-gray-500">No staff users found.</p>
                </div>
              ) : (
                <div className="space-y-3 transition-all duration-300">
                  {[...staffEmails]
                    .sort((a, b) => a.email.toLowerCase().localeCompare(b.email.toLowerCase()))
                    .map((user, index) => (
                      <div 
                        key={user.id || `staff-${index}`} 
                        className="bg-white border border-gray-100 hover:border-primary/20 rounded-lg shadow-sm hover:shadow p-5 flex justify-between items-center transition-all duration-300 hover:scale-[1.01]"
                      >
                        <div>
                          <div className="text-lg font-medium text-gradient-green">{user.email}</div>
                          <div className="text-sm text-gray-500">
                            Added: {formatTimestamp(user.added_timestamp)}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {user.roles
                              .slice() // Create a copy of the array to avoid mutating the original
                              .sort((a, b) => a.localeCompare(b)) // Sort roles alphabetically
                              .map((role) => {
                                return (
                                  <span 
                                    key={role} 
                                    className={`text-xs px-2 py-1 rounded-full ${badgeClass(role)}`}
                                  >
                                    {formatRoleNameForDisplay(role)}
                                  </span>
                                );
                              })}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handlePrepareEdit(user)}
                            className="p-2 bg-primary/10 text-white rounded-lg hover:bg-primary/20 transition-colors"
                            title="Edit user"
                          >
                            <PenSquare size={18} className="text-white" />
                          </button>
                          <button
                            onClick={() => handleConfirmDelete(user.id)}
                            className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                            title="Delete user"
                          >
                            <Trash2 size={18} className="text-white" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Edit User Modal */}
      {isEditing && editingUser && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md animate-scale-in">
            <div className="flex items-center mb-4">
              <div className="p-2 bg-primary/10 rounded-full text-primary mr-3">
                <User size={20} />
              </div>
              <h2 className="text-xl font-bold text-gradient-green">Edit User</h2>
            </div>
            
            <form onSubmit={handleEditUser} className="space-y-5">
              <div>
                <label htmlFor="edit-email" className="block text-sm font-medium mb-2 text-gray-700">
                  Email Address
                </label>
                <input
                  type="email"
                  id="edit-email"
                  value={editingEmail}
                  onChange={(e) => setEditingEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                  placeholder="Enter email address"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-3 text-gray-700">
                  User Role(s)
                </label>
                <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="edit-role-admin"
                      checked={userRoles.admin}
                      onChange={(e) => handleRoleChange('admin', e.target.checked)}
                      className="w-4 h-4 text-primary focus:ring-primary/50 rounded mr-3"
                    />
                    <label htmlFor="edit-role-admin" className="font-medium">Admin</label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="edit-role-approved"
                      checked={userRoles.approved}
                      onChange={(e) => handleRoleChange('approved', e.target.checked)}
                      className="w-4 h-4 text-primary focus:ring-primary/50 rounded mr-3"
                    />
                    <label htmlFor="edit-role-approved" className="font-medium">Approved</label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="edit-role-staff"
                      checked={userRoles.staff}
                      onChange={(e) => handleRoleChange('staff', e.target.checked)}
                      className="w-4 h-4 text-primary focus:ring-primary/50 rounded mr-3"
                    />
                    <label htmlFor="edit-role-staff" className="font-medium">Staff</label>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 italic">
                    Users can have multiple roles. This allows for flexible permission management.
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-300 transform hover:scale-105 shadow-sm hover:shadow flex items-center disabled:opacity-50 disabled:hover:scale-100"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-primary to-emerald-500 text-white rounded-lg hover:from-emerald-500 hover:to-primary transition-all duration-300 transform hover:scale-105 shadow-sm hover:shadow flex items-center disabled:opacity-50 disabled:hover:scale-100"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="flex items-center">
                      <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                      Saving...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <Save size={18} className="mr-2" />
                      Save Changes
                    </span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {isDeleting && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md animate-scale-in">
            <div className="flex items-center mb-4 text-red-500">
              <div className="p-2 bg-red-50 rounded-full mr-3">
                <AlertCircle size={20} />
              </div>
              <h2 className="text-xl font-bold">Confirm Delete</h2>
            </div>
            
            <p className="mb-6 text-gray-600">Are you sure you want to delete this user? This action cannot be undone.</p>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleCancelDelete}
                className="px-4 py-2 bg-gradient-to-r from-primary to-emerald-500 text-white rounded-lg hover:from-emerald-500 hover:to-primary transition-all duration-300 transform hover:scale-105 shadow-sm hover:shadow flex items-center disabled:opacity-50 disabled:hover:scale-100"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-300 transform hover:scale-105 shadow-sm hover:shadow flex items-center disabled:opacity-50 disabled:hover:scale-100"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="flex items-center">
                    <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    Deleting...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <Trash2 size={18} className="mr-2" />
                    Delete User
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {isClient && <Footer />}
    </div>
  );
} 