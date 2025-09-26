import { ReactNode } from 'react';
import { THEME } from '@/lib/theme';

interface PageLayoutProps {
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '6xl' | 'full';
  className?: string;
}

/**
 * Centralized page layout component
 * Provides consistent background, spacing, and max-width across all pages
 */
export default function PageLayout({
  children,
  maxWidth = '4xl',
  className = ''
}: PageLayoutProps) {
  const maxWidthClass = maxWidth === 'full' ? '' : `max-w-${maxWidth}`;

  return (
    <div className={THEME.classes.pageBackground}>
      <div className={`min-h-screen ${maxWidthClass} mx-auto px-4 py-8 ${className}`}>
        {children}
      </div>
    </div>
  );
}

/**
 * Admin layout - full width for admin pages
 */
export function AdminPageLayout({ children, className = '' }: { children: ReactNode; className?: string; }) {
  return (
    <PageLayout maxWidth="full" className={className}>
      {children}
    </PageLayout>
  );
}

/**
 * Game layout - centered with max width like games and profiles
 */
export function GamePageLayout({ children, className = '' }: { children: ReactNode; className?: string; }) {
  return (
    <PageLayout maxWidth="4xl" className={className}>
      {children}
    </PageLayout>
  );
}