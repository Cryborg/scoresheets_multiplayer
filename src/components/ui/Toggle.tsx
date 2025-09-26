'use client';

import { ReactNode } from 'react';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  variant?: 'default' | 'warning' | 'danger';
  className?: string;
}

const variants = {
  default: {
    ring: 'peer-focus:ring-green-300 dark:peer-focus:ring-green-800',
    checked: 'peer-checked:bg-green-500'
  },
  warning: {
    ring: 'peer-focus:ring-orange-300 dark:peer-focus:ring-orange-800',
    checked: 'peer-checked:bg-orange-500'
  },
  danger: {
    ring: 'peer-focus:ring-red-300 dark:peer-focus:ring-red-800',
    checked: 'peer-checked:bg-red-500'
  }
};

export default function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  variant = 'default',
  className = ''
}: ToggleProps) {
  const variantClasses = variants[variant];

  return (
    <div className={`flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg ${className}`}>
      <div className="flex-1 mr-4">
        <h3 className="font-medium text-gray-900 dark:text-white">{label}</h3>
        {description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{description}</p>
        )}
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only peer"
        />
        <div className={`w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 ${variantClasses.ring} rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 ${variantClasses.checked} peer-disabled:opacity-50 peer-disabled:cursor-not-allowed`}></div>
      </label>
    </div>
  );
}