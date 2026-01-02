'use client';

import { useState, useEffect } from 'react';
import TicketAnalyticsChart from './TicketAnalyticsChart';

interface Ticket {
  id: number;
  ticket_number: string;
  category: string;
  subject: string;
  description: string;
  priority: string;
  status: string;
  assigned_to: number | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  user_id: number | null;
  user_email: string | null;
  user_name: string | null;
  is_banned?: boolean;
  is_restricted?: boolean;
  assigned_email: string | null;
  assigned_name: string | null;
}

interface TicketReply {
  id: number;
  ticket_id: number;
  user_id: number | null;
  is_admin: boolean;
  message: string;
  created_at: string;
  user_email: string | null;
  user_name: string | null;
}

interface TicketStats {
  byStatus: Array<{ status: string; count: number }>;
  byCategory: Array<{ category: string; count: number }>;
  byPriority: Array<{ priority: string; count: number }>;
  total: number;
}

export default function SupportTicketsDashboard() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalTickets, setTotalTickets] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [replies, setReplies] = useState<TicketReply[]>([]);
  const [replyMessage, setReplyMessage] = useState('');
  const [replying, setReplying] = useState(false);

  useEffect(() => {
    fetchTickets();
    fetchStats();
  }, [statusFilter, categoryFilter, priorityFilter, searchTerm, currentPage, itemsPerPage]);

  const fetchTickets = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      if (priorityFilter !== 'all') params.append('priority', priorityFilter);
      if (searchTerm) params.append('search', searchTerm);
      params.append('page', currentPage.toString());
      params.append('limit', itemsPerPage.toString());

      const response = await fetch(
        `http://localhost:3001/api/support/admin/tickets?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('Fetched tickets:', data.tickets?.length || 0, 'of', data.total || 0);
        setTickets(data.tickets || []);
        setTotalTickets(data.total || 0);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error fetching tickets:', response.status, errorData);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(
        'http://localhost:3001/api/support/admin/tickets/stats',
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const updateTicketStatus = async (ticketId: number, newStatus: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(
        `http://localhost:3001/api/support/admin/tickets/${ticketId}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (response.ok) {
        fetchTickets();
        fetchStats();
        if (selectedTicket?.id === ticketId) {
          const updated = await response.json();
          setSelectedTicket({ ...selectedTicket, status: newStatus });
        }
      }
    } catch (error) {
      console.error('Error updating ticket:', error);
    }
  };

  const updateTicketPriority = async (ticketId: number, newPriority: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(
        `http://localhost:3001/api/support/admin/tickets/${ticketId}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ priority: newPriority }),
        }
      );

      if (response.ok) {
        fetchTickets();
        fetchStats();
        if (selectedTicket?.id === ticketId) {
          setSelectedTicket({ ...selectedTicket, priority: newPriority });
        }
      }
    } catch (error) {
      console.error('Error updating ticket priority:', error);
    }
  };

  const fetchReplies = async (ticketId: number) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(
        `http://localhost:3001/api/support/admin/tickets/${ticketId}/replies`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setReplies(data.replies || []);
      }
    } catch (error) {
      console.error('Error fetching replies:', error);
    }
  };

  const handleUnbanUser = async (userId: number) => {
    if (!confirm('Are you sure you want to unban this user?')) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`http://localhost:3001/api/admin/users/${userId}/unban`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await fetchUserStatus(userId);
        fetchTickets(); // Refresh tickets
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to unban user');
      }
    } catch (err) {
      alert('Failed to unban user');
    }
  };

  const handleUnrestrictUser = async (userId: number) => {
    if (!confirm('Are you sure you want to remove restriction from this user?')) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`http://localhost:3001/api/admin/users/${userId}/unrestrict`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        fetchTickets(); // Refresh tickets
        // Update selected ticket if it's the same user
        if (selectedTicket?.user_id === userId) {
          const updatedTicket = { ...selectedTicket, is_restricted: false };
          setSelectedTicket(updatedTicket);
        }
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to remove restriction');
      }
    } catch (err) {
      alert('Failed to remove restriction');
    }
  };

  const handleReply = async (ticketId: number) => {
    if (!replyMessage.trim()) return;

    setReplying(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(
        `http://localhost:3001/api/support/admin/tickets/${ticketId}/replies`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message: replyMessage }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setReplies([...replies, data.reply]);
        setReplyMessage('');
        fetchTickets(); // Refresh to update updated_at
      }
    } catch (error) {
      console.error('Error adding reply:', error);
    } finally {
      setReplying(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'unknown':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading tickets...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Support Tickets
        </h2>
        {stats && (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Total: {stats.total} tickets
          </div>
        )}
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {stats.byStatus.map((stat) => (
            <div
              key={stat.status}
              className="bg-white dark:bg-gray-800 rounded-lg shadow p-4"
            >
              <div className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                {stat.status.replace('_', ' ')}
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stat.count}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Analytics Chart */}
      {typeof window !== 'undefined' && localStorage.getItem('token') && (
        <TicketAnalyticsChart token={localStorage.getItem('token')!} />
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search tickets..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Categories</option>
              <option value="bug">Bug Report</option>
              <option value="feature">Feature Request</option>
              <option value="technical">Technical Issue</option>
              <option value="account">Account Issue</option>
              <option value="billing">Billing Question</option>
              <option value="data">Data Issue</option>
              <option value="api">API Question</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Priority
            </label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Priorities</option>
              <option value="unknown">Unknown (Unaddressed)</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Ticket #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Subject
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    No tickets found
                  </td>
                </tr>
              ) : (
                tickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                    onClick={() => {
                      setSelectedTicket(ticket);
                      setShowModal(true);
                      fetchReplies(ticket.id);
                    }}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {ticket.ticket_number}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {ticket.subject}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 capitalize">
                      {ticket.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(
                          ticket.priority
                        )}`}
                      >
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                          ticket.status
                        )}`}
                      >
                        {ticket.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {ticket.user_email || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(ticket.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <select
                        value={ticket.status}
                        onChange={(e) => {
                          e.stopPropagation();
                          updateTicketStatus(ticket.id, e.target.value);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className={`text-xs px-2 py-1 rounded ${getStatusColor(ticket.status)} border-0`}
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        <div className="bg-gray-100 dark:bg-zinc-900 px-6 py-4 border-t border-gray-200 dark:border-zinc-700 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
              <span className="font-medium">
                {Math.min(currentPage * itemsPerPage, totalTickets)}
              </span>{' '}
              of <span className="font-medium">{totalTickets}</span> tickets
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700 dark:text-gray-300">Per page:</label>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 border border-gray-300 dark:border-zinc-600 rounded-md bg-blue-50 dark:bg-zinc-800 text-gray-900 dark:text-white text-sm"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl hover:bg-gray-200 dark:hover:bg-zinc-700 hover:shadow-md hover:border-gray-300 dark:hover:border-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 tracking-tight"
            >
              Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.ceil(totalTickets / itemsPerPage) }, (_, i) => i + 1)
                .filter(page => {
                  // Show first page, last page, current page, and pages around current
                  const totalPages = Math.ceil(totalTickets / itemsPerPage);
                  if (totalPages <= 7) return true;
                  if (page === 1 || page === totalPages) return true;
                  if (Math.abs(page - currentPage) <= 1) return true;
                  return false;
                })
                .map((page, index, array) => {
                  // Add ellipsis
                  const prevPage = array[index - 1];
                  const showEllipsis = prevPage && page - prevPage > 1;
                  
                  return (
                    <div key={page} className="flex items-center gap-1">
                      {showEllipsis && (
                        <span className="px-2 text-gray-500 dark:text-gray-400">...</span>
                      )}
                      <button
                        onClick={() => setCurrentPage(page)}
                        className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-300 tracking-tight ${
                          currentPage === page
                            ? 'bg-blue-600 dark:bg-blue-700 text-white hover:shadow-xl hover:shadow-blue-500/30'
                            : 'text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 hover:bg-gray-200 dark:hover:bg-zinc-700 hover:shadow-md hover:border-gray-300 dark:hover:border-zinc-600'
                        } active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-zinc-900`}
                      >
                        {page}
                      </button>
                    </div>
                  );
                })}
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalTickets / itemsPerPage), prev + 1))}
              disabled={currentPage >= Math.ceil(totalTickets / itemsPerPage)}
              className="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl hover:bg-gray-200 dark:hover:bg-zinc-700 hover:shadow-md hover:border-gray-300 dark:hover:border-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 tracking-tight"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Ticket Detail Modal */}
      {showModal && selectedTicket && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-blue-50 dark:bg-zinc-800 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {selectedTicket.ticket_number}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {selectedTicket.subject}
                  </p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Category
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white capitalize">
                    {selectedTicket.category}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Priority
                  </label>
                  <select
                    value={selectedTicket.priority}
                    onChange={(e) => updateTicketPriority(selectedTicket.id, e.target.value)}
                    className={`mt-1 text-xs px-2 py-1 rounded border-0 ${getPriorityColor(selectedTicket.priority)}`}
                  >
                    <option value="unknown">Unknown</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Status
                  </label>
                  <select
                    value={selectedTicket.status}
                    onChange={(e) => updateTicketStatus(selectedTicket.id, e.target.value)}
                    className={`mt-1 text-xs px-2 py-1 rounded ${getStatusColor(selectedTicket.status)} border-0`}
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    User
                  </label>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-gray-900 dark:text-white">
                      {selectedTicket.user_email || 'N/A'}
                    </p>
                    {(selectedTicket.is_banned || selectedTicket.is_restricted) && (
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        selectedTicket.is_banned 
                          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      }`}>
                        {selectedTicket.is_banned ? 'Banned' : 'Restricted'}
                      </span>
                    )}
                  </div>
                  {selectedTicket.user_id && (selectedTicket.is_banned || selectedTicket.is_restricted) && (
                    <div className="mt-2 flex gap-2">
                      {selectedTicket.is_banned && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUnbanUser(selectedTicket.user_id!);
                          }}
                          className="text-xs px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
                        >
                          Unban User
                        </button>
                      )}
                      {selectedTicket.is_restricted && !selectedTicket.is_banned && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUnrestrictUser(selectedTicket.user_id!);
                          }}
                          className="text-xs px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
                        >
                          Unrestrict User
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-4">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Description
                </label>
                <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap mt-1 p-3 bg-gray-100 dark:bg-zinc-900 rounded-md">
                  {selectedTicket.description}
                </p>
              </div>

              {/* Replies Section */}
              <div className="mb-4 border-t border-gray-200 dark:border-zinc-700 pt-4">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Conversation ({replies.length} {replies.length === 1 ? 'reply' : 'replies'})
                </h4>
                
                <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
                  {replies.map((reply) => (
                    <div
                      key={reply.id}
                      className={`p-3 rounded-md ${
                        reply.is_admin
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500'
                          : 'bg-gray-100 dark:bg-zinc-900 border-l-4 border-gray-300 dark:border-zinc-600'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          {reply.is_admin ? '👤 Admin' : reply.user_name || reply.user_email || 'User'}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(reply.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                        {reply.message}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Reply Form */}
                <div className="border-t border-gray-200 dark:border-zinc-700 pt-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Add Reply
                  </label>
                  <textarea
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    rows={3}
                    placeholder="Type your reply..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-600 rounded-md bg-blue-50 dark:bg-zinc-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                  <button
                    onClick={() => handleReply(selectedTicket.id)}
                    disabled={!replyMessage.trim() || replying}
                    className="mt-2 px-5 py-2.5 text-sm font-semibold bg-blue-600 dark:bg-blue-700 text-white rounded-xl hover:bg-blue-700 dark:hover:bg-blue-600 hover:shadow-xl hover:shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 tracking-tight"
                  >
                    {replying ? 'Sending...' : 'Send Reply'}
                  </button>
                </div>
              </div>

              <div className="text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-zinc-700 pt-4">
                Created: {new Date(selectedTicket.created_at).toLocaleString()}
                {selectedTicket.resolved_at && (
                  <span className="ml-4">
                    Resolved: {new Date(selectedTicket.resolved_at).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

