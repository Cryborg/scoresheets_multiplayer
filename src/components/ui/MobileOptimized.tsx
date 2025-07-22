'use client';

import { useState, useEffect } from 'react';
import { Menu, X, ChevronDown, ChevronUp } from 'lucide-react';

// Hook pour détecter mobile
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}

// Layout adaptatif mobile/desktop
interface ResponsiveLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  className?: string;
}

export function ResponsiveLayout({ children, sidebar, className = '' }: ResponsiveLayoutProps) {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!sidebar) {
    return <div className={className}>{children}</div>;
  }

  if (isMobile) {
    return (
      <div className={`flex flex-col ${className}`}>
        {/* Header mobile avec toggle sidebar */}
        <div className="lg:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            <span className="font-medium">
              {sidebarOpen ? 'Fermer' : 'Scores & Info'}
            </span>
          </button>
        </div>

        {/* Sidebar mobile (collapsible) */}
        {sidebarOpen && (
          <div className="lg:hidden bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="p-4">
              {sidebar}
            </div>
          </div>
        )}

        {/* Contenu principal */}
        <div className="flex-1 p-4">
          {children}
        </div>
      </div>
    );
  }

  // Desktop layout
  return (
    <div className={`grid grid-cols-1 lg:grid-cols-4 gap-6 ${className}`}>
      <div className="lg:col-span-3">
        {children}
      </div>
      <div className="lg:col-span-1">
        {sidebar}
      </div>
    </div>
  );
}

// Section collapsible pour mobile
interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export function CollapsibleSection({ 
  title, 
  children, 
  defaultOpen = false,
  className = '' 
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const isMobile = useIsMobile();

  // Sur desktop, toujours ouvert
  if (!isMobile) {
    return (
      <div className={className}>
        <h3 className="font-medium text-lg mb-4">{title}</h3>
        {children}
      </div>
    );
  }

  return (
    <div className={`border border-gray-200 dark:border-gray-700 rounded-lg ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50"
      >
        <h3 className="font-medium text-lg">{title}</h3>
        {isOpen ? (
          <ChevronUp className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        )}
      </button>
      
      {isOpen && (
        <div className="p-4 pt-0 border-t border-gray-200 dark:border-gray-700">
          {children}
        </div>
      )}
    </div>
  );
}

// Grid responsive pour les scores
interface ResponsiveGridProps {
  children: React.ReactNode;
  columns?: number;
  className?: string;
}

export function ResponsiveGrid({ children, columns = 2, className = '' }: ResponsiveGridProps) {
  const gridClass = `grid grid-cols-1 sm:grid-cols-${Math.min(columns, 2)} lg:grid-cols-${columns} gap-4`;
  
  return (
    <div className={`${gridClass} ${className}`}>
      {children}
    </div>
  );
}

// Table responsive avec scroll horizontal
interface ResponsiveTableProps {
  children: React.ReactNode;
  className?: string;
}

export function ResponsiveTable({ children, className = '' }: ResponsiveTableProps) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-full">
        <table className={`min-w-full ${className}`}>
          {children}
        </table>
      </div>
    </div>
  );
}

// Input optimisé pour mobile (plus grand touch target)
interface MobileInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function MobileInput({ label, error, className = '', ...props }: MobileInputProps) {
  const isMobile = useIsMobile();
  
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <input
        {...props}
        className={`
          w-full border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600
          ${isMobile ? 'p-4 text-lg' : 'p-2'} 
          focus:ring-2 focus:ring-blue-500 focus:border-transparent
          ${error ? 'border-red-500' : 'border-gray-300'}
          ${className}
        `}
      />
      {error && (
        <p className="text-red-500 text-sm mt-1">{error}</p>
      )}
    </div>
  );
}

// Button optimisé pour mobile
interface MobileButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function MobileButton({ 
  variant = 'primary', 
  size = 'md',
  className = '',
  children, 
  ...props 
}: MobileButtonProps) {
  const isMobile = useIsMobile();
  
  const baseClass = 'font-medium rounded-md transition-colors focus:ring-2 focus:ring-offset-2';
  
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
  };
  
  const sizes = {
    sm: isMobile ? 'px-4 py-3 text-base' : 'px-3 py-1.5 text-sm',
    md: isMobile ? 'px-6 py-4 text-lg' : 'px-4 py-2 text-base',
    lg: isMobile ? 'px-8 py-5 text-xl' : 'px-6 py-3 text-lg'
  };
  
  return (
    <button
      {...props}
      className={`
        ${baseClass} 
        ${variants[variant]} 
        ${sizes[size]}
        ${className}
      `}
    >
      {children}
    </button>
  );
}