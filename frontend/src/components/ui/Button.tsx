'use client';

import { ReactNode } from 'react';

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function Button({
  children,
  onClick,
  type = 'button',
  disabled = false,
  variant = 'primary',
  size = 'md',
  className = '',
}: ButtonProps) {
  const baseClasses = 'group relative font-semibold rounded-xl overflow-hidden transition-all duration-300 tracking-tight active:scale-[0.98] active:transition-transform active:duration-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-zinc-900';
  
  const sizeClasses = {
    sm: 'px-4 py-2 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };
  
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-500/30 dark:bg-blue-700 dark:hover:bg-blue-600 focus:ring-blue-500',
    secondary: 'bg-gray-100 text-gray-900 border border-gray-200 hover:bg-gray-200 hover:shadow-md hover:border-gray-300 dark:bg-zinc-800 dark:text-gray-100 dark:border-zinc-700 dark:hover:bg-zinc-700 dark:hover:border-zinc-600 focus:ring-gray-400',
    danger: 'bg-red-600 text-white hover:bg-red-700 hover:shadow-xl hover:shadow-red-500/30 dark:bg-red-700 dark:hover:bg-red-600 focus:ring-red-500',
    success: 'bg-green-600 text-white hover:bg-green-700 hover:shadow-xl hover:shadow-green-500/30 dark:bg-green-700 dark:hover:bg-green-600 focus:ring-green-500',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-zinc-800 dark:hover:text-white focus:ring-gray-400',
  };
  
  const shimmerClasses = 'absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700';
  
  const combinedClasses = `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`;
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={combinedClasses}
    >
      <span className="relative z-10">{children}</span>
      {!disabled && variant !== 'ghost' && (
        <span className={shimmerClasses}></span>
      )}
    </button>
  );
}



