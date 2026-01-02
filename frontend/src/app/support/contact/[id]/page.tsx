'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';

interface ContactMessage {
  id: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Reply {
  id: number;
  contact_message_id: number;
  user_id: number;
  is_admin: boolean;
  message: string;
  created_at: string;
  user_email: string;
  user_name: string | null;
}

export default function ContactDetailPage() {
  const router = useRouter();
  const params = useParams();
  const messageId = params?.id as string;

  const [message, setMessage] = useState<ContactMessage | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchMessageData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }

        // Fetch message and replies in parallel
        const [messageResponse, repliesResponse] = await Promise.all([
          fetch(`http://localhost:3001/api/contact/messages/${messageId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }),
          fetch(`http://localhost:3001/api/contact/messages/${messageId}/replies`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }),
        ]);

        if (!messageResponse.ok) {
          if (messageResponse.status === 404) {
            setError('Message not found');
          } else {
            setError('Failed to load message');
          }
          setLoading(false);
          return;
        }

        const messageData = await messageResponse.json();
        setMessage(messageData.message);

        if (repliesResponse.ok) {
          const repliesData = await repliesResponse.json();
          setReplies(repliesData.replies || []);
        }
      } catch (error) {
        console.error('Error fetching message data:', error);
        setError('An error occurred while loading the message');
      } finally {
        setLoading(false);
      }
    };

    if (messageId) {
      fetchMessageData();
    }
  }, [messageId, router]);

  const fetchReplies = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`http://localhost:3001/api/contact/messages/${messageId}/replies`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setReplies(data.replies || []);
      }
    } catch (error) {
      console.error('Error fetching replies:', error);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim()) return;

    setSubmittingReply(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`http://localhost:3001/api/contact/messages/${messageId}/replies`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: replyMessage }),
      });

      if (response.ok) {
        const data = await response.json();
        setReplies([...replies, data.reply]);
        setReplyMessage('');
        setMessage({ ...message!, status: 'replied' });
        setSuccessMessage('Reply sent successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to send reply');
      }
    } catch (error) {
      console.error('Error sending reply:', error);
      setError('An error occurred while sending your reply');
    } finally {
      setSubmittingReply(false);
    }
  };


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'new':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'read':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'replied':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'archived':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-white dark:bg-black pt-16 flex items-center justify-center">
          <div className="text-gray-500 dark:text-gray-400">Loading message...</div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !message) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-white dark:bg-black pt-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg p-4 mb-4">
              {error || 'Message not found'}
            </div>
            <button
              onClick={() => router.push('/support')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Back to Support
            </button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-white dark:bg-black pt-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => router.push('/support')}
            className="mb-6 text-blue-600 dark:text-blue-400 hover:underline"
          >
            ← Back to Support
          </button>

          {/* Message Header */}
          <div className="bg-gray-100 dark:bg-zinc-900 rounded-xl p-6 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {message.subject}
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  From: {message.name} ({message.email})
                </p>
              </div>
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(message.status)}`}>
                {message.status}
              </span>
            </div>

            <div className="text-sm mb-4">
              <span className="text-gray-600 dark:text-gray-400">Sent:</span>
              <span className="ml-2 text-gray-900 dark:text-white">{formatDate(message.created_at)}</span>
            </div>

            <div className="mt-4 p-4 bg-gray-50 dark:bg-zinc-800 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Message</h3>
              <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{message.message}</p>
            </div>
          </div>

          {/* Replies Section */}
          <div className="bg-gray-100 dark:bg-zinc-900 rounded-xl p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Conversation ({replies.length} {replies.length === 1 ? 'reply' : 'replies'})
            </h2>

            {successMessage && (
              <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-700 text-green-700 dark:text-green-300 rounded-lg text-sm">
                {successMessage}
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg text-sm">
                {error}
              </div>
            )}

            {replies.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No replies yet. An admin will respond soon.
              </div>
            ) : (
              <div className="space-y-4 mb-6">
                {replies.map((reply) => (
                  <div
                    key={reply.id}
                    className={`p-4 rounded-lg ${
                      reply.is_admin
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500'
                        : 'bg-gray-50 dark:bg-zinc-800'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {reply.is_admin ? (
                            <span className="flex items-center gap-2">
                              <span className="px-2 py-0.5 text-xs font-medium bg-blue-600 text-white rounded">
                                Admin
                              </span>
                              {reply.user_name || reply.user_email}
                            </span>
                          ) : (
                            reply.user_name || reply.user_email
                          )}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {formatDate(reply.created_at)}
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-900 dark:text-white whitespace-pre-wrap mt-2">
                      {reply.message}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Reply Form */}
            <form onSubmit={handleReply} className="mt-6 pt-6 border-t border-gray-300 dark:border-zinc-700">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Add a Reply
                </label>
                <textarea
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  required
                  rows={4}
                  placeholder="Type your reply here..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-md bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={submittingReply || !replyMessage.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingReply ? 'Sending...' : 'Send Reply'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

