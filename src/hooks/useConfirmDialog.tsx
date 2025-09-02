'use client';

import { useState, useCallback } from 'react';
import ConfirmationModal from '@/components/ui/ConfirmationModal';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDangerous?: boolean;
}

export function useConfirmDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({
    message: ''
  });
  const [resolvePromise, setResolvePromise] = useState<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions | string): Promise<boolean> => {
    return new Promise((resolve) => {
      const finalOptions = typeof opts === 'string' 
        ? { message: opts, title: 'Confirmation' }
        : { title: 'Confirmation', ...opts };
      
      setOptions(finalOptions);
      setIsOpen(true);
      setResolvePromise(() => resolve);
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setIsOpen(false);
    resolvePromise?.(true);
    setResolvePromise(null);
  }, [resolvePromise]);

  const handleCancel = useCallback(() => {
    setIsOpen(false);
    resolvePromise?.(false);
    setResolvePromise(null);
  }, [resolvePromise]);

  const ConfirmDialog = useCallback(() => (
    <ConfirmationModal
      isOpen={isOpen}
      onClose={handleCancel}
      onConfirm={handleConfirm}
      title={options.title || 'Confirmation'}
      message={options.message}
      confirmLabel={options.confirmLabel}
      cancelLabel={options.cancelLabel}
      isDangerous={options.isDangerous}
    />
  ), [isOpen, handleCancel, handleConfirm, options]);

  return { confirm, ConfirmDialog };
}