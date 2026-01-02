'use client';

import { useState, useEffect } from 'react';
import BillingCharts from '@/components/BillingCharts';
import ApiCallsDashboard from '@/components/ApiCallsDashboard';
import ServiceHealthDashboard from '@/components/ServiceHealthDashboard';
import SupportTicketsDashboard from '@/components/SupportTicketsDashboard';
import ContactMessagesDashboard from '@/components/ContactMessagesDashboard';
import LiveStreamsDashboard from '@/components/LiveStreamsDashboard';
import BanRestrictModal from '@/components/BanRestrictModal';

interface User {
  id: number;
  email: string;
  name: string | null;
  auth_type: string;
  is_admin: boolean;
  is_superuser: boolean;
  is_banned?: boolean;
  is_restricted?: boolean;
  ban_reason?: string | null;
  banned_at?: string | null;
  created_at: string;
}

export default function AdminPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [admins, setAdmins] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'admins' | 'billing' | 'api-calls' | 'services' | 'tickets' | 'contact' | 'livestreams'>('users');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({ email: '', name: '', password: '', is_admin: false, is_superuser: false });
  const [showBanRestrictModal, setShowBanRestrictModal] = useState(false);
  const [banRestrictAction, setBanRestrictAction] = useState<'ban' | 'restrict' | 'unban' | 'unrestrict'>('ban');
  const [banRestrictUser, setBanRestrictUser] = useState<User | null>(null);

  // Check for email parameter in URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const emailParam = urlParams.get('email');
      if (emailParam) {
        setEmail(decodeURIComponent(emailParam));
        // Clean up URL
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, []);

  // Check for saved token (check both adminToken and regular token)
  useEffect(() => {
    const savedAdminToken = localStorage.getItem('adminToken');
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    // If we have a regular token and user, check if they're admin
    if (savedToken && savedUser) {
      try {
        const user = JSON.parse(savedUser);
        if (user.is_admin || user.is_superuser) {
          // User is admin, use regular token
          setToken(savedToken);
          setUser(user);
          loadUserData(savedToken);
          return;
        }
      } catch (e) {
        // Invalid user data, continue to check adminToken
      }
    }
    
    // Otherwise check for adminToken
    if (savedAdminToken) {
      setToken(savedAdminToken);
      loadUserData(savedAdminToken);
    }
  }, []);

  const loadUserData = async (authToken: string) => {
    try {
      const response = await fetch('http://localhost:3001/api/admin/verify-token', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setToken(data.token);
        
        // Set unified session - both admin and regular token
        localStorage.setItem('adminToken', data.token);
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Dispatch event to notify Navbar of auth change
        window.dispatchEvent(new Event('auth-change'));
        
        loadUsers(data.token);
        loadAdmins(data.token);
      } else {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        window.dispatchEvent(new Event('auth-change'));
      }
    } catch (err) {
      console.error('Failed to verify token:', err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:3001/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        setToken(data.token);
        setUser(data.user);
        
        // Set unified session - both admin and regular token
        localStorage.setItem('adminToken', data.token);
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Dispatch event to notify Navbar of auth change
        window.dispatchEvent(new Event('auth-change'));
        
        await loadUsers(data.token);
        await loadAdmins(data.token);
        setEmail('');
        setPassword('');
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setUsers([]);
    setAdmins([]);
    
    // Clear all session data
    localStorage.removeItem('adminToken');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Dispatch event to notify Navbar of auth change
    window.dispatchEvent(new Event('auth-change'));
  };

  const loadUsers = async (authToken: string) => {
    try {
      const response = await fetch('http://localhost:3001/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  const loadAdmins = async (authToken: string) => {
    try {
      const response = await fetch('http://localhost:3001/api/admin/admins', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAdmins(data.admins || []);
      }
    } catch (err) {
      console.error('Failed to load admins:', err);
    }
  };

  const openBanRestrictModal = (user: User, action: 'ban' | 'restrict' | 'unban' | 'unrestrict') => {
    setBanRestrictUser(user);
    setBanRestrictAction(action);
    setShowBanRestrictModal(true);
  };

  const handleBanRestrictConfirm = async (reason: string) => {
    if (!banRestrictUser || !token) return;

    try {
      let endpoint = '';
      let body: any = {};

      switch (banRestrictAction) {
        case 'ban':
          endpoint = `/api/admin/users/${banRestrictUser.id}/ban`;
          body = { reason: reason || null };
          break;
        case 'restrict':
          endpoint = `/api/admin/users/${banRestrictUser.id}/restrict`;
          body = { reason: reason || null };
          break;
        case 'unban':
          endpoint = `/api/admin/users/${banRestrictUser.id}/unban`;
          body = {};
          break;
        case 'unrestrict':
          endpoint = `/api/admin/users/${banRestrictUser.id}/unrestrict`;
          body = {};
          break;
      }

      const response = await fetch(`http://localhost:3001${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined
      });

      if (response.ok) {
        await loadUsers(token);
        await loadAdmins(token);
        setShowBanRestrictModal(false);
        setBanRestrictUser(null);
      } else {
        const data = await response.json();
        alert(data.error || `Failed to ${banRestrictAction} user`);
      }
    } catch (err) {
      alert(`Failed to ${banRestrictAction} user`);
    }
  };

  const handleBanUser = (user: User) => {
    openBanRestrictModal(user, 'ban');
  };

  const handleUnbanUser = (user: User) => {
    openBanRestrictModal(user, 'unban');
  };

  const handleRestrictUser = (user: User) => {
    openBanRestrictModal(user, 'restrict');
  };

  const handleUnrestrictUser = (user: User) => {
    openBanRestrictModal(user, 'unrestrict');
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      const response = await fetch(`http://localhost:3001/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        if (token) {
          await loadUsers(token);
          await loadAdmins(token);
        }
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete user');
      }
    } catch (err) {
      alert('Failed to delete user');
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Admin Login</h1>
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-300">
              {error}
            </div>
          )}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="admin@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-blue-50 dark:bg-gray-800 rounded-lg shadow mb-4 p-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Panel</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Logged in as {user?.email} {user?.is_superuser && '(Superuser)'}
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-blue-50 dark:bg-gray-800 rounded-lg shadow mb-4">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('users')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'users'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Users ({users.length})
              </button>
              <button
                onClick={() => setActiveTab('admins')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'admins'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Admins ({admins.length})
              </button>
              <button
                onClick={() => setActiveTab('billing')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'billing'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                GCP Billing & Usage
              </button>
              <button
                onClick={() => setActiveTab('api-calls')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'api-calls'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                API Calls & Quota
              </button>
              <button
                onClick={() => setActiveTab('services')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'services'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Service Health
              </button>
              <button
                onClick={() => setActiveTab('tickets')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'tickets'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Support Tickets
              </button>
              <button
                onClick={() => setActiveTab('contact')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'contact'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Contact Messages
              </button>
              <button
                onClick={() => setActiveTab('livestreams')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'livestreams'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Live Streams
              </button>
            </nav>
          </div>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'billing' ? (
          <BillingCharts token={token || ''} />
        ) : activeTab === 'api-calls' ? (
          <ApiCallsDashboard token={token || ''} />
        ) : activeTab === 'services' ? (
          <ServiceHealthDashboard token={token || ''} />
        ) : activeTab === 'tickets' ? (
          <SupportTicketsDashboard />
        ) : activeTab === 'contact' ? (
          <ContactMessagesDashboard />
        ) : activeTab === 'livestreams' ? (
          <LiveStreamsDashboard token={token || ''} />
        ) : (
          /* Users/Admins Table */
          <div className="bg-blue-50 dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {activeTab === 'users' ? 'Users' : 'Admins'}
              </h3>
              <button
                onClick={() => {
                  setFormData({ email: '', name: '', password: '', is_admin: activeTab === 'admins', is_superuser: false });
                  setShowCreateModal(true);
                }}
                className="px-5 py-2.5 bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-xl text-sm font-semibold hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-300 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 tracking-tight"
              >
                + Create {activeTab === 'users' ? 'User' : 'Admin'}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-blue-100 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Auth Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-blue-50 dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {(activeTab === 'users' ? users : admins).map((u) => (
                    <tr key={u.id} className="hover:bg-blue-100 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {u.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {u.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {u.name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                          {u.auth_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {u.is_superuser && (
                          <span className="px-2 py-1 text-xs rounded-full bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 mr-1">
                            Superuser
                          </span>
                        )}
                        {u.is_admin && !u.is_superuser && (
                          <span className="px-2 py-1 text-xs rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                            Admin
                          </span>
                        )}
                        {!u.is_admin && !u.is_superuser && (
                          <span className="px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                            User
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {u.is_banned && (
                          <span className="px-2 py-1 text-xs rounded-full bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 mr-1">
                            Banned
                          </span>
                        )}
                        {u.is_restricted && !u.is_banned && (
                          <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">
                            Restricted
                          </span>
                        )}
                        {!u.is_banned && !u.is_restricted && (
                          <span className="px-2 py-1 text-xs rounded-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => openEditModal(u)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          Edit
                        </button>
                        {u.is_banned ? (
                          <button
                            onClick={() => handleUnbanUser(u)}
                            className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                          >
                            Unban
                          </button>
                        ) : (
                          <button
                            onClick={() => handleBanUser(u)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          >
                            Ban
                          </button>
                        )}
                        {u.is_restricted && !u.is_banned ? (
                          <button
                            onClick={() => handleUnrestrictUser(u)}
                            className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                          >
                            Unrestrict
                          </button>
                        ) : !u.is_banned ? (
                          <button
                            onClick={() => handleRestrictUser(u)}
                            className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300"
                          >
                            Restrict
                          </button>
                        ) : null}
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(activeTab === 'users' ? users : admins).length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No {activeTab} found
                </div>
              )}
            </div>
          </div>
        )}

        {/* Ban/Restrict Modal */}
        <BanRestrictModal
          isOpen={showBanRestrictModal}
          onClose={() => {
            setShowBanRestrictModal(false);
            setBanRestrictUser(null);
          }}
          onConfirm={handleBanRestrictConfirm}
          action={banRestrictAction}
          userName={banRestrictUser?.name || undefined}
          userEmail={banRestrictUser?.email || undefined}
        />

        {/* Create/Edit Modal */}
        {(showCreateModal || showEditModal) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-blue-50 dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
              <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                {showEditModal ? 'Edit User' : `Create ${activeTab === 'users' ? 'User' : 'Admin'}`}
              </h2>
              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-300 text-sm">
                  {error}
                </div>
              )}
              <form onSubmit={showEditModal ? handleEditUser : handleCreateUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Password {showEditModal ? '(leave blank to keep current)' : '(optional, will generate if blank)'}
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                {showEditModal && user?.is_superuser && (
                  <>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="is_admin"
                        checked={formData.is_admin}
                        onChange={(e) => setFormData({ ...formData, is_admin: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="is_admin" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        Admin
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="is_superuser"
                        checked={formData.is_superuser}
                        onChange={(e) => setFormData({ ...formData, is_superuser: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="is_superuser" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                        Superuser
                      </label>
                    </div>
                  </>
                )}
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setShowEditModal(false);
                      setEditingUser(null);
                      setFormData({ email: '', name: '', password: '', is_admin: false, is_superuser: false });
                      setError(null);
                    }}
                    className="px-5 py-2.5 text-sm font-semibold border border-gray-200 dark:border-zinc-700 rounded-xl text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 hover:shadow-md hover:border-gray-300 dark:hover:border-zinc-600 transition-all duration-300 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 tracking-tight"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2.5 text-sm font-semibold bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-gray-400 dark:disabled:bg-zinc-700 text-white rounded-xl hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-300 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 tracking-tight"
                  >
                    {loading ? 'Saving...' : showEditModal ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

