'use client';

import { useState, useEffect } from 'react';

interface YouTubeChannel {
  id?: number;
  channel_id: string;
  channel_name: string;
  subject: string;
  category: 'fintech' | 'news';
  content_type: 'live' | 'video';
  pull_livestreams: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface LiveStreamsDashboardProps {
  token: string;
}

const ITEMS_PER_PAGE = 10;

export default function LiveStreamsDashboard({ token }: LiveStreamsDashboardProps) {
  const [channels, setChannels] = useState<YouTubeChannel[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'fintech' | 'news'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  
  // Column widths state
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
    id: 60,
    channel_id: 200,
    channel_name: 200,
    subject: 250,
    category: 120,
    content_type: 130,
    pull_livestreams: 140,
    is_active: 100,
    created_at: 180,
    updated_at: 180,
    actions: 100,
  });
  
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);

  useEffect(() => {
    loadChannels();
  }, [token]);

  const loadChannels = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:3001/api/admin/youtube-channels', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setChannels(data.channels || []);
      } else {
        setError('Failed to load channels');
      }
    } catch (error) {
      console.error('Error loading channels:', error);
      setError('Failed to load channels');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRow = () => {
    setChannels([
      ...channels,
      {
        channel_id: '',
        channel_name: '',
        subject: '',
        category: 'fintech',
        content_type: 'live',
        pull_livestreams: true,
        is_active: true,
      },
    ]);
  };

  const handleDeleteRow = (index: number) => {
    const channel = channels[index];
    if (channel.id) {
      // Delete from database
      fetch(`http://localhost:3001/api/admin/youtube-channels/${channel.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
        .then(() => {
          setChannels(channels.filter((_, i) => i !== index));
          setSuccess('Channel deleted successfully');
          setTimeout(() => setSuccess(null), 3000);
        })
        .catch((error) => {
          console.error('Error deleting channel:', error);
          setError('Failed to delete channel');
        });
    } else {
      // Just remove from local state if it's a new row
      setChannels(channels.filter((_, i) => i !== index));
    }
  };

  const handleFieldChange = (index: number, field: keyof YouTubeChannel, value: any) => {
    const updated = [...channels];
    updated[index] = { ...updated[index], [field]: value };
    setChannels(updated);
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Validate all channels
      const invalidChannels = channels.filter(
        (ch) => !ch.channel_id || !ch.channel_name || !ch.category || !ch.content_type
      );

      if (invalidChannels.length > 0) {
        setError('Please fill in all required fields (Channel ID, Channel Name, Category, Content Type)');
        setSaving(false);
        return;
      }

      const response = await fetch('http://localhost:3001/api/admin/youtube-channels', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ channels }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess(`Successfully saved ${data.results.filter((r: any) => r.success).length} channels`);
        setTimeout(() => setSuccess(null), 5000);
        // Reload to get updated IDs
        await loadChannels();
        setCurrentPage(1); // Reset to first page after save
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error || 'Failed to save channels');
      }
    } catch (error) {
      console.error('Error saving channels:', error);
      setError('Failed to save channels');
    } finally {
      setSaving(false);
    }
  };

  // Filter and search channels
  const filteredChannels = channels.filter((channel) => {
    // Category filter
    if (categoryFilter !== 'all' && channel.category !== categoryFilter) {
      return false;
    }

    // Search filter (channel name or channel ID)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchesName = channel.channel_name.toLowerCase().includes(query);
      const matchesId = channel.channel_id.toLowerCase().includes(query);
      if (!matchesName && !matchesId) {
        return false;
      }
    }

    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredChannels.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedChannels = filteredChannels.slice(startIndex, endIndex);

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, categoryFilter]);

  // Handle column resizing
  const handleMouseDown = (columnKey: string, e: React.MouseEvent) => {
    e.preventDefault();
    setResizingColumn(columnKey);
    const startX = e.pageX;
    const startWidth = columnWidths[columnKey];

    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.pageX - startX;
      const newWidth = Math.max(50, startWidth + diff);
      setColumnWidths(prev => ({ ...prev, [columnKey]: newWidth }));
    };

    const handleMouseUp = () => {
      setResizingColumn(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading channels...</div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Live Streams Management</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage YouTube channels for live streams and videos
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleAddRow}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            + Add Row
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {saving ? 'Saving...' : 'Save All'}
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200">
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-800 dark:text-green-200">
          {success}
        </div>
      )}

      {/* Search and Filter Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by channel name or ID..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as 'all' | 'fintech' | 'news')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              <option value="fintech">Fintech</option>
              <option value="news">News</option>
            </select>
          </div>

          {/* Results Count */}
          <div className="flex items-end">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing {startIndex + 1}-{Math.min(endIndex, filteredChannels.length)} of {filteredChannels.length} channels
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th 
                  style={{ width: columnWidths.id }}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider relative"
                >
                  ID
                  <div
                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500"
                    onMouseDown={(e) => handleMouseDown('id', e)}
                  />
                </th>
                <th 
                  style={{ width: columnWidths.channel_id }}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider relative"
                >
                  Channel ID
                  <div
                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500"
                    onMouseDown={(e) => handleMouseDown('channel_id', e)}
                  />
                </th>
                <th 
                  style={{ width: columnWidths.channel_name }}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider relative"
                >
                  Channel Name
                  <div
                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500"
                    onMouseDown={(e) => handleMouseDown('channel_name', e)}
                  />
                </th>
                <th 
                  style={{ width: columnWidths.subject }}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider relative"
                >
                  Subject
                  <div
                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500"
                    onMouseDown={(e) => handleMouseDown('subject', e)}
                  />
                </th>
                <th 
                  style={{ width: columnWidths.category }}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider relative"
                >
                  Category
                  <div
                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500"
                    onMouseDown={(e) => handleMouseDown('category', e)}
                  />
                </th>
                <th 
                  style={{ width: columnWidths.content_type }}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider relative"
                >
                  Content Type
                  <div
                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500"
                    onMouseDown={(e) => handleMouseDown('content_type', e)}
                  />
                </th>
                <th 
                  style={{ width: columnWidths.pull_livestreams }}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider relative"
                >
                  Pull Livestreams
                  <div
                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500"
                    onMouseDown={(e) => handleMouseDown('pull_livestreams', e)}
                  />
                </th>
                <th 
                  style={{ width: columnWidths.is_active }}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider relative"
                >
                  Active
                  <div
                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500"
                    onMouseDown={(e) => handleMouseDown('is_active', e)}
                  />
                </th>
                <th 
                  style={{ width: columnWidths.created_at }}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider relative"
                >
                  Created At
                  <div
                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500"
                    onMouseDown={(e) => handleMouseDown('created_at', e)}
                  />
                </th>
                <th 
                  style={{ width: columnWidths.updated_at }}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider relative"
                >
                  Updated At
                  <div
                    className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500"
                    onMouseDown={(e) => handleMouseDown('updated_at', e)}
                  />
                </th>
                <th 
                  style={{ width: columnWidths.actions }}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {paginatedChannels.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    {channels.length === 0 
                      ? 'No channels found. Click "Add Row" to add a new channel.'
                      : 'No channels match your search criteria.'}
                  </td>
                </tr>
              ) : (
                paginatedChannels.map((channel, paginatedIndex) => {
                  // Find the original index in the full channels array
                  // For saved channels, use ID; for new unsaved channels, match by channel_id and channel_name
                  let originalIndex = -1;
                  if (channel.id) {
                    originalIndex = channels.findIndex(ch => ch.id === channel.id);
                  } else {
                    // For new unsaved channels, find by channel_id and channel_name
                    originalIndex = channels.findIndex(ch => 
                      !ch.id && ch.channel_id === channel.channel_id && ch.channel_name === channel.channel_name
                    );
                  }
                  
                  // Fallback: if not found, use the index from filtered array (shouldn't happen, but safety check)
                  if (originalIndex === -1) {
                    originalIndex = channels.findIndex(ch => 
                      ch.channel_id === channel.channel_id && ch.channel_name === channel.channel_name
                    );
                  }
                  
                  // If still not found, this is a new row - use the filtered index as fallback
                  const safeIndex = originalIndex !== -1 ? originalIndex : startIndex + paginatedIndex;
                  
                  return (
                  <tr key={channel.id || originalIndex} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td style={{ width: columnWidths.id }} className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {channel.id || '-'}
                    </td>
                    <td style={{ width: columnWidths.channel_id }} className="px-4 py-3 whitespace-nowrap">
                      <input
                        type="text"
                        value={channel.channel_id}
                        onChange={(e) => handleFieldChange(safeIndex, 'channel_id', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                        placeholder="UC..."
                      />
                    </td>
                    <td style={{ width: columnWidths.channel_name }} className="px-4 py-3 whitespace-nowrap">
                      <input
                        type="text"
                        value={channel.channel_name}
                        onChange={(e) => handleFieldChange(safeIndex, 'channel_name', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                        placeholder="Channel Name"
                      />
                    </td>
                    <td style={{ width: columnWidths.subject }} className="px-4 py-3 whitespace-nowrap">
                      <input
                        type="text"
                        value={channel.subject || ''}
                        onChange={(e) => handleFieldChange(safeIndex, 'subject', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                        placeholder="Subject (optional)"
                      />
                    </td>
                    <td style={{ width: columnWidths.category }} className="px-4 py-3 whitespace-nowrap">
                      <select
                        value={channel.category}
                        onChange={(e) => handleFieldChange(safeIndex, 'category', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      >
                        <option value="fintech">Fintech</option>
                        <option value="news">News</option>
                      </select>
                    </td>
                    <td style={{ width: columnWidths.content_type }} className="px-4 py-3 whitespace-nowrap">
                      <select
                        value={channel.content_type}
                        onChange={(e) => handleFieldChange(safeIndex, 'content_type', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      >
                        <option value="live">Live</option>
                        <option value="video">Video</option>
                      </select>
                    </td>
                    <td style={{ width: columnWidths.pull_livestreams }} className="px-4 py-3 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={channel.pull_livestreams}
                        onChange={(e) => handleFieldChange(safeIndex, 'pull_livestreams', e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </td>
                    <td style={{ width: columnWidths.is_active }} className="px-4 py-3 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={channel.is_active}
                        onChange={(e) => handleFieldChange(safeIndex, 'is_active', e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </td>
                    <td style={{ width: columnWidths.created_at }} className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {channel.created_at 
                        ? new Date(channel.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : '-'}
                    </td>
                    <td style={{ width: columnWidths.updated_at }} className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {channel.updated_at 
                        ? new Date(channel.updated_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : '-'}
                    </td>
                    <td style={{ width: columnWidths.actions }} className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => handleDeleteRow(safeIndex)}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentPage === 1
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                    : 'bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600'
                }`}
              >
                Previous
              </button>

              {/* Page Numbers */}
              <div className="flex space-x-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  // Show first page, last page, current page, and pages around current
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                          currentPage === page
                            ? 'bg-blue-600 dark:bg-blue-500 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  } else if (page === currentPage - 2 || page === currentPage + 2) {
                    return <span key={page} className="px-2 text-gray-500 dark:text-gray-400">...</span>;
                  }
                  return null;
                })}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentPage === totalPages
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                    : 'bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600'
                }`}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          <strong>Instructions:</strong> Add or edit YouTube channel IDs. Set "Content Type" to "Live" to pull livestreams, or "Video" to pull latest videos. 
          Use "Pull Livestreams" checkbox to control whether to check for livestreams or just get the latest video. Click "Save All" to persist changes.
        </p>
      </div>
    </div>
  );
}

