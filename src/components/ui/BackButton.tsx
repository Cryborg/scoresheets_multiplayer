'use client';

import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  href?: string;
  label?: string;
  className?: string;
}

export default function BackButton({
  href = '/dashboard',
  label,
  className = ''
}: BackButtonProps) {

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Utiliser un lien direct en cas de problème
    if (typeof window !== 'undefined') {
      // Méthode de fallback la plus sûre
      window.location.href = href;
    }
  };

  return (
    <a 
      href={href}
      onClick={handleClick}
      className={`flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${className}`}
    >
      <ArrowLeft className="h-5 w-5" />
      {label && <span className="ml-2">{label}</span>}
    </a>
  );
}