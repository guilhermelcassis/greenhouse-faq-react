"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { AlertCircle, Trash2, CheckCircle, X } from 'lucide-react';

// User type interface with roles array
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

export default function BulkDeletePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [isClient, setIsClient] = useState(false);
  
  // State for student users
  const [studentEmails, setStudentEmails] = useState<UserEmail[]>([]);
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState({ 
    total: 0, 
    deleted: 0, 
    failed: 0 
  });
  
  // Toast notification state
  const [toast, setToast] = useState({
    message: '',
    type: 'success' as 'success' | 'error' | 'info',
    visible: false
  });

  // Email for reimport after deletion
  const [emailsToReimport, setEmailsToReimport] = useState('');
  const [showReimportSection, setShowReimportSection] = useState(false);
  const [saveForReimport, setSaveForReimport] = useState(true);

  useEffect(() => {
    setIsClient(true);
    
    // Redirect if not admin
    if (!loading && (!user || !user.isAdmin)) {
      router.push('/');
    }
  }, [user, loading, router]);

  // Fetch only student emails from the database
  const fetchStudentEmails = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Get the Firebase auth token
      const token = user ? await user.getIdToken() : null;
      
      // Call the API to fetch all users
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch user emails: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Filter only users with the 'approved' role but NOT 'admin' or 'staff' roles
      const students = data.users.filter((user: UserEmail) => 
        user.roles.includes('approved') && 
        !user.roles.includes('admin') && 
        !user.roles.includes('staff')
      );
      
      // Sort alphabetically by email
      students.sort((a: UserEmail, b: UserEmail) => 
        a.email.toLowerCase().localeCompare(b.email.toLowerCase())
      );
      
      setStudentEmails(students);
      console.log(`Found ${students.length} student-only accounts`);
      
    } catch (error) {
      console.error('Error fetching student emails:', error);
      showToast('Failed to load student emails. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Fetch students when component mounts
  useEffect(() => {
    if (user && user.isAdmin) {
      fetchStudentEmails();
    }
  }, [user, fetchStudentEmails]);

  // Function to show toast notifications
  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({
      message,
      type,
      visible: true
    });
    
    // Hide the toast after 5 seconds
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 5000);
  };

  // Toggle selection of all emails
  const toggleSelectAll = () => {
    if (selectedEmails.size === studentEmails.length) {
      // If all are selected, deselect all
      setSelectedEmails(new Set());
    } else {
      // Otherwise, select all
      setSelectedEmails(new Set(studentEmails.map(user => user.id)));
    }
  };

  // Toggle selection of a single email
  const toggleSelectEmail = (id: string) => {
    const newSelected = new Set(selectedEmails);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedEmails(newSelected);
  };

  // Show confirmation dialog
  const handleShowConfirmation = () => {
    if (selectedEmails.size === 0) {
      showToast('Please select at least one student to delete.', 'error');
      return;
    }
    setShowConfirmation(true);
  };

  // Prepare emails for reimport
  const prepareReimportEmails = () => {
    if (!saveForReimport) return;
    
    // Get emails of selected students
    const emailsToSave = studentEmails
      .filter(user => selectedEmails.has(user.id))
      .map(user => user.email)
      .join('\n');
    
    setEmailsToReimport(emailsToSave);
  };

  // Delete selected students
  const deleteSelectedStudents = async () => {
    if (selectedEmails.size === 0) {
      setShowConfirmation(false);
      return;
    }
    
    setIsDeleting(true);
    prepareReimportEmails();
    
    const selectedIds = Array.from(selectedEmails);
    setDeleteProgress({
      total: selectedIds.length,
      deleted: 0,
      failed: 0
    });
    
    // Get the Firebase auth token
    const token = user ? await user.getIdToken() : null;
    
    // Delete each selected student
    for (const id of selectedIds) {
      try {
        const response = await fetch(`/api/admin/users?id=${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          setDeleteProgress(prev => ({
            ...prev,
            deleted: prev.deleted + 1
          }));
        } else {
          setDeleteProgress(prev => ({
            ...prev,
            failed: prev.failed + 1
          }));
        }
      } catch (error) {
        console.error(`Error deleting user ${id}:`, error);
        setDeleteProgress(prev => ({
          ...prev,
          failed: prev.failed + 1
        }));
      }
      
      // Small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    // Refresh the student list
    await fetchStudentEmails();
    
    // Show reimport section if emails were saved
    if (saveForReimport && emailsToReimport) {
      setShowReimportSection(true);
    }
    
    showToast(`Deleted ${deleteProgress.deleted} students successfully. ${deleteProgress.failed} failed.`, 'success');
    setIsDeleting(false);
    setShowConfirmation(false);
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

      {/* Hero Section */}
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
              Bulk Delete Students
            </h1>
            <p className="text-xl text-white max-w-2xl mx-auto font-medium drop-shadow-md mb-6">
              Delete multiple student accounts at once and prepare for reimport
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-10">
        {/* Back button */}
        <div className="mb-6">
          <button 
            onClick={() => router.push('/admin')}
            className="text-primary hover:text-primary-dark transition-colors"
          >
            ← Back to Admin Dashboard
          </button>
        </div>

        {/* Student List */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-primary">Student Accounts</h2>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                {studentEmails.length} student-only accounts found
              </span>
              {studentEmails.length > 0 && (
                <button
                  onClick={toggleSelectAll}
                  className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-md transition-colors"
                >
                  {selectedEmails.size === studentEmails.length ? 'Deselect All' : 'Select All'}
                </button>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
            </div>
          ) : studentEmails.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 text-gray-400 mb-4">
                <AlertCircle size={32} />
              </div>
              <p className="text-lg text-gray-500">No student-only accounts found.</p>
              <p className="text-sm text-gray-400 mt-2">
                This page only shows users with the &apos;approved&apos; role who don&apos;t have &apos;admin&apos; or &apos;staff&apos; roles.
              </p>
            </div>
          ) : (
            <div>
              <div className="overflow-auto max-h-[50vh] mb-4">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          checked={selectedEmails.size === studentEmails.length && studentEmails.length > 0}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 text-primary focus:ring-primary/50 rounded"
                        />
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Added Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {studentEmails.map((student) => (
                      <tr key={student.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedEmails.has(student.id)}
                            onChange={() => toggleSelectEmail(student.id)}
                            className="w-4 h-4 text-primary focus:ring-primary/50 rounded"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{student.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{formatTimestamp(student.added_timestamp)}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="save-for-reimport"
                    checked={saveForReimport}
                    onChange={() => setSaveForReimport(!saveForReimport)}
                    className="w-4 h-4 text-primary focus:ring-primary/50 rounded mr-2"
                  />
                  <label htmlFor="save-for-reimport" className="text-sm text-gray-700">
                    Save emails for reimporting later
                  </label>
                </div>

                <button
                  onClick={handleShowConfirmation}
                  disabled={selectedEmails.size === 0 || isDeleting}
                  className={`px-4 py-2 rounded-lg flex items-center ${
                    selectedEmails.size === 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-red-500 text-white hover:bg-red-600'
                  } transition-colors`}
                >
                  <Trash2 size={18} className="mr-2" />
                  Delete Selected ({selectedEmails.size})
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Reimport Section */}
        {showReimportSection && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 mb-8 animate-fade-in">
            <h2 className="text-2xl font-bold text-primary mb-4">Reimport Students</h2>
            <p className="text-gray-600 mb-4">
              Below are the emails of the students you just deleted. You can copy this list and use it to reimport only the students you want to keep.
            </p>
            
            <div className="mb-4">
              <label htmlFor="reimport-emails" className="block text-sm font-medium mb-2 text-gray-700">
                Student Emails for Reimport
              </label>
              <textarea
                id="reimport-emails"
                value={emailsToReimport}
                onChange={(e) => setEmailsToReimport(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary min-h-[150px] transition-colors"
                placeholder="No emails saved for reimport"
              />
            </div>
            
            <div className="flex justify-between items-center">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(emailsToReimport);
                  showToast('Emails copied to clipboard!', 'success');
                }}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
              >
                Copy to Clipboard
              </button>
              
              <button
                onClick={() => router.push('/admin')}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Go to Admin Page to Reimport
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md animate-scale-in">
            <div className="flex items-center mb-4 text-red-500">
              <div className="p-2 bg-red-50 rounded-full mr-3">
                <AlertCircle size={20} />
              </div>
              <h2 className="text-xl font-bold">Confirm Bulk Delete</h2>
            </div>
            
            <p className="mb-4 text-gray-600">
              Are you sure you want to delete <span className="font-bold">{selectedEmails.size}</span> student accounts? This action cannot be undone.
            </p>
            
            {isDeleting ? (
              <div className="mb-4">
                <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${(deleteProgress.deleted + deleteProgress.failed) / deleteProgress.total * 100}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-sm text-gray-500 mt-2">
                  <span>Progress: {deleteProgress.deleted + deleteProgress.failed} / {deleteProgress.total}</span>
                  <span>
                    {deleteProgress.deleted} deleted, {deleteProgress.failed} failed
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowConfirmation(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={deleteSelectedStudents}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center"
                >
                  <Trash2 size={18} className="mr-2" />
                  Delete {selectedEmails.size} Students
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 