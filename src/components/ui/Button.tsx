import { ButtonHTMLAttributes, ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  href?: string;
  children: ReactNode;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
  loading?: boolean;
}

const variants = {
  primary: 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl',
  secondary: 'text-gray-300 border border-gray-600 hover:bg-gray-700 hover:text-white hover:border-gray-500',
  ghost: 'text-gray-300 hover:text-white hover:bg-gray-800',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-lg hover:shadow-xl',
  success: 'bg-gradient-to-r from-green-500 to-teal-600 text-white hover:from-green-600 hover:to-teal-700 shadow-lg hover:shadow-xl',
};

const sizes = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-base',
  lg: 'px-8 py-4 text-lg',
};

export default function Button({
  variant = 'secondary',
  size = 'md',
  href,
  children,
  leftIcon,
  rightIcon,
  fullWidth = false,
  loading = false,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses = cn(
    'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-200 transform hover:-translate-y-0.5',
    variants[variant],
    sizes[size],
    fullWidth && 'w-full',
    disabled && 'opacity-50 cursor-not-allowed transform-none hover:transform-none',
    className
  );

  const content = (
    <>
      {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
      <span>{children}</span>
      {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
    </>
  );

  // Si href est fourni, utiliser Link
  if (href && !disabled) {
    return (
      <Link href={href} className={baseClasses}>
        {content}
      </Link>
    );
  }

  // Sinon, utiliser button
  // Filter out custom props that shouldn't be passed to the HTML button element
  const { 
    variant: _variant, 
    size: _size, 
    leftIcon: _leftIcon, 
    rightIcon: _rightIcon, 
    fullWidth: _fullWidth, 
    loading: _loading,
    ...buttonProps 
  } = props as any;

  return (
    <button className={baseClasses} disabled={disabled} {...buttonProps}>
      {content}
    </button>
  );
}