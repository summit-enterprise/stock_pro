'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGoogleLogin } from '@react-oauth/google';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);

  // Check for email parameter in URL
  useEffect(() => {
    if (isOpen && typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const emailParam = urlParams.get('email');
      if (emailParam) {
        setEmail(decodeURIComponent(emailParam));
        setForgotPasswordEmail(decodeURIComponent(emailParam));
      }
    }
  }, [isOpen]);
  const [error, setError] = useState('');

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setError('');
      setLoading(true);

      try {
        // Get user info from Google using the access token
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: {
            Authorization: `Bearer ${tokenResponse.access_token}`,
          },
        });

        if (!userInfoResponse.ok) {
          throw new Error('Failed to fetch user info from Google');
        }

        const googleUser = await userInfoResponse.json();

        // Send to backend
        const response = await fetch('http://localhost:3001/api/auth/google', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            googleId: googleUser.sub,
            email: googleUser.email,
            name: googleUser.name,
            picture: googleUser.picture || null, // Google profile picture
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Google login failed');
        }

        // Check if user is banned or restricted
        if (data.user.is_banned || data.user.is_restricted) {
          // Still store token and user data so they can access support page
          if (data.token) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            window.dispatchEvent(new Event('auth-change'));
          }
          onClose();
          router.push('/restricted');
          return;
        }

        if (data.token) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          
          // If user is admin/superuser, also set adminToken (unified session)
          if (data.user.is_admin || data.user.is_superuser) {
            localStorage.setItem('adminToken', data.token);
          }
          
          // Dispatch event to notify Navbar of auth change
          window.dispatchEvent(new Event('auth-change'));
        }

        onClose();
        
        // Redirect admins to admin panel, regular users to dashboard
        if (data.user.is_admin || data.user.is_superuser) {
          router.push('/admin');
        } else {
          router.push('/dashboard');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Google login failed');
      } finally {
        setLoading(false);
      }
    },
    onError: () => {
      setError('Google login failed. Please try again.');
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Check if user is banned or restricted
      if (data.user.is_banned || data.user.is_restricted) {
        // Still store token and user data so they can access support page
        if (data.token) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          window.dispatchEvent(new Event('auth-change'));
        }
        onClose();
        router.push('/restricted');
        return;
      }

      // Store token
      if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // If user is admin, also set adminToken
        if (data.user.is_admin || data.user.is_superuser) {
          localStorage.setItem('adminToken', data.token);
        }
        
        // Dispatch event to notify Navbar of auth change
        window.dispatchEvent(new Event('auth-change'));
      }

      onClose();
      
      // Redirect admins to admin panel, regular users to dashboard
      if (data.user.is_admin || data.user.is_superuser) {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotPasswordLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:3001/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: forgotPasswordEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send password reset email');
      }

      setForgotPasswordSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send password reset email');
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Login</h2>
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Password
              </label>
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(true);
                  setForgotPasswordEmail(email);
                }}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Forgot password?
              </button>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="group relative w-full py-3 bg-blue-600 dark:bg-blue-700 text-white rounded-xl overflow-hidden transition-all duration-300 font-semibold
              hover:bg-blue-700 dark:hover:bg-blue-600 hover:shadow-xl hover:shadow-blue-500/30
              disabled:bg-gray-400 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed disabled:hover:shadow-none
              active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 tracking-tight"
          >
            <span className="relative z-10">{loading ? 'Logging in...' : 'Login'}</span>
            {!loading && (
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent 
                translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></span>
            )}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-zinc-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-zinc-900 text-gray-500">Or continue with</span>
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            className="group relative mt-4 w-full py-3 border border-gray-300 dark:border-zinc-700 rounded-lg overflow-hidden transition-all duration-300
              hover:bg-gray-50 dark:hover:bg-zinc-800 hover:shadow-md
              active:scale-95 active:shadow-inner
              flex items-center justify-center gap-3"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-gray-200/0 via-gray-200/10 to-gray-200/0 
              translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></span>
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span className="text-gray-700 dark:text-gray-300 font-medium">Continue with Google</span>
          </button>
        </div>

        {/* Forgot Password Modal */}
        {showForgotPassword && (
          <div className="mt-6 p-4 bg-gray-50 dark:bg-zinc-800 rounded-lg border border-gray-200 dark:border-zinc-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Reset Password</h3>
              <button
                onClick={() => {
                  setShowForgotPassword(false);
                  setForgotPasswordSuccess(false);
                  setError('');
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={forgotPasswordEmail}
                    onChange={(e) => setForgotPasswordEmail(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-zinc-700 dark:border-zinc-600 dark:text-white"
                    placeholder="your@email.com"
                  />
                </div>
                <button
                  type="submit"
                  disabled={forgotPasswordLoading}
                  className="w-full py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg font-medium transition-colors hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {forgotPasswordLoading ? 'Sending...' : 'Send Reset Email'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

