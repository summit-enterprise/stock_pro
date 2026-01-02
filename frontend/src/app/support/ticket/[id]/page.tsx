'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';

interface Ticket {
  id: number;
  ticket_number: string;
  category: string;
  subject: string;
  description: string;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

interface Reply {
  id: number;
  ticket_id: number;
  user_id: number;
  is_admin: boolean;
  message: string;
  created_at: string;
  user_email: string;
  user_name: string | null;
}

export default function TicketDetailPage() {
  const router = useRouter();
  const params = useParams();
  const ticketId = params?.id as string;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [closingTicket, setClosingTicket] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchTicketData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }

        // Fetch ticket and replies in parallel
        const [ticketResponse, repliesResponse] = await Promise.all([
          fetch(`http://localhost:3001/api/support/tickets/${ticketId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }),
          fetch(`http://localhost:3001/api/support/tickets/${ticketId}/replies`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }),
        ]);

        if (!ticketResponse.ok) {
          if (ticketResponse.status === 404) {
            setError('Ticket not found');
          } else {
            setError('Failed to load ticket');
          }
          setLoading(false);
          return;
        }

        const ticketData = await ticketResponse.json();
        setTicket(ticketData.ticket);

        if (repliesResponse.ok) {
          const repliesData = await repliesResponse.json();
          setReplies(repliesData.replies || []);
        }
      } catch (error) {
        console.error('Error fetching ticket data:', error);
        setError('An error occurred while loading the ticket');
      } finally {
        setLoading(false);
      }
    };

    if (ticketId) {
      fetchTicketData();
    }
  }, [ticketId, router]);

  const fetchReplies = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`http://localhost:3001/api/support/tickets/${ticketId}/replies`, {
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

      const response = await fetch(`http://localhost:3001/api/support/tickets/${ticketId}/replies`, {
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

  const handleCloseTicket = async () => {
    if (!confirm('Are you sure you want to close this ticket? You won\'t be able to reply after closing.')) {
      return;
    }

    setClosingTicket(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`http://localhost:3001/api/support/tickets/${ticketId}/close`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTicket({ ...ticket!, status: 'closed', resolved_at: data.ticket.resolved_at });
        setSuccessMessage('Ticket closed successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to close ticket');
      }
    } catch (error) {
      console.error('Error closing ticket:', error);
      setError('An error occurred while closing the ticket');
    } finally {
      setClosingTicket(false);
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
      case 'open':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'resolved':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'closed':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-white dark:bg-black pt-16 flex items-center justify-center">
          <div className="text-gray-500 dark:text-gray-400">Loading ticket...</div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !ticket) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-white dark:bg-black pt-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg p-4 mb-4">
              {error || 'Ticket not found'}
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

          {/* Ticket Header */}
          <div className="bg-gray-100 dark:bg-zinc-900 rounded-xl p-6 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {ticket.subject}
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Ticket #{ticket.ticket_number}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(ticket.status)}`}>
                  {ticket.status}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                  {ticket.priority} Priority
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div>
                <span className="text-gray-600 dark:text-gray-400">Category:</span>
                <span className="ml-2 text-gray-900 dark:text-white">{ticket.category}</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Created:</span>
                <span className="ml-2 text-gray-900 dark:text-white">{formatDate(ticket.created_at)}</span>
              </div>
            </div>

            <div className="mt-4 p-4 bg-gray-50 dark:bg-zinc-800 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Description</h3>
              <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{ticket.description}</p>
            </div>
          </div>

          {/* Replies Section */}
          <div className="bg-gray-100 dark:bg-zinc-900 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Conversation ({replies.length} {replies.length === 1 ? 'reply' : 'replies'})
              </h2>
              {ticket.status !== 'closed' && ticket.status !== 'resolved' && (
                <button
                  onClick={handleCloseTicket}
                  disabled={closingTicket}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {closingTicket ? 'Closing...' : 'Close Ticket'}
                </button>
              )}
            </div>

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
            {ticket.status !== 'closed' && ticket.status !== 'resolved' && (
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
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

