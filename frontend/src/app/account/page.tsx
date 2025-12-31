'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import Image from 'next/image';
import { normalizeAvatarUrl } from '@/utils/imageUtils';

interface UserProfile {
  id: number;
  email: string;
  name: string | null;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  auth_type: string;
  created_at: string;
  updated_at: string;
}

interface EditableFieldProps {
  label: string;
  value: string | null;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (value: string) => Promise<void>;
  onCancel: () => void;
  placeholder?: string;
  type?: 'text' | 'email';
  disabled?: boolean;
  saving?: boolean;
  showAtPrefix?: boolean; // For username field
}

function EditableField({
  label,
  value,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  placeholder = '',
  type = 'text',
  disabled = false,
  saving = false,
  showAtPrefix = false,
}: EditableFieldProps) {
  const [editValue, setEditValue] = useState(value || '');

  useEffect(() => {
    setEditValue(value || '');
  }, [value, isEditing]);

  const handleSave = async () => {
    // Remove @ prefix if present when saving username
    let valueToSave = editValue;
    if (showAtPrefix && valueToSave.startsWith('@')) {
      valueToSave = valueToSave.substring(1);
    }
    
    if (valueToSave !== value) {
      await onSave(valueToSave);
    } else {
      onCancel();
    }
  };

  // Format display value with @ prefix for username
  const displayValue = showAtPrefix && value ? `@${value}` : value;

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        {showAtPrefix && (
          <span className="text-gray-500 dark:text-gray-400 font-medium">@</span>
        )}
        <input
          type={type}
          value={editValue}
          onChange={(e) => {
            let newValue = e.target.value;
            // Remove @ prefix if user types it
            if (showAtPrefix && newValue.startsWith('@')) {
              newValue = newValue.substring(1);
            }
            setEditValue(newValue);
          }}
          className="flex-1 px-3 py-2 border border-blue-500 dark:border-blue-400 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={placeholder}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSave();
            } else if (e.key === 'Escape') {
              onCancel();
            }
          }}
        />
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? '...' : '✓'}
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="px-3 py-2 bg-gray-200 dark:bg-zinc-700 hover:bg-gray-300 dark:hover:bg-zinc-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-between group ${!disabled ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-lg px-2 py-1 -mx-2 -my-1' : ''}`}
      onClick={!disabled ? onEdit : undefined}
    >
      <div className="flex-1">
        <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">{label}</div>
        <div className="text-base text-gray-900 dark:text-white font-medium">
          {displayValue || <span className="text-gray-400 dark:text-gray-500 italic">{placeholder}</span>}
        </div>
      </div>
      {!disabled && (
        <button
          className="opacity-0 group-hover:opacity-100 px-2 py-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      )}
    </div>
  );
}

interface PasswordFieldProps {
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  disabled?: boolean;
  onForgotPassword?: () => void;
}

function PasswordField({ isEditing, onEdit, onCancel, disabled = false, onForgotPassword }: PasswordFieldProps) {
  const maskedPassword = '••••••••';

  if (isEditing) {
    return null; // Password editing is handled by modal
  }

  return (
    <div className="py-4">
      <div
        className={`flex items-center justify-between group ${!disabled ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-lg px-2 py-1 -mx-2 -my-1' : ''}`}
        onClick={!disabled ? onEdit : undefined}
      >
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <div className="text-sm text-gray-500 dark:text-gray-400">Password</div>
            {onForgotPassword && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onForgotPassword();
                }}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Forgot password?
              </button>
            )}
          </div>
          <div className="text-base text-gray-900 dark:text-white font-mono">
            {maskedPassword}
          </div>
        </div>
        {!disabled && (
          <button
            className="opacity-0 group-hover:opacity-100 px-2 py-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (currentPassword: string, newPassword: string, confirmPassword: string) => Promise<void>;
  saving: boolean;
}

function PasswordModal({ isOpen, onClose, onSave, saving }: PasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setError('');
    }
  }, [isOpen]);

  // Clear error when user types
  useEffect(() => {
    if (error && (currentPassword || newPassword || confirmPassword)) {
      setError('');
    }
  }, [currentPassword, newPassword, confirmPassword]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setError('');
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('All fields are required');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    await onSave(currentPassword, newPassword, confirmPassword);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Change Password</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter current password"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSave();
                }
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter new password"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSave();
                }
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Confirm new password"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSave();
                }
              }}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSave}
              disabled={saving || !currentPassword || !newPassword || !confirmPassword}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Changing...' : 'Change Password'}
            </button>
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 bg-gray-200 dark:bg-zinc-700 hover:bg-gray-300 dark:hover:bg-zinc-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  
  // Editing states for each field
  const [editingField, setEditingField] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (user?.email) {
      setForgotPasswordEmail(user.email);
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/');
        return;
      }

      const response = await fetch('http://localhost:3001/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }

      const data = await response.json();
      if (data.success) {
        setUser(data.user);
        setAvatarUrl(data.user.avatar_url);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      setSaving('avatar');
      setError(null);
      const token = localStorage.getItem('token');

      const response = await fetch('http://localhost:3001/api/user/avatar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to upload avatar');
      }

      const data = await response.json();
      if (data.success) {
        setAvatarUrl(data.avatar_url);
        setSuccess('Avatar updated successfully');
        setTimeout(() => setSuccess(null), 3000);
        
        // Update user in localStorage
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const userObj = JSON.parse(userStr);
          userObj.avatar_url = data.avatar_url;
          localStorage.setItem('user', JSON.stringify(userObj));
          window.dispatchEvent(new Event('auth-change'));
        }
      }
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      setError(error.message || 'Failed to upload avatar');
    } finally {
      setSaving(null);
    }
  };

  const handleSaveField = async (field: string, value: string) => {
    try {
      setSaving(field);
      setError(null);
      const token = localStorage.getItem('token');

      const updateData: any = {};
      if (field === 'username') {
        updateData.username = value || null;
      } else if (field === 'full_name') {
        updateData.full_name = value || null;
      } else if (field === 'name') {
        updateData.name = value || null;
      }

      const response = await fetch('http://localhost:3001/api/user/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update profile');
      }

      const data = await response.json();
      if (data.success) {
        setUser(data.user);
        setEditingField(null);
        setSuccess(`${field.replace('_', ' ')} updated successfully`);
        setTimeout(() => setSuccess(null), 3000);
        
        // Update user in localStorage
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const userObj = JSON.parse(userStr);
          userObj.username = data.user.username;
          userObj.full_name = data.user.full_name;
          userObj.name = data.user.name;
          localStorage.setItem('user', JSON.stringify(userObj));
          window.dispatchEvent(new Event('auth-change'));
        }
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setError(error.message || 'Failed to update profile');
      setEditingField(null);
    } finally {
      setSaving(null);
    }
  };

  const handleForgotPassword = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    setForgotPasswordLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:3001/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: forgotPasswordEmail || user?.email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send password reset email');
      }

      setForgotPasswordSuccess(true);
      setSuccess('Password reset email sent! Check your email for a temporary password.');
      setTimeout(() => setSuccess(null), 5000);
    } catch (error: any) {
      console.error('Error sending password reset:', error);
      setError(error.message || 'Failed to send password reset email');
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const handleChangePassword = async (currentPassword: string, newPassword: string, confirmPassword: string) => {
    try {
      setChangingPassword(true);
      setError(null);
      const token = localStorage.getItem('token');

      const response = await fetch('http://localhost:3001/api/user/password', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to change password');
      }

      const data = await response.json();
      if (data.success) {
        setSuccess('Password changed successfully');
        setTimeout(() => setSuccess(null), 3000);
        setShowPasswordModal(false);
      }
    } catch (error: any) {
      console.error('Error changing password:', error);
      setError(error.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-100 dark:bg-black pt-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-center h-64">
              <div className="animate-pulse text-gray-600 dark:text-gray-400">
                Loading profile...
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-100 dark:bg-black pt-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Account Settings</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage your account information and preferences</p>
          </div>

          {/* Success/Error Messages */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-800 dark:text-green-200">
              {success}
            </div>
          )}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200">
              {error}
            </div>
          )}

          {/* Profile Section */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800 overflow-hidden">
            {/* Avatar Section */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-zinc-800 dark:to-zinc-800 px-6 py-8 border-b border-gray-200 dark:border-zinc-800">
              <div className="flex items-center gap-6">
                <div className="relative">
                  {avatarUrl ? (
                    <Image
                      src={normalizeAvatarUrl(avatarUrl) || ''}
                      alt="Avatar"
                      width={96}
                      height={96}
                      className="rounded-full object-cover border-4 border-white dark:border-zinc-900 shadow-lg"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-lg border-4 border-white dark:border-zinc-900">
                      <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                    {user?.full_name || user?.name || 'User'}
                  </h2>
                  {user?.username && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">@{user.username}</p>
                  )}
                  <label className="inline-block">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      disabled={saving === 'avatar'}
                      className="hidden"
                      id="avatar-upload"
                    />
                    <span className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 cursor-pointer transition-colors disabled:opacity-50">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {saving === 'avatar' ? 'Uploading...' : 'Change Photo'}
                    </span>
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">JPG, PNG or GIF. Max size 5MB.</p>
                </div>
              </div>
            </div>

            {/* Editable Fields */}
            <div className="p-6">
              <div className="py-4">
                <EditableField
                  label="Username"
                  value={user?.username || null}
                  isEditing={editingField === 'username'}
                  onEdit={() => setEditingField('username')}
                  onSave={(value) => handleSaveField('username', value)}
                  onCancel={() => setEditingField(null)}
                  placeholder="Enter username"
                  saving={saving === 'username'}
                  showAtPrefix={true}
                />
              </div>

              <div className="py-4">
                <EditableField
                  label="Full Name"
                  value={user?.full_name || null}
                  isEditing={editingField === 'full_name'}
                  onEdit={() => setEditingField('full_name')}
                  onSave={(value) => handleSaveField('full_name', value)}
                  onCancel={() => setEditingField(null)}
                  placeholder="Enter full name"
                  saving={saving === 'full_name'}
                />
              </div>

              <div className="py-4">
                <EditableField
                  label="Display Name"
                  value={user?.name || null}
                  isEditing={editingField === 'name'}
                  onEdit={() => setEditingField('name')}
                  onSave={(value) => handleSaveField('name', value)}
                  onCancel={() => setEditingField(null)}
                  placeholder="Enter display name"
                  saving={saving === 'name'}
                />
              </div>

              <div className="py-4">
                <EditableField
                  label="Email"
                  value={user?.email || null}
                  isEditing={false}
                  onEdit={() => {}}
                  onSave={async () => {}}
                  onCancel={() => {}}
                  type="email"
                  disabled={true}
                />
                {user?.auth_type === 'google' && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-2">
                    Email is linked to your Google account and cannot be changed.
                  </p>
                )}
              </div>

              {/* Password Field - Only for custom auth users */}
              {user?.auth_type !== 'google' && (
                <PasswordField
                  isEditing={false}
                  onEdit={() => setShowPasswordModal(true)}
                  onCancel={() => {}}
                  onForgotPassword={() => {
                    if (user?.email) {
                      setForgotPasswordEmail(user.email);
                    }
                    setShowForgotPassword(true);
                  }}
                />
              )}
            </div>
          </div>

          {/* Subscription Card */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800 overflow-hidden mb-6">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Subscription</h2>
              <div className="text-gray-600 dark:text-gray-400">
                <p className="mb-2">Manage your subscription plan and preferences.</p>
                <p className="text-sm text-gray-500 dark:text-gray-500">Coming soon...</p>
              </div>
            </div>
          </div>

          {/* Billing Card */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800 overflow-hidden mb-6">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Billing</h2>
              <div className="text-gray-600 dark:text-gray-400">
                <p className="mb-2">View billing history and manage payment methods.</p>
                <p className="text-sm text-gray-500 dark:text-gray-500">Coming soon...</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      {user?.auth_type !== 'google' && (
        <PasswordModal
          isOpen={showPasswordModal}
          onClose={() => setShowPasswordModal(false)}
          onSave={handleChangePassword}
          saving={changingPassword}
        />
      )}

      {/* Forgot Password Modal */}
      {user?.auth_type !== 'google' && showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Reset Password</h2>
              <button
                onClick={() => {
                  setShowForgotPassword(false);
                  setForgotPasswordSuccess(false);
                  setError(null);
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {forgotPasswordSuccess ? (
              <div className="text-center py-4">
                <div className="mb-4 text-green-600 dark:text-green-400">
                  <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-gray-700 dark:text-gray-300 mb-2">
                  Password reset email sent!
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Check your email for a temporary password. Please change it after logging in.
                </p>
                <button
                  onClick={() => {
                    setShowForgotPassword(false);
                    setForgotPasswordSuccess(false);
                  }}
                  className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={forgotPasswordEmail || user?.email || ''}
                    onChange={(e) => setForgotPasswordEmail(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={user?.email || "your@email.com"}
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={forgotPasswordLoading}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {forgotPasswordLoading ? 'Sending...' : 'Send Reset Email'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setError(null);
                    }}
                    disabled={forgotPasswordLoading}
                    className="px-4 py-2 bg-gray-200 dark:bg-zinc-700 hover:bg-gray-300 dark:hover:bg-zinc-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
