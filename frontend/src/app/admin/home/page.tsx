'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import EditUserModal from '@/components/EditUserModal';

interface User {
  id: number;
  email: string;
  name: string | null;
  auth_type: string;
  is_admin: boolean;
  is_superuser: boolean;
  created_at: string;
}

export default function AdminHome() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [admins, setAdmins] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuperuser, setIsSuperuser] = useState(false);
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showCreateSuperuser, setShowCreateSuperuser] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newSuperuserEmail, setNewSuperuserEmail] = useState('');
  const [newSuperuserName, setNewSuperuserName] = useState('');
  const [newSuperuserPassword, setNewSuperuserPassword] = useState('');
  const [creatingAdmin, setCreatingAdmin] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [creatingSuperuser, setCreatingSuperuser] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [superuserPassword, setSuperuserPassword] = useState('');
  const [error, setError] = useState('');
  
  // Pagination and filtering states
  const [userSearch, setUserSearch] = useState('');
  const [userAuthFilter, setUserAuthFilter] = useState('');
  const [userCurrentPage, setUserCurrentPage] = useState(1);
  const [adminSearch, setAdminSearch] = useState('');
  const [adminAuthFilter, setAdminAuthFilter] = useState('');
  const [adminCurrentPage, setAdminCurrentPage] = useState(1);
  
  const itemsPerPage = 10;

  useEffect(() => {
    const checkAuth = async () => {
      let adminToken = localStorage.getItem('admin_token');
      let adminUser = localStorage.getItem('admin_user');

      // If no admin token, check if regular token exists and user is admin
      if (!adminToken) {
        const regularToken = localStorage.getItem('token');
        const regularUser = localStorage.getItem('user');
        
        if (regularToken && regularUser) {
          try {
            const user = JSON.parse(regularUser);
            // If user is admin/superuser, get admin token
            if (user.is_admin || user.is_superuser) {
              const response = await fetch('http://localhost:3001/api/admin/verify-token', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${regularToken}`,
                },
              });

              if (response.ok) {
                const data = await response.json();
                if (data.token) {
                  adminToken = data.token;
                  adminUser = JSON.stringify(data.user);
                  localStorage.setItem('admin_token', data.token);
                  localStorage.setItem('admin_user', adminUser);
                }
              } else if (response.status === 403) {
                // User is logged in but not admin - redirect to home
                router.push('/');
                return;
              }
            }
          } catch (err) {
            console.error('Error verifying admin status:', err);
          }
        }
      }

      if (!adminToken || !adminUser) {
        // No admin token - check if regular user is logged in
        const regularToken = localStorage.getItem('token');
        if (regularToken) {
          // Regular user trying to access admin - redirect to home
          router.push('/');
        } else {
          // Not logged in - redirect to admin login
          router.push('/admin');
        }
        return;
      }

      try {
        const user = JSON.parse(adminUser);
        setIsSuperuser(user.is_superuser || false);
      } catch (error) {
        router.push('/admin');
        return;
      }

      fetchData();
    };

    checkAuth();
  }, [router]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('admin_token');

      const [usersRes, adminsRes] = await Promise.all([
        fetch('http://localhost:3001/api/admin/users', {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch('http://localhost:3001/api/admin/admins', {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
      ]);

      if (!usersRes.ok || !adminsRes.ok) {
        if (usersRes.status === 401 || adminsRes.status === 401) {
          localStorage.removeItem('admin_token');
          localStorage.removeItem('admin_user');
          router.push('/admin');
          return;
        }
        throw new Error('Failed to fetch data');
      }

      const usersData = await usersRes.json();
      const adminsData = await adminsRes.json();

      setUsers(usersData.users || []);
      setAdmins(adminsData.admins || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number, email: string) => {
    if (!confirm(`Are you sure you want to delete user ${email}? This action cannot be undone.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`http://localhost:3001/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete user');
      }

      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingAdmin(true);
    setError('');

    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('http://localhost:3001/api/admin/create-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ email: newAdminEmail, name: newAdminName }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create admin');

      setAdminPassword(data.password);
      setNewAdminEmail('');
      setNewAdminName('');
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create admin');
    } finally {
      setCreatingAdmin(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingUser(true);
    setError('');

    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('http://localhost:3001/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: newUserEmail,
          name: newUserName,
          password: newUserPassword || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create user');

      setUserPassword(data.password);
      setNewUserEmail('');
      setNewUserName('');
      setNewUserPassword('');
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleCreateSuperuser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingSuperuser(true);
    setError('');

    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('http://localhost:3001/api/admin/create-superuser', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: newSuperuserEmail,
          name: newSuperuserName,
          password: newSuperuserPassword || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create superuser');

      setSuperuserPassword(data.password);
      setNewSuperuserEmail('');
      setNewSuperuserName('');
      setNewSuperuserPassword('');
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create superuser');
    } finally {
      setCreatingSuperuser(false);
    }
  };

  const handleLogout = () => {
    // Clear both admin and regular user sessions
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Dispatch event to notify Navbar of auth change
    window.dispatchEvent(new Event('auth-change'));
    router.push('/');
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
  };

  const handleUserUpdated = () => {
    setEditingUser(null);
    fetchData();
  };

  // Filter and paginate users
  const filteredUsers = users.filter(user => {
    const matchesSearch = !userSearch || 
      user.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      (user.name && user.name.toLowerCase().includes(userSearch.toLowerCase()));
    const matchesAuth = !userAuthFilter || user.auth_type === userAuthFilter;
    return matchesSearch && matchesAuth;
  });

  const userTotalPages = Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage));
  const userStartIndex = (userCurrentPage - 1) * itemsPerPage;
  const paginatedUsers = filteredUsers.slice(userStartIndex, userStartIndex + itemsPerPage);
  const userPaginationDisabled = filteredUsers.length <= itemsPerPage;

  // Filter and paginate admins
  const filteredAdmins = admins.filter(admin => {
    const matchesSearch = !adminSearch || 
      admin.email.toLowerCase().includes(adminSearch.toLowerCase()) ||
      (admin.name && admin.name.toLowerCase().includes(adminSearch.toLowerCase()));
    const matchesAuth = !adminAuthFilter || admin.auth_type === adminAuthFilter;
    return matchesSearch && matchesAuth;
  });

  const adminTotalPages = Math.max(1, Math.ceil(filteredAdmins.length / itemsPerPage));
  const adminStartIndex = (adminCurrentPage - 1) * itemsPerPage;
  const paginatedAdmins = filteredAdmins.slice(adminStartIndex, adminStartIndex + itemsPerPage);
  const adminPaginationDisabled = filteredAdmins.length <= itemsPerPage;

  // Get unique auth types for filter dropdowns
  const userAuthTypes = Array.from(new Set(users.map(u => u.auth_type)));
  const adminAuthTypes = Array.from(new Set(admins.map(a => a.auth_type)));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black">
        <p className="text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Admin Dashboard</h1>
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {isSuperuser && (
          <div className="mb-6 flex flex-wrap gap-4">
            <button
              onClick={() => {
                setShowCreateUser(!showCreateUser);
                setShowCreateAdmin(false);
                setShowCreateSuperuser(false);
              }}
              className="group relative px-5 py-2.5 text-sm font-semibold bg-blue-600 dark:bg-blue-700 text-white rounded-xl overflow-hidden transition-all duration-300
                hover:bg-blue-700 dark:hover:bg-blue-600 hover:shadow-xl hover:shadow-blue-500/30
                active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 tracking-tight"
            >
              <span className="relative z-10">{showCreateUser ? 'Cancel' : 'Create Regular User'}</span>
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent 
                translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></span>
            </button>
            <button
              onClick={() => {
                setShowCreateAdmin(!showCreateAdmin);
                setShowCreateUser(false);
                setShowCreateSuperuser(false);
              }}
              className="group relative px-5 py-2.5 text-sm font-semibold bg-green-600 dark:bg-green-700 text-white rounded-xl overflow-hidden transition-all duration-300
                hover:bg-green-700 dark:hover:bg-green-600 hover:shadow-xl hover:shadow-green-500/30
                active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 tracking-tight"
            >
              <span className="relative z-10">{showCreateAdmin ? 'Cancel' : 'Create Admin'}</span>
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent 
                translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></span>
            </button>
            <button
              onClick={() => {
                setShowCreateSuperuser(!showCreateSuperuser);
                setShowCreateUser(false);
                setShowCreateAdmin(false);
              }}
              className="group relative px-5 py-2.5 text-sm font-semibold bg-purple-600 dark:bg-purple-700 text-white rounded-xl overflow-hidden transition-all duration-300
                hover:bg-purple-700 dark:hover:bg-purple-600 hover:shadow-xl hover:shadow-purple-500/30
                active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 tracking-tight"
            >
              <span className="relative z-10">{showCreateSuperuser ? 'Cancel' : 'Create Superuser'}</span>
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent 
                translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></span>
            </button>
          </div>
        )}

        {/* Create Regular User Form */}
        {isSuperuser && showCreateUser && (
          <div className="mb-6 bg-white dark:bg-zinc-900 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Create Regular User</h2>
            {userPassword && (
              <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg">
                <p className="font-semibold">User created successfully!</p>
                <p className="font-mono">Password: {userPassword}</p>
              </div>
            )}
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email *</label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Name (Optional)</label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Password (Optional - will generate if empty)</label>
                <input
                  type="password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                />
              </div>
              <button 
                type="submit" 
                disabled={creatingUser} 
                className="group relative px-5 py-2.5 text-sm font-semibold bg-blue-600 dark:bg-blue-700 text-white rounded-xl overflow-hidden transition-all duration-300
                  hover:bg-blue-700 dark:hover:bg-blue-600 hover:shadow-xl hover:shadow-blue-500/30
                  disabled:bg-gray-400 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed disabled:hover:shadow-none
                  active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 tracking-tight"
              >
                <span className="relative z-10">{creatingUser ? 'Creating...' : 'Create User'}</span>
                {!creatingUser && (
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent 
                    translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></span>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Create Admin Form */}
        {isSuperuser && showCreateAdmin && (
          <div className="mb-6 bg-white dark:bg-zinc-900 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Create Admin</h2>
            {adminPassword && (
              <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg">
                <p className="font-semibold">Admin created successfully!</p>
                <p className="font-mono">Password: {adminPassword}</p>
              </div>
            )}
            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email *</label>
                <input
                  type="email"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Name (Optional)</label>
                <input
                  type="text"
                  value={newAdminName}
                  onChange={(e) => setNewAdminName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                />
              </div>
              <button 
                type="submit" 
                disabled={creatingAdmin} 
                className="group relative px-5 py-2.5 text-sm font-semibold bg-green-600 dark:bg-green-700 text-white rounded-xl overflow-hidden transition-all duration-300
                  hover:bg-green-700 dark:hover:bg-green-600 hover:shadow-xl hover:shadow-green-500/30
                  disabled:bg-gray-400 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed disabled:hover:shadow-none
                  active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 tracking-tight"
              >
                <span className="relative z-10">{creatingAdmin ? 'Creating...' : 'Create Admin'}</span>
                {!creatingAdmin && (
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent 
                    translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></span>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Create Superuser Form */}
        {isSuperuser && showCreateSuperuser && (
          <div className="mb-6 bg-white dark:bg-zinc-900 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Create Superuser</h2>
            {superuserPassword && (
              <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg">
                <p className="font-semibold">Superuser created successfully!</p>
                <p className="font-mono">Password: {superuserPassword}</p>
              </div>
            )}
            <form onSubmit={handleCreateSuperuser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email *</label>
                <input
                  type="email"
                  value={newSuperuserEmail}
                  onChange={(e) => setNewSuperuserEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Name (Optional)</label>
                <input
                  type="text"
                  value={newSuperuserName}
                  onChange={(e) => setNewSuperuserName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Password (Optional - will generate if empty)</label>
                <input
                  type="password"
                  value={newSuperuserPassword}
                  onChange={(e) => setNewSuperuserPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                />
              </div>
              <button 
                type="submit" 
                disabled={creatingSuperuser} 
                className="group relative px-5 py-2.5 text-sm font-semibold bg-purple-600 dark:bg-purple-700 text-white rounded-xl overflow-hidden transition-all duration-300
                  hover:bg-purple-700 dark:hover:bg-purple-600 hover:shadow-xl hover:shadow-purple-500/30
                  disabled:bg-gray-400 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed disabled:hover:shadow-none
                  active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 tracking-tight"
              >
                <span className="relative z-10">{creatingSuperuser ? 'Creating...' : 'Create Superuser'}</span>
                {!creatingSuperuser && (
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent 
                    translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></span>
                )}
              </button>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Regular Users Table */}
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow flex flex-col">
            <div className="p-6 border-b border-gray-200 dark:border-zinc-800">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Regular Users ({filteredUsers.length} of {users.length})
              </h2>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Search by email or name..."
                  value={userSearch}
                  onChange={(e) => {
                    setUserSearch(e.target.value);
                    setUserCurrentPage(1);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                />
                <select
                  value={userAuthFilter}
                  onChange={(e) => {
                    setUserAuthFilter(e.target.value);
                    setUserCurrentPage(1);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                >
                  <option value="">All Auth Types</option>
                  {userAuthTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="overflow-x-auto flex-1">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-zinc-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Auth</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
                  {paginatedUsers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-center text-gray-500">No users found</td>
                    </tr>
                  ) : (
                    paginatedUsers.map((user) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{user.email}</td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{user.name || 'N/A'}</td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{user.auth_type}</td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(user)}
                              className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
                              title="Edit"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDelete(user.id, user.email)}
                              className="text-red-600 hover:text-red-800 dark:text-red-400"
                              title="Delete"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-zinc-800 flex items-center justify-between">
              <button
                onClick={() => setUserCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={userCurrentPage === 1 || userPaginationDisabled}
                className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl hover:bg-gray-200 dark:hover:bg-zinc-700 hover:shadow-md hover:border-gray-300 dark:hover:border-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 tracking-tight"
              >
                Previous
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: userTotalPages }, (_, i) => i + 1).map((page) => {
                  const isActive = userCurrentPage === page;
                  return (
                    <button
                      key={page}
                      onClick={() => !userPaginationDisabled && setUserCurrentPage(page)}
                      disabled={userPaginationDisabled}
                      className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-300 tracking-tight ${
                        isActive
                          ? 'bg-blue-600 dark:bg-blue-700 text-white hover:shadow-xl hover:shadow-blue-500/30'
                          : userPaginationDisabled
                          ? 'bg-gray-200 dark:bg-zinc-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                          : 'text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 hover:bg-gray-200 dark:hover:bg-zinc-700 hover:shadow-md hover:border-gray-300 dark:hover:border-zinc-600'
                      } active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-zinc-900`}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setUserCurrentPage(prev => Math.min(userTotalPages, prev + 1))}
                disabled={userCurrentPage === userTotalPages || userPaginationDisabled}
                className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl hover:bg-gray-200 dark:hover:bg-zinc-700 hover:shadow-md hover:border-gray-300 dark:hover:border-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 tracking-tight"
              >
                Next
              </button>
            </div>
          </div>

          {/* Admins Table */}
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow flex flex-col">
            <div className="p-6 border-b border-gray-200 dark:border-zinc-800">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Admins ({filteredAdmins.length} of {admins.length})
              </h2>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Search by email or name..."
                  value={adminSearch}
                  onChange={(e) => {
                    setAdminSearch(e.target.value);
                    setAdminCurrentPage(1);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                />
                <select
                  value={adminAuthFilter}
                  onChange={(e) => {
                    setAdminAuthFilter(e.target.value);
                    setAdminCurrentPage(1);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                >
                  <option value="">All Auth Types</option>
                  {adminAuthTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="overflow-x-auto flex-1">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-zinc-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                    {isSuperuser && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
                  {paginatedAdmins.length === 0 ? (
                    <tr>
                      <td colSpan={isSuperuser ? 4 : 3} className="px-6 py-4 text-center text-gray-500">No admins found</td>
                    </tr>
                  ) : (
                    paginatedAdmins.map((admin) => (
                      <tr key={admin.id}>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{admin.email}</td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{admin.name || 'N/A'}</td>
                        <td className="px-6 py-4 text-sm">
                          {admin.is_superuser ? (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">Superuser</span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Admin</span>
                          )}
                        </td>
                        {isSuperuser && (
                          <td className="px-6 py-4 text-sm">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEdit(admin)}
                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
                                title="Edit"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDelete(admin.id, admin.email)}
                                className="text-red-600 hover:text-red-800 dark:text-red-400"
                                title="Delete"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-zinc-800 flex items-center justify-between">
              <button
                onClick={() => setAdminCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={adminCurrentPage === 1 || adminPaginationDisabled}
                className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl hover:bg-gray-200 dark:hover:bg-zinc-700 hover:shadow-md hover:border-gray-300 dark:hover:border-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 tracking-tight"
              >
                Previous
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: adminTotalPages }, (_, i) => i + 1).map((page) => {
                  const isActive = adminCurrentPage === page;
                  return (
                    <button
                      key={page}
                      onClick={() => !adminPaginationDisabled && setAdminCurrentPage(page)}
                      disabled={adminPaginationDisabled}
                      className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-300 tracking-tight ${
                        isActive
                          ? 'bg-blue-600 dark:bg-blue-700 text-white hover:shadow-xl hover:shadow-blue-500/30'
                          : adminPaginationDisabled
                          ? 'bg-gray-200 dark:bg-zinc-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                          : 'text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 hover:bg-gray-200 dark:hover:bg-zinc-700 hover:shadow-md hover:border-gray-300 dark:hover:border-zinc-600'
                      } active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-zinc-900`}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setAdminCurrentPage(prev => Math.min(adminTotalPages, prev + 1))}
                disabled={adminCurrentPage === adminTotalPages || adminPaginationDisabled}
                className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl hover:bg-gray-200 dark:hover:bg-zinc-700 hover:shadow-md hover:border-gray-300 dark:hover:border-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 tracking-tight"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {editingUser && (
        <EditUserModal
          user={editingUser}
          isOpen={!!editingUser}
          onClose={() => setEditingUser(null)}
          onSave={handleUserUpdated}
          isSuperuserEditor={isSuperuser}
        />
      )}
    </div>
  );
}
