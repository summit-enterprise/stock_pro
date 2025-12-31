'use client';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmButtonColor?: 'red' | 'blue' | 'green';
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmButtonColor = 'blue',
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const buttonColors = {
    red: 'bg-red-600 hover:bg-red-700 text-white',
    blue: 'bg-blue-600 hover:bg-blue-700 text-white',
    green: 'bg-green-600 hover:bg-green-700 text-white',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-gray-50 dark:bg-zinc-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4 animate-fade-in">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {title}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {message}
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="group relative px-5 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl overflow-hidden transition-all duration-300
              hover:bg-gray-200 dark:hover:bg-zinc-700 hover:shadow-md hover:border-gray-300 dark:hover:border-zinc-600
              active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:focus:ring-offset-zinc-900 tracking-tight"
          >
            <span className="relative z-10">{cancelText}</span>
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent 
              translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></span>
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`group relative px-5 py-2.5 text-sm font-semibold rounded-xl overflow-hidden transition-all duration-300 tracking-tight
              ${confirmButtonColor === 'red' ? 'bg-red-600 dark:bg-red-700 hover:bg-red-700 dark:hover:bg-red-600 text-white hover:shadow-xl hover:shadow-red-500/30' : ''}
              ${confirmButtonColor === 'blue' ? 'bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600 text-white hover:shadow-xl hover:shadow-blue-500/30' : ''}
              ${confirmButtonColor === 'green' ? 'bg-green-600 dark:bg-green-700 hover:bg-green-700 dark:hover:bg-green-600 text-white hover:shadow-xl hover:shadow-green-500/30' : ''}
              active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-zinc-900
              ${confirmButtonColor === 'red' ? 'focus:ring-red-500' : confirmButtonColor === 'blue' ? 'focus:ring-blue-500' : 'focus:ring-green-500'}`}
          >
            <span className="relative z-10">{confirmText}</span>
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent 
              translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></span>
          </button>
        </div>
      </div>
    </div>
  );
}

