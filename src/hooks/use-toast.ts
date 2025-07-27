import { useCallback } from 'react';
import { notify } from '@/lib/toast';

export interface Toast {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

export function useToast() {
  const toast = useCallback(({ title, description, variant = 'default' }: Toast) => {
    const message = title && description ? `${title}: ${description}` : title || description || '';
    
    if (variant === 'destructive') {
      notify.error(message);
    } else {
      notify.success(message);
    }
  }, []);

  return { toast };
}