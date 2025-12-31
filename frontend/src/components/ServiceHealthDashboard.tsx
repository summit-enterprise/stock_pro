'use client';

import { useState, useEffect } from 'react';

interface ServiceHealth {
  service_name: string;
  service_type: string;
  status: string;
  health_status: string;
  last_check: string;
  last_success: string | null;
  last_failure: string | null;
  response_time_ms: number | null;
  error_message: string | null;
  metadata: any;
  updated_at: string;
  serviceInfo: {
    name: string;
    type: string;
    description: string;
    checkInterval: number;
  } | null;
}

interface ServiceHealthDashboardProps {
  token: string;
}

export default function ServiceHealthDashboard({ token }: ServiceHealthDashboardProps) {
  const [services, setServices] = useState<ServiceHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState<string | null>(null);

  useEffect(() => {
    loadServiceHealth();
    // Refresh every 30 seconds
    const interval = setInterval(loadServiceHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadServiceHealth = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/admin/services/health', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setServices(data.services || []);
      }
    } catch (error) {
      console.error('Error loading service health:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkServiceHealth = async (serviceName: string) => {
    setChecking(serviceName);
    try {
      const response = await fetch(
        `http://localhost:3001/api/admin/services/health/${serviceName}/check`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.ok) {
        await loadServiceHealth(); // Reload after check
      }
    } catch (error) {
      console.error('Error checking service health:', error);
    } finally {
      setChecking(null);
    }
  };

  const checkAllServices = async () => {
    setChecking('all');
    try {
      const response = await fetch(
        'http://localhost:3001/api/admin/services/health/check-all',
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.ok) {
        await loadServiceHealth(); // Reload after check
      }
    } catch (error) {
      console.error('Error checking all services:', error);
    } finally {
      setChecking(null);
    }
  };

  const getHealthColor = (healthStatus: string) => {
    switch (healthStatus) {
      case 'healthy':
        return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900';
      case 'degraded':
        return 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900';
      case 'error':
      case 'unhealthy':
        return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200';
      case 'stopped':
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200';
      case 'error':
        return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200';
    }
  };

  const formatTimeAgo = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const formatUpdateFrequency = (intervalMs: number) => {
    const seconds = intervalMs / 1000;
    const minutes = seconds / 60;
    const hours = minutes / 60;

    if (seconds < 60) return `Every ${Math.round(seconds)}s`;
    if (minutes < 60) return `Every ${Math.round(minutes)}m`;
    if (hours < 24) return `Every ${Math.round(hours)}h`;
    return `Every ${Math.round(hours / 24)}d`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500 dark:text-gray-400">Loading service health...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Check All Button */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Service Health Monitoring</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Monitor the health and status of all application services
            </p>
          </div>
          <button
            onClick={checkAllServices}
            disabled={checking === 'all'}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-md transition-colors"
          >
            {checking === 'all' ? 'Checking...' : 'Check All Services'}
          </button>
        </div>
      </div>

      {/* Service Health Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((service) => (
          <div
            key={service.service_name}
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-4"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {service.serviceInfo?.name || service.service_name}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {service.serviceInfo?.description || service.service_type}
                </p>
              </div>
              <button
                onClick={() => checkServiceHealth(service.service_name)}
                disabled={checking === service.service_name}
                className="ml-2 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded transition-colors"
                title="Check health"
              >
                {checking === service.service_name ? '...' : '↻'}
              </button>
            </div>

            <div className="space-y-2">
              {/* Health Status */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600 dark:text-gray-400">Health</span>
                <span className={`px-2 py-1 text-xs rounded-full font-medium ${getHealthColor(service.health_status)}`}>
                  {service.health_status}
                </span>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600 dark:text-gray-400">Status</span>
                <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusBadge(service.status)}`}>
                  {service.status}
                </span>
              </div>

              {/* Response Time */}
              {service.response_time_ms !== null && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600 dark:text-gray-400">Response Time</span>
                  <span className="text-xs text-gray-900 dark:text-white">
                    {service.response_time_ms}ms
                  </span>
                </div>
              )}

              {/* Update Frequency */}
              {service.serviceInfo?.checkInterval && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600 dark:text-gray-400">Update Frequency</span>
                  <span className="text-xs text-gray-900 dark:text-white">
                    {formatUpdateFrequency(service.serviceInfo.checkInterval)}
                  </span>
                </div>
              )}

              {/* Last Check */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600 dark:text-gray-400">Last Check</span>
                <span className="text-xs text-gray-900 dark:text-white">
                  {formatTimeAgo(service.last_check)}
                </span>
              </div>

              {/* Last Success */}
              {service.last_success && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600 dark:text-gray-400">Last Success</span>
                  <span className="text-xs text-green-600 dark:text-green-400">
                    {formatTimeAgo(service.last_success)}
                  </span>
                </div>
              )}

              {/* Last Failure */}
              {service.last_failure && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600 dark:text-gray-400">Last Failure</span>
                  <span className="text-xs text-red-600 dark:text-red-400">
                    {formatTimeAgo(service.last_failure)}
                  </span>
                </div>
              )}

              {/* Error Message */}
              {service.error_message && (
                <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-700 dark:text-red-300">
                  {service.error_message}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {services.length === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          No services found. Services will appear here once they are initialized.
        </div>
      )}
    </div>
  );
}

