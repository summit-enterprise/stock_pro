'use client';

import { useState } from 'react';

interface BanRestrictModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  action: 'ban' | 'restrict' | 'unban' | 'unrestrict';
  userName?: string;
  userEmail?: string;
}

export default function BanRestrictModal({
  isOpen,
  onClose,
  onConfirm,
  action,
  userName,
  userEmail,
}: BanRestrictModalProps) {
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(reason);
    setReason(''); // Reset form
  };

  const handleCancel = () => {
    setReason('');
    onClose();
  };

  const getTitle = () => {
    switch (action) {
      case 'ban':
        return 'Ban User';
      case 'restrict':
        return 'Restrict User';
      case 'unban':
        return 'Unban User';
      case 'unrestrict':
        return 'Remove Restriction';
      default:
        return 'Action';
    }
  };

  const getDescription = () => {
    switch (action) {
      case 'ban':
        return 'This will ban the user and prevent them from accessing the application. They will only be able to access the support page.';
      case 'restrict':
        return 'This will restrict the user and prevent them from accessing most features. They will only be able to access the support page.';
      case 'unban':
        return 'This will remove the ban and restore full access to the user.';
      case 'unrestrict':
        return 'This will remove the restriction and restore full access to the user.';
      default:
        return '';
    }
  };

  const isUnbanAction = action === 'unban' || action === 'unrestrict';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
          {getTitle()}
        </h2>

        {(userName || userEmail) && (
          <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong>User:</strong> {userName || userEmail}
            </p>
            {userEmail && userName && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                <strong>Email:</strong> {userEmail}
              </p>
            )}
          </div>
        )}

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {getDescription()}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isUnbanAction && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Reason (optional)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Enter the reason for this action..."
              />
            </div>
          )}

          {isUnbanAction && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Are you sure you want to {action === 'unban' ? 'unban' : 'remove the restriction from'} this user?
              </p>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-4 py-2 font-medium rounded-md transition-colors ${
                action === 'ban' || action === 'restrict'
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {action === 'ban' ? 'Ban User' : action === 'restrict' ? 'Restrict User' : action === 'unban' ? 'Unban User' : 'Remove Restriction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


