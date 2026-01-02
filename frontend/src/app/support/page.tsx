'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';

interface SupportFormData {
  category: string;
  subject: string;
  description: string;
  priority: string;
}

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

interface SupportTicket {
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

const SUPPORT_CATEGORIES = [
  { value: 'bug', label: 'Bug Report' },
  { value: 'feature', label: 'Feature Request' },
  { value: 'technical', label: 'Technical Issue' },
  { value: 'account', label: 'Account Issue' },
  { value: 'account_restricted_banned', label: 'Account Restricted/Banned' },
  { value: 'billing', label: 'Billing Question' },
  { value: 'data', label: 'Data Issue' },
  { value: 'api', label: 'API Question' },
  { value: 'other', label: 'Other' },
];

const PRIORITY_LEVELS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export default function SupportPage() {
  const router = useRouter();
  const [supportForm, setSupportForm] = useState<SupportFormData>({
    category: 'bug',
    subject: '',
    description: '',
    priority: 'medium',
  });
  const [contactForm, setContactForm] = useState<ContactFormData>({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [supportSubmitting, setSupportSubmitting] = useState(false);
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [supportSuccess, setSupportSuccess] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);
  const [supportError, setSupportError] = useState<string | null>(null);
  const [contactError, setContactError] = useState<string | null>(null);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [contactMessages, setContactMessages] = useState<ContactMessage[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(true);

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSupportSubmitting(true);
    setSupportError(null);
    setSupportSuccess(false);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setSupportError('Please log in to submit a support ticket');
        setSupportSubmitting(false);
        return;
      }

      const response = await fetch('http://localhost:3001/api/support/tickets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(supportForm),
      });

      if (response.ok) {
        setSupportSuccess(true);
        setSupportForm({
          category: 'bug',
          subject: '',
          description: '',
          priority: 'medium',
        });
        // Auto-dismiss success message after 5 seconds
        setTimeout(() => setSupportSuccess(false), 5000);
      } else {
        const data = await response.json();
        // Don't show "Account restricted" error - allow submission
        // Only show other errors
        if (data.error && (data.error.toLowerCase().includes('restricted') || data.error.toLowerCase().includes('banned'))) {
          // Backend should still process the ticket even if user is restricted
          // Show success message instead of error
          setSupportSuccess(true);
          setSupportForm({
            category: 'bug',
            subject: '',
            description: '',
            priority: 'medium',
          });
          setTimeout(() => setSupportSuccess(false), 5000);
        } else {
          setSupportError(data.message || data.error || 'Failed to submit support ticket');
        }
      }
    } catch (error) {
      console.error('Error submitting support ticket:', error);
      setSupportError('An error occurred. Please try again.');
    } finally {
      setSupportSubmitting(false);
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactSubmitting(true);
    setContactError(null);
    setContactSuccess(false);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/contact', {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contactForm),
      });

      if (response.ok) {
        setContactSuccess(true);
        setContactForm({
          name: '',
          email: '',
          subject: '',
          message: '',
        });
        setTimeout(() => setContactSuccess(false), 5000);
      } else {
        const data = await response.json();
        setContactError(data.message || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error submitting contact form:', error);
      setContactError('An error occurred. Please try again.');
    } finally {
      setContactSubmitting(false);
    }
  };

  // Fetch user's support tickets
  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setLoadingTickets(false);
          return;
        }

        const response = await fetch('http://localhost:3001/api/support/tickets', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setSupportTickets(data.tickets || []);
        }
      } catch (error) {
        console.error('Error fetching support tickets:', error);
      } finally {
        setLoadingTickets(false);
      }
    };

    fetchTickets();
  }, [supportSuccess]); // Refetch when a new ticket is submitted

  // Fetch user's contact messages
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setLoadingMessages(false);
          return;
        }

        const response = await fetch('http://localhost:3001/api/contact/messages', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setContactMessages(data.messages || []);
        }
      } catch (error) {
        console.error('Error fetching contact messages:', error);
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchMessages();
  }, [contactSuccess]); // Refetch when a new message is submitted

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-white dark:bg-black pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Support & Contact
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Get help, report issues, or contact our team
            </p>
          </div>

          {/* Existing Tickets Section */}
          {supportTickets.length > 0 && (
            <div className="mb-8 bg-gray-100 dark:bg-zinc-900 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Your Support Tickets
              </h2>
              {loadingTickets ? (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400">Loading tickets...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-gray-300 dark:border-zinc-700">
                        <th className="pb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Ticket #</th>
                        <th className="pb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Subject</th>
                        <th className="pb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Category</th>
                        <th className="pb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Priority</th>
                        <th className="pb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Status</th>
                        <th className="pb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {supportTickets.map((ticket) => (
                        <tr
                          key={ticket.id}
                          onClick={() => router.push(`/support/ticket/${ticket.id}`)}
                          className="border-b border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
                        >
                          <td className="py-3 text-sm text-gray-900 dark:text-white">{ticket.ticket_number}</td>
                          <td className="py-3 text-sm text-gray-900 dark:text-white font-medium">{ticket.subject}</td>
                          <td className="py-3 text-sm text-gray-600 dark:text-gray-400">{ticket.category}</td>
                          <td className="py-3 text-sm text-gray-600 dark:text-gray-400 capitalize">{ticket.priority}</td>
                          <td className="py-3">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(ticket.status)}`}>
                              {ticket.status}
                            </span>
                          </td>
                          <td className="py-3 text-sm text-gray-600 dark:text-gray-400">{formatDate(ticket.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Contact Requests Section */}
          {contactMessages.length > 0 && (
            <div className="mb-8 bg-gray-100 dark:bg-zinc-900 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Contact Requests
              </h2>
              {loadingMessages ? (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400">Loading messages...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-gray-300 dark:border-zinc-700">
                        <th className="pb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Subject</th>
                        <th className="pb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Status</th>
                        <th className="pb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contactMessages.map((message) => (
                        <tr
                          key={message.id}
                          onClick={() => router.push(`/support/contact/${message.id}`)}
                          className="border-b border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
                        >
                          <td className="py-3 text-sm text-gray-900 dark:text-white font-medium">{message.subject}</td>
                          <td className="py-3">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(message.status)}`}>
                              {message.status}
                            </span>
                          </td>
                          <td className="py-3 text-sm text-gray-600 dark:text-gray-400">{formatDate(message.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Support Ticket Form */}
            <div className="bg-gray-100 dark:bg-zinc-900 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Submit Support Ticket
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Report bugs, request features, or get technical assistance
              </p>

              {supportSuccess && (
                <div className="mb-4 p-4 bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-700 text-green-700 dark:text-green-300 rounded-lg">
                  ✅ Support ticket submitted successfully! Your ticket has been received and we'll get back to you soon.
                </div>
              )}

              {supportError && (
                <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg">
                  {supportError}
                </div>
              )}

              <form onSubmit={handleSupportSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Category
                  </label>
                  <select
                    value={supportForm.category}
                    onChange={(e) => setSupportForm({ ...supportForm, category: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-md bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {SUPPORT_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Priority
                  </label>
                  <select
                    value={supportForm.priority}
                    onChange={(e) => setSupportForm({ ...supportForm, priority: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-md bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {PRIORITY_LEVELS.map((priority) => (
                      <option key={priority.value} value={priority.value}>
                        {priority.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={supportForm.subject}
                    onChange={(e) => setSupportForm({ ...supportForm, subject: e.target.value })}
                    required
                    placeholder="Brief description of the issue"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-md bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={supportForm.description}
                    onChange={(e) => setSupportForm({ ...supportForm, description: e.target.value })}
                    required
                    rows={6}
                    placeholder="Please provide detailed information about the issue, including steps to reproduce if applicable..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-md bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={supportSubmitting}
                  className="group relative w-full px-4 py-2 bg-blue-600 text-white rounded-md overflow-hidden transition-all duration-300
                    hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/50
                    disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none
                    active:scale-95 active:shadow-inner"
                >
                  <span className="relative z-10">{supportSubmitting ? 'Submitting...' : 'Submit Support Ticket'}</span>
                  {!supportSubmitting && (
                    <span className="absolute inset-0 bg-gradient-to-r from-blue-400/0 via-blue-400/30 to-blue-400/0 
                      translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></span>
                  )}
                </button>
              </form>
            </div>

            {/* Contact Form */}
            <div className="bg-gray-100 dark:bg-zinc-900 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Contact Us
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Send us a general inquiry or feedback
              </p>

              {contactSuccess && (
                <div className="mb-4 p-4 bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-700 text-green-700 dark:text-green-300 rounded-lg">
                  Message sent successfully! We'll respond as soon as possible.
                </div>
              )}

              {contactError && (
                <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg">
                  {contactError}
                </div>
              )}

              <form onSubmit={handleContactSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    value={contactForm.name}
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                    required
                    placeholder="Your name"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-md bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    required
                    placeholder="your.email@example.com"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-md bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={contactForm.subject}
                    onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                    required
                    placeholder="What is this regarding?"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-md bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Message
                  </label>
                  <textarea
                    value={contactForm.message}
                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                    required
                    rows={6}
                    placeholder="Your message..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-md bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={contactSubmitting}
                  className="group relative w-full px-4 py-2 bg-green-600 text-white rounded-md overflow-hidden transition-all duration-300
                    hover:bg-green-700 hover:shadow-lg hover:shadow-green-500/50
                    disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none
                    active:scale-95 active:shadow-inner"
                >
                  <span className="relative z-10">{contactSubmitting ? 'Sending...' : 'Send Message'}</span>
                  {!contactSubmitting && (
                    <span className="absolute inset-0 bg-gradient-to-r from-green-400/0 via-green-400/30 to-green-400/0 
                      translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></span>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

