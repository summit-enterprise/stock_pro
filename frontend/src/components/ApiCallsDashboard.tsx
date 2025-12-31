'use client';

import { useState, useEffect } from 'react';

interface ApiCallStat {
  api_provider: string;
  api_name: string;
  total_calls: number;
  successful_calls: number;
  failed_calls: number;
  avg_response_time: number;
  total_quota_units: number;
  last_call_time: string;
}

interface QuotaUsage {
  api_provider: string;
  quota_type: string;
  quota_limit: number;
  quota_used: number;
  quota_remaining: number;
  quota_reset_date: string;
  quota_period: string;
  quota_percentage: number;
  last_updated: string;
}

interface ApiCall {
  id: number;
  api_provider: string;
  api_name: string;
  endpoint: string;
  method: string;
  status_code: number;
  response_time_ms: number;
  success: boolean;
  error_message: string | null;
  quota_units_used: number;
  service_name: string | null;
  created_at: string;
}

interface ApiProvider {
  provider_key: string;
  provider_name: string;
  base_url: string;
  api_key_env_var: string | null;
  quota_limit: number | null;
  quota_period: string;
  quota_units_per_call: number;
  documentation_url: string | null;
  status: string;
  description: string | null;
}

interface ApiCallsDashboardProps {
  token: string;
}

export default function ApiCallsDashboard({ token }: ApiCallsDashboardProps) {
  const [apiProviders, setApiProviders] = useState<ApiProvider[]>([]);
  const [stats, setStats] = useState<ApiCallStat[]>([]);
  const [quotaUsage, setQuotaUsage] = useState<QuotaUsage[]>([]);
  const [recentCalls, setRecentCalls] = useState<ApiCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | 'all'>('24h');
  const [selectedProvider, setSelectedProvider] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, [timeRange, selectedProvider]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [providersRes, statsRes, quotaRes, callsRes] = await Promise.all([
        fetch('http://localhost:3001/api/admin/api-calls/providers', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`http://localhost:3001/api/admin/api-calls/stats?timeRange=${timeRange}&apiProvider=${selectedProvider === 'all' ? '' : selectedProvider}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://localhost:3001/api/admin/api-calls/quota', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`http://localhost:3001/api/admin/api-calls/recent?limit=50&apiProvider=${selectedProvider === 'all' ? '' : selectedProvider}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
      ]);

      if (providersRes.ok) {
        const providersData = await providersRes.json();
        setApiProviders(providersData.providers || []);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.stats || []);
      }

      if (quotaRes.ok) {
        const quotaData = await quotaRes.json();
        setQuotaUsage(quotaData.quotaUsage || []);
      }

      if (callsRes.ok) {
        const callsData = await callsRes.json();
        setRecentCalls(callsData.calls || []);
      }
    } catch (error) {
      console.error('Error loading API calls data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getQuotaColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600 dark:text-red-400';
    if (percentage >= 75) return 'text-orange-600 dark:text-orange-400';
    return 'text-green-600 dark:text-green-400';
  };

  const getQuotaBgColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-orange-500';
    return 'bg-green-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500 dark:text-gray-400">Loading API calls data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Time Range and Provider Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">API Calls & Quota Usage</h2>
          <div className="flex items-center space-x-4">
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Providers</option>
              {Array.from(new Set(stats.map(s => s.api_provider))).map(provider => (
                <option key={provider} value={provider}>{provider}</option>
              ))}
            </select>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </div>
      </div>

      {/* All APIs Used by Application */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">All APIs Used by Application</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Complete list of external APIs integrated into the application
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">API Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Base URL</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">API Key Env Var</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Quota Limit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Period</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Units/Call</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Documentation</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {apiProviders.map((provider, index) => (
                <tr key={provider.provider_key || `provider-${index}`} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {provider.provider_name}
                    </div>
                    {provider.description && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {provider.description}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white max-w-xs truncate" title={provider.base_url}>
                      {provider.base_url || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white font-mono">
                      {provider.api_key_env_var || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {provider.quota_limit ? provider.quota_limit.toLocaleString() : 'Unlimited'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white capitalize">
                    {provider.quota_period || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {provider.quota_units_per_call || 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      provider.status === 'active'
                        ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                    }`}>
                      {provider.status || 'unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {provider.documentation_url ? (
                      <a
                        href={provider.documentation_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Docs
                      </a>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {apiProviders.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No API providers found
            </div>
          )}
        </div>
      </div>

      {/* Quota Usage Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {quotaUsage.map((quota) => (
          <div key={`${quota.api_provider}-${quota.quota_type}`} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900 dark:text-white">{quota.api_provider}</h3>
              <span className={`text-sm font-medium ${getQuotaColor(quota.quota_percentage)}`}>
                {quota.quota_percentage}%
              </span>
            </div>
            <div className="mb-2">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                <span>Used: {quota.quota_used.toLocaleString()}</span>
                <span>Limit: {quota.quota_limit.toLocaleString()}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${getQuotaBgColor(quota.quota_percentage)}`}
                  style={{ width: `${Math.min(100, quota.quota_percentage)}%` }}
                />
              </div>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Period: {quota.quota_period} | Remaining: {quota.quota_remaining.toLocaleString()}
              {quota.quota_reset_date && (
                <div>Resets: {new Date(quota.quota_reset_date).toLocaleString()}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* API Call Statistics */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">API Call Statistics</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Provider</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Total Calls</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Success</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Failed</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Avg Response (ms)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Quota Units</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Last Call</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {stats.map((stat, idx) => (
                <tr key={`${stat.api_provider}-${stat.api_name}-${idx}`} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {stat.api_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {stat.total_calls.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 dark:text-green-400">
                    {stat.successful_calls.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 dark:text-red-400">
                    {stat.failed_calls.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {Math.round(stat.avg_response_time || 0)}ms
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {stat.total_quota_units?.toLocaleString() || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {stat.last_call_time ? new Date(stat.last_call_time).toLocaleString() : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {stats.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No API calls found for the selected time range
            </div>
          )}
        </div>
      </div>

      {/* Recent API Calls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent API Calls</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Provider</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Endpoint</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Response Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Service</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {recentCalls.map((call) => (
                <tr key={call.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(call.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {call.api_name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white max-w-xs truncate">
                    {call.method} {call.endpoint}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      call.success 
                        ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' 
                        : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                    }`}>
                      {call.status_code || 'Error'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {call.response_time_ms}ms
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {call.service_name || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {recentCalls.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No recent API calls found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

